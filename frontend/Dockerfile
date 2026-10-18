# syntax=docker/dockerfile:1
# Build context is the repo root, so the npm workspace (and @hse/shared) is visible.

FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY frontend/package.json frontend/
RUN --mount=type=cache,target=/root/.npm npm ci --workspace frontend

COPY shared shared
COPY frontend frontend
RUN npm run lint --workspace frontend && npm run build --workspace frontend

FROM caddy:2-alpine
COPY frontend/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/frontend/dist /srv
