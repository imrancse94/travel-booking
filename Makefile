# Travel Agency + Hotel Booking Management System -- developer command runner.
#
# Every target runs through Docker Compose by default: no host-installed Node,
# PostgreSQL or Redis is required. Host-Node equivalents live under the
# "Without Docker" section at the bottom.
#
# Quick start:   make setup     (env files + build + start + seed demo data)
# Day to day:    make up / make logs / make down
# Full list:     make help

COMPOSE        ?= docker compose
PROJECT        ?= travel-booking
BACKEND        ?= backend
FRONTEND       ?= frontend
PG_SERVICE     ?= postgres
REDIS_SERVICE  ?= redis

# Credentials/ports mirror the defaults in docker-compose.yml.
POSTGRES_USER  ?= booking_user
POSTGRES_DB    ?= booking_db
POSTGRES_PASSWORD ?= booking_password
TEST_DB        ?= booking_test
TEST_DATABASE_URL ?= postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@$(PG_SERVICE):5432/$(TEST_DB)?schema=public
API_URL        ?= http://localhost:4000/api/v1
WEB_URL        ?= http://localhost:5173
MAIL_URL       ?= http://localhost:8026
PGADMIN_URL    ?= http://localhost:5050

# -T disables TTY allocation so these targets also work from CI and other
# non-interactive shells; EXEC_TTY is for commands that prompt or need a pty.
EXEC           := $(COMPOSE) exec -T
EXEC_TTY       := $(COMPOSE) exec

.DEFAULT_GOAL := help

# Ask before anything that destroys data. FORCE=1 skips the prompt.
# Keep the message comma-free -- it is a $(call) argument.
define confirm
@if [ "$(FORCE)" != "1" ]; then \
	printf "\033[33m%s\033[0m [y/N] " "$(1)"; \
	read ans; \
	case "$$ans" in [yY]*) ;; *) echo "Aborted."; exit 1 ;; esac; \
fi
endef

##@ Setup

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"} \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } \
		/^[a-zA-Z0-9_-]+:.*##/ { printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 }' \
		$(MAKEFILE_LIST); echo

setup: env up seed ## First-time setup: env files, build, start the stack, seed demo data
	@echo
	@$(MAKE) --no-print-directory urls

env: ## Create backend/.env + frontend/.env from the .env.example templates (never overwrites)
	@for d in backend frontend; do \
		if [ -f $$d/.env ]; then echo "  exists   $$d/.env"; \
		else cp $$d/.env.example $$d/.env; echo "  created  $$d/.env"; fi; \
	done

urls: ## Print the local service URLs
	@printf "  Customer site  %s\n  Admin console  %s/admin\n  Sign in        %s/login\n  API            %s\n  API docs       %s\n  Health         %s\n  Mailpit        %s\n  pgAdmin        %s\n" \
		"$(WEB_URL)" "$(WEB_URL)" "$(WEB_URL)" "$(API_URL)" "http://localhost:4000/api-docs" "$(API_URL)/health" "$(MAIL_URL)" "$(PGADMIN_URL)"

##@ Stack

up: env ## Build if needed and start the whole stack in the background, waiting until healthy
	$(COMPOSE) up --build -d --wait

dev: env ## Start the stack in the foreground with logs attached (Ctrl-C stops it)
	$(COMPOSE) up --build

rebuild: env ## Rebuild images from scratch (no cache) and restart
	$(COMPOSE) build --no-cache
	$(COMPOSE) up -d --wait

# node_modules lives in a named volume so it does not collide with the host's.
# Docker seeds that volume from the image only when it is first created, so
# after a dependency change the volume still holds the OLD tree and shadows the
# rebuilt image -- which shows up as `sh: <binary>: not found`. `make rebuild`
# does not fix it (it rebuilds images, not volumes) and `make clean` would take
# the database with it. This drops only the dependency volumes.
deps-refresh: env ## Re-install deps in the containers after changing package.json (keeps databases)
	$(COMPOSE) rm -sf $(BACKEND) $(FRONTEND)
	-docker volume rm $(PROJECT)_backend_node_modules \
		$(PROJECT)_frontend_node_modules \
		$(PROJECT)_frontend_next_cache
	$(COMPOSE) up --build -d --wait

down: ## Stop and remove the containers (keeps database volumes)
	$(COMPOSE) down --remove-orphans

stop: ## Stop the containers without removing them
	$(COMPOSE) stop

start: ## Start previously stopped containers
	$(COMPOSE) start

restart: ## Restart every service
	$(COMPOSE) restart

restart-backend: ## Restart just the backend
	$(COMPOSE) restart $(BACKEND)

restart-frontend: ## Restart just the frontend
	$(COMPOSE) restart $(FRONTEND)

ps: ## Show container status
	$(COMPOSE) ps

logs: ## Follow logs from all services
	$(COMPOSE) logs -f --tail=100

logs-backend: ## Follow backend logs
	$(COMPOSE) logs -f --tail=100 $(BACKEND)

logs-frontend: ## Follow frontend logs
	$(COMPOSE) logs -f --tail=100 $(FRONTEND)

health: ## Curl the API health endpoint
	@curl -fsS $(API_URL)/health && echo || echo "API unreachable at $(API_URL) -- is the stack up? (make up)"

##@ Shells

sh-backend: ## Open a shell in the backend container
	$(EXEC_TTY) $(BACKEND) sh

sh-frontend: ## Open a shell in the frontend container
	$(EXEC_TTY) $(FRONTEND) sh

psql: ## Open a psql session on the dev database
	$(EXEC_TTY) $(PG_SERVICE) psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)

redis-cli: ## Open a redis-cli session
	$(EXEC_TTY) $(REDIS_SERVICE) redis-cli

pgadmin: ## Print the pgAdmin URL and the password its pre-registered connection needs
	@printf "  pgAdmin   %s\n  Server    travel-booking (docker) -- pre-registered\n  Password  %s (POSTGRES_PASSWORD)\n" \
		"$(PGADMIN_URL)" "$(POSTGRES_PASSWORD)"

##@ Database

migrate: ## Apply pending migrations (prisma migrate deploy)
	$(EXEC) $(BACKEND) npx prisma migrate deploy

migrate-new: ## Create + apply a migration after editing schema.prisma -- make migrate-new name=add_x
	@test -n "$(name)" || { echo "usage: make migrate-new name=<description>"; exit 1; }
	$(EXEC_TTY) $(BACKEND) npx prisma migrate dev --name $(name)

migrate-reset: ## DESTRUCTIVE: drop the database and re-apply every migration
	$(call confirm,This drops the dev database and all its data.)
	$(EXEC_TTY) $(BACKEND) npx prisma migrate reset --force

prisma-generate: ## Regenerate the Prisma client
	$(EXEC) $(BACKEND) npx prisma generate

studio: ## Open Prisma Studio (needs a 5555:5555 port mapping on the backend service)
	$(EXEC_TTY) $(BACKEND) npx prisma studio

seed: ## Load demo data (idempotent -- safe to re-run)
	$(EXEC) $(BACKEND) npm run seed

db-reset: migrate-reset seed ## DESTRUCTIVE: reset the database then re-seed demo data

##@ Quality

test: test-backend test-frontend ## Run backend + frontend tests

test-backend: ## Run backend tests (Jest + Supertest) against a separate test database
	@# Jest truncates tables between suites, so it gets its own database rather
	@# than the one holding your seeded dev data (same DB name CI uses).
	@$(EXEC) $(PG_SERVICE) psql -U $(POSTGRES_USER) -d $(POSTGRES_DB) -tAc \
		"SELECT 1 FROM pg_database WHERE datname='$(TEST_DB)'" | grep -q 1 \
		|| $(EXEC) $(PG_SERVICE) createdb -U $(POSTGRES_USER) $(TEST_DB)
	$(EXEC) -e DATABASE_URL=$(TEST_DATABASE_URL) $(BACKEND) npx prisma migrate deploy
	$(EXEC) -e DATABASE_URL=$(TEST_DATABASE_URL) $(BACKEND) npm test

test-frontend: ## Run frontend tests (Vitest)
	$(EXEC) $(FRONTEND) npm test

lint: lint-backend lint-frontend ## Lint backend + frontend

lint-backend: ## Lint the backend
	$(EXEC) $(BACKEND) npm run lint

lint-frontend: ## Lint the frontend
	$(EXEC) $(FRONTEND) npm run lint

lint-fix: ## Auto-fix lint errors in both packages
	$(EXEC) $(BACKEND) npm run lint:fix
	$(EXEC) $(FRONTEND) npm run lint:fix

smoke: ## End-to-end smoke test against the running stack (same script CI runs)
	@API_URL="$(API_URL)" WEB_URL="$(WEB_URL)" MAIL_URL="$(MAIL_URL)" PGADMIN_URL="$(PGADMIN_URL)" \
		./.github/scripts/smoke.sh

ci: lint test ## What CI runs: lint + tests for both packages

##@ Production build

build: build-backend build-frontend ## Build both production Docker images

build-backend: ## Build the backend production image
	docker build --target production -t travel-booking-backend:local ./backend

build-frontend: ## Build the frontend production image (Next.js standalone server)
	docker build --target production -t travel-booking-frontend:local ./frontend

##@ Without Docker (host Node 20)

local-deps: env ## Start only postgres + redis, for running the apps on the host
	$(COMPOSE) up -d --wait $(PG_SERVICE) $(REDIS_SERVICE)

local-install: ## npm ci in backend and frontend on the host
	cd backend && npm ci && npx prisma generate
	cd frontend && npm ci

local-backend: ## Run the backend on the host (point DATABASE_URL/REDIS_URL at localhost first)
	cd backend && npx prisma migrate deploy && npm run dev

local-frontend: ## Run the Next.js dev server on the host
	cd frontend && npm run dev

##@ Cleanup

clean: ## DESTRUCTIVE: remove containers, named volumes (database included) and orphans
	$(call confirm,This removes the containers and the postgres/redis volumes.)
	$(COMPOSE) down -v --remove-orphans

prune: ## Reclaim disk: prune dangling Docker build cache and images
	docker system prune -f

.PHONY: help setup env urls up dev rebuild deps-refresh down stop start restart restart-backend \
	restart-frontend ps logs logs-backend logs-frontend health sh-backend sh-frontend \
	psql redis-cli pgadmin migrate migrate-new migrate-reset prisma-generate studio seed db-reset \
	test test-backend test-frontend smoke lint lint-backend lint-frontend lint-fix ci \
	build build-backend build-frontend local-deps local-install local-backend \
	local-frontend clean prune
