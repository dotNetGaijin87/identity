# Admin Console

A simplified identity-provider (IdP) administration console built with React + TypeScript, following the
React Application Architecture skill: **feature-based modules, unidirectional dependencies,
types-first, a per-feature data layer, and the testing pyramid.**

Manage **Tenants**, and within a tenant its **Users**, **Clients**, and **Roles** — each with
list / create / edit — plus **assigning roles to a user**. The whole admin area is behind a login;
all auth + admin APIs are mocked with **MSW**, so it runs with no backend.

## Stack & key decisions (Step 1)

| Concern           | Choice                                          | Why                                                           |
| ----------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| Framework / build | **Vite + React (SPA)**                          | The console lives entirely behind auth → CSR; no SSR/SEO need |
| Routing           | **React Router v6**                             | Nested routes + layout; tenant-scoped URLs                    |
| Server state      | **TanStack Query v5**                           | Caching, dedup, invalidation — the only home for server data  |
| Global UI state   | **Zustand**                                     | Notifications only (server data never goes here)              |
| Forms             | **React Hook Form + Zod** (`zodResolver`)       | Perf + one schema for validation _and_ types                  |
| Validation        | **Zod**                                         | Parse untrusted API responses at the boundary                 |
| HTTP              | **Typed `fetch` wrapper** (`lib/api-client.ts`) | baseURL + JSON + global error-notify interceptor              |
| Mock API          | **MSW + @mswjs/data**                           | Same handlers back dev and tests                              |
| Tests             | **Vitest + RTL + Playwright**                   | Unit → integration → e2e pyramid                              |

**Rendering:** every route is CSR (behind auth). **Auth:** session-cookie style — the mock tracks a
session; `useUser` (`/auth/me`) restores it; `Protected` redirects to `/login?redirect=…` when there's
no user. Auth user is **server state** (query cache), not a store.

## Data model

```ts
Tenant  { id, name, displayName, enabled, createdAt }
Role   { id, tenantId, name, description, createdAt }
Client { id, tenantId, clientId, name, description, enabled, publicClient, rootUrl, createdAt }
User   { id, tenantId, username, email, firstName, lastName, enabled, createdAt, roleIds: string[] }
```

Users / clients / roles are scoped to a tenant; a user holds a set of `roleIds` (assignment).

## Project structure

```
src/
├── app/                      # Routing layer (thin): router, layouts, pages — composes features
│   ├── layouts/admin-layout.tsx
│   ├── pages/                # login-page, not-found-page
│   ├── router.tsx
│   └── App.tsx
├── components/               # Shared, wrapped UI: button, *-field, table, misc, notifications
├── config/env.ts             # Typed, validated env access
├── features/                 # PRIMARY place code lives — one module per feature
│   ├── auth/                 #   api/ (login, get-user, logout) · components/ (login-form, protected)
│   ├── tenants/               #   api/ · components/ (list, form, create, edit) · types/ · index.ts
│   ├── users/                #   …incl. assign-roles api + user-roles-form
│   ├── clients/
│   └── roles/
├── lib/                      # api-client.ts, react-query.ts
├── providers/                # app-provider.tsx (one composed provider)
├── stores/                   # notifications.ts (Zustand)
├── testing/                  # test-utils, setup, mocks/ (db + handlers + worker/server)
├── types/                    # shared ApiError
└── utils/                    # cn
```

Each feature exposes a **public API via `index.ts`**; cross-feature code only imports that
(`@/features/roles`), never internals. ESLint (`no-restricted-imports` + `import/no-cycle`) enforces
the rule, and shared code may not import features.

### Per-feature data layer

Every feature owns an `api/` folder, one file per operation holding the **request fn + its hook**:
a query (`get-*`) with a stable query key, or a mutation (`create-*` / `update-*` / `assign-roles`)
that **invalidates** the affected keys `onSuccess`. Responses are **parsed with Zod at the boundary**;
the rest of the feature trusts the inferred type. Components consume `useX()` hooks only — they never
call `fetch`.

## Running it

```bash
npm install
npm run msw:init     # one-time: writes public/mockServiceWorker.js (the browser worker)
npm run dev          # http://localhost:5173 — sign in with admin / admin
```

Other scripts:

```bash
npm run types:check   # strict tsc, no emit
npm run lint          # ESLint incl. the architecture import rules
npm run format:check  # Prettier
npm run test          # Vitest unit + integration (MSW-backed)
npm run e2e           # Playwright (run `npx playwright install` once first)
npm run build         # type-check + production bundle
```

**Demo credentials:** `admin` / `admin`.

> The MSW mock is the backend for this demo, so it's enabled in dev/preview via `VITE_API_MOCKING`.
> A real deployment would point `VITE_API_URL` at a server and ship with mocking disabled.

## Testing pyramid

- **Unit** — notifications store, `cn`, and Zod schemas (valid + invalid input).
- **Integration** (RTL + MSW) — login (validation, bad creds, success+redirect), tenants list
  (data + error state), create-tenant (validation + success toast), and **user role assignment**
  (reflects assigned roles, saves a new one).
- **E2E** (Playwright) — protected-route redirect → login, and create-a-tenant flow.

## Notes / deferred

- Storybook is set up in CSF style (`button.stories.tsx`) but the runtime isn't wired — add
  `@storybook/react` to view the catalog.
- Delete actions exist in the mock API; wiring delete buttons + confirm dialogs is a natural next slice.
- Tenant-scoped admin endpoints don't enforce the session in the mock (the `Protected` wrapper +
  `/auth/me` drive access control); a real backend would authorize every request.
