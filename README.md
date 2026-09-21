# Travel Agency + Hotel Booking Management System

A production-oriented hotel booking and travel agency management platform: hotel/room inventory, availability search with double-booking prevention, the full booking lifecycle (hold -> confirm -> check-in -> check-out -> cancel), payments, invoices, tour packages and transport, agent commissions, role-based access control, and an admin + customer-facing web UI.

## Tech stack

**Application** — Next.js 16 (App Router), React 19, plain JavaScript (ES Modules, no TypeScript). A single Node.js 20 LTS process serves both the UI and the API: former REST endpoints now live as Next.js Route Handlers under `nextapp/src/app/api/v1/**`, which call a server-side service layer backed by Drizzle ORM against PostgreSQL, Redis, JWT auth (httpOnly cookies), and Zod validation. Session state is resolved on the server and passed into a React context — there is no client-side store.

**Infrastructure** — Docker (multi-stage build), a single Docker Compose service for the app plus Postgres/Redis/pgAdmin/Mailpit, GitHub Actions for CI/CD, images on GHCR, deployed to a single AWS EC2 instance behind nginx, which reverse-proxies everything to the one Next.js `app` container. Port 80 is the only published port.

See [`documentation/architecture.md`](documentation/architecture.md) for the full system design.

## Folder structure

```
/
├── nextapp/                  # the whole application (UI + API) — see documentation/architecture.md
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/v1/       # Route Handlers (route.js) — the former Express REST API, one folder per resource
│   │   │   ├── uploads/      # [...path]/route.js — serves uploaded files at /uploads/:path*
│   │   │   └── ...           # page routes: layouts + page.jsx for the admin console and customer site
│   │   ├── components/       # reusable UI primitives
│   │   ├── layouts/          # admin shell, customer shell
│   │   ├── views/            # page components the routes render
│   │   ├── contexts/         # AuthProvider + useAuth()
│   │   ├── hooks/            # useResourceList, usePermission, usePagination, useDebounce
│   │   ├── constants/        # nav config, select options
│   │   ├── utils/            # formatting helpers
│   │   ├── styles/           # global CSS + design tokens
│   │   ├── lib/              # ApiClient wrapper around axios (browser side), session.js (server-side session)
│   │   ├── middleware.js     # route gating + token refresh (Edge runtime)
│   │   ├── server/           # the API/data layer, Node-only — imported only by route handlers, never client code
│   │   │   ├── config/       # env, permissions
│   │   │   ├── db/           # thin re-export of DrizzleClient, schema.js, relations.js, migrations/
│   │   │   ├── services/     # business logic and transactions — the only layer route handlers call
│   │   │   ├── repositories/ # data-access modules on top of Drizzle
│   │   │   ├── validators/   # zod schemas
│   │   │   ├── utils/        # errors, money, pagination, apiResponse, bookingNumber
│   │   │   ├── jobs/         # background jobs (hold-expiry sweeper)
│   │   │   ├── integrations/ # pluggable email/sms/whatsapp/payment providers
│   │   │   ├── notifications/# notification fan-out service
│   │   │   ├── lib/          # wrapper classes around every external npm library (DrizzleClient, BcryptHasher, JwtService, RedisClient, ...)
│   │   │   └── seeds/        # database seed script
│   │   └── tests/            # Vitest suites: component tests + api/ route-handler integration tests, helpers/ (callRoute.js, fixtures.js)
│   ├── instrumentation.js    # Next's startup hook — starts the hold-expiry sweeper (replaces the old server.js)
│   ├── public/                # favicon and other static assets
│   ├── Dockerfile
│   └── package.json
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml            # test + build on every push/PR
│   │   ├── _deploy.yml       # reusable build-push-deploy workflow
│   │   ├── staging.yml       # deploys to staging on push to develop
│   │   └── production.yml    # deploys to production on push to main
│   └── scripts/smoke.sh      # end-to-end checks, run by `make smoke`
├── documentation/            # architecture, database, api, booking-flow, development, deployment
├── docker-compose.yml        # single `app` service + postgres/redis/pgadmin/mailpit
├── pgadmin.servers.json      # pgAdmin's pre-registered dev database connection
├── Makefile                  # command runner for everything above (`make help`)
└── .gitignore
```

Note: the top-level application folder is lowercase `nextapp/` (not a capitalized `Nextapp/` sometimes seen in project templates) — an intentional, explicit choice to match standard Node/JS ecosystem convention and every import path, Docker build context, and CI working directory in this repo.

## Quick start

```bash
make setup
```

That copies the `.env` file from its `.env.example` template, builds the
image, starts the stack, waits for every service to report healthy, and seeds
demo data. The equivalent by hand:

```bash
cp nextapp/.env.example nextapp/.env

docker compose up --build
docker compose exec app npm run seed
```

Database migrations run automatically when the `app` container starts (`npm run db:migrate`, part of its Compose start command).

### Common commands

`make help` lists every target. The ones used most:

| Command | What it does |
|---|---|
| `make up` / `make down` | start (detached, wait for healthy) / stop the stack |
| `make dev` | start in the foreground with logs attached |
| `make logs` | follow logs from all services |
| `make seed` | load demo data (idempotent) |
| `make migrate` / `make migrate-new name=add_x` | apply / create migrations |
| `make test` / `make lint` | run tests / lint the app |
| `make smoke` | end-to-end checks against the running stack |
| `make psql` / `make sh` | database shell / container shell |
| `make build` | build the production Docker image |
| `make clean` | remove containers **and** database volumes |

Full setup, testing, linting, pgAdmin and Drizzle Studio instructions are in [`documentation/development.md`](documentation/development.md).

## Default URLs

| What | URL |
|---|---|
| App (customer site) | http://localhost:5173 |
| Admin console | http://localhost:5173/admin |
| Sign in (staff + customers) | http://localhost:5173/login |
| API | http://localhost:5173/api/v1 |
| Health check | http://localhost:5173/api/v1/health |
| pgAdmin (dev only) | http://localhost:5050 |
| Mailpit inbox (dev only) | http://localhost:8026 |

## Development-only credentials

**Seeded for local development only. Never use these, or accounts created the same way, in production.**

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@example.com` | `Admin@12345` |
| Customer | `customer@example.com` | `Customer@12345` |

## Documentation

- [`documentation/architecture.md`](documentation/architecture.md) — system design, the service/repository layering, the `lib/` wrapper convention, RBAC model, provider abstractions.
- [`documentation/database.md`](documentation/database.md) — schema by domain, the booking overlap-prevention design, soft deletion, money handling, migrations.
- [`documentation/api.md`](documentation/api.md) — REST conventions, auth flow, full route map.
- [`documentation/booking-flow.md`](documentation/booking-flow.md) — the complete booking lifecycle, the concurrency/double-booking guarantee, and pricing.
- [`documentation/development.md`](documentation/development.md) — local setup, migrations, seeding, tests, linting.
- [`documentation/deployment.md`](documentation/deployment.md) — AWS production architecture and the CI/CD pipeline.

## Known limitations

This project is under active, incremental development across several concurrent workstreams. As of this writing:

- **API**: every resource domain under `nextapp/src/app/api/v1/` (auth, users, roles, hotels, room types, rooms, amenities, rate plans, availability, bookings, customers, services, payments, refunds, invoices, destinations, tours, transport, commissions, reports, dashboard, notifications, settings, uploads, activity-logs, health) has real route-handler + service implementations — none are placeholder stubs. Booking creation accepts either a specific `roomId` or a `roomTypeId` (the server auto-assigns and locks an available room of that type — what the customer-facing checkout uses, since customers are never shown raw room numbers), and every list/detail/payment/invoice endpoint a `Customer`-role user can reach is scoped to their own records server-side. See `documentation/api.md` for the full route table.
- **Automated tests**: `nextapp/src/tests/` has 160 passing Vitest tests (run with `make test`), including component tests plus route-handler integration tests under `src/tests/api/` (using the shared `callRoute.js` helper to invoke route handlers directly) covering auth, hotels, users, RBAC, amenities/services, rate plans, bookings, booking concurrency, and payments/invoices — including, per the brief's single most critical scenario, concurrent double-booking prevention verified by firing real simultaneous requests against the same room and the same room type and asserting exactly the right number succeed. Route-level test coverage was **not** added for the tours/transport/destinations/refunds/reports/invoices-pdf/uploads domains — they still have only whatever pre-existing component-level coverage they had, if any; this is a known gap, not a covered area.
- **UI**: the application has a full admin console (`/admin/*` — dashboard, bookings, hotels, rooms/room-types/rate-plans, customers, tours, destinations, transport, payments, invoices, commissions, reports, users, roles & permissions, settings) and the complete customer-facing flow (home search, hotel details + room selection, multi-step checkout with guest info/room summary/additional services/price summary/payment, booking confirmation, my bookings, my invoices, profile) plus the extra-services catalog (`/admin/services`) and auth pages (login, register, forgot/reset password), all built on a shared reusable UI kit (`nextapp/src/components/ui/`).
- **SMS / WhatsApp notifications**: the provider abstraction exists (`nextapp/src/server/integrations/sms/`, `nextapp/src/server/integrations/whatsapp/`) and is wired into the notification fan-out service, with two providers each: `none` (channel disabled — the default) and `console` (development provider that logs the message). No real gateway is implemented yet; adding Twilio, the Meta Cloud API or a local Bangladesh gateway means one `case` plus a provider factory in that one file.
- **Payment gateways**: five adapters, each its own class extending `PaymentGateway` — `mock` (default, always succeeds, no credentials), `stripe` (cards, charged server-side in one call), and the buyer-approved wallets `paypal`, `bkash` and `nagad`. Sandbox credentials come from env constants and every provider defaults to its sandbox host; a gateway with missing credentials is refused at resolve time with a message naming the absent variable. Only `mock` is exercised end to end in CI — the live adapters are unit-tested against mocked transports, not against the providers' sandboxes.

This section reflects the state of the repository at the time it was last updated — check the codebase directly for anything that may have since changed.
</content>
