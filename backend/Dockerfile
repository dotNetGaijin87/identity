# syntax=docker/dockerfile:1

# ── build ──────────────────────────────────────────────────────────────────────
FROM golang:1.26 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -o /idp-api ./cmd/api

# ── runtime ────────────────────────────────────────────────────────────────────
FROM alpine:3.20
RUN adduser -D -u 10001 app
COPY --from=build /idp-api /idp-api
USER app
EXPOSE 8080
# The binary applies embedded migrations on startup, then serves.
ENTRYPOINT ["/idp-api"]
