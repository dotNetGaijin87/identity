# syntax=docker/dockerfile:1

# ── build the SPA ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# No MSW in the served app; it talks to the backend (nginx proxies /api).
RUN printf "VITE_API_URL=/api\nVITE_API_MOCKING=disabled\n" > .env && npm run build

# ── serve with nginx (also proxies /api → backend) ─────────────────────────────
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
