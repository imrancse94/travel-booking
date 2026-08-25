# Local Development

## 1. Prerequisites

- Docker and Docker Compose (this project does not require a host-installed Node, PostgreSQL, or Redis — everything runs in containers).
- Git.

## 2. First-time setup

```bash
git clone <repo-url>
cd Bookings

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Review the copied `.env` files. The defaults work as-is for local Docker Compose use (they point at the `postgres`/`redis` service names, use the `console` email provider and `mock` payment gateway, and need no external credentials). Never commit `.env` files — both are already covered by `.gitignore`.

## 3. Start everything

```bash
docker compose up --build
```

This starts four services (`docker-compose.yml`):

| Service | Image / build | Port |
|---|---|---|
| `postgres` | `postgres:16-alpine` | 5432 |
| `redis` | `redis:7-alpine` | 6379 |
| `backend` | built from `backend/Dockerfile`, `development` stage | 4000 |
| `frontend` | built from `frontend/Dockerfile`, `development` stage | 5173 |

`backend` and `frontend` both bind-mount their `src/` directories (and a few other folders) into the container, so **hot reload works out of the box**: the backend runs `node --watch src/server.js` (via `npm run dev`) and the frontend runs the Vite dev server (`vite --host 0.0.0.0`) — edits on the host are picked up immediately without rebuilding the image. `backend`/`frontend` also depend on named volumes for `node_modules` so container-installed dependencies aren't shadowed by the host bind mount.

`backend` additionally waits for both `postgres` and `redis` to report healthy (`depends_on: condition: service_healthy`) before starting.

Shut everything down with:

```bash
docker compose down
```

(add `-v` if you also want to drop the `postgres_data`/`redis_data` volumes and start from a clean database).

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
docker compose exec backend npm test
docker compose exec frontend npm test
```

- Backend tests run with Jest + Supertest (`cross-env NODE_ENV=test jest --runInBand`, ESM mode via `--experimental-vm-modules`) against `backend/tests/unit` and `backend/tests/integration`.
- Frontend tests run with Vitest (`vitest run`) against `frontend/src/tests` and any `*.test.jsx`/`*.test.js` files colocated with components.

Watch modes are available via `npm run test:watch` in either package if you prefer running tests outside Docker against a host-installed Node 20 (`npm install` in the respective folder first).

## 7. Linting

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
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000/api/v1 |
| API docs (Swagger UI, dev only) | http://localhost:4000/api-docs |
| Health check | http://localhost:4000/api/v1/health |

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
