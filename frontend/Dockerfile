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
# be changed on the container later. Unset is the common case: the app then
# calls the relative /api/v1 that next.config.js rewrites to the backend.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Baked in for the same reason: `output: 'standalone'` resolves next.config.js
# rewrites at build time, so BACKEND_ORIGIN cannot be set on the container.
# The default is the Compose service name the image is deployed alongside.
ARG BACKEND_ORIGIN=http://backend:4000
ENV BACKEND_ORIGIN=$BACKEND_ORIGIN

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

USER appuser
EXPOSE 5173
CMD ["node", "server.js"]
