# Booking Flow

This document walks through the full lifecycle of a hotel booking, end to end, as actually implemented in `backend/src/services/bookingService.js`, `availabilityService.js`, `pricingService.js`, `utils/bookingNumber.js`, and `jobs/holdExpiryJob.js`. This is the single most critical piece of the system — it is what prevents double-booking a room.

## 1. End-to-end lifecycle

```
1. Search availability      GET /rooms/availability
2. Select room(s)           (client-side selection from search results)
3. Checkout
   a. Guest information
   b. Room summary
   c. Additional services
   d. Price summary          <- always recalculated server-side, see section 5
   e. Payment
   f. Confirmation
4. POST /bookings            -> booking created as HELD, 10-minute expiry
5a. Payment succeeds          -> POST /bookings/:id/confirm  -> HELD -> CONFIRMED
5b. Staff/walk-in booking      -> created with immediateConfirm=true -> straight to CONFIRMED
5c. Hold expires (no payment)  -> background job -> HELD -> CANCELLED, room released
6. POST /bookings/:id/check-in   -> CONFIRMED -> CHECKED_IN, room.status -> occupied
7. POST /bookings/:id/check-out  -> CHECKED_IN -> CHECKED_OUT, room.status -> available
(at any point before check-out) POST /bookings/:id/cancel -> CANCELLED, cancellation fee applied
```

### 1. Search availability

`GET /rooms/availability` (public, no auth required) accepts `destination`, `hotelId`, `checkIn`, `checkOut`, `adults`, `children`, `roomsRequested`, `roomTypeId`, `starRating`, `amenityIds`. `availabilityService.searchAvailability` finds active, non-deleted hotels matching the filters, then for each room type calls `getAvailableRoomsForType`, which:

1. Loads every non-deleted room in that room type whose own status is `available` or `occupied` (i.e. not `maintenance`/`inactive`).
2. Runs the overlap query (section 4 below) to find which of those rooms already have a blocking booking for the requested dates.
3. Returns the rooms that are neither overlapping nor under maintenance.

Only room types with at least `roomsRequested` free rooms are included in the response, alongside hotel/room-type metadata (images, amenities, cancellation policy) needed to render search results.

### 2. Select room(s) / 3. Checkout

The frontend checkout is a multi-step form — guest information, room summary, additional services, price summary, payment, confirmation — but every value it collects (dates, room ids, guest list, requested services, discount) is just **input to the booking API**. Nothing computed in the browser is trusted.

Each entry in the booking payload's `rooms` array selects either a specific physical `roomId` (used by staff picking an exact room number) or a `roomTypeId` (the customer-facing case — the public UI only ever shows room *types*, never raw room numbers). When `roomTypeId` is given, `bookingService.js` picks and locks an available room of that type itself, inside the same transaction described in section 2 below, so two customers requesting "a Deluxe room" for overlapping dates can never be assigned the same physical room. A `customerId` in the request body is required for a staff/agent caller (booking on behalf of someone) but is ignored — and instead resolved server-side from the caller's own `Customer` profile — for a `Customer`-role caller, so one customer can never book, view, or pay for another customer's reservation by passing a different id.

### 4. Create booking — `POST /bookings`

`createBooking(input)` in `bookingService.js` is the heart of the system. See section 4 below for the full transactional detail. At the end of it, the booking exists with:

- `status = 'held'` and `hold_expires_at = now + BOOKING_HOLD_MINUTES minutes` (default 10, `env.bookingHoldMinutes`), **unless** the caller passes `immediateConfirm: true` — reserved for staff-created bookings (walk-in, phone, admin) where there is no online payment step to wait for — in which case `status = 'confirmed'` and `hold_expires_at = null` directly.
- A `booking_status_history` row recording the initial status.
- A confirmation notification (in-app always; email only when the booking is immediately confirmed — a held booking's guest gets an in-app/"received" notification, and the confirmation email is sent later when payment succeeds and `confirmBookingAfterPayment` runs).

### 5a. Payment succeeds — `POST /bookings/:id/confirm`

`confirmBookingAfterPayment(bookingId)` requires the booking to currently be `held` or `pending`, then transitions it to `confirmed` and appends a status-history row ("Payment received"). This endpoint is what the payment flow calls once the payment gateway adapter reports success.

### 5b. Staff / walk-in immediate confirmation

Passing `immediateConfirm: true` into `createBooking` (gated by the caller's own authorization — this is a staff/admin capability, not exposed to the public checkout) skips the hold entirely and creates the booking already `confirmed`. This covers walk-in guests and phone/admin bookings where payment (cash, card-present) is settled at the same moment as booking creation.

### 5c. Hold expires — background sweeper

If no payment/confirmation happens within the hold window, a background interval job (`startBookingHoldSweeper`, started from `server.js` and polling every 60 seconds) calls `releaseExpiredHolds()`, which finds every booking still `held` with `hold_expires_at` in the past and — inside its own transaction, re-checking the status is still `held` to avoid a race with a concurrent confirm — transitions it to `cancelled` with reason "Hold expired". Because the availability overlap check (section 4) only considers `held`/`confirmed`/`checked_in` bookings as blocking, a `cancelled` booking's rooms become bookable again immediately — there is no separate "release" step; cancelling *is* releasing.

### 6. Check-in — `POST /bookings/:id/check-in`

Requires the booking to be `confirmed`. `checkInBooking` stamps `actual_check_in`/`checked_in_by_id`/`notes` on every `booking_rooms` row, sets every reserved `room.status` to `occupied`, and transitions the booking to `checked_in`.

### 7. Check-out — `POST /bookings/:id/check-out`

Requires the booking to be `checked_in`. `checkOutBooking` stamps `actual_check_out`/`checked_out_by_id`/`notes`, sets every reserved `room.status` back to `available`, and transitions the booking to `checked_out`.

### Cancellation — `POST /bookings/:id/cancel`

Available any time before the booking reaches `cancelled`/`checked_out`/`completed`. See section 6 for the fee calculation. `cancelBooking` computes the fee/refundable amount from the **current settings and current time**, updates the booking (`status = 'cancelled'`, `cancelled_at`, `cancellation_fee`, `refundable_amount`, `cancellation_reason`), appends status history, records an audit log entry, and emails the customer.

## 2. Concurrency guarantee (the single most critical requirement)

**Claim**: two concurrent requests to book the same room for overlapping dates can never both succeed. One will receive `201 Created`; the other will receive `409 Conflict`.

**Mechanism**, in `createBooking` (`bookingService.js`):

1. The entire booking creation runs inside **one database transaction** (`db.transaction(async (tx) => { ... })`). Nothing about the booking is visible to any other connection until this transaction commits, and any failure at any step rolls back everything — no room is ever left half-reserved.
2. Before touching availability data, the transaction takes a **PostgreSQL advisory transaction lock per room (and, for a type-based selection, per room type) being booked**:
   ```js
   async function lockRoomsAndTypes(tx, { roomIds, roomTypeIds }) {
     const keys = [...new Set([...roomIds, ...roomTypeIds.map((id) => `roomtype:${id}`)])].sort();
     for (const key of keys) {
       await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', key);
     }
   }
   ```
   `hashtextextended(key, 0)` deterministically maps a lock key to a 64-bit lock id, so every transaction that touches a given room (or wants to auto-assign from a given room type) contends for the *same* advisory lock. Room-type keys are prefixed (`roomtype:<id>`) so they can never collide with a room's UUID. All keys — explicit room ids and room-type keys together — are combined into **one sorted list** before locking, so if transaction A wants `[X, Y]` and transaction B concurrently wants `[Y, X]`, both actually acquire in the order `[X, Y]` — neither can end up holding one lock while waiting on the other's lock, which is exactly how a deadlock would otherwise occur. `pg_advisory_xact_lock` blocks the calling connection until the lock is free and releases it automatically when the transaction commits or rolls back.
3. **Only after acquiring the lock(s)** does the transaction resolve any `roomTypeId` selections to a concrete, currently-available room of that type (`resolveRoomSelections`) and re-run the overlap check (section 4) via `assertRoomsAvailable` against the full resolved room-id list. If any requested/resolved room already has an overlapping booking in a blocking status — or a room type simply has no room left to assign — it throws `ConflictError` (mapped to HTTP 409) and the transaction rolls back — nothing is written.
4. If the check passes, the same transaction computes pricing, creates the `booking` + `booking_rooms` + `booking_guests` + `booking_services` (+ `commission` if applicable) rows, and commits.

**Why this is safe under concurrency**: suppose two requests, A and B, both try to book room `X` for overlapping dates at the same instant.
- Both transactions call `lockRooms`. One of them (say A) acquires the advisory lock on `X` first; B's `pg_advisory_xact_lock` call **blocks** — B's transaction does not proceed past this line until A's transaction ends.
- A proceeds: re-checks overlap (finds none, since B hasn't committed anything yet), creates its booking, and commits. Committing releases A's advisory lock.
- B's blocked call now acquires the lock and proceeds: it re-checks overlap and this time **does** find A's just-committed `booking_rooms` row overlapping the requested dates (A's booking is `held`, which is a blocking status) — so B throws `ConflictError` and rolls back.
- Net result: exactly one `201 Created`, one `409 Conflict`. This is verified by an automated test (`backend/tests/integration/booking.concurrency.test.js`) that fires 10 simultaneous requests for the same room/dates and asserts exactly one succeeds, plus a second test that fires more simultaneous type-based (`roomTypeId`) requests than physical rooms exist and asserts exactly one booking per room, each assigned a distinct room.

This guarantee holds regardless of how many application server processes/pods are running the API, because the lock lives in PostgreSQL itself (a per-connection advisory lock scoped to the transaction), not in application memory — it is safe under horizontal scaling.

## 3. Overlap rule

A room is considered unavailable for `[requestedCheckIn, requestedCheckOut)` if there exists a `booking_rooms` row for that room, belonging to a booking whose status is `held`, `confirmed`, or `checked_in` (`BLOCKING_BOOKING_STATUSES` in `availabilityService.js`), such that:

```
existing.check_in < requested.check_out
AND
existing.check_out > requested.check_in
```

This is the standard half-open interval overlap test — two stays that only touch at the boundary (one guest checks out the same day another checks in) do **not** overlap. Bookings in `pending`, `cancelled`, `checked_out`, `completed`, or `no_show` never block — cancelling (including via hold expiry) or completing a stay immediately frees the room for new overlap checks.

## 4. Pricing — always recalculated server-side

The client never gets to say what a booking costs. `calculateRoomStayPrice` (`pricingService.js`) is called once per room, inside the same transaction as the availability re-check, and reads `RoomRate` rows fresh from the database for the requested room type and date range — any price/discount value submitted by the client for a room is ignored entirely.

Pricing proceeds **night by night** (not as one flat multiply), because a stay can span a rate-plan boundary (e.g. a seasonal rate change mid-stay):

1. For each calendar night of the stay, find the candidate `room_rates` rows whose `[start_date, end_date)` window contains that night (and whose `rate_plan_id` matches the requested plan, if one was specified).
2. Pick the **highest-`priority`** candidate (a promotional/override rate beats the standard rate); ties are broken by the **lowest price**, so an ambiguous rate never silently books the guest into the more expensive option.
3. For that night: `base = rate.price`; extra-occupancy surcharge = `rate.extra_adult_price * max(0, adults - 2) + rate.extra_child_price * max(0, children - 0)` — **base occupancy is 2 adults / 0 children**, so the first 2 adults are included in the base rate and every adult beyond that (and every child, since base child occupancy is 0) is charged the rate's per-person surcharge for that night.
4. Nightly total = `base + extra`. The stay's `ratePerNight` returned to the caller is the *average* nightly total across the stay (for display); the authoritative `totalPrice` is the exact sum of each night's total, not `nights * average`.

All arithmetic uses `Money` (a `Decimal` wrapper — see `database.md` section 4), never JS floats.

### Worked example

Room type "Deluxe", `extra_adult_price = 15`, `extra_child_price = 8`, base rate `100.00`/night (Room Only plan, flat across the stay for simplicity), booked for **3 nights** by **3 adults, 1 child**, with a **10.00 discount**, and the agency's `tax_rate_percent` setting at **5%**:

1. Base occupancy is 2 adults / 0 children. Extra occupants: `1 extra adult` (3 - 2), `1 child` (1 - 0, since base child occupancy is 0).
2. Per-night extra charge: `1 * 15.00 (extra adult) + 1 * 8.00 (extra child) = 23.00`.
3. Per-night total: `100.00 + 23.00 = 123.00`.
4. Room subtotal for 3 nights: `123.00 * 3 = 369.00` (assume no extra services for this example).
5. Apply discount: `subtotal - discount = 369.00 - 10.00 = 359.00` — this is the **taxable amount**.
6. Apply tax: `359.00 * 5% = 17.95`.
7. **Total amount** = `taxable amount + tax = 359.00 + 17.95 = 376.95`.

(If the booking has an `agentId` and an effective commission percentage, e.g. from `default_commission_percent` or an explicit override, the commission is calculated the same way — as a percentage of the taxable amount — and recorded on a separate `commissions` row; it does not change what the customer owes.)

## 5. Cancellation policy

Cancellation fee is a function of how far out the check-in date is at the moment of cancellation, resolved from the agency's `settings` (with hard-coded fallbacks if unset — see `settingsService.js` `DEFAULTS`):

| Time until check-in | Fee | Settings keys |
|---|---|---|
| More than `cancellation_free_days` (default **7**) days out | **Free** — 0% fee | `cancellation_free_days` |
| Between `cancellation_full_within_hours` (default 24 hours) and `cancellation_free_days` (default 7 days) out | **Partial fee** — `cancellation_partial_percent` (default **50%**) | `cancellation_partial_percent` |
| Within `cancellation_full_within_hours` (default **24 hours**) of check-in | **Full fee** — 100% | `cancellation_full_within_hours` |

This directly implements the free-7-days / 50%-inside-the-free-window / 100%-inside-24-hours policy (the tiered "50% before 3 days" example from the original brief is covered by the middle tier using a 50% partial rate inside the free-cancellation window — the exact partial-fee cutoff and percentage are configurable per agency via `settings`, not hard-coded, so an agency can tune it to a stricter or looser schedule, e.g. a distinct "50% inside 3 days / 100% inside 24 hours" schedule, without a code change).

The fee is calculated as `total_amount * feePercent / 100`, and the refundable amount is `max(paid_amount - fee, 0)` — a customer is never refunded more than they actually paid, and never charged a "fee" beyond what they paid. Both values, plus the reason and timestamp, are stored on the `bookings` row and mirrored into `booking_status_history` for audit purposes.
