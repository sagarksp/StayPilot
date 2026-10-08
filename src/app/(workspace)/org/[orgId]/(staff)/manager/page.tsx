import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { propertyUseCases } from "@/modules/property/application";
import { reservationUseCases } from "@/modules/reservation/application";
import { residentUseCases } from "@/modules/resident/application";

const numberFormat = new Intl.NumberFormat("en-IN");

export default async function ManagerDashboardPage({ params }: Readonly<{ params: Promise<{ orgId: string }> }>) {
  const { orgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("MANAGER")) redirect(`/org/${orgId}/owner`);

  await reservationUseCases.expireReservations(actor);
  const [properties, residents, occupancy, reservations] = await Promise.all([
    propertyUseCases.listProperties(actor),
    residentUseCases.listResidents(actor),
    residentUseCases.getOccupancy(actor),
    reservationUseCases.getOverview(actor),
  ]);
  const currentResidents = residents.filter((resident) => resident.currentStay).length;
  const today = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: actor.organizationTimezone }).format(new Date());

  return (
    <section className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#176e61]">Manager workspace · {today}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Daily operations</h1>
          <p className="muted mt-2 max-w-2xl leading-6">A live view of residents, beds, and reservations in the properties assigned to you.</p>
        </div>
        <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10564c]" href={`/org/${orgId}/reservations`}>New reservation</Link>
      </header>

      <section aria-label="Assigned property metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Assigned properties" value={properties.length} detail="Properties you can manage" />
        <Metric label="Residents staying" value={currentResidents} detail={`${residents.length} resident records`} />
        <Metric label="Occupied beds" value={occupancy.occupiedBedCount} detail={`${occupancy.activeBedCount} active beds`} />
        <Metric label="Reserved today" value={reservations.reservedBedCountToday} detail={`${reservations.activeCount} active reservations`} />
      </section>

      <section aria-labelledby="assigned-properties-heading" className="surface-card overflow-hidden">
        <header className="flex flex-col justify-between gap-2 border-b border-[#dce4e0] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="text-lg font-semibold" id="assigned-properties-heading">Your assigned properties</h2>
            <p className="muted mt-1 text-sm">Inventory and occupancy for the properties in your manager scope.</p>
          </div>
          <Link className="text-sm font-semibold text-[#176e61] hover:underline" href={`/org/${orgId}/properties`}>View all properties</Link>
        </header>
        {properties.length ? (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => (
              <Link className="rounded-xl border border-[#dce4e0] p-4 transition hover:border-[#9fc5b8] hover:bg-[#fbfdfc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176e61]" href={`/org/${orgId}/properties/${property.id}`} key={property.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{property.name}</h3>
                    <p className="muted mt-1 truncate text-sm">{property.city}, {property.state}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${property.status === "ACTIVE" ? "bg-[#eaf5ef] text-[#256b4c]" : "bg-slate-100 text-slate-700"}`}>{property.status === "ACTIVE" ? "Active" : "Inactive"}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#edf0ee] pt-3 text-sm">
                  <Count label="Floors" value={property.floorCount} />
                  <Count label="Rooms" value={property.roomCount} />
                  <Count label="Beds" value={property.bedCount} />
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#176e61]">Open inventory <span aria-hidden="true">→</span></span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center sm:px-6">
            <h3 className="font-semibold">No properties assigned yet</h3>
            <p className="muted mx-auto mt-2 max-w-lg text-sm leading-6">Ask your organization owner to assign one or more properties to your manager account. Assigned properties will appear here.</p>
          </div>
        )}
      </section>

      <section aria-label="Daily tasks" className="grid gap-4 md:grid-cols-2">
        <ActionCard href={`/org/${orgId}/residents`} label="Review residents" detail={`${numberFormat.format(currentResidents)} currently staying · ${numberFormat.format(residents.length)} total records`} />
        <ActionCard href={`/org/${orgId}/reservations`} label="Manage reservations" detail={`${numberFormat.format(reservations.activeCount)} active reservations · ${numberFormat.format(reservations.reservedBedCountToday)} beds reserved today`} />
      </section>
    </section>
  );
}

function Metric({ label, value, detail }: Readonly<{ label: string; value: number; detail: string }>) {
  return <div className="surface-card p-4 sm:p-5"><p className="muted text-sm">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{numberFormat.format(value)}</p><p className="muted mt-1 text-xs">{detail}</p></div>;
}

function Count({ label, value }: Readonly<{ label: string; value: number }>) {
  return <div><strong className="block">{numberFormat.format(value)}</strong><span className="muted text-xs">{label}</span></div>;
}

function ActionCard({ href, label, detail }: Readonly<{ href: string; label: string; detail: string }>) {
  return <Link className="surface-card flex items-start justify-between gap-4 p-5 transition hover:border-[#9fc5b8] hover:bg-[#fbfdfc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176e61]" href={href}><span><strong className="block">{label}</strong><span className="muted mt-1 block text-sm">{detail}</span></span><span aria-hidden="true" className="text-lg font-semibold text-[#176e61]">→</span></Link>;
}
