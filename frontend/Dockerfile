# syntax=docker/dockerfile:1.7

# ---- Build stage ---------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY tsconfig.json tsconfig.node.json* vite.config.ts postcss.config.js tailwind.config.js index.html ./
COPY public public
COPY src src
COPY components.json* eslint.config.js* ./

# Build with empty VITE_* values; the runtime config is fetched from /config.json
ENV VITE_AUTH0_DOMAIN="" \
    VITE_AUTH0_CLIENT_ID="" \
    VITE_AUTH0_AUDIENCE="" \
    VITE_API_BASE_URL="/api"
RUN npm run build

# ---- Runtime stage -------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.29-alpine

USER root
# Patch base OS packages (Alpine 3.20 ships old libssl/libpng/musl with HIGH CVEs)
RUN apk upgrade --no-cache
RUN rm -rf /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/app.conf

COPY --from=build --chown=101:0 /app/dist/ /usr/share/nginx/html/

# Default runtime config; overridden by mounted ConfigMap in K8s.
COPY --from=build --chown=101:0 /app/public/config.json /usr/share/nginx/html/config.json

USER 101
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
