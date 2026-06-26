# B-View Expense Tracker

A full-stack institutional expense tracking web app for school administrators. Supports recording, categorizing, and managing expenses with JWT auth, role-based access, audit trails, and export capabilities.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, default)
- `pnpm --filter @workspace/b-view run dev` — run the frontend (port 24535)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (`jsonwebtoken`), `bcryptjs` for password hashing
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite, TanStack Query, wouter, shadcn/ui, recharts

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for API)
- `lib/api-client-react/src/generated/` — Generated React Query hooks + Zod schemas (do not edit manually)
- `lib/db/src/schema/` — Drizzle ORM table definitions (users, categories, departments, expenses, audit_logs)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — JWT middleware
- `artifacts/b-view/src/pages/` — React pages (dashboard, expenses, audit-logs, settings, login)
- `artifacts/b-view/src/lib/auth.tsx` — Auth context + token management

## Architecture decisions

- Contract-first API: OpenAPI spec drives codegen; all client hooks and Zod schemas are auto-generated via Orval — never hand-write API calls on the frontend.
- `bcryptjs` (pure JS) instead of `bcrypt` (native addon) — avoids native build issues in the Replit environment.
- JWT secret uses `SESSION_SECRET` env var (already set as a Replit secret).
- Token stored in `localStorage` as `bview_token`, attached to requests via `setAuthTokenGetter` in `custom-fetch.ts`.
- Export files generated to `artifacts/api-server/exports/` and served at `/api/export/download/:filename`.
- API server defaults to port 8080; workflow sets `PORT=8080` explicitly since `dev` script uses `${PORT:-8080}`.

## Product

- **Login**: JWT auth, 3 roles — Admin, FinanceOfficer, Auditor
- **Dashboard**: Summary cards + bar charts (spending by category, department, monthly trend)
- **Expenses**: Paginated list, search, create/edit/delete (role-gated), PDF/Excel export
- **Audit Logs**: Full trail of all changes with timestamps and user info
- **Settings**: User management (Admin only: add users, set roles), role permissions overview

## Seed accounts (all use password `Admin@2024`)

| Email | Role |
|---|---|
| admin@bview.edu | Admin |
| finance@bview.edu | FinanceOfficer |
| auditor@bview.edu | Auditor |

## User preferences

- Use `bcryptjs` (not `bcrypt`) for password hashing throughout this project.
- Oxford Blue theme (`#002147`) via CSS variables in `index.css`.

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change before editing frontend code.
- Run `pnpm run typecheck:libs` after changing any `lib/*` package before running leaf artifact typechecks.
- API server `dev` script builds then starts — so hot reload requires a full restart (no ts-node/tsx watch in dev).
- The mutation hooks use `{ data: Body }` wrapper (Orval convention), NOT passing the body directly.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
