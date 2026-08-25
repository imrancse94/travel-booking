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

## 2. How `.github/workflows/deploy.yml` gets there

The deploy workflow runs on push to `main` (and supports manual `workflow_dispatch`) and performs, in order:

1. **Checkout** the repository.
2. **Authenticate to AWS via OIDC** (`aws-actions/configure-aws-credentials`, `role-to-assume: ${{ secrets.AWS_ROLE_ARN }}`) — no long-lived AWS access keys are stored in GitHub at all; the workflow assumes a role trusted for GitHub's OIDC provider, scoped to this repository, for the duration of the job only.
3. **Log in to ECR** (`aws-actions/amazon-ecr-login`).
4. **Build and push both images**, each tagged with the commit SHA (and `latest`):
   - `docker build --target production -t $ECR_REGISTRY/travel-booking-backend:$GITHUB_SHA ./backend`
   - `docker build --target production -t $ECR_REGISTRY/travel-booking-frontend:$GITHUB_SHA ./frontend`
   - both pushed to their ECR repositories.
5. **Run database migrations as a one-off ECS task**, *before* the new backend task definition is rolled out to receive live traffic: `aws ecs run-task` launches the just-pushed backend image with its command overridden to `npx prisma migrate deploy`, using the same network configuration (VPC subnets/security group) as the real service so it can reach RDS, then the workflow polls until that task exits and fails the deploy if it exits non-zero. Migrations are run **before** flipping traffic (rather than after) so that a new backend version never receives requests against a schema it doesn't expect — Prisma migrations in this schema are additive/backward-compatible by convention (see `database.md` section 5), which keeps the previous task definition's still-running tasks compatible with the post-migration schema during the rollover window.
6. **Update both ECS services** with the new image — either a direct `aws ecs update-service --force-new-deployment` after registering a new task definition revision, or `aws-actions/amazon-ecs-deploy-task-definition` to render the task definition from a template and register/deploy it in one step.
7. **Wait for stability**: `aws ecs wait services-stable --cluster $ECS_CLUSTER --services $ECS_BACKEND_SERVICE $ECS_FRONTEND_SERVICE`, which blocks until ECS reports the desired count of healthy, running tasks for both services (or times out, failing the job).
8. **Health check**: a final `curl --fail` against the ALB's public health endpoint (`https://<domain>/api/v1/health`) confirms the new deployment is actually serving traffic before the job is considered successful.

## 3. Required GitHub repository secrets/variables

No real ARNs, account IDs, or hostnames are hard-coded in the workflow — everything below is referenced by name and must be configured in the repository's Settings > Secrets and variables > Actions:

**Secrets** (sensitive):
| Name | Purpose |
|---|---|
| `AWS_ROLE_ARN` | IAM role the GitHub OIDC provider assumes to deploy (ECR push, ECS update, `ecs:RunTask` for migrations). |

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
| `ECS_SUBNETS` / `ECS_SECURITY_GROUP` | Network configuration for the one-off migration task (`aws ecs run-task --network-configuration`). |
| `HEALTH_CHECK_URL` | Public URL polled for the final health check (e.g. `https://api.example.com/api/v1/health`). |

Database credentials, `JWT_SECRET`/`JWT_REFRESH_SECRET`, SMTP credentials, and the S3 bucket name are **not** GitHub secrets — they belong in the ECS task definition as references to AWS Secrets Manager/SSM Parameter Store, injected at container start, exactly as `backend/.env.example` enumerates them for local development.

## 4. Notes and open items

- The CI workflow (`ci.yml`) validates that both Docker images build (`docker build --target production`) on every push/PR; `deploy.yml` reuses that same `production` target so what gets deployed is exactly what CI already proved builds cleanly.
- Blue/green or canary rollout (e.g. via CodeDeploy) is a reasonable future enhancement on top of the current rolling ECS deployment; it is not implemented today.
- Autoscaling policies for the ECS services (target-tracking on CPU/memory or request count) are expected to be configured on the ECS services/cluster directly (Terraform/CloudFormation/console), not in this repository's GitHub Actions workflows.
