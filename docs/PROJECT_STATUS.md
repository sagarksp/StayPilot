# StayPilot Project Status

**Last updated:** 2026-10-09

**Overall status:** In progress

This file tracks completed major project milestones. New major features should be added here as they are completed.

## Completed milestones

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

The application foundation, public landing page, property inventory workflow, Stitch-aligned owner dashboard, resident occupancy MVP, reservation management MVP, manager operations dashboard, and rent invoice draft/review/finalization workflow are in place. The resident directory and profile follow the updated mobile-first Stitch design. Payment recording and allocation, resident invoice self-service, security deposits, support, and staff invitation workflows remain to be built.
