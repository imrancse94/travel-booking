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
APP            ?= app
PG_SERVICE     ?= postgres
REDIS_SERVICE  ?= redis

# Credentials/ports mirror the defaults in docker-compose.yml.
POSTGRES_USER  ?= booking_user
POSTGRES_DB    ?= booking_db
POSTGRES_PASSWORD ?= booking_password
TEST_DB        ?= booking_test
TEST_DATABASE_URL ?= postgresql://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@$(PG_SERVICE):5432/$(TEST_DB)
API_URL        ?= http://localhost:5173/api/v1
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

env: ## Create nextapp/.env from its .env.example template (never overwrites)
	@if [ -f nextapp/.env ]; then echo "  exists   nextapp/.env"; \
	else cp nextapp/.env.example nextapp/.env; echo "  created  nextapp/.env"; fi

urls: ## Print the local service URLs
	@printf "  Customer site  %s\n  Admin console  %s/admin\n  Sign in        %s/login\n  API            %s\n  Health         %s\n  Mailpit        %s\n  pgAdmin        %s\n" \
		"$(WEB_URL)" "$(WEB_URL)" "$(WEB_URL)" "$(API_URL)" "$(API_URL)/health" "$(MAIL_URL)" "$(PGADMIN_URL)"

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
deps-refresh: env ## Re-install deps in the container after changing package.json (keeps databases)
	$(COMPOSE) rm -sf $(APP)
	-docker volume rm $(PROJECT)_app_node_modules \
		$(PROJECT)_app_next_cache
	$(COMPOSE) up --build -d --wait

down: ## Stop and remove the containers (keeps database volumes)
	$(COMPOSE) down --remove-orphans

stop: ## Stop the containers without removing them
	$(COMPOSE) stop

start: ## Start previously stopped containers
	$(COMPOSE) start

restart: ## Restart every service
	$(COMPOSE) restart

restart-app: ## Restart just the app
	$(COMPOSE) restart $(APP)

ps: ## Show container status
	$(COMPOSE) ps

logs: ## Follow logs from all services
	$(COMPOSE) logs -f --tail=100

logs-app: ## Follow app logs
	$(COMPOSE) logs -f --tail=100 $(APP)

health: ## Curl the API health endpoint
	@curl -fsS $(API_URL)/health && echo || echo "API unreachable at $(API_URL) -- is the stack up? (make up)"

##@ Shells

sh: ## Open a shell in the app container
	$(EXEC_TTY) $(APP) sh

psql: ## Open a psql session on the dev database
	$(EXEC_TTY) $(PG_SERVICE) psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)

redis-cli: ## Open a redis-cli session
	$(EXEC_TTY) $(REDIS_SERVICE) redis-cli

pgadmin: ## Print the pgAdmin URL and the password its pre-registered connection needs
	@printf "  pgAdmin   %s\n  Server    travel-booking (docker) -- pre-registered\n  Password  %s (POSTGRES_PASSWORD)\n" \
		"$(PGADMIN_URL)" "$(POSTGRES_PASSWORD)"

##@ Database

migrate: ## Apply pending migrations
	$(EXEC) $(APP) npm run db:migrate

migrate-new: ## Generate a migration from src/server/db/schema.js -- make migrate-new name=add_x
	@test -n "$(name)" || { echo "usage: make migrate-new name=<description>"; exit 1; }
	$(EXEC_TTY) $(APP) npx drizzle-kit generate --name $(name)
	$(MAKE) migrate

db-pull: ## Regenerate the schema by introspecting the live database
	$(EXEC_TTY) $(APP) npm run db:pull

migrate-reset: ## DESTRUCTIVE: drop the schema and re-apply every migration
	$(call confirm,This drops the dev database and all its data.)
	$(EXEC) $(PG_SERVICE) psql -U $(POSTGRES_USER) -d $(POSTGRES_DB) -c \
		"DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;"
	$(MAKE) migrate

studio: ## Open Drizzle Studio (needs a 4983:4983 port mapping on the app service)
	$(EXEC_TTY) $(APP) npm run db:studio

seed: ## Load demo data (idempotent -- safe to re-run)
	$(EXEC) $(APP) npm run seed

db-reset: migrate-reset seed ## DESTRUCTIVE: reset the database then re-seed demo data

##@ Quality

test: ## Run the app's tests (Vitest) against a separate test database
	@# Tests truncate tables between suites, so they get their own database
	@# rather than the one holding your seeded dev data (same DB name CI uses).
	@$(EXEC) $(PG_SERVICE) psql -U $(POSTGRES_USER) -d $(POSTGRES_DB) -tAc \
		"SELECT 1 FROM pg_database WHERE datname='$(TEST_DB)'" | grep -q 1 \
		|| $(EXEC) $(PG_SERVICE) createdb -U $(POSTGRES_USER) $(TEST_DB)
	$(EXEC) -e DATABASE_URL=$(TEST_DATABASE_URL) $(APP) npm run db:migrate
	$(EXEC) -e DATABASE_URL=$(TEST_DATABASE_URL) $(APP) npm test

lint: ## Lint the app
	$(EXEC) $(APP) npm run lint

lint-fix: ## Auto-fix lint errors
	$(EXEC) $(APP) npm run lint:fix

smoke: ## End-to-end smoke test against the running stack
	@API_URL="$(API_URL)" WEB_URL="$(WEB_URL)" MAIL_URL="$(MAIL_URL)" PGADMIN_URL="$(PGADMIN_URL)" \
		./scripts/smoke.sh

ci: lint test ## What CI runs: lint + tests

##@ Production build

build: ## Build the production Docker image (Next.js standalone server)
	docker build --target production -t travel-booking-app:local ./nextapp

##@ Without Docker (host Node 20)

local-deps: env ## Start only postgres + redis, for running the app on the host
	$(COMPOSE) up -d --wait $(PG_SERVICE) $(REDIS_SERVICE)

local-install: ## npm ci in nextapp on the host
	cd nextapp && npm ci

local-app: ## Run the app on the host (point DATABASE_URL/REDIS_URL at localhost first)
	cd nextapp && npm run db:migrate && npm run dev

##@ Cleanup

clean: ## DESTRUCTIVE: remove containers, named volumes (database included) and orphans
	$(call confirm,This removes the containers and the postgres/redis volumes.)
	$(COMPOSE) down -v --remove-orphans

prune: ## Reclaim disk: prune dangling Docker build cache and images
	docker system prune -f

.PHONY: help setup env urls up dev rebuild deps-refresh down stop start restart restart-app \
	ps logs logs-app health sh \
	psql redis-cli pgadmin migrate migrate-new db-pull migrate-reset studio seed db-reset \
	test smoke lint lint-fix ci \
	build local-deps local-install local-app \
	clean prune
