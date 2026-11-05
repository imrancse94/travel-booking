# Local Development

## 1. Prerequisites

- Docker and Docker Compose (this project does not require a host-installed Node, PostgreSQL, or Redis — everything runs in containers).
- Git.

## 2. First-time setup

The repo ships a `Makefile` that wraps every command below; `make help` lists
the full target list. The fastest path from clone to a seeded, running stack:

```bash
git clone <repo-url>
cd travel-booking

make setup   # copies the .env file, builds, starts the stack, seeds demo data
```

Everything the Makefile does is a plain `docker compose` command, so the manual
route works exactly the same:

```bash
cp nextapp/.env.example nextapp/.env
```

Review the copied `.env` file. The defaults work as-is for local Docker Compose use (they point at the `postgres`/`redis` service names, use the `console` email provider and `mock` payment gateway, and need no external credentials). Never commit `.env` files — they are already covered by `.gitignore`.

## 3. Start everything

```bash
docker compose up --build
```

(or `make up`, which adds `-d --wait` so it returns once every service reports
healthy.) This starts five services (`docker-compose.yml`):

| Service | Image / build | Port | What it's for |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | 5432 | application database |
| `redis` | `redis:7-alpine` | 6379 | room holds / caching |
| `pgadmin` | `dpage/pgadmin4` | 5050 | database browser (dev only) |
| `mailpit` | `axllent/mailpit` | 8026 | catches every email the app sends |
| `app` | built from `nextapp/Dockerfile`, `development` stage | 5173 | Next.js dev server — serves both the UI and `/api/v1/*` |

`pgadmin` starts in desktop mode (no pgAdmin login screen) and comes with the
`postgres` service pre-registered as a connection from `pgadmin.servers.json`
at the repo root — open http://localhost:5050, expand **travel-booking
(docker)**, and enter the database password (`POSTGRES_PASSWORD`, dev default
`booking_password`) when prompted. It is a local development tool: the port is
published for convenience and should never be exposed publicly. `make psql`
gives you the same database on the command line.

`app` bind-mounts `nextapp/src/`, `nextapp/public/`, `nextapp/next.config.js` and `nextapp/instrumentation.js` into the container, so **hot reload works out of the box**: it runs `next dev -H 0.0.0.0 -p 5173` (via `npm run dev`) — edits on the host are picked up immediately without rebuilding the image. `app` also depends on named volumes for `node_modules` and Next's `.next` build cache so container-installed dependencies aren't shadowed by the host bind mount, and a rebuilt container starts warm.

`app` additionally waits for both `postgres`, `redis` and `mailpit` to report healthy (`depends_on: condition: service_healthy`) before starting.

Shut everything down with:

```bash
docker compose down
```

(add `-v` if you also want to drop the `postgres_data`/`redis_data` volumes and start from a clean database).

### After changing a package.json

`node_modules` lives in a named volume so it never collides with the host's.
Docker seeds that volume from the image only when it is *first* created, so
after adding or upgrading a dependency the volume still holds the old tree and
shadows the rebuilt image — which surfaces as `sh: <binary>: not found`.
`make rebuild` does not fix it (it rebuilds images, not volumes) and `make clean`
would take the database with it. Use:

```bash
make deps-refresh
```

which drops only the dependency volumes and brings the stack back up.

## 4. Migrations

Migrations run **automatically** every time the `app` container starts — its Compose `command` is:

```
sh -c "npm run db:migrate && npm run dev"
```

(see `docker-compose.yml`), so `docker compose up` alone brings the schema fully up to date; there is no separate manual migration step for normal day-to-day development.

To run migration commands manually against the running stack:

```bash
# Apply any pending migrations (what the container does automatically)
docker compose exec app npm run db:migrate

# Generate a new migration after editing src/server/db/schema.js, then apply it
docker compose exec app npx drizzle-kit generate --name <description>
docker compose exec app npm run db:migrate

# Regenerate src/server/db/schema.js by introspecting the live database
docker compose exec app npm run db:pull
```

`make migrate`, `make migrate-new name=<description>`, `make db-pull` and `make migrate-reset`
(destructive: drops the schema and re-applies every migration) wrap the same commands.

The first migration is the introspected baseline of the schema. A database that
already has those tables is recorded as up to date rather than re-created, so an
existing environment adopts the migration ledger instead of failing on the first
`CREATE TYPE`; see `nextapp/src/server/db/migrate.js`.

## 5. Seed data

```bash
docker compose exec app npm run seed
```

Runs `nextapp/src/server/seeds/index.js`, which is idempotent (it upserts by unique key, so re-running it is safe). It seeds:

- The full RBAC graph: all permissions, the 7 roles (Super Admin, Agency Admin, Hotel Admin, Booking Agent, Accountant, Tour Manager, Customer) and their default permission grants (`nextapp/src/server/config/permissions.js`).
- Agency **"Global Travel Agency"**.
- A development admin user with the Super Admin role.
- 10 amenities and 5 rate plans.
- 3 hotels (**Grand Palace Hotel**, **Ocean View Resort**, **City Center Hotel**), each with 3 room types (**Standard**, **Deluxe**, **Suite**), 5 rooms per room type, and 2 years of room rates (Room Only + Breakfast Included).
- 5 destinations (Dhaka, Cox's Bazar, Chittagong, Sylhet, Sajek) and 3 tour packages with day-by-day itineraries.
- One sample customer account.

### DEV-ONLY credentials

**These credentials are seeded for local development only. Never use them, or accounts created the same way, in a production environment.**

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@example.com` | `Admin@12345` |
| Customer | `customer@example.com` | `Customer@12345` |

## 6. Running tests

```bash
make test   # Vitest, run inside the app container
```

or directly:

```bash
docker compose exec app npm test
```

`make test` points Vitest at a separate `booking_test` database (created
on first run, the same database name CI uses) instead of the one holding your
seeded dev data, because the suites truncate tables between runs. Running
`docker compose exec app npm test` directly uses whatever `DATABASE_URL`
the container has — i.e. your dev database.

Tests run with Vitest + Testing Library (`vitest run`) against `nextapp/src/tests`. This covers both component tests (login, the auth and permission gates, hotel search, hotel details, room selection, the multi-step checkout including the exact booking payload it POSTs, the booking confirmation page, money/cancellation-policy/payment-gateway unit tests) and route-handler integration tests under `src/tests/api/` (auth, hotels, users, RBAC, amenities/services, rate plans, bookings, booking concurrency, payments/invoices), which call the route handlers directly via the shared `src/tests/helpers/callRoute.js` helper (constructs a `NextRequest` and invokes the handler in-process, no HTTP server needed) with fixtures from `src/tests/helpers/fixtures.js`. `src/tests/testUtils.jsx` renders a component inside the session context + toast provider with a seeded `user` and a stubbed `next/navigation` location (`pathname`/`search`/`params`), returning `router` spies to assert navigation against and a `getUser()` probe for reading the live session.

Known gap: route-level test coverage was not added for the tours/transport/destinations/refunds/reports/invoices-pdf/uploads domains — they have only whatever pre-existing component-level coverage they had, if any.

Watch mode is available via `npm run test:watch` in `nextapp/` if you prefer running tests outside Docker against a host-installed Node 20 (`npm install` first).

## 6a. Smoke testing the running stack

```bash
make smoke
```

Runs `.github/scripts/smoke.sh`: ~60 assertions over the live HTTP API — health endpoints, login and
rejected credentials, RBAC across roles, availability search, booking creation,
double-booking prevention, payment, invoice PDF, cancellation, and every
report/dashboard endpoint. It needs a seeded stack (`make setup`) and creates
then cancels one real booking, so run it against local/throwaway environments
only. Point it elsewhere with `API_URL=... WEB_URL=... CHECK_DEV_TOOLS=0`.

## 7. Linting

```bash
make lint       # ESLint
make lint-fix   # auto-fix what can be fixed
```

or directly:

```bash
docker compose exec app npm run lint
```

Uses ESLint (`nextapp/.eslintrc.json` or equivalent flat config). `npm run lint:fix` auto-fixes what it can.

## 8. Drizzle Studio

A visual database browser for the running Postgres instance:

```bash
docker compose exec app npm run db:studio
```

Drizzle Studio binds to port 4983 inside the container; to reach it from the host, add a `4983:4983` port mapping to the `app` service, or run `npx drizzle-kit studio` directly on the host against `DATABASE_URL=postgresql://booking_user:booking_password@localhost:5432/booking_db`.

## 9. Default URLs

| What | URL |
|---|---|
| App (customer site) | http://localhost:5173 |
| Admin console | http://localhost:5173/admin |
| Sign in (staff + customers) | http://localhost:5173/login |
| API | http://localhost:5173/api/v1 |
| Health check | http://localhost:5173/api/v1/health |
| pgAdmin (dev only) | http://localhost:5050 |
| Mailpit inbox (dev only) | http://localhost:8026 |

## 10. Working without Docker (optional)

The app can also run directly on a host Node 20 install against the Dockerized Postgres/Redis (keep those two services running via `docker compose up postgres redis`):

```bash
cd nextapp
npm install
npm run db:migrate
npm run dev
```

Point `nextapp/.env`'s `DATABASE_URL`/`REDIS_URL` at `localhost` instead of the `postgres`/`redis` service hostnames when running the app outside Docker.
</content>
