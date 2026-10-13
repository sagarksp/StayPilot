import Link from "next/link";
import { redirect } from "next/navigation";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { complaintUseCases } from "@/modules/complaint/application";
import { propertyUseCases } from "@/modules/property/application";
import { reservationUseCases } from "@/modules/reservation/application";
import { residentUseCases } from "@/modules/resident/application";
import styles from "./manager-dashboard.module.css";

const numberFormat = new Intl.NumberFormat("en-IN");

export default async function ManagerDashboardPage({ params }: Readonly<{ params: Promise<{ orgId: string }> }>) {
  const { orgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("MANAGER")) redirect(`/org/${orgId}/owner`);

  await reservationUseCases.expireReservations(actor);
  const [properties, residents, occupancy, reservations, complaints] = await Promise.all([
    propertyUseCases.listProperties(actor),
    residentUseCases.listResidents(actor),
    residentUseCases.getOccupancy(actor),
    reservationUseCases.getOverview(actor),
    complaintUseCases.getMetricsForStaff(actor),
  ]);

  const currentResidents = residents.filter((resident) => resident.currentStay).length;
  const openComplaintCount = complaints.byStatus
    .filter(({ status }) => status === "OPEN" || status === "IN_PROGRESS")
    .reduce((total, { count }) => total + count, 0);
  const occupancyRate = occupancy.activeBedCount
    ? Math.round((occupancy.occupiedBedCount / occupancy.activeBedCount) * 100)
    : 0;
  const availableBeds = Math.max(
    0,
    occupancy.activeBedCount - occupancy.occupiedBedCount - reservations.reservedBedCountToday,
  );
  const today = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: actor.organizationTimezone,
  }).format(new Date());

  return (
    <section className={styles.dashboard}>
      <header className={styles.pageHeader}>
        <div className={styles.headingCopy}>
          <div className={styles.headingMeta}>
            <span className={styles.livePill}><span aria-hidden="true" />Daily operations</span>
            <span aria-hidden="true" className={styles.metaSeparator}>&middot;</span>
            <span className={styles.snapshotDate}>{today}</span>
          </div>
          <h1>Manager dashboard</h1>
          <p>Your assigned properties, resident activity, and work that needs attention.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.periodCard}>
            <WorkspaceIcon className={styles.periodIcon} name="calendar_today" />
            <span><small>Organization</small><strong>{actor.organizationName}</strong></span>
          </div>
          {properties.length ? (
            <Link className={styles.primaryButton} href={`/org/${orgId}/reservations`}>
              <WorkspaceIcon className={styles.buttonIcon} name="add_circle" />
              <span>New reservation</span>
            </Link>
          ) : null}
        </div>
      </header>

      <section aria-label="Assigned property metrics" className={styles.metricsGrid}>
        <MetricCard detail="In your manager scope" icon="domain" label="Properties" value={properties.length} />
        <MetricCard detail={`${numberFormat.format(residents.length)} resident records`} icon="groups" label="Residents staying" value={currentResidents} />
        <MetricCard detail={`${numberFormat.format(occupancy.activeBedCount)} active beds`} icon="bed" label="Occupied beds" value={occupancy.occupiedBedCount} />
        <MetricCard detail={`${numberFormat.format(reservations.activeCount)} active reservations`} icon="event_available" label="Reserved today" value={reservations.reservedBedCountToday} />
        <MetricCard detail="Open or in progress" icon="report_problem" label="Open complaints" value={openComplaintCount} />
      </section>

      <section className={styles.contentGrid}>
        <section aria-labelledby="assigned-properties-heading" className={styles.propertiesPanel}>
          <header className={styles.panelHeading}>
            <div>
              <p className={styles.sectionEyebrow}>PROPERTY PORTFOLIO</p>
              <h2 id="assigned-properties-heading">Your assigned properties</h2>
              <p>Inventory and access are limited to your assigned locations.</p>
            </div>
            <Link className={styles.textLink} href={`/org/${orgId}/properties`}>View properties <span aria-hidden="true">&rarr;</span></Link>
          </header>
          {properties.length ? (
            <div className={styles.propertyGrid}>
              {properties.map((property) => (
                <Link className={styles.propertyCard} href={`/org/${orgId}/properties/${property.id}`} key={property.id}>
                  <div className={styles.propertyTopline}>
                    <span className={`${styles.statusPill} ${property.status === "ACTIVE" ? styles.activeStatus : styles.inactiveStatus}`}>
                      <span aria-hidden="true" />{property.status === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                    {property.code ? <span className={styles.propertyCode}>{property.code}</span> : null}
                  </div>
                  <h3>{property.name}</h3>
                  <p className={styles.propertyLocation}>
                    <WorkspaceIcon className={styles.locationIcon} name="location_on" />
                    <span>{[property.city, property.state].filter(Boolean).join(", ")}</span>
                  </p>
                  <div className={styles.inventoryStats}>
                    <Count label="Floors" value={property.floorCount} />
                    <Count label="Rooms" value={property.roomCount} />
                    <Count label="Beds" value={property.bedCount} />
                  </div>
                  <span className={styles.propertyAction}>Open inventory <span aria-hidden="true">&rarr;</span></span>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}><WorkspaceIcon name="domain" /></span>
              <h3>No properties assigned yet</h3>
              <p>Ask your organization owner to assign one or more properties to your manager account. They will appear here once access is set up.</p>
            </div>
          )}
        </section>

        <aside aria-labelledby="attention-heading" className={styles.attentionPanel}>
          <div className={styles.attentionHeading}>
            <div>
              <p className={styles.sectionEyebrow}>TODAY&apos;S WORK</p>
              <h2 id="attention-heading">Needs attention</h2>
            </div>
            <span className={styles.attentionCount}>2 queues</span>
          </div>
          <p className={styles.attentionIntro}>Stay on top of resident requests and upcoming arrivals.</p>
          <Link className={styles.queueItem} href={`/org/${orgId}/complaints`}>
            <span className={`${styles.queueIcon} ${styles.complaintIcon}`}><WorkspaceIcon name="campaign" /></span>
            <span className={styles.queueCopy}><strong>Resident requests</strong><small>{numberFormat.format(openComplaintCount)} open or in progress</small></span>
            <WorkspaceIcon className={styles.queueArrow} name="chevron_right" />
          </Link>
          <Link className={styles.queueItem} href={`/org/${orgId}/reservations`}>
            <span className={`${styles.queueIcon} ${styles.reservationIcon}`}><WorkspaceIcon name="event_available" /></span>
            <span className={styles.queueCopy}><strong>Today&apos;s arrivals</strong><small>{numberFormat.format(reservations.reservedBedCountToday)} beds reserved today</small></span>
            <WorkspaceIcon className={styles.queueArrow} name="chevron_right" />
          </Link>
          <div className={styles.capacityCard}>
            <div className={styles.capacityHeader}>
              <span>Bed availability</span>
              <strong>{occupancyRate}% occupied</strong>
            </div>
            <div
              aria-label={`${occupancyRate}% of active beds occupied`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={occupancyRate}
              className={styles.progressTrack}
              role="progressbar"
            >
              <span style={{ width: `${occupancyRate}%` }} />
            </div>
            <div className={styles.capacityFooter}>
              <span>{numberFormat.format(availableBeds)} available</span>
              <span>{numberFormat.format(occupancy.activeBedCount)} active beds</span>
            </div>
          </div>
        </aside>
      </section>

      <section aria-label="Daily tasks" className={styles.quickActions}>
        <QuickAction detail={`${numberFormat.format(currentResidents)} currently staying · ${numberFormat.format(residents.length)} total records`} href={`/org/${orgId}/residents`} icon="groups" label="Review residents" />
        <QuickAction detail={`${numberFormat.format(reservations.activeCount)} active reservations`} href={`/org/${orgId}/reservations`} icon="calendar_month" label="Manage reservations" />
        <QuickAction detail={`${numberFormat.format(openComplaintCount)} requests need follow-up`} href={`/org/${orgId}/complaints`} icon="campaign" label="Triage complaints" />
      </section>
    </section>
  );
}

function MetricCard({ label, value, detail, icon }: Readonly<{ label: string; value: number; detail: string; icon: string }>) {
  return (
    <article className={styles.metricCard}>
      <div className={styles.metricTopline}>
        <span className={styles.metricIcon}><WorkspaceIcon name={icon} /></span>
        <span className={styles.metricLabel}>{label}</span>
      </div>
      <p className={styles.metricValue}>{numberFormat.format(value)}</p>
      <p className={styles.metricDetail}>{detail}</p>
    </article>
  );
}

function Count({ label, value }: Readonly<{ label: string; value: number }>) {
  return <div className={styles.inventoryStat}><strong>{numberFormat.format(value)}</strong><span>{label}</span></div>;
}

function QuickAction({ href, label, detail, icon }: Readonly<{ href: string; label: string; detail: string; icon: string }>) {
  return (
    <Link className={styles.quickAction} href={href}>
      <span className={styles.quickIcon}><WorkspaceIcon name={icon} /></span>
      <span className={styles.quickCopy}><strong>{label}</strong><small>{detail}</small></span>
      <WorkspaceIcon className={styles.quickArrow} name="chevron_right" />
    </Link>
  );
}
