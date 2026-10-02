# StayPilot

StayPilot is a multi-tenant PG management SaaS. The V1 product direction and
domain constraints are documented in [`docs/`](docs/).

## Status

This repository contains the initial Next.js application scaffold. The Owner and
Manager workspaces share their operational resource pages; each has a separate
dashboard entry. Residents have a separate portal shell. The current workspace
pages are static scaffolding and do not load tenant data or enforce sessions.

Authentication is intentionally not wired yet. The authentication library and
its user/schema mapping must be selected before adding session handlers or
tenant data access. No authentication catch-all route is defined.

## Architecture boundaries

- `src/app/` contains route composition, layouts, and transport entry points.
- `src/modules/` owns business capabilities, including their forms and
  feature-specific UI. Add modules as milestones begin.
- `src/infrastructure/` owns database and external-service adapters.
- `src/shared/` is for small, framework-independent cross-cutting code.
- `src/components/` is for shared visual primitives and workspace shells.
- `prisma/` owns the MySQL schema and reviewed migrations.

Route components and handlers must call application use cases. They must not
query Prisma directly. Tenant authorization must be enforced on the server
before loading tenant-owned data or issuing file URLs.

## Local setup

Prerequisites: Node.js 22.12 or newer, npm, and a local MySQL database.

1. Copy `.env.example` to `.env.local` and set a local `DATABASE_URL`.
2. Install the dependencies with `npm install`.
3. Start the development server with `npm run dev`.

The schema currently declares only the MySQL provider. Business models and
migrations are intentionally held until the auth identity mapping and API
alignment notes are resolved. Do not run database migration scripts against a
production database from a developer workstation.

## Scripts

- `npm run dev` — start Next.js locally.
- `npm run build` / `npm run start` — build and serve the production app.
- `npm run lint` — run ESLint.
- `npm run typecheck` — check TypeScript.
- `npm test` — run Vitest when domain tests are added.
- `npm run db:generate` — generate Prisma Client after the schema is defined.
- `npm run db:migrate:dev` — create/apply a local development migration.
- `npm run db:migrate:deploy` — apply reviewed migrations during release.
- `npm run db:studio` — open Prisma Studio.

## Environments

V1 environments are Local and Production. Keep local credentials in ignored
`.env.local` and configure production credentials as protected Vercel secrets.
Never expose `DATABASE_URL`, auth secrets, AWS credentials, email API keys, or
the cron secret through a `NEXT_PUBLIC_` variable.
