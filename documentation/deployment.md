# Deployment (AWS)

## 1. Target architecture

```
Internet
  |
  v
Route 53 (DNS)
  |
  v
Application Load Balancer (ALB)
  |-- /  (or a dedicated frontend host/path)  --> Frontend ECS Service (Fargate, nginx serving the Vite build)
  |-- /api/*                                   --> Backend ECS Service (Fargate, Express)
                                                        |
                                                        |--> RDS PostgreSQL
                                                        |--> ElastiCache Redis
                                                        |--> S3 (uploaded files: hotel/room images, customer documents, invoice PDFs)
                                                        |--> CloudWatch Logs (both services)

Container images for both services are built and stored in ECR.
```

- **Route 53** resolves the public domain to the ALB.
- **ALB** terminates TLS and routes by host/path to two target groups: the frontend ECS service and the backend ECS service. Health checks against each target group gate whether a task receives traffic.
- **ECS/Fargate** runs both the frontend (the `production` stage of `frontend/Dockerfile` — a static build served by nginx) and the backend (the `production` stage of `backend/Dockerfile` — `node src/server.js` as a non-root user) as separate services, so each can be scaled and deployed independently.
- **RDS PostgreSQL** replaces the Compose `postgres` container in production. `DATABASE_URL` is injected as a task-definition secret (from Secrets Manager or SSM Parameter Store), never baked into the image.
- **ElastiCache Redis** replaces the Compose `redis` container.
- **S3** replaces local-disk file storage in production (`FILE_STORAGE_DRIVER=s3`, see `architecture.md`'s file-upload abstraction) for hotel/room images, customer/passport documents, and generated invoice PDFs.
- **CloudWatch** receives structured logs from both services (the `awslogs` log driver on each ECS task definition; the backend already logs as structured JSON via the `Logger`/`pino` wrapper, which CloudWatch Logs Insights can query directly).

## 2. Continuous integration

Three workflows run in `.github/workflows/`:

| Workflow | Trigger | What it proves |
|---|---|---|
| `ci.yml` | push/PR to `main` | Each package on its own: ESLint, backend Jest/Supertest against service containers, frontend Vitest, the Vite production bundle, and the backend production image build. |
| `docker-compose-ci.yml` | push/PR to `main`, manual | The stack we actually ship: `docker compose build` + `up --wait`, `prisma migrate status`, seeding (twice, proving idempotence), both test suites *inside* the containers, and an end-to-end smoke test through HTTP. Also builds both `production` image stages and boots the frontend one to confirm nginx serves the bundle. |
| `deploy.yml` | push to `main`, manual | Section 3 below. |

`docker-compose-ci.yml` runs `.github/scripts/smoke.sh`, which is the same
script `make smoke` runs locally: ~60 assertions over health endpoints, login
and rejected credentials, RBAC (401/403/200 for the same routes across roles),
availability search and its date validation, booking creation with a
server-calculated total, **double-booking prevention** (a second booking of the
same room over the same dates must be a 409), payment → confirmation, invoice
generation and PDF rendering, cancellation releasing the room, and every
report/export/dashboard endpoint. On failure the job dumps and uploads
`docker compose logs`, then always tears the stack down with `down -v`.

Because the smoke test only needs `curl` + `python3` and takes its base URLs
from `API_URL`/`WEB_URL`, the same script can be pointed at a deployed
environment (set `CHECK_DEV_TOOLS=0` to skip the Mailpit/pgAdmin checks, which
exist only in Compose) as a post-deploy verification step.

## 3. How `.github/workflows/deploy.yml` gets there

The deploy workflow runs on push to `main` and via `workflow_dispatch` (which
takes an optional `image_tag` — naming a previously built commit SHA redeploys
or rolls back to it without rebuilding). It is a single `production-deploy`
concurrency group with `cancel-in-progress: false`, so deployments never
overlap and are never cancelled halfway through. The `migrate` and `deploy` jobs
both declare `environment: production`, so a required reviewer on that
environment gates everything that touches production.

**Job 1 — `build`**

1. **Authenticate to AWS via OIDC** (`aws-actions/configure-aws-credentials`, `role-to-assume: ${{ secrets.AWS_ROLE_ARN }}`) — no long-lived AWS keys exist in GitHub; the workflow assumes a role trusted for GitHub's OIDC provider, scoped to this repository, for the job's lifetime.
2. **Log in to ECR** (`aws-actions/amazon-ecr-login`).
3. **Build and push both images** from their `production` stages with Buildx + GitHub Actions layer caching, tagged with the **commit SHA** (and `latest` for convenience). Deployments always reference the SHA tag, never `latest`, so what is running is unambiguous and reproducible.
4. **Verify the images exist in ECR** (`aws ecr describe-images`), which fails fast if a manual redeploy names a tag that was never built.

**Job 2 — `migrate`**

5. **Register a new backend task definition revision** pinned to the new image: `describe-task-definition` → strip the read-only fields (`taskDefinitionArn`, `revision`, `status`, `requiresAttributes`, `compatibilities`, `registeredAt/By`) with `jq` → swap the container's `image` → `register-task-definition`. The new revision's ARN is a job output.
6. **Run `npx prisma migrate deploy` as a one-off Fargate task on that new revision** (`aws ecs run-task` with a `containerOverrides` command), in the service's own subnets/security group so it can reach RDS. The workflow waits for the task to stop, reads the container exit code, and on a non-zero exit tails the backend CloudWatch log group and fails the deployment.

   Running the migration on the **newly registered revision** — rather than on whatever the service currently runs — is the point: the migration belongs to the code being deployed. It also runs **before** any task serving that code receives traffic, so a new backend version never queries a schema it doesn't expect. Migrations here are additive/backward-compatible by convention (see `database.md` section 5), which keeps the still-running previous revision valid during the rollover.

**Job 3 — `deploy`**

7. **Record the currently deployed revisions** of both services, so a failure has somewhere to go back to.
8. **Register the frontend revision** the same way as the backend's.
9. **Update both services** to their new revisions with `aws ecs update-service --task-definition <arn>` — the backend reuses the exact revision the migration ran on. (This is why the workflow does not use `--force-new-deployment`: that only re-pulls a mutable tag and leaves no revision history to roll back to.)
10. **Wait for stability**: `aws ecs wait services-stable` blocks until ECS reports the desired count of healthy tasks for both services, or fails on timeout.
11. **Health check through the ALB**: `curl --fail` against the public health endpoint, retried for up to two minutes — ECS "stable" only means tasks pass their target-group checks, not that the load balancer is serving the app.
12. **Roll back on failure**: any failure in the rollout puts both services back on the revisions recorded in step 7 and waits for them to stabilise. The step warns explicitly that **database migrations are not rolled back** — the additive-schema convention is what makes the previous revision safe against the new schema.
13. **Job summary**: image tag, both task definition ARNs, and the result are written to the run summary.

## 4. Required GitHub repository secrets/variables

No real ARNs, account IDs, or hostnames are hard-coded in the workflow — everything below is referenced by name and must be configured in the repository's Settings > Secrets and variables > Actions:

**Secrets** (sensitive):
| Name | Purpose |
|---|---|
| `AWS_ROLE_ARN` | IAM role the GitHub OIDC provider assumes to deploy. Needs ECR push/read, `ecs:DescribeTaskDefinition`, `ecs:RegisterTaskDefinition`, `ecs:RunTask` + `ecs:DescribeTasks` (migrations), `ecs:UpdateService` + `ecs:DescribeServices`, `iam:PassRole` for the task execution/task roles, and `logs:*` read on the backend log group. |

**Variables** (non-sensitive, environment-specific):
| Name | Purpose |
|---|---|
| `AWS_REGION` | e.g. `us-east-1`. |
| `ECR_REGISTRY` | The account/registry URI images are pushed to. |
| `ECR_REPOSITORY_BACKEND` | ECR repository name for the backend image. |
| `ECR_REPOSITORY_FRONTEND` | ECR repository name for the frontend image. |
| `ECS_CLUSTER` | Target ECS cluster name. |
| `ECS_SERVICE_BACKEND` | Backend ECS service name. |
| `ECS_SERVICE_FRONTEND` | Frontend ECS service name. |
| `ECS_TASK_DEFINITION_BACKEND` | Backend task definition family name (for render+deploy). |
| `ECS_TASK_DEFINITION_FRONTEND` | Frontend task definition family name. |
| `ECS_CONTAINER_BACKEND` / `ECS_CONTAINER_FRONTEND` | Container names inside those task definitions, i.e. which container's `image` is swapped and which one the migration command overrides. Default to `backend`/`frontend` when unset. |
| `ECS_SUBNETS` / `ECS_SECURITY_GROUP` | Network configuration for the one-off migration task (`aws ecs run-task --network-configuration`). `ECS_SUBNETS` is a comma-separated list. |
| `HEALTH_CHECK_URL` | Public URL polled for the final health check (e.g. `https://api.example.com/api/v1/health`). |
| `CLOUDWATCH_LOG_GROUP_BACKEND` | Optional. Backend log group tailed when a migration task fails, e.g. `/ecs/travel-booking-backend`. |

Database credentials, `JWT_SECRET`/`JWT_REFRESH_SECRET`, SMTP credentials, and the S3 bucket name are **not** GitHub secrets — they belong in the ECS task definition as references to AWS Secrets Manager/SSM Parameter Store, injected at container start, exactly as `backend/.env.example` enumerates them for local development.

## 5. Notes and open items

- `docker-compose-ci.yml` builds the same `production` image stages `deploy.yml` ships, and boots the stack the same way, so what gets deployed is exactly what CI already proved builds and runs.
- Rollback is automatic on a failed rollout, and manual rollback is a `workflow_dispatch` run with `image_tag` set to an older commit SHA (it skips the build and redeploys that tag).
- Blue/green or canary rollout (e.g. via CodeDeploy) is a reasonable future enhancement on top of the current rolling ECS deployment; it is not implemented today.
- Running `.github/scripts/smoke.sh` against the deployed environment as a post-deploy gate is intentionally *not* wired in: it creates and cancels a real booking, so it needs a throwaway environment or dedicated demo tenant rather than production.
- Autoscaling policies for the ECS services (target-tracking on CPU/memory or request count) are expected to be configured on the ECS services/cluster directly (Terraform/CloudFormation/console), not in this repository's GitHub Actions workflows.
