# syntax=docker/dockerfile:1

# ── build the SPA ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Trust an optional TLS-intercepting root CA (e.g. Avast/corporate HTTPS scanning)
# so `npm ci` can verify the registry with strict TLS ON. Drop the root cert(s)
# into ca/*.crt (see ca/README.md); empty ca/ is a harmless no-op. Without this,
# intercepted networks fail with UNABLE_TO_VERIFY_LEAF_SIGNATURE.
COPY ca/ /tmp/ca/
RUN mkdir -p /usr/local/share/ca-certificates && \
    cat /tmp/ca/*.crt > /usr/local/share/ca-certificates/proxy-ca.pem 2>/dev/null || true
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/proxy-ca.pem
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ── serve with nginx (also proxies /bff → bff) ─────────────────────────────────
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
