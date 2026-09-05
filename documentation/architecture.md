# Architecture

## 1. Overview

The system is a Travel Agency + Hotel Booking Management System composed of two independently deployable applications sharing one PostgreSQL database:

- **backend** — a REST API (Node.js + Express) that owns all business logic, data access, authentication, and background jobs.
- **frontend** — a React single-page application (admin console + customer-facing booking site) that talks to the backend exclusively over HTTP.

Both applications live in one repository so they can be versioned, tested, and deployed together, but they do not share code or a runtime process.

```
Browser (admin / customer)
        |
        v
   nginx (reverse proxy: /api/* -> backend, everything else -> frontend)
   frontend (Next.js App Router)
        |  HTTPS, /api/v1/*
        v
   backend (Express API)
        |
        +--> PostgreSQL (system of record)
        +--> Redis (cache / rate limiting support)
        +--> SMTP / console (email)
        +--> S3 / local disk (file storage)
        +--> payment gateway adapter (mock | stripe | paypal | bkash | nagad)
```

## 2. Technology stack

**Backend**
- Node.js 20 LTS, plain JavaScript (ES Modules, no TypeScript, no build step — `node --watch` in dev, `node src/server.js` in production)
- Express 4 for HTTP routing and middleware
- Drizzle ORM (`drizzle-orm` + the `drizzle-kit` CLI) against PostgreSQL — the single chosen data-access layer for the whole project (per the "choose one ORM" instruction)
- Redis via `ioredis`, wrapped by `RedisClient`
- `zod` for request validation, `jsonwebtoken` for JWT, `bcrypt` for password hashing, `pino`/`pino-http` for structured logging, `swagger-jsdoc` + `swagger-ui-express` for API docs, `pdfkit` for invoice PDFs, `multer` for uploads, `aws-sdk` for S3, `nodemailer` for SMTP
- Jest + Supertest for backend tests

**Frontend**
- React 18, plain JavaScript (no TypeScript)
- Next.js 16 (App Router) for routing, dev server and production build
- File-based routing under `src/app`. The root layout is a **server component**: it reads the access token from an httpOnly cookie, resolves the session against `GET /auth/me`, and passes it into a small client `SessionProvider`. So the first paint already knows who is signed in — no bootstrap request and no signed-out flash
- `middleware.js` gates protected routes before any page JS is sent, and owns token refresh: the access cookie expires with its 15-minute JWT, and only middleware (not a server component) can write the replacement cookie. The refreshed token is applied to the *request* as well as the response, so the render that triggered the refresh already sees the session
- **No client-side store.** Session state was a Redux slice holding `{ user, isLoading }`; the server now resolves it per request. Interactive leaves (forms, wizards, pickers) stay client components, which is what they should be
- Axios (wrapped by `ApiClient`) for HTTP calls
- Vitest + Testing Library for tests

**Database**
- PostgreSQL 16, accessed only through Drizzle. Migrations are generated with `drizzle-kit generate` and applied by `src/db/migrate.js` (`npm run db:migrate`).

**Infrastructure**
- Docker multi-stage builds for both apps, Docker Compose for local development
- GitHub Actions for CI and CD
- A single AWS EC2 instance running Docker Compose for production, with images on GHCR — see `deployment.md`

## 3. Backend layered architecture

Every request flows through a fixed sequence of layers. Business logic is never placed directly in a controller or a route file:

```
Route            defines the URL/method and wires middleware (routes/*.routes.js)
  -> Middleware  cross-cutting concerns: auth, RBAC, validation, rate limiting
  -> Controller  translates HTTP <-> service calls, no business logic (controllers/*.js)
  -> Service     business rules, transactions, orchestration (services/*.js)
  -> Repository  data access for the handful of domains that warrant one on top of Drizzle (repositories/*.js)
  -> Database    PostgreSQL via the Drizzle client (src/db/index.js)
```

Notes on how this is applied in practice:

- **Route** files (`src/routes/*.routes.js`) only declare `router.get/post/put/delete(...)` and attach the middleware chain (`authenticate`, `requirePermission(...)`, `validate({...})`). They are mounted under a common prefix in `src/routes/index.js`.
- **Middleware** (`src/middleware/`) handles authentication (`auth.js`), authorization (`rbac.js`), input validation (`validate.js`, backed by `zod` schemas in `src/validators/`), rate limiting (`rateLimiter.js`), request logging (`requestLogger.js`), and centralized error translation (`errorHandler.js`).
- **Controller** functions (`src/controllers/*.js`) parse `req`, call one or more service functions, and shape the HTTP response using the shared envelope helpers in `src/utils/apiResponse.js`.
- **Service** functions (`src/services/*.js`) contain the actual business rules — availability checks, pricing, booking state transitions, settings resolution, auditing — and are the only layer allowed to open a database transaction. Services are plain functions, not classes, and are unit-testable independent of Express.
- **Repository** functions (`src/repositories/*.js`) isolate Drizzle queries behind a narrow function set, one module per domain; a service that needs a transaction spanning several tables opens it directly with `db.transaction`.
- **Database** access always goes through the shared Drizzle client (`src/db/index.js`); no module outside the services/repositories layer touches it directly.

Cross-cutting infrastructure required by section 4 of the original spec is all present: Helmet, CORS (env-configured allow-list), `express-rate-limit`, centralized error handling (`AppError` subclasses + `errorHandler.js`), graceful shutdown on `SIGTERM`/`SIGINT` in `server.js`, and structured logging via the `Logger` wrapper around `pino`.

## 4. The `lib/` wrapper-class convention

Every external npm package that talks to the outside world or provides a cross-cutting capability is wrapped in a small class under `backend/src/lib/<Name>.js` (and the equivalent `frontend/src/lib/ApiClient.js` on the frontend):

| Wrapper | Wraps | Location |
|---|---|---|
| `BcryptHasher` | `bcrypt` | `backend/src/lib/BcryptHasher.js` |
| `JwtService` | `jsonwebtoken` | `backend/src/lib/JwtService.js` |
| `RedisClient` | `ioredis` | `backend/src/lib/RedisClient.js` |
| `MailTransport` | `nodemailer` | `backend/src/lib/MailTransport.js` |
| `Logger` | `pino` | `backend/src/lib/Logger.js` |
| `ApiClient` | `axios` | `frontend/src/lib/ApiClient.js` |

The rest of the application imports and depends only on these wrapper classes — never on `bcrypt`, `jsonwebtoken`, `ioredis`, `nodemailer`, `pino`, or `axios` directly (the only sanctioned exception is the wrapper file itself, plus rare direct interop needs such as handing `pino-http` the raw `pino` instance via `Logger.raw`). Additional libraries brought in by other route/feature modules as they are implemented (e.g. `pdfkit` for invoice generation, `multer` for uploads, `aws-sdk` for S3) are expected to follow the same pattern and get their own `lib/PdfGenerator.js`, `lib/UploadHandler.js`, `lib/S3Client.js`, etc.

Why this convention exists:

1. **Swappability** — replacing `bcrypt` with `argon2`, or `nodemailer` with a different transport, or `axios` with `fetch`, means editing one file instead of hunting down every call site across the codebase.
2. **Single point of change** — cross-cutting concerns (retry policy, logging, default options, error normalization) are configured once, in the wrapper's constructor/methods, instead of being duplicated at every call site.
3. **Easier testing** — application code depends on a small class with a handful of methods, which is trivial to mock in unit tests, instead of mocking a large third-party API surface.

## 5. RBAC model

Authorization is modeled as a classic many-to-many graph, stored in PostgreSQL and evaluated on every authenticated request:

```
User --(user_roles)--> Role --(role_permissions)--> Permission
```

- `roles` — the 7 fixed roles: Super Admin, Agency Admin, Hotel Admin, Booking Agent, Accountant, Tour Manager, Customer (see `backend/src/config/permissions.js`, `ROLES`).
- `permissions` — a flat, granular list such as `bookings.create`, `hotels.update`, `payments.refund` (see `PERMISSIONS` in the same file).
- `user_roles` — join table, a user can hold more than one role.
- `role_permissions` — join table, a role can hold many permissions.

At login, the backend resolves a user's roles and the union of their permissions and attaches both to `req.user`. Route guards use `requirePermission('bookings.create')` (or an array, matched with OR semantics) from `middleware/rbac.js`. **Super Admin is a special case: it bypasses every permission check** (`requirePermission` returns `next()` immediately if `req.user.roles.includes('Super Admin')`), rather than being granted every permission row explicitly — this keeps Super Admin correct even as new permissions are added later without a seed/migration to update its grant set. Every other role's default permission set is seeded from `ROLE_PERMISSIONS` in `permissions.js` (see `database.md` and `backend/seeds/index.js`).

## 6. Notification / email / payment provider abstractions

Following the "never hard-code an external provider" rule, three integration points are built as small pluggable adapters under `backend/src/integrations/`, each selected by an environment variable so the system stays fully runnable in local development with zero external accounts:

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

The repository intentionally uses **lowercase** `backend/` and `frontend/` as its two top-level application folders — this differs from the capitalized `Backend/`/`Frontend/` shown in the original project brief, and was an explicit, deliberate project decision (lowercase is the Node/JS ecosystem convention and matches every import path, Docker build context, and CI working-directory in this repo). Everything else follows the brief's structure:

```
/
├── backend/
│   ├── src/
│   │   ├── config/        # env, redis client, logger, swagger, permissions
│   │   ├── db/            # Drizzle client, schema.js, relations.js, migrations/
│   │   ├── controllers/   # HTTP <-> service glue, no business logic
│   │   ├── middleware/    # auth, rbac, validate, rateLimiter, requestLogger, errorHandler
│   │   ├── models/        # reserved for non-ORM model helpers
│   │   ├── repositories/  # narrow data-access modules on top of Drizzle
│   │   ├── routes/        # one *.routes.js per resource, mounted in routes/index.js
│   │   ├── services/      # business logic and transactions
│   │   ├── validators/    # zod schemas
│   │   ├── utils/         # errors, money, pagination, apiResponse, bookingNumber, asyncHandler
│   │   ├── jobs/           # background jobs (hold-expiry sweeper)
│   │   ├── integrations/  # pluggable external providers (email/sms/whatsapp/payment)
│   │   ├── notifications/ # notification fan-out service
│   │   ├── lib/            # wrapper classes around every external npm library
│   │   ├── app.js
│   │   └── server.js
│   ├── migrations/         # reserved (migrations live under src/db/migrations)
│   ├── seeds/              # database seed script
│   ├── tests/              # unit/ and integration/
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/    # reusable UI primitives (buttons, tables, modals, ...)
│   │   ├── layouts/       # admin shell, customer shell
│   │   ├── pages/         # route-level page components
│   │   ├── features/      # feature-based modules (bookings, hotels, ...)
│   │   ├── app/           # App Router tree: layouts, page.jsx, auth/permission gates
│   │   ├── views/         # the page components those routes render
│   │   ├── services/      # API call modules built on lib/ApiClient
│   │   ├── hooks/
│   │   ├── contexts/      # auth context, etc.
│   │   ├── utils/
│   │   ├── constants/
│   │   ├── assets/
│   │   ├── styles/
│   │   ├── lib/            # ApiClient wrapper around axios
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── .github/
│   ├── workflows/
│   │   └── main.yml
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

No extra top-level folders (`database/`, `server/`, `client/`, `api/`, `infra/`, `devops/`) exist — infrastructure configuration stays at the repo root or under `.github/`, exactly as required.
