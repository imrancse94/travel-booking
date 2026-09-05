# Database

PostgreSQL 16 is the system of record for the whole application. Access is exclusively through the Drizzle client (`backend/src/db/index.js`); no other module opens a raw `pg` connection of its own. The schema is defined in `backend/src/db/schema.js` with its relations in `backend/src/db/relations.js` (~40 tables across 9 domain groups, summarized below).

## 1. Schema by domain group

### Identity / RBAC
- `agencies` — the owning travel agency for a hotel/user (multi-tenant-ready: most top-level entities carry a nullable `agency_id`).
- `users` — login identity: email/password hash, email verification and password-reset tokens, refresh token hash, `status`, soft-deleted via `deleted_at`.
- `roles`, `permissions`, `user_roles`, `role_permissions` — the RBAC graph described in `architecture.md`. `roles.is_system` marks the 7 built-in roles so they can be protected from deletion.

### Hotel / room management
- `hotels` — profile, address/geo (`latitude`/`longitude` as `Decimal(9,6)`), check-in/out times, four free-text policy fields (`cancellation_policy`, `payment_policy`, `child_policy`, `pet_policy`), `status` (active/inactive/suspended), soft-deleted.
- `hotel_images`, `amenities`, `hotel_amenities` — gallery and amenity tagging (amenities are shared between hotels and room types via a common `amenities` table).
- `room_types` — per-hotel category (Standard/Deluxe/Suite/etc. are seed data, not an enum, so agencies can define their own), `max_adults`/`max_children` (occupancy caps used by availability search), `total_rooms`, soft-deleted.
- `room_type_images`, `room_type_amenities`.
- `rooms` — one row per physical room, unique on `(room_type_id, room_number)`, `status` enum (`available`/`occupied`/`maintenance`/`inactive`), soft-deleted.

### Pricing
- `rate_plans` — Room Only / Breakfast Included / Half Board / Full Board / All Inclusive (`RatePlanType` enum), reusable across room types.
- `room_rates` — the actual price table: `(room_type_id, rate_plan_id, start_date, end_date, price, extra_adult_price, extra_child_price, currency, priority)`, indexed on `(room_type_id, start_date, end_date)` for range lookups. `priority` lets a promotional/seasonal rate override the standard rate for an overlapping date window without deleting it — see `pricingService.js`'s `pickRateForNight`, which picks the highest-priority row (ties broken by lowest price) covering each night of the stay.

### Customer
- `customers` — profile (name, contact, nationality, passport, DOB), optionally linked 1:1 to a `users` row (`user_id`, nullable — a customer can exist without a login, e.g. created by a booking agent) and soft-deleted.
- `customer_documents` — uploaded passport/ID scans etc.

### Booking (the core transactional domain — see `booking-flow.md` for the full lifecycle)
- `bookings` — one row per reservation: dates, party size, `status` (`pending`/`held`/`confirmed`/`checked_in`/`checked_out`/`cancelled`/`completed`/`no_show`), `source` (website/mobile_app/admin/agent/walk_in/api), the full money breakdown (`subtotal`, `discount_amount`, `tax_amount`, `commission_amount`, `total_amount`, `paid_amount`, `due_amount`, all `Decimal(12,2)`), `hold_expires_at`, and cancellation fields (`cancelled_at`, `cancellation_fee`, `refundable_amount`, `cancellation_reason`). Indexed on `status` and on `(check_in, check_out)`.
- `booking_rooms` — one row per room reserved within a booking (a booking can span multiple rooms/room types), storing the per-room nightly rate and total, plus actual check-in/out timestamps and the staff member who performed each. Indexed on `(room_id, check_in, check_out)` — this is the table the availability/overlap check queries.
- `booking_guests` — every guest on the booking (not just the account holder), with `is_primary` marking the lead guest.
- `booking_services` — extra services attached to a booking (see Services below), with quantity/price/tax/total snapshotted at booking time.
- `booking_status_history` — an audit trail of every status transition (`from_status` -> `to_status`, who changed it, why), written by the booking service on every transition.

### Services
- `services` — the catalog of extras (airport pickup, breakfast, extra bed, laundry, etc.), each with price/tax/status.

### Payments / refunds / invoices
- `payments` — one row per payment attempt against a booking: `method` enum, `status` enum, gateway name, `transaction_id`, `metadata` (JSON, gateway-specific payload).
- `refunds` — linked to a payment, its own `status` lifecycle.
- `invoices`, `invoice_items` — generated per booking, with subtotal/discount/tax/total/paid/due mirrored from the booking, `pdf_url` pointing at the generated PDF, and `status` (unpaid/partially_paid/paid/void).

### Travel / tours
- `destinations` — name/country/description, soft-deleted.
- `tour_packages` — duration, price, `max_participants`, included/excluded services text, soft-deleted.
- `tour_images`, `tour_itineraries` (day-by-day plan, unique on `(tour_package_id, day_number)`).
- `tour_bookings` — its own booking number sequence (`TB-YYYY-NNNNNN`) and status lifecycle (pending/confirmed/cancelled/completed), independent of the hotel `bookings` table.

### Transport
- `vehicles` — type enum (car/microbus/bus/van/minibus), registration number (unique), capacity, status, soft-deleted.
- `drivers` — optionally assigned to a vehicle.
- `transport_bookings` — pickup/dropoff/date/time/price, optionally linked back to a hotel `booking_id`.

### Commissions
- `commissions` — per-booking agent commission: percentage, amount, status (pending/approved/paid/cancelled), `paid_at`. Created automatically by the booking service when a booking has an `agent_id` and a non-zero effective commission percentage (see `booking-flow.md`).

### Notifications / audit / settings
- `notifications` — in-app notification feed per user, `channel` enum (email/in_app/sms/whatsapp) primarily used to record what channel a given notification was delivered on, `is_read` flag, `metadata` JSON.
- `email_logs` — a record of every email send attempt (template, subject, status, error), independent of whether it was sent via the console or SMTP provider.
- `audit_logs` — generic `(user_id, action, entity, entity_id, old_value, new_value, ip_address, user_agent)` trail, indexed on `(entity, entity_id)`, written by `services/auditService.js` for booking creation/cancellation and other sensitive actions.
- `settings` — a per-agency (or global, `agency_id = null`) key/value store (`value` is JSON), unique on `(agency_id, key)`. This is how `tax_rate_percent`, `default_commission_percent`, `cancellation_free_days`, `cancellation_partial_percent`, `cancellation_full_within_hours`, currency, timezone, etc. are made configurable instead of hard-coded — see `services/settingsService.js` for the full default set and the merge-with-global-fallback lookup.

## 2. Booking overlap prevention: design and tradeoff

The single most important invariant in this schema is: **two bookings can never hold the same room for overlapping dates while both are in a "blocking" status** (`held`, `confirmed`, or `checked_in` — see `BLOCKING_BOOKING_STATUSES` in `availabilityService.js`).

This is enforced with **application-level locking + a re-check inside the transaction**, not a database-level `EXCLUDE` constraint:

1. `createBooking` (`services/bookingService.js`) takes a Postgres **advisory transaction lock** per room, `pg_advisory_xact_lock(hashtextextended(room_id, 0))`, acquired in **sorted room-id order** so that any two transactions touching an overlapping set of rooms always acquire their locks in the same relative order and cannot deadlock each other.
2. Only after holding those locks does it **re-run the overlap query** (`existing.check_in < requested.check_out AND existing.check_out > requested.check_in` against `booking_rooms` joined to `bookings` in a blocking status). Any overlap raises a `ConflictError` (HTTP 409) and the whole transaction rolls back.
3. The advisory lock is released automatically when the transaction commits or rolls back (`_xact` locks are transaction-scoped).

This was a **deliberate simplicity/correctness tradeoff**, not an oversight:

- A database-level `EXCLUDE USING gist (room_id WITH =, daterange(check_in, check_out) WITH &&)` constraint would be a stronger, schema-enforced guarantee (it protects even against a future code path that forgets to take the advisory lock), but it requires the `btree_gist` extension, a `daterange`/`tstzrange` column (which means hand-written migration SQL and a custom column type), and careful handling of the booking `status` dimension (the exclusion needs to apply only to blocking statuses, which usually means a partial index/constraint or a trigger that only exercises the check for the relevant states).
- The advisory-lock approach uses only integer arithmetic already provided by an unextended Postgres 16 image (`hashtextextended` is built in), needs no extension, and works entirely from application code inside a normal database transaction — which keeps the whole booking write path in one place (`bookingService.js`) that is easy to read, test, and reason about.
- The two approaches give the **same effective guarantee** as long as every write path to `booking_rooms` goes through `createBooking`'s transaction (it is currently the only insertion path), which is true today.

This has been manually verified: firing two concurrent `POST /bookings` requests for the same room and overlapping dates reliably produces exactly one `201 Created` and one `409 Conflict` — the second request's transaction blocks on the advisory lock until the first commits, then re-checks overlap and sees the just-committed row.

**Future hardening**: if a second write path to `booking_rooms` is ever added outside `bookingService.js` (e.g. a bulk-import job), the schema-level `EXCLUDE` constraint (with `btree_gist`, a generated `daterange` column, and a `BEFORE INSERT/UPDATE` trigger scoped to blocking statuses, or a partial exclusion constraint using a boolean "is_blocking" generated column) should be added as defense in depth. It is documented here as the recommended next step rather than implemented now, to avoid the added migration/extension complexity until there is a second writer that needs the extra safety net.

## 3. Soft deletion

`deleted_at` (nullable `DateTime`) is present on: `users`, `hotels`, `room_types`, `rooms`, `customers`, `tour_packages`, `destinations`, `vehicles`. Deleting one of these rows in the application layer sets `deleted_at` rather than issuing a SQL `DELETE`, so:

- Historical bookings/invoices/commissions that reference a since-removed hotel, room, room type, customer, tour package, destination, or vehicle keep working and keep showing correct historical data.
- Queries that should exclude removed records filter on `deleted_at: null` explicitly (see `availabilityService.js`, which always filters rooms/room types by `deletedAt: null`).

Entities without a soft-delete column (e.g. `bookings`, `payments`, `invoices`, join tables) are never deleted at all in normal operation — a booking is cancelled via its `status`, not removed.

## 4. Money as NUMERIC/DECIMAL

Every monetary column (`price`, `subtotal`, `total_amount`, `commission_amount`, etc.) is PostgreSQL `NUMERIC(12,2)` (or `NUMERIC(5,2)` for `commissions.percentage`), declared as `numeric({ precision, scale })` in the schema. The driver returns those columns as strings, never as JS floats. Application code never does money arithmetic with native JS numbers either: `backend/src/utils/money.js` exports `decimal.js` as `Money`, plus small helpers (`sum`, `roundCurrency`, `toDecimal`). All pricing and booking calculations (`pricingService.js`, `bookingService.js`) construct and operate on `Money` instances and only call `.toString()` when writing a value back into a numeric column. This avoids floating-point rounding errors in prices, taxes, discounts, and commissions, per the project's explicit "never use floating point for money" rule.

## 5. Migrations

Migrations are managed with **drizzle-kit**, not hand-written SQL:

- `backend/src/db/schema.js` is the single source of truth for the schema. It is generated by `drizzle-kit pull` (`npm run db:pull`), which introspects the live database, so it reflects what is actually deployed rather than a hand translation.
- `npx drizzle-kit generate --name <description>` (locally) writes a new migration under `backend/src/db/migrations/` by diffing the schema against the recorded snapshot in `migrations/meta/`.
- `npm run db:migrate` (used in Docker, CI, and production) applies any pending migrations without generating new ones — the correct command for non-interactive environments. It runs `backend/src/db/migrate.js`, plain Node against `drizzle-orm`, so the production image needs no extra CLI.
- The first migration, `0000_married_bucky.sql`, is the full schema as introspected from a live database. Every table in this document exists in it, and a fresh database (CI, a new environment) is built entirely from it.
- A database that already has those tables is **baselined** instead: `migrate.js` records every journal entry as applied without executing it, so an environment created before the move to Drizzle adopts the ledger rather than failing on the first `CREATE TYPE`. Applied migrations are tracked in `drizzle.__drizzle_migrations`.
- Rollback is handled by writing a new forward migration that reverses the change (there are no automatic down-migrations); for a schema this size, "roll forward" is the supported and recommended workflow.

See `development.md` for the exact commands used to run and seed migrations locally, and `deployment.md` for how `npm run db:migrate` is run safely in production before traffic is shifted to a new backend version.
