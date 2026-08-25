# API

## 1. Conventions

- **Base path**: every route is mounted under `/api/v1` (`env.apiPrefix`, see `backend/src/app.js` and `backend/src/config/env.js`). For example the booking list endpoint is `GET /api/v1/bookings`.
- **Response envelope** (`backend/src/utils/apiResponse.js`):
  - Success: `{ "success": true, "data": <payload>, "message": "..." }`, optionally with a top-level `meta` object.
  - Failure: `{ "success": false, "message": "...", "errors": [...] }`. Errors are raised as one of the `AppError` subclasses in `utils/errors.js` (`NotFoundError` 404, `ValidationError` 422, `AuthenticationError` 401, `AuthorizationError` 403, `ConflictError` 409, `PaymentError` 402, `DatabaseError` 500) and turned into this shape by the central `errorHandler` middleware. Stack traces are never included in production responses.
  - Pagination: any list endpoint returns paginated results as `data: [...items], meta: { pagination: { page, limit, total, totalPages } }` (helper: `paginated()` in `apiResponse.js`).
- **Query parameters** for list endpoints follow a common shape, parsed by `utils/pagination.js`: `?page=1&limit=20&search=...&status=...` (plus resource-specific filters, e.g. a date range or hotel id). `page`/`limit` are clamped (`limit` capped at 100, defaulting to 20) so a client can never request an unbounded result set.
- **Content type**: JSON request/response bodies; `express.json({ limit: '2mb' })` and `express.urlencoded({ extended: true, limit: '2mb' })` cap request body size.
- **Validation**: request `body`/`params`/`query` are validated with `zod` schemas via the `validate({ body, params, query })` middleware (`middleware/validate.js`) before a controller ever runs; a failing schema short-circuits with a 422 and a list of field errors.

## 2. Authentication flow

- Auth is JWT-based with a short-lived **access token** and a longer-lived **refresh token**:
  - The access token is returned in the login/refresh response body and must be sent by the client as `Authorization: Bearer <token>` on every subsequent request. Default lifetime `JWT_EXPIRES_IN=15m`.
  - The refresh token is issued as an **httpOnly cookie** (not accessible to client-side JS) so a stolen access token alone cannot be replayed indefinitely; default lifetime `JWT_REFRESH_EXPIRES_IN=7d`. Its hash (not the raw token) is stored on the `users.refresh_token_hash` column so a compromised database dump cannot be used to forge sessions.
  - `POST /api/v1/auth/refresh` exchanges a valid refresh cookie for a new access token.
  - `middleware/auth.js`'s `authenticate` guard verifies the access token (via the `JwtService` wrapper around `jsonwebtoken`) on every protected route and populates `req.user` with the user id, roles, and resolved permission set used by `requirePermission(...)` (see `architecture.md` section 5 for the RBAC model, including the Super Admin bypass).
- All `/auth/*` endpoints (see table below) are public except `/auth/logout`, `/auth/change-password`, and `/auth/me`, which require a valid access token. Login/register/password-reset endpoints are additionally rate-limited (`authLimiter`) to slow down credential-stuffing/brute-force attempts.

## 3. Swagger / OpenAPI

Interactive API documentation is generated at boot from `@openapi` JSDoc comments in the route files (`backend/src/config/swagger.js`, using `swagger-jsdoc`) and served at:

```
http://localhost:4000/api-docs
```

This is only mounted when `NODE_ENV !== 'production'` (see `app.js`) — it is a development/staging aid, not a production-exposed surface. As more route modules are implemented, add `@openapi` blocks following the existing examples in `auth.routes.js`, `bookings.routes.js`, `availability.routes.js`, and `health.routes.js` so the generated spec stays in sync with this document.

## 4. Route map

This table is derived directly from `backend/src/routes/index.js` and the individual `*.routes.js` files, not guessed. The mount prefix column is relative to `/api/v1`.

| Mount prefix | Resource | Status |
|---|---|---|
| `/health` | Liveness / DB / Redis checks | Implemented |
| `/auth` | Authentication | Implemented |
| `/users` | User management | Implemented |
| `/roles` | Roles & permissions | Implemented |
| `/hotels` | Hotel management | Implemented |
| `/room-types` | Room types (+ images, amenities, rates sub-resources) | Implemented |
| `/rooms/availability` | Availability search | Implemented |
| `/rooms` | Room management | Implemented |
| `/amenities` | Amenities | Implemented |
| `/rate-plans` | Rate plans / room rates | Implemented |
| `/bookings` | Bookings | Implemented |
| `/customers` | Customer management (+ booking/payment history, documents) | Implemented |
| `/services` | Extra services catalog | Implemented |
| `/payments` | Payments | Implemented |
| `/refunds` | Refunds | Implemented |
| `/invoices` | Invoices (+ PDF) | Implemented |
| `/destinations` | Destinations | Implemented |
| `/tours` | Tour packages, itineraries, images, tour bookings | Implemented |
| `/transport` | Vehicles / drivers / transport bookings | Implemented |
| `/commissions` | Agent commissions | Implemented |
| `/reports` | Reporting, CSV export, audit log | Implemented |
| `/dashboard` | Dashboard summary cards & charts | Implemented |
| `/notifications` | In-app notifications | Implemented |
| `/settings` | Agency settings | Implemented |
| `/uploads` | File uploads | Implemented |

Every mounted resource has real handlers as of this writing — none of the route files still contain the `// TODO: implement <resource> endpoints` placeholder. Route modules were being implemented incrementally by other workstreams in parallel with this document, so re-check the route files under `backend/src/routes/` for the current state before relying on this table long after it was written.

Note `/rooms/availability` is intentionally mounted **before** `/rooms` in `routes/index.js` so the more specific path is matched first. Similarly, within `tours.routes.js`, the literal `/bookings` and `/bookings/:id` routes are registered before the generic `/:id` tour-package routes so they are not shadowed by it.

### Endpoints, in full

**Auth** (`/auth`, public unless noted)
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | Rate-limited. Creates a customer account. |
| POST | `/auth/login` | Rate-limited. Returns access token + sets refresh cookie. |
| POST | `/auth/refresh` | Exchanges refresh cookie for a new access token. |
| POST | `/auth/logout` | Requires auth. |
| POST | `/auth/forgot-password` | Rate-limited. |
| POST | `/auth/reset-password` | Rate-limited. |
| POST | `/auth/verify-email` | |
| POST | `/auth/change-password` | Requires auth. |
| GET | `/auth/me` | Requires auth. Returns the current user profile + roles. |

**Users** (`/users`, all require auth + permission)
| Method | Path | Permission |
|---|---|---|
| GET | `/users` | `users.view` (paginated: `page`, `limit`, `search`) |
| POST | `/users` | `users.create` |
| GET | `/users/:id` | `users.view` |
| PUT | `/users/:id` | `users.update` |
| DELETE | `/users/:id` | `users.delete` |

**Roles** (`/roles`, all require auth + permission)
| Method | Path | Permission |
|---|---|---|
| GET | `/roles` | `roles.view` |
| GET | `/roles/permissions` | `roles.view` — lists every permission in the system |
| POST | `/roles` | `roles.create` |
| PUT | `/roles/:id/permissions` | `roles.update` — replaces a role's permission set |

**Availability** (`/rooms/availability`, public)
| Method | Path | Notes |
|---|---|---|
| GET | `/rooms/availability` | Query: `destination`, `hotelId`, `checkIn`, `checkOut`, `adults`, `children`, `roomsRequested`, `roomTypeId`, `starRating`, `amenityIds`. Returns hotels with only the room types that actually have enough free rooms for the requested dates/party size. |

**Bookings** (`/bookings`, all require auth)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/bookings` | `bookings.view` | Paginated, filterable list. For a `Customer`-role caller, always scoped to their own bookings server-side — any `customerId` query filter they pass is ignored and overridden. |
| POST | `/bookings` | `bookings.create` | Rate-limited (`bookingLimiter`). Creates a `held` (or `confirmed`, staff-only) booking — see `booking-flow.md`. Each `rooms[]` entry takes `roomId` (a specific room) or `roomTypeId` (server auto-assigns an available room of that type). `customerId` is required for a staff/agent caller and ignored/resolved server-side for a `Customer` caller. |
| GET | `/bookings/:id` | *(none — any authenticated user)* | A `Customer`-role caller gets `403` unless the booking belongs to them. |
| POST | `/bookings/:id/cancel` | `bookings.cancel` | Applies the cancellation-fee policy. |
| POST | `/bookings/:id/confirm` | `bookings.confirm` | Moves `held`/`pending` -> `confirmed` (e.g. on payment success). |
| POST | `/bookings/:id/check-in` | `bookings.checkin` | Moves `confirmed` -> `checked_in`, occupies the rooms. |
| POST | `/bookings/:id/check-out` | `bookings.checkout` | Moves `checked_in` -> `checked_out`, frees the rooms. |

**Hotels** (`/hotels`; list/detail are public, mutations require auth + permission)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/hotels` | *(public)* | Paginated; filter by search/city/country/starRating/status. |
| POST | `/hotels` | `hotels.create` | |
| GET | `/hotels/:id` | *(public)* | Customer-facing detail. |
| PUT | `/hotels/:id` | `hotels.update` | |
| DELETE | `/hotels/:id` | `hotels.delete` | Soft delete. |
| POST | `/hotels/:id/images` | `hotels.update` | |
| DELETE | `/hotels/:id/images/:imageId` | `hotels.update` | |
| POST | `/hotels/:id/amenities` | `hotels.update` | Assign a single amenity. |
| PUT | `/hotels/:id/amenities` | `hotels.update` | Bulk-replace the hotel's full amenity set (body: `{ amenityIds: [] }`) — what the admin Hotel form actually uses. |
| DELETE | `/hotels/:id/amenities/:amenityId` | `hotels.update` | |

**Room types** (`/room-types`; list/detail public, mutations require auth + permission)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/room-types` | *(public)* | Filter by `hotelId`/search. |
| POST | `/room-types` | `room_types.create` | |
| GET | `/room-types/:id` | *(public)* | |
| PUT | `/room-types/:id` | `room_types.update` | |
| DELETE | `/room-types/:id` | `room_types.delete` | Soft delete. |
| POST/DELETE | `/room-types/:id/images[/:imageId]` | `room_types.update` | |
| POST/DELETE | `/room-types/:id/amenities[/:amenityId]` | `room_types.update` | Assign/unassign a single amenity. |
| PUT | `/room-types/:id/amenities` | `room_types.update` | Bulk-replace the room type's full amenity set (body: `{ amenityIds: [] }`) — what the admin Room Type form actually uses. |
| GET | `/room-types/:id/rates` | `rate_plans.view` | Rates configured for this room type. |
| POST | `/room-types/:id/rates` | `rate_plans.create` | |

**Rooms** (`/rooms`, all require auth)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/rooms` | `rooms.view` | Filter by `hotelId`/`roomTypeId`/`status`/search. |
| POST | `/rooms` | `rooms.create` | |
| GET | `/rooms/:id` | `rooms.view` | |
| PUT | `/rooms/:id` | `rooms.update` | Moving to maintenance/inactive is blocked if the room has an active booking. |
| DELETE | `/rooms/:id` | `rooms.delete` | Soft delete; blocked if the room has an active booking. |

**Amenities** (`/amenities`, all require auth) — standard `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id` guarded by `amenities.view`/`.create`/`.update`/`.delete`.

**Rate plans** (`/rate-plans`, all require auth)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/rate-plans` | `rate_plans.view` | Filter by type/search. |
| POST | `/rate-plans` | `rate_plans.create` | |
| GET/PUT/DELETE | `/rate-plans/:id` | `rate_plans.view`/`.update`/`.delete` | |
| GET/PUT/DELETE | `/rate-plans/rates/:rateId` | `rate_plans.view`/`.update`/`.delete` | Direct access to a single `room_rates` row. |

**Customers** (`/customers`, all require auth)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/customers/me` | *(none — any authenticated user)* | Self-service: the logged-in user's own `Customer` profile. Registered before `/:id` so `"me"` is never parsed as a uuid. |
| PUT | `/customers/me` | *(none — any authenticated user)* | Self-service profile update — lets a `Customer`-role user edit their own profile without the admin `customers.update` permission. |
| GET | `/customers` | `customers.view` | Paginated, searchable. |
| POST | `/customers` | `customers.create` | |
| GET/PUT/DELETE | `/customers/:id` | `customers.view`/`.update`/`.delete` | |
| GET | `/customers/:id/bookings` | `customers.view` | Hotel booking history. |
| GET | `/customers/:id/payments` | `customers.view` | Payment history. |
| GET | `/customers/:id/documents` | `customers.view` | Document metadata (file storage lives in `/uploads`). |
| POST/DELETE | `/customers/:id/documents[/:documentId]` | `customers.update` | |

**Services** (`/services`) — `GET /` and `GET /:id` are **public** (no auth), the same way `/hotels` and `/room-types` are, so the customer-facing checkout's "Additional Services" step can list the catalog before the user is signed in. `POST /`, `PUT /:id`, `DELETE /:id` require auth + `services.create`/`.update`/`.delete`. This is the extras catalog (airport pickup, breakfast, extra bed, etc.) attached to bookings via `booking_services`.

**Payments** (`/payments`, all require auth)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/payments` | `payments.view` | Paginated, filterable. A `Customer`-role caller is always scoped to payments on their own bookings. |
| POST | `/payments` | `payments.create` | Rate-limited (`bookingLimiter`). Records a payment against a booking via the payment gateway abstraction (`integrations/payment/paymentGateway.js`). A `Customer`-role caller gets `404` if `bookingId` isn't their own booking. |
| GET | `/payments/:id` | `payments.view` | A `Customer`-role caller gets `403` unless the payment is against their own booking. |

**Refunds** (`/refunds`, all require auth)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/refunds` | `payments.view` | |
| POST | `/refunds` | `payments.refund` | Refund part or all of a payment. |
| GET | `/refunds/:id` | `payments.view` | |

**Invoices** (`/invoices`, all require auth)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/invoices` | `invoices.view` | A `Customer`-role caller is always scoped to invoices for their own bookings. |
| POST | `/invoices` | `invoices.create` | Generates an invoice from a booking's stored amounts. |
| GET | `/invoices/:id` | `invoices.view` | A `Customer`-role caller gets `403` unless the invoice is for their own booking. |
| GET | `/invoices/:id/pdf` | `invoices.view` | Same ownership check as above. |
| GET | `/invoices/:id/pdf` | `invoices.view` | Downloadable PDF (via the `PdfGenerator`/`pdfkit` wrapper). |

**Destinations** (`/destinations`; list/detail public, mutations require auth + permission) — `GET /`, `GET /:id` public; `POST /`, `PUT /:id`, `DELETE /:id` guarded by `destinations.create`/`.update`/`.delete`.

**Tours** (`/tours`; catalog reads public, mutations require auth + permission)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/tours` | *(public)* | Tour package catalog. |
| POST | `/tours` | `tours.create` | |
| GET/PUT/DELETE | `/tours/:id` | *(public)* / `tours.update` / `.delete` | |
| GET/POST/PUT/DELETE | `/tours/:tourId/itinerary[/:day]` | *(public read)* / `tours.update`/`.delete` | Day-by-day itinerary sub-resource. |
| GET/POST/PUT/DELETE | `/tours/:tourId/images[/:imageId]` | *(public read)* / `tours.update`/`.delete` | |
| GET | `/tours/bookings` | `tour_bookings.view` | Registered before `/:id` so it isn't shadowed by the generic tour-package route. |
| POST | `/tours/bookings` | `tour_bookings.create` | |
| GET | `/tours/bookings/:id` | *(any authenticated user)* | |
| POST | `/tours/bookings/:id/cancel` | `tour_bookings.update` | |

**Transport** (`/transport`, all require auth)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET/POST | `/transport/vehicles` | `transport.view`/`.create` | |
| GET/PUT/DELETE | `/transport/vehicles/:id` | `transport.view`/`.update`/`.delete` | |
| GET/POST | `/transport/drivers` | `transport.view`/`.create` | |
| GET/PUT/DELETE | `/transport/drivers/:id` | `transport.view`/`.update`/`.delete` | |
| GET/POST | `/transport/bookings` | `transport.view`/`.create` | |
| GET/PUT/DELETE | `/transport/bookings/:id` | `transport.view`/`.update`/`.delete` | |

**Commissions** (`/commissions`, all require auth)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/commissions` | `commissions.view` | Filterable by agent/status/date. |
| POST | `/commissions` | `commissions.create` | Manual adjustments — normally auto-created on booking (see `booking-flow.md`). |
| GET | `/commissions/:id` | `commissions.view` | |
| PATCH | `/commissions/:id/status` | `commissions.update` | |

**Reports** (`/reports`, all require auth)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/reports/audit-logs` | `audit_logs.view` | Filter by entity, entityId, userId, dateFrom/dateTo. Registered before `/:reportName` so it isn't captured by that param route. |
| GET | `/reports/:reportName/export` | `reports.export` | CSV export. |
| GET | `/reports/:reportName` | `reports.view` | Paginated tabular report — bookings, occupancy, revenue, customers, payments, refunds, commissions, hotels, tours, destinations. |

**Dashboard** (`/dashboard`, requires auth)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/dashboard` | `dashboard.view` | Role-aware summary (admin/hotel/agent view, selected via `?view=`). |

**Notifications** (`/notifications`, all require auth)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/notifications` | `notifications.view` | The caller's own notifications, paginated. |
| PATCH | `/notifications/read-all` | *(auth only)* | |
| PATCH | `/notifications/:id/read` | *(auth only)* | |

**Settings** (`/settings`, all require auth)
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/settings` | `settings.view` | Agency settings merged with system defaults (see `settingsService.js`). |
| PUT | `/settings` | `settings.update` | Updates one or more settings. |

**Health** (`/health`, public)
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Process liveness only. |
| GET | `/health/db` | Round-trips a query through Prisma. |
| GET | `/health/redis` | Pings Redis. |

**Uploads** (`/uploads`, requires auth)
| Method | Path | Permission | Notes |
|---|---|---|---|
| POST | `/uploads/:category` | `uploads.create` | Multipart file upload (`multer`-backed, via the `FileUploadHandler` wrapper in `lib/`). `category` is e.g. `hotels`, `rooms`, `documents`, `passports`, `invoices`. Returns a stored file URL, behind the `FILE_STORAGE_DRIVER=local|s3` abstraction described in `architecture.md`. Used by the hotel/room-type image and customer-document endpoints above. |
