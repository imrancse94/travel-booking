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

make setup   # copies both .env files, builds, starts the stack, seeds demo data
```

Everything the Makefile does is a plain `docker compose` command, so the manual
route works exactly the same:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Review the copied `.env` files. The defaults work as-is for local Docker Compose use (they point at the `postgres`/`redis` service names, use the `console` email provider and `mock` payment gateway, and need no external credentials). Never commit `.env` files — both are already covered by `.gitignore`.

## 3. Start everything

```bash
docker compose up --build
```

(or `make up`, which adds `-d --wait` so it returns once every service reports
healthy.) This starts six services (`docker-compose.yml`):

| Service | Image / build | Port | What it's for |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | 5432 | application database |
| `redis` | `redis:7-alpine` | 6379 | room holds / caching |
| `pgadmin` | `dpage/pgadmin4` | 5050 | database browser (dev only) |
| `mailpit` | `axllent/mailpit` | 8026 | catches every email the app sends |
| `backend` | built from `backend/Dockerfile`, `development` stage | 4000 | Express API |
| `frontend` | built from `frontend/Dockerfile`, `development` stage | 5173 | Next.js dev server (also proxies `/api/*` to `backend`) |

`pgadmin` starts in desktop mode (no pgAdmin login screen) and comes with the
`postgres` service pre-registered as a connection from `pgadmin.servers.json`
at the repo root — open http://localhost:5050, expand **travel-booking
(docker)**, and enter the database password (`POSTGRES_PASSWORD`, dev default
`booking_password`) when prompted. It is a local development tool: the port is
published for convenience and should never be exposed publicly. `make psql`
gives you the same database on the command line.

`backend` and `frontend` both bind-mount their `src/` directories (and a few other folders) into the container, so **hot reload works out of the box**: the backend runs `node --watch src/server.js` (via `npm run dev`) and the frontend runs the Vite dev server (`vite --host 0.0.0.0`) — edits on the host are picked up immediately without rebuilding the image. `backend`/`frontend` also depend on named volumes for `node_modules` so container-installed dependencies aren't shadowed by the host bind mount.

`backend` additionally waits for both `postgres` and `redis` to report healthy (`depends_on: condition: service_healthy`) before starting.

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

Migrations run **automatically** every time the `backend` container starts — its Compose `command` is:

```
sh -c "npx prisma migrate deploy && npm run dev"
```

(see `docker-compose.yml`), so `docker compose up` alone brings the schema fully up to date; there is no separate manual migration step for normal day-to-day development.

To run Prisma commands manually (e.g. after changing `schema.prisma`) against the running stack:

```bash
# Apply any pending migrations without creating new ones (what the container does automatically)
docker compose exec backend npx prisma migrate deploy

# Create + apply a new migration after editing schema.prisma
docker compose exec backend npx prisma migrate dev --name <description>

# Danger: drops and recreates the database, then re-applies all migrations
docker compose exec backend npx prisma migrate reset --force
```

`npm run prisma:migrate`, `npm run prisma:migrate:deploy`, and `npm run prisma:migrate:reset` in `backend/package.json` are shortcuts for the same commands.

## 5. Seed data

```bash
docker compose exec backend npm run seed
```

Runs `backend/seeds/index.js`, which is idempotent (it upserts by unique key, so re-running it is safe). It seeds:

- The full RBAC graph: all permissions, the 7 roles (Super Admin, Agency Admin, Hotel Admin, Booking Agent, Accountant, Tour Manager, Customer) and their default permission grants (`backend/src/config/permissions.js`).
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
make test            # both suites
make test-backend    # Jest + Supertest
make test-frontend   # Vitest
```

or directly:

```bash
docker compose exec backend npm test
docker compose exec frontend npm test
```

`make test-backend` points Jest at a separate `booking_test` database (created
on first run, the same database name CI uses) instead of the one holding your
seeded dev data, because the suites truncate tables between runs. Running
`docker compose exec backend npm test` directly uses whatever `DATABASE_URL`
the container has — i.e. your dev database.

- Backend tests run with Jest + Supertest (`cross-env NODE_ENV=test jest --runInBand`, ESM mode via `--experimental-vm-modules`) against `backend/tests/unit` and `backend/tests/integration`.
- Frontend tests run with Vitest + Testing Library (`vitest run`) against `frontend/src/tests` and any `*.test.jsx`/`*.test.js` files colocated with components. The committed suites cover login, the auth and permission gates, hotel search, hotel details, room selection, the multi-step checkout (including the exact booking payload it POSTs) and the booking confirmation page. `src/tests/testUtils.jsx` renders a component inside the real Redux store + toast provider with a seeded session and a stubbed `next/navigation` location (`pathname`/`search`/`params`), returning `router` spies to assert navigation against; `src/tests/fixtures.js` holds API-shaped fixtures.

Watch modes are available via `npm run test:watch` in either package if you prefer running tests outside Docker against a host-installed Node 20 (`npm install` in the respective folder first).

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
make lint       # both packages
make lint-fix   # auto-fix what can be fixed
```

or directly:

```bash
docker compose exec backend npm run lint
docker compose exec frontend npm run lint
```

Both use ESLint (`.eslintrc.json` in each package). `npm run lint:fix` auto-fixes what it can.

## 8. Prisma Studio

A visual database browser for the running Postgres instance:

```bash
docker compose exec backend npx prisma studio
```

Prisma Studio binds to port 5555 inside the container; if you need to reach it from the host, run it with an explicit port mapping instead (e.g. `docker compose exec backend npx prisma studio --port 5555` and add a `5555:5555` port mapping to the `backend` service, or run `npx prisma studio` directly on the host against `DATABASE_URL=postgresql://booking_user:booking_password@localhost:5432/booking_db`).

## 9. Default URLs

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

## 10. Working without Docker (optional)

Each package can also run directly on a host Node 20 install against the Dockerized Postgres/Redis (keep those two services running via `docker compose up postgres redis`):

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

Point `backend/.env`'s `DATABASE_URL`/`REDIS_URL` at `localhost` instead of the `postgres`/`redis` service hostnames when running the backend outside Docker.
