# StayPilot

StayPilot is a multi-tenant PG management SaaS. The V1 product direction and
domain constraints are documented in [`docs/`](docs/).

## Status

The public landing page, owner dashboard, Stitch-aligned manager operations
dashboard, property inventory, resident occupancy, reservation management,
rent and electricity billing,
payment recording, checkout settlement, and resident billing self-service are
implemented, including auditable security-deposit transfers between stays of
the same resident. Deposits cannot be transferred to another person. The
resident portal supports maintenance requests with private
photo and PDF attachments; staff can assign, resolve, and close them with a
recorded status history. Configure `AWS_REGION`, `AWS_S3_BUCKET`,
`AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` to enable private S3 storage
for complaint attachments and resident verification documents.
The bucket should block public access; complaint downloads require organization
membership and a complaint-scoped authorization check, and links expire after
one minute.
Owners can invite managers, assign property access, and resend single-use
activation links. Owners can enable or disable owner and manager memberships;
each organization must retain one active owner. Email/password sign-in,
one-hour password reset links, and organization setup use Better Auth with
server-side sessions. Password reset delivery uses Gmail SMTP when
`GMAIL_SMTP_USER` and `GMAIL_SMTP_APP_PASSWORD` are configured. Create a Gmail
app password after enabling 2-Step Verification on the sending account.
Email verification is required for password sign-in and account activation.
Configure those Gmail SMTP values so StayPilot can send one-hour verification
links during registration and invitation acceptance.

Residents can select “Will Not Eat” for a meal poll and leave a suggestion for
the kitchen. They can also schedule or edit away date ranges from the Food
section; managers see the resulting expected meal counts and anonymous meal
suggestions. Active away ranges can be edited without changing their original
start date. The resident API supports listing, creating, updating, and
cancelling away ranges under `/api/v1/me/food/availability`. Owners and assigned
managers can download a property-scoped 14-day kitchen plan CSV with attendance
forecasts, poll totals, and anonymous suggestions. Residents with an active
stay for a meal date receive an in-app notification when its poll opens;
residents already marked away for that date are excluded. Apply the food
availability migration through the normal deployment process.

Residents can update their name and phone number from their portal. Login email,
verification, and financial records are not editable through this self-service
form.

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
5. Set `PLATFORM_ADMIN_EMAILS` to the developer email address, then from the
   `C:\StayPilot` project root start the development server with
   `npm run dev -- --hostname localhost --port 3000`. On a fresh database, open
   `/register?platformAdmin=1` to create and verify the developer account. After
   signing in, invite the first owner from `/platform-admin` and have the owner
   finish setup from the emailed invitation.

## Production deployment

StayPilot can be deployed to Vercel from the GitHub repository. Use a managed
MySQL-compatible database reachable by Vercel and keep production data separate
from local and preview environments. The current GitHub working branch is
`dev`; choose the intended production branch in Vercel before connecting the
production domain.

Before the first production deployment:

1. Create the production database and a restricted application database user.
   Configure TLS and database network access for the deployment and migration
   runner. Avoid opening the database to all internet addresses.
2. Import the GitHub repository into Vercel and set the repository root as the
   project root. The project uses Node.js 22.12 or newer and `npm run build`.
3. Configure the production environment variables from `.env.example` in
   Vercel: `DATABASE_URL`, `APP_URL`, `AUTH_SECRET`,
   `PLATFORM_ADMIN_EMAILS`, `GMAIL_SMTP_USER`, `GMAIL_SMTP_APP_PASSWORD`, and
   `CRON_SECRET`. Also configure `AWS_REGION`, `AWS_S3_BUCKET`,
   `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` to enable private file
   uploads. Keep these values server-side; never use `NEXT_PUBLIC_` names for
   secrets. Set `APP_URL` to the final HTTPS domain and use a random
   `AUTH_SECRET` with at least 32 characters.
4. Apply all checked-in Prisma migrations to the production database with
   `npm run db:migrate:deploy` from a trusted runner that can reach the database.
   Back up the database first. Do not run `migrate dev`, `db push`, or reset
   commands against production.
5. Deploy, attach the custom domain, and verify sign-in, verification email,
   owner invitations, demo requests, private file uploads, and billing.

Vercel Cron is configured in `vercel.json` to run rent draft generation,
notifications, and platform invoice generation daily at staggered times in UTC.
Each route validates the `Authorization: Bearer <CRON_SECRET>` header and
supports the GET method Vercel Cron invokes. Platform invoice generation
requires a developer-configured monthly price and currency; configure these
before expecting scheduled platform invoices.

Configure separate Preview environment values and a separate Preview database
before enabling preview deployments. Do not point Preview deployments at the
production database.

Set `APP_URL` to the exact origin used in the browser. For the command above,
use `http://localhost:3000`; `localhost` and `127.0.0.1` use separate browser
cookies, so invitation links opened on the other host will not carry the sign-in
session.

Complaint attachments accept JPEG, PNG, WebP, and PDF files up to 10 MB each,
with a maximum of five files per complaint. Limit S3 permissions to the
configured bucket and the application's complaint and resident KYC object
prefixes.

Residents can upload up to ten active government ID, address proof, profile
photo, or other verification documents in JPEG, PNG, WebP, or PDF format, up to
10 MB per file. Files are private, encrypted at rest in S3, and only available
through one-minute download links after resident identity or assigned-property
access checks. Owners can review organization documents; managers can review
only documents linked to their assigned properties. Document uploads, staff
reviews, and staff downloads are recorded in the audit log. Rejected files stay
in the resident's history, and a new upload can be submitted for review.

Open the exact local URL printed by Next.js. If port 3000 is already in use,
stop the other development server first so the browser doesn't show a different
checkout or an older build.

If a database-backed page such as Security deposit transfers or Complaints fails
to load after pulling updates, apply any newly checked-in local migrations with
`npm run db:migrate:deploy`, then restart the development server. Complaint pages
need the `20261015000000_complaint_attachments` migration because their queries
include attachment metadata. Check the
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

Platform subscription invoices are generated idempotently per PG by
`POST /api/internal/platform-billing/generate-invoices`. Configure the same
daily scheduler with `Authorization: Bearer <CRON_SECRET>`; it creates the
current UTC month invoice for every active PG in active organizations, using
the current developer-configured rate and currency. Each invoice identifies one
PG, and owners see the PG name and can submit payment against its invoice. The
developer dashboard can create invoices for selected PGs or backfill a month.
Existing invoices are not changed, so later pricing changes apply to invoices
created afterward. Existing organization-wide invoices remain visible as legacy
invoices and prevent duplicate per-PG billing for that organization and month.
The endpoint returns `409 PRICING_NOT_CONFIGURED` until a positive monthly rate
has been saved.

In-app notifications are available in each workspace header. Complaints notify
the property's owner and assigned managers, published or withdrawn notices
notify current residents in their scope, and invoice due reminders are
deduplicated per resident and invoice. Configure the existing daily scheduler to
also call `POST /api/internal/notifications/reminders` with the same
`Authorization: Bearer <CRON_SECRET>` header. The reminder endpoint creates an
in-app notification two calendar days before an unpaid finalized invoice is due;
email delivery is not included.

Owners and assigned managers can record full or partial payments against
finalized invoices from the finance page. They can reverse eligible invoice
payments with a reason; reversals are stored as signed append-only ledger rows,
use an idempotency key in the API, and update the invoice's paid balance.
Online payment collection is not included.

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

Owner account creation requires a developer-issued setup invitation. The
`/register` route redirects visitors without an invitation to sign-in, and
`/setup` only shows organization creation for the invited, signed-in email. Invited owners
verify their email and create the organization from their one-time link.
Platform operations access is separate from tenant membership and is
granted only to verified email addresses listed in `PLATFORM_ADMIN_EMAILS`.
The platform-admin console provides a cross-tenant organization directory and
operational totals. Allowlisted platform administrators can suspend or
reactivate an organization with a required reason; each change is recorded in
that organization's audit log. Configure `PLATFORM_ADMIN_EMAILS` with verified
email addresses only.

Platform administrators can send owners a seven-day setup link, configure the
monthly subscription price per active PG and its ISO currency, generate monthly
owner invoices, review external payment submissions, and activate or deactivate
PG records with an audit reason. Owners choose their own passwords and verify
their email; credentials are never emailed. Payment methods currently include
UPI, bank transfer, cash, card, and other. Owners see only their organization's
platform invoices, and a payment is counted as revenue only after platform
administrator confirmation. Apply the platform billing migrations with
`npm run db:migrate:deploy` before using these controls.

The public landing page shows clearly marked illustrative dashboard figures.
Prospects can submit a demo request at `/demo`; developers review requests in
the platform dashboard and can email a one-time owner setup link with up to 720
hours of demo access. The timer starts when the invited owner creates a
workspace, and the organization becomes inaccessible when the demo expires.
Apply the demo access migration with `npm run db:migrate:deploy` before using
the demo request and review flow.
Deactivated PGs disappear from tenant staff operation scopes, cannot be opened
from the property inventory, and no longer expose resident operations; their
stored history remains available again if the developer reactivates the PG.

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
