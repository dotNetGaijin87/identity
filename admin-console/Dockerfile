# syntax=docker/dockerfile:1

# ── build the SPA ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# This network runs a TLS-intercepting proxy/AV (Avast HTTPS scanning), so npm's
# cert chain to the registry won't verify (UNABLE_TO_VERIFY_LEAF_SIGNATURE) and npm
# then crashes with the misleading "Exit handler never called". Fixed the secure
# way: trust the interceptor's root CA via NODE_EXTRA_CA_CERTS — strict TLS stays
# ON. Provide the root cert(s) as ca/*.crt (see ca/README.md); an empty ca/ folder
# is a harmless no-op on networks without interception.
COPY ca/ /tmp/ca/
RUN mkdir -p /usr/local/share/ca-certificates && \
    cat /tmp/ca/*.crt > /usr/local/share/ca-certificates/proxy-ca.pem 2>/dev/null || true
ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/proxy-ca.pem
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund
COPY . .
# No MSW in the served app; it talks to the backend (nginx proxies /api).
RUN printf "VITE_API_URL=/api\nVITE_API_MOCKING=disabled\n" > .env && npm run build

# ── serve with nginx (also proxies /api → backend) ─────────────────────────────
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
