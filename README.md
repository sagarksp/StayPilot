# StayPilot

StayPilot is a multi-tenant PG management SaaS. The V1 product direction and
domain constraints are documented in [`docs/`](docs/).

## Status

The public landing page, owner dashboard, Stitch-aligned manager operations
dashboard, property inventory, resident occupancy, reservation management,
rent and electricity billing,
payment recording, checkout settlement, and resident billing self-service are
implemented, including auditable security-deposit transfers within an
organization. The resident portal supports text-based maintenance requests;
staff can assign, resolve, and close them with a recorded status history.
Owners can invite managers, assign property access, and resend single-use
activation links. Owners can enable or disable owner and manager memberships;
each organization must retain one active owner. Email/password sign-in,
one-hour password reset links, and organization setup use Better Auth with
server-side sessions. Password reset delivery uses Gmail SMTP when
`GMAIL_SMTP_USER` and `GMAIL_SMTP_APP_PASSWORD` are configured. Create a Gmail
app password after enabling 2-Step Verification on the sending account.

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

Set `APP_URL` to the exact origin used in the browser. For the command above,
use `http://127.0.0.1:3000`; `localhost` and `127.0.0.1` use separate browser
cookies, so invitation links opened on the other host will not carry the sign-in
session.

Open the exact local URL printed by Next.js. If port 3000 is already in use,
stop the other development server first so the browser doesn't show a different
checkout or an older build.

If a database-backed page such as Security deposit transfers or Complaints fails
to load after pulling updates, apply any newly checked-in local migrations with
`npm run db:migrate:deploy`, then restart the development server. Check the
configured database first; do not run this command against production from a
developer workstation.

The Prisma schema includes global auth identities, organization memberships,
property inventory, stays, reservations, rent rates, invoices, and invoice
payments. Local
database credentials and the checked-in migrations are required before the
workflow can run. Do not run database migration scripts against a production
database from a developer workstation.

The internal billing scheduler is `POST /api/internal/billing/generate-drafts`.
Configure the scheduler to call it daily with `Authorization: Bearer <CRON_SECRET>`;
the endpoint creates rent drafts five days before their due date. Set a strong
`CRON_SECRET` in each environment. Owners and assigned managers review drafts
under Invoices; finalization is always an explicit action.

Owners and assigned managers can record full or partial payments against
finalized invoices from the finance page. Payment amounts are allocated to one
invoice at a time; online payment collection and reversals are not included.

After a confirmed move-in, StayPilot creates a resident activation invitation
when the profile has an email address. The link is single-use, expires after
seven days, and is stored as a hash. Residents can activate with the invited
email or sign in, then view their own stay, finalized invoices, payment
receipts, deposit activity, and support requests. Owners and assigned managers
can resend an invitation from the resident profile; if email delivery is
unavailable, the one-time link can be copied there. Online payments are not
included.

Owners can invite managers from Staff & Managers. Invitation links expire after
seven days and are stored as hashes. Set `GMAIL_SMTP_USER` and
`GMAIL_SMTP_APP_PASSWORD` to deliver invitations through Gmail SMTP. When email delivery is unavailable, the
owner can share the one-time link displayed after creating or resending an
invitation. Manager activation requires the invited email address and records
the selected organization property scope. Owners can update manager property
access later from the same page. After acceptance, managers go directly to the
invited organization even if they already belong to another one.
Owners can also enable or disable owner and manager memberships from that page.
The API refuses to disable the organization's final active owner.
Managers land on their assigned-property operations dashboard after sign-in,
with occupancy, reservation, and complaint follow-up counts scoped to their
assigned properties.

Owner accounts can register and create an organization. Email verification is
not configured yet. The platform-admin route stays
unavailable until a separate
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
