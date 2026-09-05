# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./

# ---------------------------------------------------------------------------
FROM base AS dependencies
RUN npm ci

# ---------------------------------------------------------------------------
FROM base AS development
ENV NODE_ENV=development
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
EXPOSE 4000
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------------------
FROM base AS production-dependencies
RUN npm ci --omit=dev

# ---------------------------------------------------------------------------
FROM node:20-alpine AS production
ENV NODE_ENV=production
RUN apk add --no-cache openssl && addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY src ./src
COPY seeds ./seeds
COPY package*.json ./
RUN mkdir -p /app/logs /app/uploads && chown -R appuser:appgroup /app/logs /app/uploads
USER appuser
EXPOSE 4000
CMD ["node", "src/server.js"]
