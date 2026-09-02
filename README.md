# Travel Agency + Hotel Booking Management System

A production-oriented hotel booking and travel agency management platform: hotel/room inventory, availability search with double-booking prevention, the full booking lifecycle (hold -> confirm -> check-in -> check-out -> cancel), payments, invoices, tour packages and transport, agent commissions, role-based access control, and an admin + customer-facing web UI.

## Tech stack

**Backend** — Node.js 20 LTS, Express, plain JavaScript (ES Modules, no TypeScript), Prisma ORM against PostgreSQL, Redis, JWT auth, Zod validation, Swagger/OpenAPI docs.

**Frontend** — Next.js 16 (App Router), React 19, plain JavaScript (no TypeScript), Axios. Session state is resolved on the server from an httpOnly cookie and passed into a React context — there is no client-side store.

**Infrastructure** — Docker (multi-stage builds), Docker Compose for local development and production, GitHub Actions for CI/CD, images on GHCR, deployed to a single AWS EC2 instance behind nginx, which reverse-proxies `/api/*` to the backend and everything else to the Next.js server. Port 80 is the only published port.

See [`documentation/architecture.md`](documentation/architecture.md) for the full system design.

## Folder structure

```
/
├── backend/                # Express API — see documentation/architecture.md
│   ├── src/
│   │   ├── config/         # env, prisma client, redis client, logger, swagger, permissions
│   │   ├── controllers/    # HTTP <-> service glue
│   │   ├── middleware/     # auth, rbac, validate, rateLimiter, requestLogger, errorHandler
│   │   ├── repositories/   # data-access modules on top of Prisma
│   │   ├── routes/         # one *.routes.js per resource
│   │   ├── services/       # business logic and transactions
│   │   ├── validators/     # zod schemas
│   │   ├── utils/          # errors, money, pagination, apiResponse, bookingNumber
│   │   ├── jobs/           # background jobs (hold-expiry sweeper)
│   │   ├── integrations/   # pluggable email/sms/whatsapp/payment providers
│   │   ├── notifications/  # notification fan-out service
│   │   ├── lib/            # wrapper classes around every external npm library
│   │   ├── app.js
│   │   └── server.js
│   ├── prisma/             # schema.prisma + migrations/
│   ├── seeds/               # database seed script
│   ├── tests/                # unit/ and integration/
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                # Next.js (App Router) app
│   ├── src/
│   │   ├── components/     # reusable UI primitives
│   │   ├── layouts/        # admin shell, customer shell
│   │   ├── pages/          # route-level pages, grouped admin/ + customer/ + auth/
│   │   ├── app/            # App Router route tree (layouts + page.jsx)
│   │   ├── views/          # page components the routes render
│   │   ├── services/       # API call modules (one per resource)
│   │   ├── lib/session.js  # server-side session (reads the auth cookie)
│   │   ├── middleware.js   # route gating + token refresh at the edge
│   │   ├── contexts/       # AuthProvider + useAuth()
│   │   ├── hooks/          # useResourceList, usePermission, usePagination, useDebounce
│   │   ├── constants/      # nav config, select options
│   │   ├── utils/          # formatting helpers
│   │   ├── styles/         # global CSS + design tokens
│   │   ├── tests/          # Vitest suites, shared render helper + fixtures
│   │   ├── lib/            # ApiClient wrapper around axios
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/             # favicon and other static assets
│   ├── Dockerfile
│   └── package.json
│
├── .github/
│   ├── workflows/main.yml   # test -> build -> deploy to EC2, the only workflow
│   └── scripts/smoke.sh     # end-to-end checks, run by `make smoke`
├── documentation/           # architecture, database, api, booking-flow, development, deployment
├── docker-compose.yml
├── pgadmin.servers.json     # pgAdmin's pre-registered dev database connection
├── Makefile                 # command runner for everything above (`make help`)
└── .gitignore
```

Note: the top-level application folders are lowercase `backend/` and `frontend/` (not the capitalized `Backend/`/`Frontend/` sometimes seen in project templates) — an intentional, explicit choice to match standard Node/JS ecosystem convention and every import path, Docker build context, and CI working directory in this repo.

## Quick start

```bash
make setup
```

That copies both `.env` files from their `.env.example` templates, builds the
images, starts the stack, waits for every service to report healthy, and seeds
demo data. The equivalent by hand:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

docker compose up --build
docker compose exec backend npm run seed
```

Database migrations run automatically when the backend container starts (`npx prisma migrate deploy`, part of its Compose start command).

### Common commands

`make help` lists every target. The ones used most:

| Command | What it does |
|---|---|
| `make up` / `make down` | start (detached, wait for healthy) / stop the stack |
| `make dev` | start in the foreground with logs attached |
| `make logs` | follow logs from all services |
| `make seed` | load demo data (idempotent) |
| `make migrate` / `make migrate-new name=add_x` | apply / create migrations |
| `make test` / `make lint` | both test suites / both linters |
| `make smoke` | end-to-end checks against the running stack |
| `make psql` / `make sh-backend` | database shell / container shell |
| `make build` | build the production Docker images |
| `make clean` | remove containers **and** database volumes |

Full setup, testing, linting, pgAdmin and Prisma Studio instructions are in [`documentation/development.md`](documentation/development.md).

## Default URLs

| What | URL |
|---|---|
| Frontend (customer site) | http://localhost:5173 |
| Admin console | http://localhost:5173/admin |
| Sign in (staff + customers) | http://localhost:5173/login |
| Backend API | http://localhost:4000/api/v1 |
| API docs (Swagger UI, dev only) | http://localhost:4000/api-docs |
| Health check | http://localhost:4000/api/v1/health |
| pgAdmin (dev only) | http://localhost:5050 |
| Mailpit inbox (dev only) | http://localhost:8026 |

## Development-only credentials

**Seeded for local development only. Never use these, or accounts created the same way, in production.**

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@example.com` | `Admin@12345` |
| Customer | `customer@example.com` | `Customer@12345` |

## Documentation

- [`documentation/architecture.md`](documentation/architecture.md) — system design, layered backend architecture, the `lib/` wrapper convention, RBAC model, provider abstractions.
- [`documentation/database.md`](documentation/database.md) — schema by domain, the booking overlap-prevention design, soft deletion, money handling, migrations.
- [`documentation/api.md`](documentation/api.md) — REST conventions, auth flow, full route map.
- [`documentation/booking-flow.md`](documentation/booking-flow.md) — the complete booking lifecycle, the concurrency/double-booking guarantee, and pricing.
- [`documentation/development.md`](documentation/development.md) — local setup, migrations, seeding, tests, linting.
- [`documentation/deployment.md`](documentation/deployment.md) — AWS production architecture and the CI/CD pipeline.

## Known limitations

This project is under active, incremental development across several concurrent workstreams. As of this writing:

- **Backend API**: every resource module under `backend/src/routes/` (auth, users, roles, hotels, room types, rooms, amenities, rate plans, availability, bookings, customers, services, payments, refunds, invoices, destinations, tours, transport, commissions, reports, dashboard, notifications, settings, uploads) has real controller/service implementations — none are placeholder stubs. Booking creation accepts either a specific `roomId` or a `roomTypeId` (the server auto-assigns and locks an available room of that type — what the customer-facing checkout uses, since customers are never shown raw room numbers), and every list/detail/payment/invoice endpoint a `Customer`-role user can reach is scoped to their own records server-side. See `documentation/api.md` for the full route table.
- **Automated tests**: the backend has 68 passing tests (`backend/tests/unit` + `backend/tests/integration`, run with `make test-backend`) covering auth, RBAC/permission checks, hotel CRUD, availability search, the full booking lifecycle (creation, cancellation-fee tiers, check-in/out), payments, invoices, refunds, and — the single most critical scenario in the brief — concurrent double-booking prevention, verified by firing real simultaneous requests against the same room and the same room type and asserting exactly the right number succeed. The frontend has 84 passing Vitest + Testing Library tests (`frontend/src/tests`, run with `make test-frontend`) covering login, the auth and permission gates, hotel search, hotel details, room selection, the five-step checkout (including the exact payload it POSTs and the payment/booking failure paths) and the booking confirmation page.
- **Frontend UI**: the React application has a full admin console (`/admin/*` — dashboard, bookings, hotels, rooms/room-types/rate-plans, customers, tours, destinations, transport, payments, invoices, commissions, reports, users, roles & permissions, settings) and the complete customer-facing flow (home search, hotel details + room selection, multi-step checkout with guest info/room summary/additional services/price summary/payment, booking confirmation, my bookings, my invoices, profile) plus the extra-services catalog (`/admin/services`) and auth pages (login, register, forgot/reset password), all built on a shared reusable UI kit (`frontend/src/components/ui/`).
- **SMS / WhatsApp notifications**: the provider abstraction exists (`backend/src/integrations/sms/`, `backend/src/integrations/whatsapp/`) and is wired into the notification fan-out service, with two providers each: `none` (channel disabled — the default) and `console` (development provider that logs the message). No real gateway is implemented yet; adding Twilio, the Meta Cloud API or a local Bangladesh gateway means one `case` plus a provider factory in that one file.
- **Payment gateways**: five adapters, each its own class extending `PaymentGateway` — `mock` (default, always succeeds, no credentials), `stripe` (cards, charged server-side in one call), and the buyer-approved wallets `paypal`, `bkash` and `nagad`. Sandbox credentials come from env constants and every provider defaults to its sandbox host; a gateway with missing credentials is refused at resolve time with a message naming the absent variable. Only `mock` is exercised end to end in CI — the live adapters are unit-tested against mocked transports, not against the providers' sandboxes.

This section reflects the state of the repository at the time it was last updated — check the codebase directly for anything that may have since changed.
