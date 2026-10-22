# StayPilot Project Status

**Last updated:** 2026-10-20

**Overall status:** In progress

This file tracks completed major project milestones. New major features should be added here as they are completed.

## Completed milestones

### 2026-10-20 — Finance and collections report

**Status:** Complete

Added a staff finance report with property and date filters, invoice totals, net payment collections, current outstanding balances, security-deposit receipts and refunds, and a detailed financial activity table. PDF and Excel exports use the shared report renderer. Manager queries and downloads remain limited to assigned properties; deposit ledger entries are reported separately from payment transactions to avoid double-counting.

**Key areas:** `src/modules/billing/application/schemas.ts`, `src/modules/billing/application/use-cases.ts`, `src/app/(workspace)/org/[orgId]/(staff)/reports/finance/page.tsx`, `src/app/api/v1/organizations/[orgId]/reports/download/route.ts`, `src/app/(workspace)/org/[orgId]/(staff)/reports/electricity/page.tsx`, `docs/PROJECT_STATUS.md`

### 2026-10-20 — Property occupancy report

**Status:** Complete

Added an as-of-date occupancy report by active property. It counts occupied, reserved, available, operational, and maintenance beds, and calculates weighted occupancy from operational beds. Reservations only count when their bed is not occupied; manager data and exports remain limited to assigned properties. Added PDF and Excel downloads through the shared report export route.

**Key areas:** `src/modules/property/application/schemas.ts`, `src/modules/property/application/repository.ts`, `src/modules/property/application/use-cases.ts`, `src/modules/property/infrastructure/prisma-property-repository.ts`, `src/app/(workspace)/org/[orgId]/(staff)/reports/occupancy/page.tsx`, `src/app/api/v1/organizations/[orgId]/reports/download/route.ts`, `docs/PROJECT_STATUS.md`

### 2026-10-20 — Reservation activity report

**Status:** Complete

Added a reservation report with property, lifecycle status, and overlapping stay-window filters. The report summarizes active, moved-in, cancelled, and expired reservations and advance deposit receipts, with resident, property/bed, stay dates, expected move-in, and status in its table. PDF and Excel exports use the shared renderer; managers remain scoped to assigned properties.

**Key areas:** `src/modules/reservation/application/schemas.ts`, `src/modules/reservation/application/repository.ts`, `src/modules/reservation/application/use-cases.ts`, `src/modules/reservation/infrastructure/prisma-reservation-repository.ts`, `src/app/(workspace)/org/[orgId]/(staff)/reports/reservations/page.tsx`, `src/app/api/v1/organizations/[orgId]/reports/download/route.ts`, `docs/PROJECT_STATUS.md`

### 2026-10-16 — Payment reversal ledger

**Status:** Complete

Added reasoned reversals for eligible invoice payments. Reversal rows are append-only, signed negative transactions linked to their original payment. The API requires an idempotency key, enforces the unreversed amount, and recalculates the invoice balance and status in a transaction. Staff can create reversals from finance; staff and residents see reversal activity and reasons in payment history. Payments tied to deposit transactions or completed stays are not eligible in this flow.

**Key areas:** `src/modules/billing/application/`, `src/modules/billing/ui/actions.ts`, `src/app/api/v1/organizations/[orgId]/payments/[paymentId]/reverse/route.ts`, `src/app/(workspace)/org/[orgId]/(staff)/finance/page.tsx`, `src/modules/resident/`, `prisma/schema.prisma`, `prisma/migrations/20261016000000_payment_reversals/migration.sql`, `README.md`

### 2026-10-02 — Project scaffold

**Status:** Complete

Created the Next.js application foundation, including public, authentication, organization workspace, and platform-admin route areas. Added initial staff and resident workspace shells, placeholder dashboard routes, shared UI structure, and the Prisma configuration and starter schema.

**Key areas:** `src/app/`, `src/components/`, `src/modules/`, `src/infrastructure/`, `prisma/`

### 2026-10-02 — Public landing page

**Status:** Complete

Built the public StayPilot landing page following the Stitch design direction. It introduces the product and its planned property, resident, finance, operations, portfolio, onboarding, and security areas. Live metric fields remain unpopulated until a data source is connected; landing-page copy and metric definitions are centralized for later updates.

**Key files:** `src/app/(public)/page.tsx`, `src/app/(public)/landing.module.css`, `src/app/(public)/landing-content.ts`

### 2026-10-03 — Property setup and inventory MVP

**Status:** Complete

Added email/password sessions and owner workspace setup, then implemented tenant-scoped property creation and inventory setup for floors, rooms, and beds. Organization membership and manager PG scope are checked on the server; composite database relations keep inventory links inside the owning organization and property.

**Key areas:** `src/modules/property/`, `src/infrastructure/auth/`, `src/infrastructure/db/`, `src/app/(workspace)/org/`, `prisma/schema.prisma`, `prisma/migrations/`

### 2026-10-04 — Executive owner dashboard MVP

**Status:** Complete

Rebuilt the owner landing page against the actual Stitch Executive Owner Dashboard screen, including its light owner console shell, grouped sidebar, top bar, six KPI cards, financial and chart panels, operational checkpoints, property performance grid/table switch, activity stream, manager panel, and executive shortcuts. Property, inventory, manager, and activity details come from organization-scoped database records; occupancy, booking, billing, support, and utility figures remain explicitly unavailable until those records and workflows exist. Search, property navigation, inventory links, manager email, and browser print are functional.

**Key files:** `src/app/(workspace)/workspace/page.tsx`, `src/app/(workspace)/org/[orgId]/(staff)/owner/page.tsx`, `src/app/(workspace)/org/[orgId]/(staff)/owner/property-performance.tsx`, `src/app/(workspace)/org/[orgId]/(staff)/owner/owner-dashboard.module.css`, `src/app/(workspace)/org/[orgId]/(staff)/layout.tsx`, `src/components/workspace/owner-console-shell.tsx`, `src/components/workspace/owner-console-shell.module.css`, `src/infrastructure/auth/actor-context.ts`, `src/modules/property/infrastructure/prisma-property-repository.ts`

### 2026-10-04 — Resident management and bed occupancy MVP

**Status:** Complete

Added organization-scoped resident records and stay history, active bed assignment, checkout, and reassignment workflows for owners and assigned property managers. Available beds are chosen from active inventory; database uniqueness constraints prevent two active stays from sharing a bed or resident. Resident names now appear on occupied property inventory beds, and the owner dashboard reports occupancy from active stay and inventory records. Reservation metrics remain unavailable until reservation records exist.

**Key areas:** `src/modules/resident/`, `src/app/(workspace)/org/[orgId]/(staff)/residents/`, `src/app/(workspace)/org/[orgId]/(staff)/properties/[propertyId]/page.tsx`, `src/app/(workspace)/org/[orgId]/(staff)/owner/page.tsx`, `prisma/schema.prisma`, `prisma/migrations/20261004000000_resident_occupancy/migration.sql`

### 2026-10-05 — Resident operations Stitch design refresh

**Status:** Complete

Refined the resident directory and profile screens to follow the updated mobile-first Stitch direction, using indigo interaction accents, slate borders, and compact resident cards while preserving owner and assigned-manager workflows. Occupied property beds now use the same resident accent when linking to a profile.

**Key files:** `src/app/(workspace)/org/[orgId]/(staff)/residents/page.tsx`, `src/app/(workspace)/org/[orgId]/(staff)/residents/[residentId]/page.tsx`, `src/app/(workspace)/org/[orgId]/(staff)/properties/[propertyId]/page.tsx`

### 2026-10-08 — Reservation management MVP

**Status:** Complete

Implemented organization-scoped reservation creation for existing residents and operational beds, including date-range overlap checks, automatic expiration after the reservation period, cancellation with a reason, and move-in that creates an active resident stay. Reservation access follows owner and assigned-manager property scope.

**Key areas:** `src/modules/reservation/`, `src/app/(workspace)/org/[orgId]/(staff)/reservations/`, `src/app/(workspace)/org/[orgId]/(staff)/owner/page.tsx`, `prisma/schema.prisma`, `prisma/migrations/20261008000000_reservations/migration.sql`

### 2026-10-08 — Manager operations and booking flow UX

**Status:** Complete

Replaced the manager dashboard placeholder with a live assigned-property overview, occupancy metrics, and resident/reservation actions. The reservation flow can now create a resident profile and hold a bed before move-in, while managers only see residents connected to their assigned properties. First-time organization setup continues directly into first-property creation, and resident pages clearly distinguish a new reservation from an immediate move-in.

**Key areas:** `src/app/(workspace)/org/[orgId]/(staff)/manager/page.tsx`, `src/app/(workspace)/org/[orgId]/(staff)/reservations/page.tsx`, `src/app/(workspace)/org/[orgId]/(staff)/residents/page.tsx`, `src/modules/reservation/`, `src/modules/resident/infrastructure/prisma-resident-repository.ts`, `src/app/(auth)/setup/`

### 2026-10-09 — Rent terms and invoice review MVP

**Status:** Complete

Added effective-dated rent rates to resident stays, with monthly billing on either the move-in day or a selected fixed day. Immediate move-in, reservation move-in, and return stays all capture rent terms; existing active stays can add or update terms from the resident profile. An authenticated internal job creates idempotent rent invoice drafts five days before their due date, and owners and assigned managers can review and finalize drafts. Invoice totals use integer paise, finalized invoices retain a snapshot, and the owner dashboard now reports draft and finalized rent invoice totals.

**Key areas:** `src/modules/billing/`, `src/app/(workspace)/org/[orgId]/(staff)/finance/page.tsx`, `src/app/api/internal/billing/generate-drafts/route.ts`, `src/app/api/v1/invoices/`, `src/modules/resident/`, `src/modules/reservation/`, `src/components/workspace/owner-console-shell.tsx`, `src/app/(workspace)/org/[orgId]/(staff)/owner/page.tsx`, `prisma/schema.prisma`, `prisma/migrations/20261009000000_billing_mvp/migration.sql`

## Current project position

### 2026-10-09 — Payment recording and invoice allocation MVP

**Status:** Complete

Owners and assigned managers can record full or partial payments against finalized rent invoices. Payment entries retain the date, method, optional reference and note, and recording staff name; balances and invoice payment status update in the same transaction. Overpayments and concurrent balance changes are rejected, and the owner dashboard reports recorded collections.

**Key areas:** `src/modules/billing/`, `src/app/(workspace)/org/[orgId]/(staff)/finance/page.tsx`, `src/app/(workspace)/org/[orgId]/(staff)/payments/page.tsx`, `src/app/api/v1/invoices/[invoiceId]/payments/route.ts`, `src/app/(workspace)/org/[orgId]/(staff)/owner/page.tsx`, `prisma/schema.prisma`, `prisma/migrations/20261009010000_payment_recording/migration.sql`

### 2026-10-09 — Reservation deposits and current rent visibility

**Status:** Complete

Aligned resident and bed views with the documented reservation-to-move-in lifecycle. Active reservations now remain “Reserved · move-in pending” until move-in creates a stay; direct bed assignment cannot bypass a resident’s active reservation. Staff can record an optional security-deposit receipt at reservation time, define the required deposit at move-in, carry prior receipts into a per-stay deposit ledger, and record partial receipts against the outstanding balance. Effective rent is now visible in resident and property views using the rate active for the organization’s local date.

**Key areas:** `src/modules/reservation/`, `src/modules/resident/`, `src/modules/billing/`, `src/app/(workspace)/org/[orgId]/(staff)/reservations/`, `src/app/(workspace)/org/[orgId]/(staff)/residents/`, `src/app/(workspace)/org/[orgId]/(staff)/properties/[propertyId]/page.tsx`, `src/app/(workspace)/org/[orgId]/(staff)/owner/page.tsx`, `prisma/schema.prisma`, `prisma/migrations/20261009020000_reservation_deposits_and_stay_links/migration.sql`

### 2026-10-09 — Checkout rent and deposit settlement

**Status:** Complete

Checkout rejects draft invoices, applies the open security deposit to finalized invoice dues, requires any remaining balance to be paid, records reasoned damage deductions, refunds the remaining deposit, and closes the stay in one transaction. Deposit receipts, invoice applications, deductions and refunds remain in the append-only ledger; a checkout process, settlement snapshot, and settlement items preserve the result for history.

**Key areas:** `src/modules/resident/`, `src/modules/billing/`, `src/app/(workspace)/org/[orgId]/(staff)/residents/[residentId]/page.tsx`, `prisma/schema.prisma`, `prisma/migrations/20261009030000_checkout_settlement/migration.sql`

### 2026-10-09 — Electricity billing MVP

**Status:** Complete

Added room and floor meter setup, meter retirement, cumulative reading history with monotonic validation, and manual or meter based bill drafts. Staff can calculate resident charges from actual stay days, review and reasoned override individual allocations while preserving the bill total, then finalize the bill into draft electricity invoices for finance review. Electricity invoices appear with other invoices and are included in checkout settlement through the existing invoice balance flow.

Added the documented per-property electricity mode and default unit rate, and made bill entry use those defaults. Reading choices now follow the selected property and meter, and the form only asks for the fields needed by its billing mode.

**Key areas:** `src/modules/electricity/`, `src/app/(workspace)/org/[orgId]/(staff)/electricity/`, `src/app/(workspace)/org/[orgId]/(staff)/finance/page.tsx`, `src/components/workspace/owner-console-shell.tsx`, `src/components/workspace/staff-shell.tsx`, `src/modules/property/infrastructure/prisma-property-repository.ts`, `prisma/schema.prisma`, `prisma/migrations/20261009040000_electricity_mvp/migration.sql`, `prisma/migrations/20261009050000_pg_settings_electricity_defaults/migration.sql`, `prisma/migrations/20261009060000_seed_pg_settings/migration.sql`

### 2026-10-10 — Electricity billing and collection reporting

**Status:** Complete

Added the documented owner and manager electricity billing and collection report with property and billing-period filters. The report includes finalized source bill totals, collections applied to finalized electricity invoices, remaining invoice balances, and separate draft bill and invoice totals. Both the workspace page and `GET /api/v1/organizations/{orgId}/reports/electricity` enforce organization and assigned-property scope; API money values are returned as integer-paise strings.

**Key areas:** `src/modules/electricity/application/schemas.ts`, `src/modules/electricity/application/use-cases.ts`, `src/app/(workspace)/org/[orgId]/(staff)/reports/electricity/page.tsx`, `src/app/api/v1/organizations/[orgId]/reports/electricity/route.ts`, `src/components/workspace/owner-console-shell.tsx`, `src/components/workspace/staff-shell.tsx`

### 2026-10-10 — Checkout notice and lock-in workflow

**Status:** Complete

Added per-property notice and lock-in settings, captured lock-in terms on each new stay, and added move-out notice submission with the minimum notice date and an owner or manager override reason for early lock-in exits. Checkout now requires an approved notice and cannot complete before its requested move-out date. Residents can submit a notice through the authenticated API; owners and assigned managers manage notice and checkout from the resident profile.

**Key areas:** `src/modules/property/`, `src/modules/resident/`, `src/app/(workspace)/org/[orgId]/(staff)/settings/`, `src/app/(workspace)/org/[orgId]/(staff)/residents/[residentId]/page.tsx`, `src/app/api/v1/organizations/[orgId]/stays/[stayId]/notice/route.ts`, `prisma/schema.prisma`, `prisma/migrations/20261010000000_checkout_notice_lock_in/migration.sql`

### 2026-10-12 — Resident billing and move-out self-service

**Status:** Complete

Expanded the resident portal with current stay details, finalized rent and electricity invoices, itemized charges, payment receipts, and security-deposit activity. Residents can submit a move-out notice from the portal; notice dates respect the property's notice period and the stay's lock-in end date. Portal records are matched by the signed-in email and shown only when exactly one resident profile matches inside the organization. Online payment collection is not included.

**Key areas:** `src/app/(workspace)/org/[orgId]/resident/`, `src/components/workspace/resident-portal-shell.tsx`, `src/modules/resident/application/`, `src/modules/resident/infrastructure/prisma-resident-repository.ts`, `src/modules/resident/ui/actions.ts`, `README.md`

### 2026-10-12 — Same-organization security-deposit transfers

**Status:** Complete

Owners and assigned managers can transfer deposit balances between eligible open stays inside their organization. Transfers validate both property scopes, source balance, and destination deposit capacity, then write paired `TRANSFER_OUT` and `TRANSFER_IN` ledger entries with a shared reference and reason in one transaction. Account ledger versions prevent concurrent receipts, transfers, and checkout settlements from spending the same balance. The finance page shows recent entries and respects manager property scope.

**Key areas:** `src/modules/resident/`, `src/app/(workspace)/org/[orgId]/(staff)/deposit-transfers/page.tsx`, `src/app/api/v1/organizations/[orgId]/stays/[stayId]/security-deposit/transfer/route.ts`, `src/components/workspace/owner-console-shell.tsx`, `src/components/workspace/staff-shell.tsx`, `prisma/schema.prisma`, `prisma/migrations/20261012000000_security_deposit_transfers/migration.sql`

### 2026-10-12 — Resident complaints and support workflow

**Status:** Complete

Residents can submit text-based maintenance or service complaints for an active stay and follow status updates in the resident portal. Owners and assigned managers can list complaints in their property scope, assign them to a manager assigned to that property, progress them through `OPEN` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`, and provide a required resolution note. Complaint creation, assignment, category changes, and status changes are stored in an append-only event history. Added self-service and staff APIs plus organization-scoped complaint status/category metrics. Complaint attachments were added in the 2026-10-13 milestone below.

**Key areas:** `src/modules/complaint/`, `src/app/(workspace)/org/[orgId]/(staff)/complaints/page.tsx`, `src/app/(workspace)/org/[orgId]/resident/page.tsx`, `src/app/api/v1/me/complaints/`, `src/app/api/v1/organizations/[orgId]/complaints/`, `src/app/api/v1/organizations/[orgId]/reports/complaints/`, `prisma/schema.prisma`, `prisma/migrations/20261013000000_complaints/migration.sql`, `src/components/workspace/owner-console-shell.tsx`, `src/components/workspace/staff-shell.tsx`

### 2026-10-12 — Manager invitations and property-scoped activation

**Status:** Complete

Owners can invite managers, select organization properties for their access, list active managers and pending invitations, edit active managers' property scopes, and resend pending links. Invitation tokens are single-use, expire after seven days, and are stored hashed; resending rotates the token. Invitees create an account or sign in with the invited email before acceptance creates their active manager membership and property assignments. Gmail SMTP delivery is supported when configured, and the owner receives a one-time link for manual sharing when email is unavailable. Resident activation invitations are recorded in the subsequent milestone.

**Key areas:** `src/modules/auth/application/manager-invitations.ts`, `src/modules/auth/ui/manager-invitations.tsx`, `src/modules/auth/ui/invitation-acceptance.tsx`, `src/infrastructure/auth/prisma-manager-invitations.ts`, `src/app/(workspace)/org/[orgId]/(staff)/team/page.tsx`, `src/app/(auth)/invite/[token]/page.tsx`, `src/app/api/v1/organizations/[orgId]/members/`, `src/app/api/v1/organizations/[orgId]/manager-invitations/`, `src/app/api/v1/organizations/[orgId]/managers/[membershipId]/pgs/`, `src/app/api/v1/auth/invitations/`, `prisma/schema.prisma`, `prisma/migrations/20261014000000_manager_invitations/migration.sql`

The application foundation, public landing page, property inventory workflow, Stitch-aligned owner dashboard, resident occupancy and reservation management, rent and electricity billing, payment recording, deposit receipts, checkout settlement, resident self-service, same-organization deposit transfers, complaints, and manager invitations are in place. Staff membership administration is recorded in the 2026-10-13 milestone below.

### 2026-10-12 — Resident activation invitations

**Status:** Complete

Added the documented resident activation handoff after immediate move-in, reassignment, and reservation move-in. Invitations are tied to the exact resident profile, single-use, hashed, and expire after seven days. Acceptance creates or attaches the resident organization membership and sends the account to its resident portal. Owners and assigned managers can resend from a resident profile and copy the one-time link if email delivery is unavailable. Invitation or email failures happen after the stay commits and do not undo move-in.

**Key areas:** `src/modules/auth/application/resident-invitations.ts`, `src/infrastructure/auth/prisma-resident-invitations.ts`, `src/modules/auth/ui/resident-invitation-card.tsx`, `src/modules/auth/ui/invitation-acceptance.tsx`, `src/modules/resident/ui/actions.ts`, `src/modules/reservation/ui/actions.ts`, `src/modules/resident/infrastructure/prisma-resident-repository.ts`, `src/modules/reservation/infrastructure/prisma-reservation-repository.ts`, `src/app/api/v1/organizations/[orgId]/residents/[residentId]/invitation/resend/route.ts`, `src/app/api/v1/auth/invitations/[token]/accept/route.ts`, `prisma/schema.prisma`, `prisma/migrations/20261014010000_resident_activation_invitations/migration.sql`

### 2026-10-13 — Owner and manager membership administration

**Status:** Complete

Owners can now list active and inactive owner/manager memberships and enable or disable access from Staff & Managers. Added the documented organization-scoped membership PATCH endpoint; disabling the final active owner is rejected, with an organization-row lock making the invariant safe across concurrent updates. No schema migration is required.

**Key areas:** `src/modules/auth/application/manager-invitations.ts`, `src/infrastructure/auth/prisma-manager-invitations.ts`, `src/modules/auth/ui/manager-invitations.tsx`, `src/app/api/v1/organizations/[orgId]/members/route.ts`, `src/app/api/v1/organizations/[orgId]/members/[membershipId]/route.ts`, `README.md`, `src/modules/auth/README.md`

### 2026-10-13 — Manager sign-in dashboard and operations snapshot

**Status:** Complete

Fixed the default post-login workspace redirect so managers land on their manager dashboard instead of the property list. Updated the operational overview to use the Stitch manager dashboard palette and added complaint follow-up counts and a direct triage action. Property, resident, reservation, and complaint data stay limited to the manager's assigned properties; managers without assignments see an explanation and no reservation creation shortcut.

**Key areas:** `src/app/(workspace)/workspace/page.tsx`, `src/app/(workspace)/org/[orgId]/(staff)/manager/page.tsx`, `src/components/workspace/staff-shell.tsx`, `README.md`

### 2026-10-13 — Manager dashboard Stitch visual refresh

**Status:** Complete

Refreshed the manager workspace to follow the Stitch operational dashboard direction: responsive manager navigation, a structured daily overview, compact live metrics, assigned-property inventory cards, resident and arrival queues, and an accessible bed-availability indicator. All dashboard data and links remain scoped to the manager's assigned properties.

**Key areas:** `src/app/(workspace)/org/[orgId]/(staff)/manager/page.tsx`, `src/app/(workspace)/org/[orgId]/(staff)/manager/manager-dashboard.module.css`, `src/components/workspace/staff-shell.tsx`, `src/components/ui/workspace-icon.tsx`, `docs/PROJECT_STATUS.md`

### 2026-10-13 — Manager workspace Stitch design alignment

**Status:** Complete

Aligned the manager workspace shell with the Stitch operations dashboard palette and component language. The sidebar now groups operational destinations, shows the current section and organization, and includes manager account details. The responsive mobile navigation keeps every manager destination reachable while the shared frame and top bar carry the same typography, surface tones, and teal accents across manager pages.

**Key areas:** `src/components/workspace/staff-shell.tsx`, `src/components/workspace/staff-shell.module.css`, `src/app/(workspace)/org/[orgId]/(staff)/layout.tsx`, `docs/PROJECT_STATUS.md`

### 2026-10-13 — Password recovery

**Status:** Complete

Added account recovery through a generic reset request flow and a single-use, one-hour Better Auth token. Reset messages are delivered through Gmail SMTP when configured, reset requests avoid disclosing whether an account exists, and successful password changes revoke active sessions.

**Key areas:** `src/infrastructure/auth/auth.ts`, `src/modules/auth/ui/password-recovery-forms.tsx`, `src/modules/auth/ui/sign-in-form.tsx`, `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx`, `README.md`, `src/app/(auth)/README.md`, `docs/PROJECT_STATUS.md`

### 2026-10-13 — Complaint file attachments

**Status:** Complete

Residents and staff can attach up to five JPEG, PNG, WebP, or PDF files to a complaint, with a 10 MB per-file limit and content signature validation. Files are stored in private S3 with server-side encryption; uploads and one-minute download redirects require the same organization, property, or resident complaint access as the complaint itself.

**Key areas:** `src/modules/complaint/infrastructure/attachments.ts`, `src/modules/complaint/ui/complaint-attachments.tsx`, `src/modules/complaint/infrastructure/prisma-complaint-repository.ts`, `src/app/api/v1/organizations/[orgId]/complaints/[complaintId]/attachments/`, `prisma/schema.prisma`, `prisma/migrations/20261015000000_complaint_attachments/migration.sql`, `.env.example`, `README.md`

### 2026-10-15 — Move-out rent clear-out

**Status:** Complete

Checkout now lets an owner or manager select full-cycle rent or rent prorated through the actual move-out date, and optionally record a reasoned early-exit charge. If finalized rent was paid above the selected amount, the difference becomes a checkout credit that can cover rent or electricity dues and then be refunded with the remaining deposit. Finalized invoice totals and line items remain unchanged; a separate adjustment is recorded and shown in invoice balances.

**Key areas:** `src/modules/resident/`, `src/modules/billing/`, `src/app/(workspace)/org/[orgId]/(staff)/residents/[residentId]/page.tsx`, `src/app/(workspace)/org/[orgId]/resident/page.tsx`, `prisma/schema.prisma`, `prisma/migrations/20261015010000_checkout_rent_adjustments/migration.sql`

### 2026-10-15 — Food meal poll MVP

**Status:** Complete

Added per-property meal type configuration and polls for meal dates from the next local day onward. Owners and assigned managers can configure meal types; assigned managers can create polls, set a voting cutoff before the meal date, close polls early, and review aggregate option counts. Residents with an active or notice-period stay can submit or update one vote per stay until the cutoff. Polls and votes are tenant- and property-scoped; owners can configure meal types but cannot view poll results.

**Key areas:** `src/modules/food/`, `src/app/(workspace)/org/[orgId]/(staff)/food/page.tsx`, `src/app/api/v1/organizations/[orgId]/pgs/[pgId]/food/`, `src/app/api/v1/me/food/`, `src/app/(workspace)/org/[orgId]/resident/page.tsx`, `prisma/schema.prisma`, `prisma/migrations/20261015020000_food_polls/migration.sql`

### 2026-10-16 - Resident dashboard Stitch refresh

**Status:** Complete

Finished the resident dashboard around the StayPilot Stitch resident portal design: warm off-white surfaces, a deep teal billing statement, responsive stay and invoice cards, quick links, recent payment and deposit activity, and fixed mobile navigation. Existing resident workflows remain connected for move-out notices, meal voting, invoices, complaint creation, and complaint updates. Dashboard content is based on organization-scoped resident records; no payment collection or unsupported resident services are implied.

**Key areas:** `src/app/(workspace)/org/[orgId]/resident/page.tsx`, `src/app/(workspace)/org/[orgId]/resident/resident-dashboard.module.css`, `src/components/workspace/resident-portal-shell.tsx`, `src/components/workspace/resident-portal-shell.module.css`, `src/components/ui/workspace-icon.tsx`, `src/modules/food/ui/resident-food-polls.tsx`, `src/modules/food/ui/resident-food-polls.module.css`, `src/modules/complaint/ui/resident-complaints.tsx`, `src/modules/complaint/ui/resident-complaints.module.css`

### 2026-10-16 - Email verification

**Status:** Complete

Password sign-in now requires verified email addresses. Registration and invitation signup send one-hour verification links, unverified sign-in attempts send a fresh link, and users can request a resend. Verification returns owners to workspace setup and invitees to the invitation they were accepting. SMTP setup requirements are documented for local and production environments.

**Key areas:** `src/infrastructure/auth/auth.ts`, `src/modules/auth/ui/register-form.tsx`, `src/modules/auth/ui/sign-in-form.tsx`, `src/modules/auth/ui/invitation-acceptance.tsx`, `src/app/(auth)/login/page.tsx`, `README.md`, `src/modules/auth/README.md`, `src/app/(auth)/README.md`

### 2026-10-16 - Platform admin organization overview

**Status:** Complete

Added a separate platform operations console guarded by a server-side allowlist of verified email identities, independent of tenant membership. Platform admins can review cross-tenant organization status, property totals, active membership totals, timezone, and creation date from a read-only directory. Platform-admin users route to this console after sign-in; tenant status changes remain unavailable until an audited workflow is specified.

**Key areas:** `src/infrastructure/auth/platform-admin-access.ts`, `src/modules/platform-admin/application/organization-overview.ts`, `src/infrastructure/platform-admin/prisma-platform-admin-overview.ts`, `src/app/(platform)/platform-admin/`, `src/components/workspace/platform-shell.tsx`, `src/app/(workspace)/workspace/page.tsx`, `.env.example`, `README.md`

### 2026-10-16 - Food poll owner-to-resident handoff

**Status:** Complete

Clarified the end-to-end food workflow for owners, assigned managers, and residents. Meal poll status now displays as closed once its property-local voting cutoff passes, even when its stored status remains open; vote writes were already guarded by the cutoff in the database transaction. Manager pages now explain the handoff and show an empty state before the first poll, while preserving owner privacy for vote totals and resident voting/change-vote access.

**Key areas:** `src/modules/food/application/use-cases.ts`, `src/app/(workspace)/org/[orgId]/(staff)/food/page.tsx`, `src/modules/food/ui/resident-food-polls.tsx`, `src/app/(workspace)/org/[orgId]/resident/page.tsx`, `docs/PROJECT_STATUS.md`

### 2026-10-16 - Food menus and documented voting API completion

**Status:** Complete

Completed the documented food workflow around meal menus and resident voting. Assigned managers can publish and edit property menus with dated meal items until a related poll closes; residents see published menus for their current stay and can vote or update their choice before the cutoff. Added scoped menu read/create/update APIs and the documented manager poll-close endpoint. Menu and item foreign keys preserve organization, property, and meal-type boundaries.

**Key areas:** `src/modules/food/`, `src/app/(workspace)/org/[orgId]/(staff)/food/page.tsx`, `src/app/(workspace)/org/[orgId]/resident/page.tsx`, `src/app/api/v1/organizations/[orgId]/pgs/[pgId]/food/`, `prisma/schema.prisma`, `prisma/migrations/20261016010000_food_menus/migration.sql`

### 2026-10-17 - Owner food and poll controls

**Status:** Complete

Owners can configure meal types, publish and edit menus, create and close polls, and review poll totals directly without a manager profile. Assigned managers retain access only to their assigned properties; owner access remains scoped to the owner's organization.

**Key areas:** `src/modules/food/application/use-cases.ts`, `src/app/(workspace)/org/[orgId]/(staff)/food/page.tsx`, `src/modules/food/ui/actions.ts`, `docs/PROJECT_STATUS.md`

### 2026-10-17 - Resident notice board

**Status:** Complete

Owners can publish notices organization-wide or for one property; assigned managers can publish to their properties. Staff can set an expiry date and withdraw notices, and current residents see active notices for their stay on the resident dashboard. Notice data is organization-scoped, with property-scoped access for managers.

**Key areas:** `src/modules/notice/`, `src/app/(workspace)/org/[orgId]/(staff)/notices/page.tsx`, `src/app/(workspace)/org/[orgId]/resident/page.tsx`, `src/components/workspace/owner-console-shell.tsx`, `src/components/workspace/staff-shell.tsx`, `prisma/schema.prisma`, `prisma/migrations/20261017000000_notice_board/migration.sql`

### 2026-10-17 - Filterable operational report downloads

**Status:** Complete

Expanded the staff reports page with electricity and complaints categories, property/date/status/category filters, and role-scoped PDF and Excel downloads. PDF exports use a paginated landscape table layout with report summaries; Excel exports include the same filter details, summary metrics, and full report rows. Complaint reports query all matching records rather than the shorter operational list.

**Key areas:** `src/app/(workspace)/org/[orgId]/(staff)/reports/electricity/page.tsx`, `src/app/api/v1/organizations/[orgId]/reports/download/route.ts`, `src/infrastructure/reports/report-export.ts`, `src/modules/complaint/application/`, `src/modules/complaint/infrastructure/prisma-complaint-repository.ts`, `docs/PROJECT_STATUS.md`

### 2026-10-19 - Audit trail

**Status:** Complete

Added organization-scoped audit records for invoice payments and reversals, invoice finalization, security deposit receipts and transfers, move-out requests, checkout, manager invitation and acceptance, membership status, and manager property access changes. Events are written in the same database transactions as the actions they describe. Owners can review organization events; managers see events for their assigned properties. The staff audit page shows the latest 100 records with event time, action, property, staff member, and summary.

**Key areas:** `src/modules/audit/`, `src/app/(workspace)/org/[orgId]/(staff)/audit/page.tsx`, `src/modules/billing/application/use-cases.ts`, `src/modules/resident/infrastructure/prisma-resident-repository.ts`, `src/infrastructure/auth/prisma-manager-invitations.ts`, `prisma/schema.prisma`, `prisma/migrations/20261019000000_audit_trail/migration.sql`, `docs/PROJECT_STATUS.md`

### 2026-10-19 - In-app notifications

**Status:** Complete

Added a per-user, organization-scoped notification inbox to resident, owner, and manager workspace headers. New complaints notify the property's owner and assigned managers; published and withdrawn notices notify current residents in the affected scope; a daily authenticated scheduler creates deduplicated reminders two calendar days before an unpaid finalized invoice is due. Added read tracking and a migration; the migration must be applied through the normal deployment process.

**Key areas:** `src/modules/notification/`, `src/components/workspace/notification-bell.tsx`, `src/app/api/v1/organizations/[orgId]/notifications/`, `src/app/api/internal/notifications/reminders/`, `src/modules/complaint/infrastructure/prisma-complaint-repository.ts`, `src/modules/notice/application/use-cases.ts`, `prisma/schema.prisma`, `prisma/migrations/20261019120000_in_app_notifications/migration.sql`, `README.md`

### 2026-10-19 - Resident documents and KYC review

**Status:** Complete

Residents can upload government ID, address proof, profile photo, or other verification documents and see pending, verified, or update-needed status. Owners can review all organization documents; managers can see and review files only for residents and documents linked to their assigned properties. Files use private, encrypted S3 storage with signature-checked uploads and short-lived download links. Upload, review, and staff download events are recorded in the audit log; residents receive an in-app notification after a review. The database migration must be applied through the normal deployment process.

**Key areas:** `src/modules/resident-document/`, `src/app/api/v1/organizations/[orgId]/me/documents/`, `src/app/api/v1/organizations/[orgId]/residents/[residentId]/documents/`, `src/app/(workspace)/org/[orgId]/resident/page.tsx`, `src/app/(workspace)/org/[orgId]/(staff)/residents/[residentId]/page.tsx`, `prisma/schema.prisma`, `prisma/migrations/20261019130000_resident_documents_kyc/migration.sql`, `README.md`

### 2026-10-20 - Security deposit report

**Status:** Complete

Added a staff report for current held and required security deposit balances, plus filtered deposit ledger activity. Owners can report across the organization; managers are restricted to assigned properties. The report supports PDF and Excel downloads and includes deposit activity associated with reservations before a deposit account is created. Archived properties remain available in the report so outstanding liabilities are not hidden.

**Key areas:** `src/modules/billing/application/schemas.ts`, `src/modules/billing/application/use-cases.ts`, `src/app/(workspace)/org/[orgId]/(staff)/reports/deposits/page.tsx`, `src/app/api/v1/organizations/[orgId]/reports/download/route.ts`, `src/app/(workspace)/org/[orgId]/(staff)/reports/electricity/page.tsx`, `docs/PROJECT_STATUS.md`

### 2026-10-20 - Audited platform organization controls

**Status:** Complete

Allowlisted platform administrators can suspend or reactivate an organization from the cross-tenant directory. Each change requires an explicit confirmation and a reason, updates the organization and appends an audit event in the same transaction. Unsupported organization states cannot be changed through this workflow; suspending an organization blocks tenant access while preserving its data.

**Key areas:** `src/app/(platform)/platform-admin/`, `src/modules/platform-admin/application/organization-status.ts`, `src/infrastructure/platform-admin/prisma-platform-admin-status.ts`, `src/modules/audit/application/events.ts`, `README.md`, `docs/PROJECT_STATUS.md`

### 2026-10-20 - Resident food availability and meal suggestions

**Status:** Complete

Residents can choose “Will Not Eat” in a meal poll and provide a suggestion for the kitchen. They can schedule, edit, or cancel away date ranges from the resident Food section; active ranges preserve their original past start date when edited. Away dates exclude residents from poll counts and daily kitchen attendance estimates. Residents with an active stay for a meal date receive an in-app notification when its poll opens; residents already marked away for that date are excluded. Managers see anonymous suggestions, poll participation counts for the coming two weeks, and expected resident meal counts. Owners or assigned managers can download a property-scoped 14-day kitchen plan CSV with attendance forecasts and poll results. The resident API supports listing, creating, updating, and cancelling away ranges. Apply the database migration through the normal deployment process.

**Key areas:** `src/modules/food/`, `src/modules/notification/`, `src/app/(workspace)/org/[orgId]/resident/page.tsx`, `src/app/(workspace)/org/[orgId]/(staff)/food/page.tsx`, `src/app/api/v1/me/food/`, `src/app/api/v1/organizations/[orgId]/reports/food-attendance/`, `prisma/schema.prisma`, `prisma/migrations/20261020140000_resident_food_availability/migration.sql`, `README.md`, `docs/PROJECT_STATUS.md`

### 2026-10-20 - Resident self-service profile updates

**Status:** Complete

Residents can update their own name and phone number from the resident portal. The update is scoped through the signed-in resident membership and organization; login email, verification, and financial fields are excluded from the form.

**Key areas:** `src/modules/resident/application/`, `src/modules/resident/infrastructure/prisma-resident-repository.ts`, `src/modules/resident/ui/actions.ts`, `src/app/(workspace)/org/[orgId]/resident/page.tsx`, `src/app/api/v1/me/profile/route.ts`, `README.md`, `docs/PROJECT_STATUS.md`

### 2026-10-20 - Developer owner onboarding and platform billing

**Status:** Implemented; database migrations must be applied before release

Expanded the allowlisted developer console with one-time owner setup invitations, configurable monthly price per active PG and currency, idempotent monthly invoice generation, organization and PG status controls, confirmed revenue totals, and owner payment review. Owners set their own passwords through the existing verified signup flow, see only their organization's platform invoices, and can submit external payment details using UPI, bank transfer, cash, card, or other. Submitted payments remain pending until a developer confirms them; confirmed receipts update invoice status. Organization and PG status changes require a reason and are added to the tenant audit log.

**Key areas:** `src/app/(platform)/platform-admin/`, `src/modules/platform-admin/`, `src/infrastructure/platform-admin/`, `src/app/(workspace)/org/[orgId]/(staff)/subscription/`, `src/app/(auth)/register/`, `src/app/(auth)/setup/`, `src/components/workspace/owner-console-shell.tsx`, `prisma/schema.prisma`, `prisma/migrations/20261020160000_platform_billing/migration.sql`, `prisma/migrations/20261020170000_platform_owner_invitations/migration.sql`, `README.md`

### 2026-10-20 - Inactive PG operational access enforcement

**Status:** Complete

Owner and manager operation scopes now include only active PGs. Inactive PGs are excluded from property-specific staff workflows, resident operational access, food, notices, complaints, documents, electricity, reservations, billing operations, and reports. Property detail routes reject inactive PGs, while the owner property directory and platform directory retain their status visibility. Reactivating a PG restores access to its preserved records and the manager assignments remain intact.

**Key areas:** `src/infrastructure/auth/actor-context.ts`, `src/modules/property/domain/inventory.ts`, `src/modules/{property,resident,reservation,billing,electricity,food,notice,complaint,resident-document}/`, `src/app/(workspace)/org/[orgId]/(staff)/properties/`, `README.md`, `docs/PROJECT_STATUS.md`

### 2026-10-21 - Automatic platform subscription invoices

**Status:** Complete

Added an authenticated, idempotent daily scheduler endpoint that generates the current month's platform invoice for active organizations with active PGs. Invoice pricing, currency, and PG count are captured when generated; later pricing or inventory changes do not rewrite existing bills. The developer dashboard retains manual generation for backfills.

**Key areas:** `src/app/api/internal/platform-billing/generate-invoices/route.ts`, `src/infrastructure/platform-admin/prisma-platform-billing.ts`, `src/app/(platform)/platform-admin/page.tsx`, `README.md`, `docs/PROJECT_STATUS.md`

### 2026-10-21 - Developer dashboard and PG-specific billing

**Status:** Complete; local migration applied

Refined the platform console with collapsible work areas, a six-month confirmed-revenue chart grouped by currency, and summary cards for tenants, active PGs, pending receipts, revenue, and open balances. Developers can select active PGs and create one monthly invoice per PG; scheduled billing also creates individual PG invoices. Owners see the PG covered by each invoice. Existing organization-wide invoices remain readable and are protected from duplicate billing for the same organization and month.

**Key areas:** `src/app/(platform)/platform-admin/`, `src/app/(workspace)/org/[orgId]/(staff)/subscription/page.tsx`, `src/infrastructure/platform-admin/prisma-platform-billing.ts`, `prisma/schema.prisma`, `prisma/migrations/20261021000000_platform_invoice_per_pg/migration.sql`, `README.md`, `docs/PROJECT_STATUS.md`

### 2026-10-21 - Invitation-only owner workspace setup

**Status:** Complete

Removed the public self-service owner registration path. The registration page only presents account creation for a valid developer-issued owner invitation, and workspace setup only presents organization creation when the invitation is valid and matches the signed-in email. The server action and organization setup use case also require the invitation token, preventing a direct form submission from creating an uninvited workspace.

**Key areas:** `src/app/(auth)/register/page.tsx`, `src/app/(auth)/setup/`, `src/modules/auth/application/setup-organization.ts`, `src/infrastructure/auth/prisma-organization-setup.ts`, `README.md`, `docs/PROJECT_STATUS.md`

### 2026-10-21 - Public demo requests and time-limited access

**Status:** Complete; local migration applied

Added an illustrative public landing dashboard and a demo request form with international calling-code selection. Demo requests appear in the developer dashboard, where the developer can close them or email a secure owner setup link with a 1-to-720-hour access window. The timer starts when the invited owner creates their workspace; tenant access is blocked after expiry and the owner sees an expiration page.

**Key areas:** `src/app/(public)/page.tsx`, `src/app/(public)/landing-content.ts`, `src/app/(public)/demo/`, `src/app/(public)/demo-expired/`, `src/app/(platform)/platform-admin/`, `src/infrastructure/demo-requests/`, `src/infrastructure/auth/actor-context.ts`, `src/infrastructure/auth/prisma-organization-setup.ts`, `prisma/schema.prisma`, `prisma/migrations/20261021120000_demo_requests_and_access/migration.sql`, `docs/PROJECT_STATUS.md`

### 2026-10-22 - Vercel production deployment preparation

**Status:** Code prepared; AWS database and Vercel project configuration remain

Added Vercel Cron schedules for rent drafts, reminders, and per-PG platform
invoices. The authenticated scheduler handlers now accept Vercel's GET
invocations while retaining POST support. Documented production setup, secret
configuration, database migration, and Preview/Production separation.

**Key areas:** `vercel.json`, `src/app/api/internal/`, `README.md`,
`docs/PROJECT_STATUS.md`

### 2026-10-22 - Responsive dashboard navigation

**Status:** Implemented; visual review on mobile devices remains

Added a consistent hamburger side drawer for owner, manager, resident, and
platform-admin workspaces. The drawer supports keyboard focus, Escape to close,
backdrop dismissal, and scroll locking. Mobile headers and content now adapt to
narrow screens while desktop navigation remains in place.

**Key areas:** `src/components/workspace/mobile-navigation-drawer.tsx`,
`src/components/workspace/*shell*`, `src/components/workspace/resident-mobile-nav.tsx`,
`src/components/ui/workspace-icon.tsx`, `docs/PROJECT_STATUS.md`

### 2026-10-22 - Collapsible operational records

**Status:** Implemented

Added collapsible sections for reservation history, resident records and stay
history, notice history, and the property food workflow. Food setup now groups
attendance estimates, meal types, menus, poll creation, and vote suggestions
under compact headings with useful record counts.

**Key areas:** `src/app/(workspace)/org/[orgId]/(staff)/food/page.tsx`,
`src/app/(workspace)/org/[orgId]/(staff)/reservations/page.tsx`,
`src/app/(workspace)/org/[orgId]/(staff)/residents/`,
`src/app/(workspace)/org/[orgId]/(staff)/notices/page.tsx`,
`docs/PROJECT_STATUS.md`

### 2026-10-22 - Global activity and feedback

**Status:** Implemented; visual review across role-specific layouts remains

Added a shared activity indicator for internal navigation and form submissions.
Accessible success and error messages now appear as dismissible, timed popups,
and one-time feedback query parameters are cleared after display to prevent
repeated messages on refresh.

**Key areas:** `src/components/ui/global-feedback.tsx`, `src/app/layout.tsx`,
`src/app/globals.css`, `docs/PROJECT_STATUS.md`
