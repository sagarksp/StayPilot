import Link from "next/link";
import { redirect } from "next/navigation";
import { PrintSummaryButton } from "@/components/workspace/print-summary-button";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { prisma } from "@/infrastructure/db/prisma";
import { propertyUseCases } from "@/modules/property/application";
import type { PropertySummary } from "@/modules/property/domain/inventory";
import { residentUseCases } from "@/modules/resident/application";
import { reservationUseCases } from "@/modules/reservation/application";
import { billingUseCases } from "@/modules/billing/application/use-cases";
import { PropertyPerformance } from "./property-performance";
import styles from "./owner-dashboard.module.css";

const numberFormat = new Intl.NumberFormat("en-IN");

function formatDate(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(date);
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

function location(property: PropertySummary) {
  return [property.city, property.state].filter(Boolean).join(", ");
}

function formatPaise(paise: bigint) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise) / 100);
}

export default async function OwnerDashboardPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ q?: string }>;
}>) {
  const [{ orgId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("OWNER")) redirect("/org/" + orgId + "/properties");

  await reservationUseCases.expireReservations(actor);

  const [properties, managers, occupancy, reservations, billingOverview] = await Promise.all([
    propertyUseCases.listProperties(actor),
    prisma.organizationMembership.findMany({
      where: {
        status: "ACTIVE",
        organization: { publicId: orgId },
        user: { status: "ACTIVE" },
        roles: { some: { roleCode: "MANAGER" } },
      },
      select: {
        user: { select: { name: true, email: true } },
        pgAssignments: {
          where: { status: "ACTIVE", property: { status: "ACTIVE" } },
          select: { property: { select: { name: true } } },
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 4,
    }),
    residentUseCases.getOccupancy(actor),
    reservationUseCases.getOverview(actor),
    billingUseCases.getOverview(actor),
  ]);
  const { draftRent, finalizedRent } = billingOverview;

  const activeCount = properties.filter((property) => property.status === "ACTIVE").length;
  const totals = properties.reduce(
    (result, property) => ({
      floors: result.floors + property.floorCount,
      rooms: result.rooms + property.roomCount,
      beds: result.beds + property.bedCount,
    }),
    { floors: 0, rooms: 0, beds: 0 },
  );
  const searchTerm = query.q?.trim().slice(0, 100) ?? "";
  const visibleProperties = searchTerm
    ? properties.filter((property) => [property.name, property.code, property.addressLine1, property.city, property.state]
      .some((value) => value?.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase())))
    : properties;
  const recentProperties = [...properties]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);
  const now = new Date();
  const dateLabel = formatDate(now, actor.organizationTimezone);
  const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: actor.organizationTimezone }).format(now);
  const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", timeZone: actor.organizationTimezone }).format(now);
  const periodLabel = `1–${dayLabel} ${monthLabel} (MTD)`;
  return (
    <section className={styles.dashboard}>
      <header className={styles.pageHeader}>
        <div className={styles.headingCopy}>
          <div className={styles.headingMeta}>
            <span className={styles.livePill}><i aria-hidden="true" />Portfolio overview</span>
            <span aria-hidden="true" className={styles.metaSeparator}>·</span>
            <span className={styles.snapshotDate}>Data as of {dateLabel}</span>
          </div>
          <h1>Portfolio Overview</h1>
          <p>Property portfolio and configured inventory across {numberFormat.format(properties.length)} {properties.length === 1 ? "property" : "properties"}.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.periodCard}>
            <WorkspaceIcon name="calendar_today" />
            <span><small>Reporting Period</small><strong>{periodLabel}</strong></span>
          </div>
          <PrintSummaryButton className={styles.printButton} />
          <Link className={styles.primaryButton} href={`/org/${orgId}/properties/new`}>
            <WorkspaceIcon name="add_circle" />
            <span>Add Property</span>
          </Link>
        </div>
      </header>

      <section aria-label="Portfolio metrics" className={styles.metricsGrid}>
        <MetricCard
          icon="apartment"
          label="Properties"
          note={`${numberFormat.format(activeCount)} active · ${numberFormat.format(properties.length - activeCount)} inactive`}
          value={numberFormat.format(properties.length)}
        />
        <MetricCard
          icon="bed"
          label="Total Beds"
          note={`Across ${numberFormat.format(totals.rooms)} configured rooms`}
          value={numberFormat.format(totals.beds)}
        />
        <MetricCard
          label="Occupied"
          note={`${numberFormat.format(occupancy.activeBedCount)} active beds in service`}
          value={numberFormat.format(occupancy.occupiedBedCount)}
        />
        <MetricCard
          accent="gold"
          label="Reserved"
          note="Beds reserved for today"
          value={numberFormat.format(reservations.reservedBedCountToday)}
        />
        <MetricCard
          icon="door_open"
          label="Vacant"
          note="Active beds without a current stay or reservation"
          value={numberFormat.format(Math.max(0, occupancy.activeBedCount - occupancy.occupiedBedCount - reservations.reservedBedCountToday))}
        />
        <MetricCard
          accent="dark"
          icon="pie_chart"
          label="Effective Occ."
          note="Occupied active beds ÷ active beds in service"
          value={occupancy.activeBedCount
            ? `${Math.round((occupancy.occupiedBedCount / occupancy.activeBedCount) * 100)}%`
            : "—"}
        />
      </section>

      <section aria-label="Financial summary" className={styles.financialGrid}>
        <div className={`${styles.panel} ${styles.financePanel}`}>
          <div className={styles.panelHeading}>
            <div>
              <div className={styles.titleWithIcon}>
                <WorkspaceIcon name="account_balance" />
                <h2>Rent Realization &amp; Escrow Summary</h2>
              </div>
              <p>Rent invoice totals from finalized and pending drafts.</p>
            </div>
            <span className={styles.cycleBadge}>Cycle: {monthLabel}</span>
          </div>
          <div className={styles.financeCards}>
            <FinanceCard label="Draft Rent Invoices" icon="request_quote" note={`${numberFormat.format(draftRent._count)} awaiting review`} value={formatPaise(draftRent._sum.totalPaise ?? BigInt(0))} />
            <FinanceCard label="Realized Collections" icon="payments" note="No payment records available" tone="blue" />
            <FinanceCard label="Finalized Rent Invoices" icon="pending_actions" note={`${numberFormat.format(finalizedRent._count)} finalized · payments not recorded`} tone="gold" value={formatPaise(finalizedRent._sum.totalPaise ?? BigInt(0))} />
            <FinanceCard label="Escrow Security Deposits" icon="verified_user" note="No deposit records available" />
          </div>
          <div className={styles.financeFooter}>
            <span><i aria-hidden="true" />Invoice totals exclude payment allocations.</span>
            <Link className={styles.unavailableAction} href={`/org/${orgId}/finance`}>Review invoices</Link>
          </div>
        </div>

        <div className={`${styles.panel} ${styles.chartPanel}`}>
          <div className={styles.panelHeading}>
            <div><h2>Realization Velocity</h2><p>Rent collection history</p></div>
            <span className={styles.chartLegend}><i aria-hidden="true" />Realized</span>
          </div>
          <div className={styles.chartEmpty}>
            <svg aria-hidden="true" className={styles.chartGrid} preserveAspectRatio="none" viewBox="0 0 400 180">
              <line x1="10" x2="390" y1="25" y2="25" /><line x1="10" x2="390" y1="68" y2="68" />
              <line x1="10" x2="390" y1="111" y2="111" /><line x1="10" x2="390" y1="154" y2="154" />
            </svg>
            <div>
              <WorkspaceIcon name="bar_chart" />
              <strong>No billing history yet</strong>
              <p>Collection trends will appear after billing records are added.</p>
            </div>
          </div>
          <div className={styles.chartFooter}><span>Reporting period</span><strong>{monthLabel}</strong></div>
        </div>
      </section>

      <section aria-labelledby="checkpoint-heading" className={styles.checkpointSection}>
        <div className={styles.sectionHeading}>
          <div className={styles.titleWithIcon}>
            <WorkspaceIcon name="tune" />
            <h2 id="checkpoint-heading">Active Operational Checkpoints</h2>
          </div>
          <span>Operational tracking</span>
        </div>
        <div className={styles.checkpointsGrid}>
          <CheckpointCard icon="flight_takeoff" label="Move-Outs" note="Resident move-out tracking is not available yet" />
          <CheckpointCard icon="person_add" label="Upcoming Intakes" note="Active reservations across your properties" tone="green" value={numberFormat.format(reservations.activeCount)} />
          <CheckpointCard icon="pending_actions" label="48-Hr Collection" note="Invoice due dates are not available yet" tone="gold" />
          <CheckpointCard icon="build" label="Open Tickets" note="Maintenance tickets are not available yet" />
          <CheckpointCard icon="bolt" label="Sub-meter Billing" note="Utility meter records are not available yet" tone="teal" />
        </div>
      </section>

      <section aria-labelledby="property-performance-heading" className={styles.panel}>
        <PropertyPerformance orgId={orgId} properties={visibleProperties} searchTerm={searchTerm} />
      </section>

      <section aria-label="Portfolio activity and owner actions" className={styles.lowerGrid}>
        <div className={`${styles.panel} ${styles.activityPanel}`}>
          <div className={styles.panelHeading}>
            <div className={styles.titleWithIcon}>
              <WorkspaceIcon name="history" />
              <h2>Portfolio Activity Stream</h2>
            </div>
            <span className={styles.activityScope}><i aria-hidden="true" />Property records</span>
          </div>
          {recentProperties.length ? (
            <div className={styles.activityList}>
              {recentProperties.map((property) => (
                <Link className={styles.activityItem} href={`/org/${orgId}/properties/${property.id}`} key={property.id}>
                  <WorkspaceIcon className={`${styles.activityIcon} material-symbols-outlined`} name="add_home_work" />
                  <span className={styles.activityCopy}>
                    <strong>Property record created: {property.name}</strong>
                    <small>{location(property)}{property.code ? ` · ${property.code}` : ""}</small>
                  </span>
                  <time dateTime={property.createdAt.toISOString()}>{formatDate(property.createdAt, actor.organizationTimezone)}</time>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.activityEmpty}>
              <WorkspaceIcon name="history" />
              <strong>No property activity yet</strong>
              <p>Property creation events will appear here.</p>
            </div>
          )}
          <div className={styles.activityFooter}>
            <span>Showing {recentProperties.length} of {properties.length} property records</span>
            <Link href={`/org/${orgId}/properties`}>View portfolio <span aria-hidden="true">→</span></Link>
          </div>
        </div>

        <div className={styles.rightPanels}>
          <div className={`${styles.panel} ${styles.managersPanel}`}>
            <div className={styles.panelHeading}>
              <div>
                <h2>Staff &amp; Managers</h2>
                <p>Organization managers and property assignments</p>
              </div>
              <span className={styles.countBadge}>{managers.length} listed</span>
            </div>
            {managers.length ? (
              <div className={styles.managerList}>
                {managers.map((manager) => {
                  const assignedProperties = manager.pgAssignments.map(({ property }) => property.name);
                  return (
                    <div className={styles.managerRow} key={manager.user.email}>
                      <span aria-hidden="true" className={styles.managerAvatar}>{initials(manager.user.name)}</span>
                      <span className={styles.managerIdentity}>
                        <strong>{manager.user.name}</strong>
                        <small>{assignedProperties.length ? assignedProperties.join(", ") : "No active property assignment"}</small>
                      </span>
                      <a aria-label={`Email ${manager.user.name}`} className={styles.contactLink} href={`mailto:${manager.user.email}`}>
                        <WorkspaceIcon name="mail" />
                      </a>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.managersEmpty}>No active managers are assigned to this organization.</div>
            )}
          </div>

          <div className={`${styles.panel} ${styles.acceleratorsPanel}`}>
            <div className={styles.panelHeading}>
              <div>
                <h2>Executive Accelerators</h2>
                <p>Shortcuts to available portfolio workflows</p>
              </div>
            </div>
            <div className={styles.acceleratorGrid}>
              <Accelerator href={`/org/${orgId}/properties/new`} icon="add_home_work" label="Add Property" note="Create a PG location" />
              <Accelerator href={`/org/${orgId}/properties`} icon="apartment" label="Properties" note="Review the portfolio" />
              <Accelerator href={properties[0] ? `/org/${orgId}/properties/${properties[0].id}` : `/org/${orgId}/properties/new`} icon="meeting_room" label="Build Inventory" note="Configure floors, rooms, beds" />
              <Accelerator href={`/org/${orgId}/residents`} icon="groups" label="Residents" note="Manage stays and occupancy" />
              <Accelerator href={`/org/${orgId}/owner`} icon="print" label="Print Summary" note="Open the browser print dialog" print />
            </div>
            <div className={styles.acceleratorFooter}>
              <span>Property inventory</span>
              <strong>{numberFormat.format(properties.length)} records</strong>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}

function MetricCard({
  icon,
  label,
  note,
  value,
  badge,
  accent,
}: Readonly<{
  icon?: string;
  label: string;
  note: string;
  value: string;
  badge?: string;
  accent?: "gold" | "dark";
}>) {
  const className = [styles.metricCard, accent === "gold" ? styles.metricCardGold : "", accent === "dark" ? styles.metricCardDark : ""].filter(Boolean).join(" ");
  return (
    <article className={className}>
      <div className={styles.metricTop}>
        <span>{label}</span>
        {icon ? <WorkspaceIcon className={`${styles.metricIcon} material-symbols-outlined`} name={icon} /> : <small>{badge}</small>}
      </div>
      <div className={styles.metricBottom}>
        <strong>{value}</strong>
        <p>{note}</p>
      </div>
    </article>
  );
}

function FinanceCard({
  icon,
  label,
  note,
  tone,
  value,
}: Readonly<{ icon: string; label: string; note: string; tone?: "blue" | "gold"; value?: string }>) {
  const className = [styles.financeCard, tone === "blue" ? styles.financeCardBlue : "", tone === "gold" ? styles.financeCardGold : ""].filter(Boolean).join(" ");
  return (
    <article className={className}>
      <div className={styles.financeCardTop}><span>{label}</span><WorkspaceIcon name={icon} /></div>
      <strong>{value ?? "—"}</strong>
      <p>{note}</p>
    </article>
  );
}

function CheckpointCard({
  icon,
  label,
  note,
  tone,
  value = "Not tracked",
}: Readonly<{ icon: string; label: string; note: string; tone?: "gold" | "green" | "teal"; value?: string }>) {
  const className = [styles.checkpointCard, tone === "gold" ? styles.checkpointGold : "", tone === "green" ? styles.checkpointGreen : "", tone === "teal" ? styles.checkpointTeal : ""].filter(Boolean).join(" ");
  return (
    <article className={className}>
      <div className={styles.checkpointTop}><span>{label}</span><WorkspaceIcon name={icon} /></div>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

function Accelerator({
  href,
  icon,
  label,
  note,
  print = false,
}: Readonly<{ href: string; icon: string; label: string; note: string; print?: boolean }>) {
  const className = styles.accelerator;
  const content = (
    <>
      <WorkspaceIcon className={`${styles.acceleratorIcon} material-symbols-outlined`} name={icon} />
      <span><strong>{label}</strong><small>{note}</small></span>
    </>
  );
  return print ? (
    <PrintSummaryButton className={className}>{content}</PrintSummaryButton>
  ) : (
    <Link className={className} href={href}>{content}</Link>
  );
}
