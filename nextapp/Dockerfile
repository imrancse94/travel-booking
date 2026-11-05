# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ---------------------------------------------------------------------------
FROM base AS dependencies
RUN npm ci

# ---------------------------------------------------------------------------
FROM base AS development
ENV NODE_ENV=development
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------------------
FROM dependencies AS build
# Next inlines NEXT_PUBLIC_* into the client bundle at build time, so it cannot
# be changed on the container later. Unset is the common case: httpClient.js
# already defaults to the relative /api/v1, which this single app serves
# itself -- same origin, no separate backend to point at.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build
# Runtime-only dependency tree, used by the production stage so the same image
# can run migrations (drizzle-orm, pg, dotenv...) before starting the server.
RUN npm prune --omit=dev

# ---------------------------------------------------------------------------
FROM node:20-alpine AS production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Next's standalone server reads these rather than accepting CLI flags.
ENV PORT=5173
ENV HOSTNAME=0.0.0.0
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app

# `output: 'standalone'` traces the exact runtime files and emits its own
# server.js, so the production image carries no node_modules tree of its own.
# The two other COPYs are the pieces the trace deliberately leaves out:
# hashed build assets, and anything served from public/.
COPY --from=build --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=build --chown=appuser:appgroup /app/.next/static ./.next/static
COPY --from=build --chown=appuser:appgroup /app/public ./public
# Full prod node_modules + server code so `node src/server/db/migrate.js` works
# at container start (standalone's traced tree omits the migration script).
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/src/server ./src/server
COPY --from=build --chown=appuser:appgroup /app/src/lib ./src/lib
COPY --from=build --chown=appuser:appgroup /app/package.json ./package.json
COPY --from=build --chown=appuser:appgroup /app/healthcheck.js ./healthcheck.js
COPY --from=build --chown=appuser:appgroup --chmod=755 /app/start.sh ./start.sh

# UPLOAD_ROOT (server/services/uploadService.js) is process.cwd()/uploads --
# server.js runs from /app, so local-driver uploads need this directory to
# exist and be writable by the non-root user before the app tries to.
RUN mkdir -p ./uploads ./logs && chown appuser:appgroup ./uploads ./logs

USER appuser
EXPOSE 5173
# Checks the app, its database and Redis (see healthcheck.js).
HEALTHCHECK --interval=15s --timeout=6s --start-period=40s --retries=5 \
  CMD ["node", "healthcheck.js"]
# Migrate, seed demo data when IS_DEMO=true, then start (see start.sh).
CMD ["./start.sh"]
