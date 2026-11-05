# Architecture

## 1. Overview

The system is a Travel Agency + Hotel Booking Management System built as a **single Next.js application** (`nextapp/`) that is both the frontend and the API server. There is no separate backend process: a former standalone Express API was merged into this app as Next.js Route Handlers, running in the same Node.js process as the UI.

```
Browser (admin / customer)
        |
        v
   nginx (reverse proxy: everything -> the app container, port 5173)
        |
        v
   Next.js app (App Router: pages + /api/v1/* route handlers, one process)
        |
        +--> PostgreSQL (system of record)
        +--> Redis (cache / rate limiting support)
        +--> SMTP / console (email)
        +--> S3 / local disk (file storage, served at /uploads/:path*)
        +--> payment gateway adapter (mock | stripe | paypal | bkash | nagad)
```

## 2. Technology stack

- Node.js 20 LTS, plain JavaScript (ES Modules, no TypeScript)
- Next.js 16 (App Router) for routing (both pages and the API), dev server and production build (`output: 'standalone'`)
- React 19 for the UI. File-based routing under `src/app`. The root layout is a **server component**: it reads the access token from an httpOnly cookie and resolves the session in-process via `src/lib/session.js` (no HTTP hop — session resolution calls the auth logic directly, since it now runs in the same process as the route handlers), passing it into a small client `SessionProvider`. So the first paint already knows who is signed in — no bootstrap request and no signed-out flash
- `middleware.js` gates protected routes before any page JS is sent, and owns token refresh: the access cookie expires with its 15-minute JWT, and only middleware (not a server component) can write the replacement cookie. Middleware runs on Next's **Edge runtime**, which cannot import the Node-only Drizzle/pg stack, so it still makes one HTTP call — to this same server's own `/api/v1/auth/refresh` — instead of importing session logic directly. The refreshed token is applied to the *request* as well as the response, so the render that triggered the refresh already sees the session
- **No client-side store.** Session state is resolved per request on the server. Interactive leaves (forms, wizards, pickers) stay client components, which is what they should be
- Drizzle ORM (`drizzle-orm` + the `drizzle-kit` CLI) against PostgreSQL — the single chosen data-access layer for the whole project, accessed through the `DrizzleClient` wrapper class (`src/server/lib/DrizzleClient.js`); `src/server/db/index.js` is a thin re-export of it
- Redis via `ioredis`, wrapped by `RedisClient`
- Axios (wrapped by `ApiClient`) for browser-side HTTP calls to the app's own `/api/v1/*` routes
- `zod` for request validation, `jsonwebtoken` for JWT (wrapped by `JwtService`), `bcrypt` for password hashing (wrapped by `BcryptHasher`), `pino` for structured logging (wrapped by `Logger`), `pdfkit` for invoice PDFs (wrapped by `PdfBuilder`), `aws-sdk` for S3 (wrapped by `S3Client`), `nodemailer` for SMTP (wrapped by `MailTransport`)
- Vitest + Testing Library for all tests — component tests and route-handler integration tests alike

**Database**
- PostgreSQL 16, accessed only through Drizzle (via `DrizzleClient`). Migrations are generated with `drizzle-kit generate` and applied by `src/server/db/migrate.js` (`npm run db:migrate`).

**Infrastructure**
- Docker multi-stage build for the one app image, Docker Compose for local development
- GitHub Actions for CI and CD
- A single AWS EC2 instance running Docker Compose for production, with the image on GHCR — see `deployment.md`

## 3. Layered architecture

Every API request flows through a fixed sequence of layers. Business logic is never placed directly in a route handler:

```
Route Handler   defines the URL/method (src/app/api/v1/<resource>/route.js), parses the request,
                enforces auth/RBAC/validation, calls the service layer, shapes the HTTP response
  -> Service    business rules, transactions, orchestration (src/server/services/*.js)
  -> Repository data access for the handful of domains that warrant one on top of Drizzle
                (src/server/repositories/*.js)
  -> Database   PostgreSQL via the DrizzleClient wrapper (src/server/db/index.js)
```

Notes on how this is applied in practice:

- **Route Handlers** (`src/app/api/v1/<resource>/route.js` — 94 files across 26 domains: auth, hotels, rooms, room-types, rate-plans, amenities, availability, bookings, users, roles, customers, commissions, activity-logs, notifications, settings, tours, transport, services, destinations, dashboard, health, invoices, refunds, reports, payments, uploads) export the HTTP method functions Next expects (`GET`, `POST`, `PUT`, `DELETE`, ...). Each one authenticates the caller, checks the required permission, validates the request body/query with a `zod` schema, and then calls **only** the service layer — this was a hard rule throughout the port from Express: no route handler touches a repository or Drizzle directly. Shared plumbing (auth/RBAC checks, `zod` validation, error-to-response mapping, the response envelope) lives in `src/server/lib/apiHandler.js`, `apiResponse.js`, `parseRequest.js`, and `authCookies.js`.
- **Service** functions (`src/server/services/*.js`) contain the actual business rules — availability checks, pricing, booking state transitions, settings resolution, auditing — and are the only layer allowed to open a database transaction. Services are plain functions, not classes, and are unit-testable independent of Next.
- **Repository** functions (`src/server/repositories/*.js`) isolate Drizzle queries behind a narrow function set, one module per domain; a service that needs a transaction spanning several tables opens it directly with `db.transaction`.
- **Database** access always goes through the shared `DrizzleClient` wrapper (`src/server/db/index.js`); no module outside the services/repositories layer touches it directly.
- **Uploaded files** are served by `src/app/uploads/[...path]/route.js` — the same `/uploads/:path*` URL shape the old Express static file server used.
- **The hold-expiry background sweeper** starts from `nextapp/instrumentation.js`, Next's supported hook for one-time startup code in a long-running server (this app deploys as a persistent Docker container, not serverless, so `register()` runs exactly once per process). It replaces the `startBookingHoldSweeper()` call that used to live in Express's `server.js`. `register()` is guarded to the Node runtime (`process.env.NEXT_RUNTIME !== 'nodejs'` short-circuits it), because it also fires for the Edge runtime (`middleware.js`), which cannot import the job's Drizzle/pg dependencies and would otherwise start a duplicate sweeper.

Cross-cutting infrastructure required by section 4 of the original spec is all present: security headers, CORS (env-configured allow-list), rate limiting (`src/server/lib/rateLimit.js`), centralized error handling (`AppError` subclasses mapped to the response envelope), and structured logging via the `Logger` wrapper around `pino`.

## 4. The `lib/` wrapper-class convention

Every external npm package that talks to the outside world or provides a cross-cutting capability is wrapped in a small class under `nextapp/src/server/lib/<Name>.js` (and the equivalent `nextapp/src/lib/ApiClient.js` on the browser side):

| Wrapper | Wraps | Location |
|---|---|---|
| `DrizzleClient` | `drizzle-orm` + `pg` | `nextapp/src/server/lib/DrizzleClient.js` |
| `BcryptHasher` | `bcrypt` | `nextapp/src/server/lib/BcryptHasher.js` |
| `JwtService` | `jsonwebtoken` | `nextapp/src/server/lib/JwtService.js` |
| `RedisClient` | `ioredis` | `nextapp/src/server/lib/RedisClient.js` |
| `MailTransport` | `nodemailer` | `nextapp/src/server/lib/MailTransport.js` |
| `Logger` | `pino` | `nextapp/src/server/lib/Logger.js` |
| `PdfBuilder` | `pdfkit` | `nextapp/src/server/lib/PdfBuilder.js` |
| `S3Client` | `aws-sdk` | `nextapp/src/server/lib/S3Client.js` |
| `FileUploadHandler` | multipart upload parsing | `nextapp/src/server/lib/FileUploadHandler.js` |
| `ApiClient` | `axios` | `nextapp/src/lib/ApiClient.js` |

The rest of the application imports and depends only on these wrapper classes — never on `bcrypt`, `jsonwebtoken`, `ioredis`, `nodemailer`, `pino`, `drizzle-orm`/`pg`, or `axios` directly (the only sanctioned exception is the wrapper file itself). Additional libraries brought in as new features are implemented are expected to follow the same pattern and get their own wrapper class.

Why this convention exists:

1. **Swappability** — replacing `bcrypt` with `argon2`, or `nodemailer` with a different transport, or `axios` with `fetch`, means editing one file instead of hunting down every call site across the codebase.
2. **Single point of change** — cross-cutting concerns (retry policy, logging, default options, error normalization) are configured once, in the wrapper's constructor/methods, instead of being duplicated at every call site.
3. **Easier testing** — application code depends on a small class with a handful of methods, which is trivial to mock in unit tests, instead of mocking a large third-party API surface.

## 5. RBAC model

Authorization is modeled as a classic many-to-many graph, stored in PostgreSQL and evaluated on every authenticated request:

```
User --(user_roles)--> Role --(role_permissions)--> Permission
```

- `roles` — the 7 fixed roles: Super Admin, Agency Admin, Hotel Admin, Booking Agent, Accountant, Tour Manager, Customer (see `nextapp/src/server/config/permissions.js`, `ROLES`).
- `permissions` — a flat, granular list such as `bookings.create`, `hotels.update`, `payments.refund` (see `PERMISSIONS` in the same file).
- `user_roles` — join table, a user can hold more than one role.
- `role_permissions` — join table, a role can hold many permissions.

At login, the session resolution logic works out a user's roles and the union of their permissions and attaches both to the resolved session. Route handlers guard access with a `requirePermission('bookings.create')`-style check (or an array, matched with OR semantics). **Super Admin is a special case: it bypasses every permission check**, rather than being granted every permission row explicitly — this keeps Super Admin correct even as new permissions are added later without a seed/migration to update its grant set. Every other role's default permission set is seeded from `ROLE_PERMISSIONS` in `permissions.js` (see `database.md` and `nextapp/src/server/seeds/index.js`).

## 6. Notification / email / payment provider abstractions

Following the "never hard-code an external provider" rule, three integration points are built as small pluggable adapters under `nextapp/src/server/integrations/`, each selected by an environment variable so the system stays fully runnable in local development with zero external accounts:

- **Email** (`integrations/email/providers/`) — `consoleProvider.js` (default in development: logs the email instead of sending it) and `smtpProvider.js` (real SMTP via the `MailTransport` wrapper), selected by `EMAIL_PROVIDER=console|smtp`. Templates live in `integrations/email/emailTemplates.js` and are rendered by `services/emailService.js`.
- **SMS / WhatsApp** (`integrations/sms/smsProvider.js`, `integrations/whatsapp/whatsappProvider.js`) — same provider-selection shape as email: `SMS_PROVIDER`/`WHATSAPP_PROVIDER` pick between `none` (channel disabled, returns `{ skipped: true }` — the default) and `console` (development provider that logs the message instead of sending it, so the channel is exercisable locally). Wiring in Twilio, Vonage, the Meta Cloud API, or a local Bangladesh gateway is a one-file change that adds a `case` and a provider factory; no caller changes.
- **Payment gateways** (`integrations/payment/`) — `resolvePaymentGateway(name)` returns an adapter shaped `{ name, async charge({ amount, currency, method, metadata }) }`, selected by `PAYMENT_GATEWAY` or per-request `gateway`. Each provider is its own class in `providers/` extending the `PaymentGateway` base:

  | Gateway | Flow | Notes |
  |---|---|---|
  | `MockGateway` | one call, always succeeds | default; no credentials; what CI runs |
  | `StripeGateway` | PaymentIntent create + confirm | official SDK; 3-D Secure is reported, never auto-completed |
  | `PayPalGateway` | create order → approve → capture | Orders v2 |
  | `BkashGateway` | create → approve → execute | tokenized checkout; BDT only |
  | `NagadGateway` | initialize → approve → verify | RSA-signed and -encrypted; BDT only |

  A declined or unfinished charge **resolves** with `success: false` (paymentService records a `failed` Payment row either way); throwing is reserved for a misconfigured gateway, which is an operator error rather than a customer outcome. The three wallet gateways cannot complete in one server call — the payer must approve on the provider's page — so their first call returns `raw.requiresApproval` with the redirect URL, and a second call carrying the provider's payment id completes it. Amount conversion is centralised in `toMinorUnits()`, which knows the zero-decimal currencies (JPY, KRW, …) that must not be multiplied by 100.
- **Notifications** (`notifications/notificationService.js`) — `notify(...)` is the single fan-out point for every business event (booking created, cancelled, etc.): it always writes an in-app `Notification` row, and optionally sends an email when an `emailTemplate` is supplied. SMS/WhatsApp dispatch (`notifySms`, `notifyWhatsapp`) is wired through the same module for a consistent call shape, and resolves to whichever provider the env selects.

All four abstractions share the same shape: a small resolver function keyed off an environment variable, a development-safe default that requires no external account, and a documented extension point for a real provider.

## 7. Folder structure

The repository uses a single top-level application folder, **lowercase** `nextapp/` — this matches the Node/JS ecosystem convention and every import path, Docker build context, and CI working directory in this repo.

```
/
├── nextapp/
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/v1/        # Route Handlers, one route.js per endpoint, 26 resource folders
│   │   │   ├── uploads/       # [...path]/route.js — serves uploaded files
│   │   │   └── ...            # page routes: layouts, page.jsx, auth/permission gates
│   │   ├── components/        # reusable UI primitives (buttons, tables, modals, ...)
│   │   ├── layouts/           # admin shell, customer shell
│   │   ├── views/             # the page components those routes render
│   │   ├── hooks/
│   │   ├── contexts/          # auth context, etc.
│   │   ├── utils/
│   │   ├── constants/
│   │   ├── styles/
│   │   ├── lib/                # ApiClient wrapper around axios, session.js (server-side session resolution)
│   │   ├── middleware.js       # route gating + token refresh at the Edge
│   │   ├── server/             # Node-only API/data layer, imported only by route handlers
│   │   │   ├── config/         # env, permissions
│   │   │   ├── db/             # thin re-export of DrizzleClient, schema.js, relations.js, migrations/
│   │   │   ├── services/       # business logic and transactions
│   │   │   ├── repositories/   # narrow data-access modules on top of Drizzle
│   │   │   ├── validators/     # zod schemas
│   │   │   ├── utils/          # errors, money, pagination, apiResponse, bookingNumber
│   │   │   ├── jobs/           # background jobs (hold-expiry sweeper)
│   │   │   ├── integrations/   # pluggable external providers (email/sms/whatsapp/payment)
│   │   │   ├── notifications/  # notification fan-out service
│   │   │   ├── lib/            # wrapper classes around every external npm library
│   │   │   └── seeds/          # database seed script
│   │   └── tests/              # Vitest suites: component tests + api/ route-handler integration tests, helpers/
│   ├── instrumentation.js      # Next startup hook — starts the hold-expiry sweeper
│   ├── public/
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── _deploy.yml
│   │   ├── staging.yml
│   │   └── production.yml
│   └── scripts/
│       └── smoke.sh
│
├── documentation/
│   ├── architecture.md
│   ├── database.md
│   ├── api.md
│   ├── booking-flow.md
│   ├── development.md
│   └── deployment.md
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

No extra top-level folders (`database/`, `server/`, `client/`, `api/`, `infra/`, `devops/`) exist at the repo root — infrastructure configuration stays at the repo root or under `.github/`, exactly as required.
</content>
