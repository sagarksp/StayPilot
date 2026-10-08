# StayPilot

StayPilot is a multi-tenant PG management SaaS. The V1 product direction and
domain constraints are documented in [`docs/`](docs/).

## Status

The public landing page, owner and manager workspaces, property inventory,
resident occupancy, reservation management, and rent invoice draft/review flow
are implemented. Email/password sign-in and organization setup use Better Auth
with server-side sessions.

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

1. Copy `.env.example` to `.env.local`, set a local `DATABASE_URL`, and generate
   an `AUTH_SECRET` with the command shown in `.env.example`.
2. Install the dependencies with `npm install`.
3. Generate the Prisma client with `npm run db:generate`.
4. Apply the checked-in local schema with `npm run db:migrate:deploy`.
5. From the `C:\StayPilot` project root, start the development server with
   `npm run dev -- --hostname 127.0.0.1 --port 3000`, then register an owner
   account at `/register` and create the first organization.

Open the exact local URL printed by Next.js. If port 3000 is already in use,
stop the other development server first so the browser doesn't show a different
checkout or an older build.

The Prisma schema includes global auth identities, organization memberships,
property inventory, stays, reservations, rent rates, and invoices. Local
database credentials and the checked-in migrations are required before the
workflow can run. Do not run database migration scripts against a production
database from a developer workstation.

The internal billing scheduler is `POST /api/internal/billing/generate-drafts`.
Configure the scheduler to call it daily with `Authorization: Bearer <CRON_SECRET>`;
the endpoint creates rent drafts five days before their due date. Set a strong
`CRON_SECRET` in each environment. Owners and assigned managers review drafts
under Invoices; finalization is always an explicit action.

Owner accounts can register and create an organization. Staff and resident
accounts are not yet provisioned through invitation workflows.
Email verification, password recovery, and staff/resident invitations are not
configured yet. The platform-admin route stays unavailable until a separate
platform-admin identity and authorization flow is implemented.

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
