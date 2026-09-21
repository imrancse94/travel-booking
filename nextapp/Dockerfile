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

# UPLOAD_ROOT (server/services/uploadService.js) is process.cwd()/uploads --
# server.js runs from /app, so local-driver uploads need this directory to
# exist and be writable by the non-root user before the app tries to.
RUN mkdir -p ./uploads && chown appuser:appgroup ./uploads

USER appuser
EXPOSE 5173
CMD ["node", "server.js"]
