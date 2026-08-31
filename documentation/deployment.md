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
  |-- /api/        --> backend container : 4000   (Express)
  |-- /_next/static/ --> frontend container : 5173 (immutable, long-cached)
  |-- /            --> frontend container : 5173  (Next.js App Router)
  |-- /healthz     --> answered by nginx itself (container healthcheck)
                            |
                            |--> postgres container  (named volume: postgres_data)
                            |--> redis container     (named volume: redis_data)
                            |--> /app/uploads        (named volume: backend_uploads)

Images for both services are built by GitHub Actions and stored in GHCR.
```

- **nginx** is the only container with a published port. It reverse-proxies
  `/api/*` to Express and everything else to the Next.js server over the
  internal Compose bridge network, so both app containers are unreachable from
  outside. Because the browser only ever talks to port 80, production has no
  cross-origin preflight at all.
- nginx also owns the edge concerns: gzip, security headers
  (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`),
  `server_tokens off`, a 20 MB body limit matching the backend's, and a
  one-year immutable `Cache-Control` on Next's content-hashed
  `/_next/static/` assets.
- Its healthcheck probes `/healthz`, which nginx answers itself. Probing a
  proxied route would mark nginx unhealthy whenever an upstream blipped and
  restart the one container that was still working. The probe uses
  `127.0.0.1`, not `localhost`: busybox `wget` tries `::1` first and
  `listen 80` binds IPv4 only.
- **The backend, Postgres and Redis declare no `ports:`**, so they are reachable
  only from inside the Compose network. The instance's security group therefore
  only needs 80 (and 22 for the deploy itself) open.
- **Two values are baked in at image build time, not read at runtime.**
  `NEXT_PUBLIC_API_URL` (left unset, so the app calls the relative `/api/v1`)
  because Next inlines `NEXT_PUBLIC_*` into the client bundle when it compiles;
  and `BACKEND_ORIGIN`, because `output: 'standalone'` resolves `next.config.js`
  rewrites during `next build` and freezes them into the server bundle. Setting
  `BACKEND_ORIGIN` on a running container has no effect — it is a `--build-arg`.
  Under `npm run dev` the config *is* evaluated at startup, so there it is a
  normal environment variable (see `docker-compose.yml`).

  In production this barely matters, because **nginx intercepts `/api/*` before
  it reaches Next** — the baked value is only a fallback for anything talking to
  the frontend container directly. Moving the API proxy into nginx is what makes
  the proxy target runtime-configurable again: nginx reads its config at
  container start, so retargeting it is a redeploy, not a rebuild.
- **State lives in named volumes** (`postgres_data`, `redis_data`,
  `backend_uploads`, `backend_logs`), so `docker compose up -d` recreating
  containers does not lose data. Snapshot the EBS volume to back it up.
- **Files are stored on local disk** (`FILE_STORAGE_DRIVER=local`) rather than
  S3. The upload abstraction in `architecture.md` supports S3 if that changes.

Being one box, this trades availability for simplicity: a deploy briefly
restarts the containers, and losing the instance loses the environment until it
is rebuilt. That is the intended trade for this project.

## 2. Continuous integration

One workflow, `.github/workflows/main.yml`, covers testing, building and
deploying:

| Job | Runs on | What it proves |
|---|---|---|
| `backend-test` | push/PR to `main` | ESLint, then Jest/Supertest against throwaway Postgres and Redis service containers, after `prisma generate` and `prisma migrate deploy`. |
| `frontend-test` | push/PR to `main` | ESLint, then Vitest over the Next.js app. |
| `build` | push to `main` only | Builds both `production` image stages and pushes them to GHCR. Needs both test jobs green. |
| `check-secrets` | push to `main` only | Confirms the EC2 secrets exist; a missing one warns and skips the deploy rather than failing the run. |
| `deploy` | push to `main` only | Section 3 below. |

A pull request stops after the two test jobs — `build` carries
`if: github.event_name != 'pull_request'`, and everything downstream needs it.

Concurrency is keyed so production deploys serialise and are never cancelled
mid-flight, while PR runs (tests only) may be superseded by a newer push to the
same branch.

`.github/scripts/smoke.sh` is **not** wired into this workflow. It remains the
script `make smoke` runs locally: ~60 assertions over health endpoints, login
and rejected credentials, RBAC (401/403/200 for the same routes across roles),
availability search and its date validation, booking creation with a
server-calculated total, **double-booking prevention** (a second booking of the
same room over the same dates must be a 409), payment → confirmation, invoice
generation and PDF rendering, cancellation releasing the room, and every
report/export/dashboard endpoint. Because it only needs `curl` + `python3` and
takes its base URLs from `API_URL`/`WEB_URL`, it can be pointed at a deployed
environment (set `CHECK_DEV_TOOLS=0` to skip the Mailpit/pgAdmin checks, which
exist only in Compose) — see section 5 for why that is deliberately not
automatic.

## 3. How `.github/workflows/main.yml` gets there

**Job `build`**

1. **Log in to GHCR** with the built-in `GITHUB_TOKEN` (`packages: write`). No
   personal access token is stored or rotated.
2. **Pull the previous images** and build with `--cache-from` plus
   `BUILDKIT_INLINE_CACHE=1`, which is what makes the cache actually hit — the
   inline cache manifest has to be in the pushed image for the next run to use it.
3. **Build both `production` stages** and tag each with `latest` *and* the
   commit SHA. The frontend build receives `--build-arg BACKEND_ORIGIN=http://backend:4000`.
4. **Push both tags.** The deploy consumes `:latest`; the SHA tag is what you
   pull by hand to roll back to a known build.
5. **On failure, open a GitHub issue** naming the workflow, run, branch, actor
   and commit.

**Job `check-secrets`**

6. Verifies `PRIVATE_KEY`, `AWS_EC2_IP_ADDRESS` and `AWS_HOST_USER` are all set,
   and emits a `::warning::` and skips the deploy if not. The secrets are passed
   through `env:` rather than interpolated into the script body — `PRIVATE_KEY`
   is a multi-line PEM, and pasting it straight into a `[[ -n "..." ]]` test
   breaks the shell syntax outright.

**Job `deploy`** (declares `environment: production`, so a required reviewer on
that environment can gate everything that touches production)

7. **Generate the host-side files** — `.env`, `docker-compose.prod.yml` and the
   nginx vhost — and `scp` them to `~/app` on the instance. These are generated
   by the workflow rather than committed, which is why the repo carries exactly
   one YAML file and nothing to drift out of sync. `.env` pins both images to
   the **commit SHA**, never `:latest`, so what is running is always traceable
   to one build.
8. **Pull both images on the instance** before anything is recreated, since
   `:latest` has moved server-side.
9. **Start Postgres and Redis first** and wait for `pg_isready`, so the
   migration has a database to talk to.
10. **Run `npx prisma migrate deploy` in a one-off `run --rm --no-deps`
    container on the new image** — deliberately *not* `exec` into the running
    backend, which may still be serving the previous release. The schema
    belongs to the code being deployed and must land before any container
    running that code serves traffic. Migrations are additive/backward-compatible
    by convention (see `database.md` section 5), which keeps the outgoing
    containers valid during the restart.

    This is why the `prisma` CLI is a runtime `dependency` rather than a
    `devDependency`: the production image installs with `npm ci --omit=dev`, so
    a dev-only CLI would not be present to run the migration.
11. **`docker compose up -d --remove-orphans`** to roll both services onto the
    new images, then `docker image prune -f` — without that, a small instance
    fills its disk after a few dozen `:latest` retags.
12. **Health check through nginx**, retried up to ten times:
    `GET /api/v1/health` and `GET /` must both return 200. Since everything is
    behind the single published port, this doubles as a proxy test — a 200 on
    the API path means the vhost, the backend and the database are reachable,
    and a 200 on `/` means the Next upstream is too.

    Before that, the deploy runs `nginx -t` against the freshly copied vhost in
    a throwaway container. A malformed config would otherwise take the whole
    site down the moment nginx restarted. On failure it
    prints the exact `docker compose logs` command to run on the instance.

## 4. Required GitHub repository secrets

No IP addresses, hostnames or credentials are hard-coded in the workflow.
Configure these under Settings > Secrets and variables > Actions.

**Required** — the deploy is skipped with a warning if any of the first three
are missing:
| Name | Purpose |
|---|---|
| `PRIVATE_KEY` | SSH private key (full PEM) authorised on the instance. |
| `AWS_EC2_IP_ADDRESS` | Public IP or DNS name of the instance. |
| `AWS_HOST_USER` | SSH user, e.g. `ubuntu` or `ec2-user`. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credentials for the Postgres container; also composed into `DATABASE_URL`. A password containing `@ : / ?` must be percent-encoded, since it is embedded in a URL. |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Token signing secrets. |

**Optional** — each falls back to a safe default when unset:
| Name | Default |
|---|---|
| `PAYMENT_GATEWAY` | `mock` |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` | unset — required only when `PAYMENT_GATEWAY=stripe` |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | unset — required only for `paypal` |
| `BKASH_APP_KEY` / `BKASH_APP_SECRET` / `BKASH_USERNAME` / `BKASH_PASSWORD` | unset — required only for `bkash` |
| `NAGAD_MERCHANT_ID` / `NAGAD_MERCHANT_PRIVATE_KEY` / `NAGAD_PUBLIC_KEY` | unset — required only for `nagad` |
| `EMAIL_PROVIDER` | `console` (logs instead of sending) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | empty / `587` / placeholder sender |
| `SMS_PROVIDER` / `WHATSAPP_PROVIDER` | `none` |

`GITHUB_TOKEN` is provided automatically and needs no configuration.

The instance itself needs Docker and the Compose plugin installed, the deploy
key in `~/.ssh/authorized_keys`, and a security group allowing 80 and 22.

## 5. Notes and open items

- **Rollback** is a `workflow_dispatch` run with `image_tag` set to an earlier
  commit SHA: the build is skipped, the tag's existence in GHCR is verified up
  front, and the deploy pins to it. There is no *automatic* rollback, because
  with one instance there is no previous revision still running to fall back to.
- **Migrations are never rolled back.** The additive-schema convention is what
  makes an older image safe against a newer schema.
- **TLS is not configured.** Everything speaks plain HTTP on port 80. nginx is
  now the natural place to terminate it — add a certbot sidecar and a 443
  server block to the generated vhost — which is the obvious next step before
  this faces real users.
- Running `.github/scripts/smoke.sh` against the deployed environment as a
  post-deploy gate is intentionally *not* wired in: it creates and cancels a
  real booking, so it needs a throwaway environment or dedicated demo tenant
  rather than production.
- There is a brief interruption during `up -d` while containers restart. Zero
  downtime would need a second instance and a load balancer, which is outside
  the single-EC2 constraint this deployment is built around.
