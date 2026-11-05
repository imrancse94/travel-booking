# Deployment (AWS)

## 1. Target architecture

The deployment target is a **single EC2 instance** running Docker Compose. That
is the whole of the AWS footprint — there is no ECS, ECR, RDS, ElastiCache or
load balancer. Postgres and Redis run as containers on the same box, and the
container registry is **GHCR**, which comes free with the repository.

```
Internet
  |
  v
EC2 instance : port 80  (the only published port)
  |
  v
nginx container : 80   (the only published port)
  |-- /_next/static/ --> app container : 5173 (immutable, long-cached)
  |-- /            --> app container : 5173  (Next.js: pages + /api/v1/* route handlers)
  |-- /healthz     --> answered by nginx itself (container healthcheck)
                            |
                            |--> postgres container  (named volume: postgres_data)
                            |--> redis container     (named volume: redis_data)
                            |--> /app/uploads        (named volume: app_uploads)

The image is built by GitHub Actions and stored in GHCR.
```

- **nginx** is the only container with a published port. It reverse-proxies
  everything — page requests and `/api/v1/*` alike — to the single Next.js
  `app` container over the internal Compose bridge network, so the app
  container is unreachable from outside. Because the browser only ever talks
  to port 80, and the API is served from the same origin as the UI, production
  has no cross-origin preflight at all.
- nginx also owns the edge concerns: gzip, security headers
  (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`),
  `server_tokens off`, a 20 MB body limit matching the app's, and a
  one-year immutable `Cache-Control` on Next's content-hashed
  `/_next/static/` assets.
- Its healthcheck probes `/healthz`, which nginx answers itself. Probing a
  proxied route would mark nginx unhealthy whenever an upstream blipped and
  restart the one container that was still working. The probe uses
  `127.0.0.1`, not `localhost`: busybox `wget` tries `::1` first and
  `listen 80` binds IPv4 only.
- **The app, Postgres and Redis declare no `ports:`**, so they are reachable
  only from inside the Compose network. The instance's security group therefore
  only needs 80 (and 22 for the deploy itself) open.
- **There is no separate API origin to configure.** Since the frontend and the
  API routes are the same Next.js app, calls to `/api/v1/*` are always relative
  to the app's own origin — no `NEXT_PUBLIC_API_URL`/`BACKEND_ORIGIN`-style
  build arg is needed, and nothing has to be baked in at image build time for
  routing purposes.
- **State lives in named volumes** (`postgres_data`, `redis_data`,
  `app_uploads`), so `docker compose up -d` recreating
  containers does not lose data. Snapshot the EBS volume to back it up.
- **Files are stored on local disk** (`FILE_STORAGE_DRIVER=local`) rather than
  S3. The upload abstraction in `architecture.md` supports S3 if that changes.

Being one box, this trades availability for simplicity: a deploy briefly
restarts the containers, and losing the instance loses the environment until it
is rebuilt. That is the intended trade for this project.

## 2. Continuous integration

CI/CD is split across four workflow files, one app image built once and
deployed to two environments:

| Workflow | Trigger | What it does |
|---|---|---|
| `.github/workflows/ci.yml` | every push and PR, any branch | `test` job: ESLint, then Vitest, against throwaway Postgres and Redis service containers, after applying migrations. `build` job: `docker build` of the `nextapp` production image (no push — this is a build-only smoke check that the Dockerfile still builds). |
| `.github/workflows/_deploy.yml` | called by the two workflows below (`workflow_call`), never runs on its own | The reusable build-push-deploy pipeline — see section 3. |
| `.github/workflows/staging.yml` | push to `develop`, or manual dispatch | Calls `_deploy.yml` with `environment: staging`, mapping `STAGING_`-prefixed secrets onto the generic names `_deploy.yml` expects. |
| `.github/workflows/production.yml` | push to `main`, or manual dispatch | Calls `_deploy.yml` with `environment: production`, mapping the unprefixed secrets (unchanged names from the pre-migration workflow). Gated by the `production` GitHub environment, so a required reviewer can gate everything that touches production. |

Both `staging.yml` and `production.yml` accept an optional `image_tag` input
on manual dispatch to redeploy an existing image instead of building a new one
— this is also how a rollback works (section 5).

Concurrency on each deploy workflow is keyed per environment
(`deploy-staging` / `deploy-production`) with `cancel-in-progress: false`, so
deploys to the same environment serialise and are never cancelled mid-flight.
`ci.yml` cancels superseded runs on the same ref, since tests-only runs are
cheap to re-trigger.

`.github/scripts/smoke.sh` is **not** wired into `ci.yml`. It remains the
script `make smoke` runs locally, and the one `_deploy.yml` runs against the
freshly deployed environment at the end of every deploy: ~60 assertions over
health endpoints, login and rejected credentials, RBAC (401/403/200 for the
same routes across roles), availability search and its date validation,
booking creation with a server-calculated total, **double-booking prevention**
(a second booking of the same room over the same dates must be a 409), payment
→ confirmation, invoice generation and PDF rendering, cancellation releasing
the room, and every report/export/dashboard endpoint. Because it only needs
`curl` + `python3` and takes its base URLs from `API_URL`/`WEB_URL`, it can be
pointed at any environment (`CHECK_DEV_TOOLS=0` skips the Mailpit/pgAdmin
checks, which exist only in Compose) — see section 5 for the trade-off of
running it against production on every deploy.

## 3. How `_deploy.yml` gets there

**Job `build`**

1. **Resolve the image tag** — the caller's `image_tag` input if given
   (redeploy/rollback), otherwise the triggering commit SHA.
2. **Log in to GHCR** with the built-in `GITHUB_TOKEN` (`packages: write`). No
   personal access token is stored or rotated.
3. **Pull the previous environment image** and build with `--cache-from` plus
   `BUILDKIT_INLINE_CACHE=1`, which is what makes the cache actually hit — the
   inline cache manifest has to be in the pushed image for the next run to use
   it. Skipped entirely when an `image_tag` was supplied — there is nothing new
   to build.
4. **Build the `production` stage** from `./nextapp` and tag it with both the
   environment tag (`<environment>-latest`, e.g. `staging-latest`) and the
   commit SHA.
5. **Push both tags**, then verify the resolved tag exists in GHCR
   (`docker manifest inspect`).
6. **On build failure, open a GitHub issue** naming the workflow, run, branch,
   actor and commit.

**Job `deploy`** (declares `environment: ${{ inputs.environment }}`, so a
required reviewer on that GitHub environment can gate the run)

7. **Generate the host-side files** — `.env`, `docker-compose.prod.yml` and the
   nginx vhost — and `scp` them to `~/app` on the instance. These are generated
   by the workflow rather than committed, which is why the repo carries no
   `docker-compose.prod.yml` and nothing to drift out of sync. `.env` pins the
   image to the resolved **commit SHA / image tag**, never a moving
   `:latest`-style tag, so what is running is always traceable to one build.
   `docker-compose.prod.yml` here declares one `app` service (plus `postgres`,
   `redis` and `nginx`) — there is no separate backend service to coordinate.
8. **Pull the image on the instance** before anything is recreated.
9. **Start Postgres and Redis first** and wait for `pg_isready`, so the
   migration has a database to talk to.
10. **Run `npm run db:migrate` in a one-off `run --rm --no-deps` container on
    the new image** — deliberately *not* `exec` into the running `app`
    container, which may still be serving the previous release. The schema
    belongs to the code being deployed and must land before any container
    running that code serves traffic. Migrations are additive/backward-compatible
    by convention (see `database.md` section 5), which keeps the outgoing
    container valid during the restart.

    The runner is `src/server/db/migrate.js`, plain Node against
    `drizzle-orm`, which is already a runtime dependency. Nothing extra has to
    survive the production image's dependency pruning, and the migration SQL
    ships inside `src/server/db/migrations/`.
11. **`docker compose up -d --remove-orphans`** to roll the stack onto the
    new image, then `docker image prune -f` — without that, a small instance
    fills its disk after a few dozen retags.
12. **Health check through nginx**, retried up to ten times:
    `GET /` must return 200. Since everything is
    behind the single published port and nginx proxies both pages and
    `/api/v1/*` to the same `app` upstream, a 200 here means the vhost, the
    app and the database are all reachable.

    Before that, the deploy runs `nginx -t` against the freshly copied vhost in
    a throwaway container. A malformed config would otherwise take the whole
    site down the moment nginx restarted. On failure it
    prints the exact `docker compose logs` command to run on the instance.
13. **Run `.github/scripts/smoke.sh` against the deployed environment**,
    pointed at the environment's own public URL.

## 4. Required GitHub repository secrets

No IP addresses, hostnames or credentials are hard-coded in the workflow
files. `_deploy.yml` declares generic secret names (`ec2_host`, `ssh_user`,
`ssh_private_key`, `postgres_user`, ...); each caller workflow maps its own
environment's secrets onto those names, so production and staging can point at
different instances and credentials without touching `_deploy.yml` itself.
Configure the concrete secrets under Settings > Secrets and variables >
Actions, either at the repo level or scoped to the `production`/`staging`
GitHub environments.

**Production** (`production.yml`, unprefixed names — unchanged from before the
migration) — required, or the workflow fails outright:
| Name | Purpose |
|---|---|
| `PRIVATE_KEY` | SSH private key (full PEM) authorised on the instance. |
| `AWS_EC2_IP_ADDRESS` | Public IP or DNS name of the instance. |
| `AWS_HOST_USER` | SSH user, e.g. `ubuntu` or `ec2-user`. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credentials for the Postgres container; also composed into `DATABASE_URL`. A password containing `@ : / ?` must be percent-encoded, since it is embedded in a URL. |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Token signing secrets. |

**Staging** (`staging.yml`) needs a parallel `STAGING_`-prefixed set:
`STAGING_SSH_KEY`, `STAGING_EC2_HOST`, `STAGING_SSH_USER`,
`STAGING_POSTGRES_USER` / `STAGING_POSTGRES_PASSWORD` / `STAGING_POSTGRES_DB`,
`STAGING_JWT_SECRET` / `STAGING_JWT_REFRESH_SECRET`, scoped to the `staging`
GitHub environment so it can target its own instance.

**Optional** (both environments — prefixed for staging, unprefixed for
production) — each falls back to a safe default when unset:
| Name | Default |
|---|---|
| `PAYMENT_GATEWAY` | `mock` |
| `EMAIL_PROVIDER` | `console` (logs instead of sending) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | empty / `587` / placeholder sender |
| `SMS_PROVIDER` / `WHATSAPP_PROVIDER` | `none` |

Stripe/PayPal/bKash/Nagad credentials are read at runtime from the app's own
`.env` (see `nextapp/.env.example`), not injected by the deploy workflow —
add them there (or extend `_deploy.yml`'s generated `.env` block) only if a
real gateway other than `mock` is going into use.

`GITHUB_TOKEN` is provided automatically and needs no configuration.

The instance itself needs Docker and the Compose plugin installed, the deploy
key in `~/.ssh/authorized_keys`, and a security group allowing 80 and 22.

## 5. Notes and open items

- **Rollback** is a `workflow_dispatch` run (on `staging.yml` or
  `production.yml`) with `image_tag` set to an earlier commit SHA: the build
  is skipped, the tag's existence in GHCR is verified up front, and the deploy
  pins to it. There is no *automatic* rollback, because with one instance
  there is no previous revision still running to fall back to.
- **Migrations are never rolled back.** The additive-schema convention is what
  makes an older image safe against a newer schema.
- **TLS is not configured.** Everything speaks plain HTTP on port 80. nginx is
  now the natural place to terminate it — add a certbot sidecar and a 443
  server block to the generated vhost — which is the obvious next step before
  this faces real users.
- `.github/scripts/smoke.sh` **is** wired in as the last step of every deploy
  (both staging and production): it creates and cancels a real booking, so
  running it against production on every deploy is a deliberate trade-off —
  it is the cheapest available end-to-end proof the deploy actually works,
  at the cost of a throwaway booking record each time.
- There is a brief interruption during `up -d` while containers restart. Zero
  downtime would need a second instance and a load balancer, which is outside
  the single-EC2 constraint this deployment is built around.
