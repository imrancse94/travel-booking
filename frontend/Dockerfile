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
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
