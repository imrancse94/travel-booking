# Travel Agency + Hotel Booking Management System

A production-oriented hotel booking and travel agency management platform: hotel/room inventory, availability search with double-booking prevention, the full booking lifecycle (hold -> confirm -> check-in -> check-out -> cancel), payments, invoices, tour packages and transport, agent commissions, role-based access control, and an admin + customer-facing web UI.

## Tech stack

**Backend** — Node.js 20 LTS, Express, plain JavaScript (ES Modules, no TypeScript), Prisma ORM against PostgreSQL, Redis, JWT auth, Zod validation, Swagger/OpenAPI docs.

**Frontend** — React 18, Vite, plain JavaScript (no TypeScript), React Router, Redux Toolkit (session state), Axios.

**Infrastructure** — Docker (multi-stage builds), Docker Compose for local development, GitHub Actions for CI/CD, targeting AWS (ECR, ECS/Fargate, ALB, RDS PostgreSQL, ElastiCache Redis, S3, CloudWatch, Route 53) in production.

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
├── frontend/                # React + Vite app
│   ├── src/
│   │   ├── components/     # reusable UI primitives
│   │   ├── layouts/        # admin shell, customer shell
│   │   ├── pages/          # route-level pages
│   │   ├── features/       # feature-based modules
│   │   ├── routes/         # React Router trees + protected routes
│   │   ├── services/       # API call modules
│   │   ├── lib/            # ApiClient wrapper around axios
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   └── package.json
│
├── .github/workflows/       # ci.yml, deploy.yml
├── documentation/           # architecture, database, api, booking-flow, development, deployment
├── docker-compose.yml
└── .gitignore
```

Note: the top-level application folders are lowercase `backend/` and `frontend/` (not the capitalized `Backend/`/`Frontend/` sometimes seen in project templates) — an intentional, explicit choice to match standard Node/JS ecosystem convention and every import path, Docker build context, and CI working directory in this repo.

## Quick start

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

docker compose up --build
```

Database migrations run automatically when the backend container starts (`npx prisma migrate deploy`, part of its Compose start command). To load demo data:

```bash
docker compose exec backend npm run seed
```

Full setup, testing, linting, and Prisma Studio instructions are in [`documentation/development.md`](documentation/development.md).

## Default URLs

| What | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000/api/v1 |
| API docs (Swagger UI, dev only) | http://localhost:4000/api-docs |
| Health check | http://localhost:4000/api/v1/health |

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
- **Automated tests**: the backend has 46 passing tests (`backend/tests/unit` + `backend/tests/integration`, run with `npm test`) covering auth, RBAC/permission checks, hotel CRUD, availability search, the full booking lifecycle (creation, cancellation-fee tiers, check-in/out), payments, invoices, refunds, and — the single most critical scenario in the brief — concurrent double-booking prevention, verified by firing real simultaneous requests against the same room and the same room type and asserting exactly the right number succeed. The frontend does not yet have committed test files, even though `npm test` is wired up in `package.json` and CI is configured to run it.
- **Frontend UI**: the React application has a full admin console (`/admin/*` — dashboard, bookings, hotels, rooms/room-types/rate-plans, customers, tours, destinations, transport, payments, invoices, commissions, reports, users, roles & permissions, settings) and the complete customer-facing flow (home search, hotel details + room selection, multi-step checkout with guest info/room summary/additional services/price summary/payment, booking confirmation, my bookings, my invoices, profile) plus auth pages (login, register, forgot/reset password), all built on a shared reusable UI kit (`frontend/src/components/ui/`). There is no admin management page yet for the extra-services catalog (`/services`) — the catalog itself is seeded and fully usable from the customer checkout, just not editable from the admin UI.
- **SMS / WhatsApp notifications**: the provider abstraction exists (`backend/src/integrations/sms/`, `backend/src/integrations/whatsapp/`) and is wired into the notification fan-out service, but no real provider is implemented yet — both are no-op stubs gated by `SMS_PROVIDER=none`/`WHATSAPP_PROVIDER=none`.
- **Payment gateway**: only the `mock` gateway is implemented (`PAYMENT_GATEWAY=mock`); Stripe/PayPal/local gateway adapters are reserved extension points that currently throw "not implemented yet".

This section reflects the state of the repository at the time it was last updated — check the codebase directly for anything that may have since changed.
