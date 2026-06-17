DATABASE_URL ?= postgres://idp:idp@localhost:5432/idp?sslmode=disable

.PHONY: tools db-up db-down migrate sqlc run build test tidy fmt-check openapi-ts

## Install dev tools (goose migrations, sqlc codegen)
tools:
	go install github.com/pressly/goose/v3/cmd/goose@latest
	go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

## Start / stop the Postgres container
db-up:
	docker compose up -d db

db-down:
	docker compose down

## Apply migrations
migrate:
	goose -dir migrations postgres "$(DATABASE_URL)" up

migrate-down:
	goose -dir migrations postgres "$(DATABASE_URL)" down

## Generate type-safe query code from SQL
sqlc:
	sqlc generate

run:
	go run ./cmd/api

build:
	go build ./...

test:
	go test ./...

fmt-check:
	test -z "$$(gofmt -l .)" || (gofmt -l . && exit 1)

tidy:
	go mod tidy

## Generate frontend TypeScript types from the OpenAPI contract
openapi-ts:
	npx --yes openapi-typescript openapi.yaml -o ../admin-console/src/types/api.d.ts
