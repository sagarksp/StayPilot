# StayPilot Project Status

**Last updated:** 2026-10-16

**Overall status:** In progress

This file tracks completed major project milestones. New major features should be added here as they are completed.

## Completed milestones

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

### 2026-10-13 â€” Manager workspace Stitch design alignment

**Status:** Complete

Aligned the manager workspace shell with the Stitch operations dashboard palette and component language. The sidebar now groups operational destinations, shows the current section and organization, and includes manager account details. The responsive mobile navigation keeps every manager destination reachable while the shared frame and top bar carry the same typography, surface tones, and teal accents across manager pages.

**Key areas:** `src/components/workspace/staff-shell.tsx`, `src/components/workspace/staff-shell.module.css`, `src/app/(workspace)/org/[orgId]/(staff)/layout.tsx`, `docs/PROJECT_STATUS.md`

### 2026-10-13 â€” Password recovery

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
