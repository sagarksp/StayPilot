import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { propertyUseCases } from "@/modules/property/application";

export default async function PropertiesPage({
  params,
}: Readonly<{ params: Promise<{ orgId: string }> }>) {
  const { orgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  const properties = await propertyUseCases.listProperties(actor);
  const canCreate = actor.roles.includes("OWNER");

  return (
    <section className="space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-[#176e61]">Property setup</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Properties</h1>
          <p className="muted mt-2 max-w-2xl leading-7">
            Set up your PG locations and organize each one into floors, rooms, and beds.
          </p>
        </div>
        {canCreate ? (
          <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10564c]" href={`/org/${orgId}/properties/new`}>
            Add property
          </Link>
        ) : null}
      </header>

      {properties.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <Link
              className="surface-card block p-5 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176e61]"
              href={`/org/${orgId}/properties/${property.id}`}
              key={property.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{property.name}</h2>
                  <p className="muted mt-1 text-sm">{property.city}, {property.state}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${property.status === "ACTIVE" ? "bg-[#eaf5ef] text-[#256b4c]" : "bg-slate-100 text-slate-700"}`}>{property.status === "ACTIVE" ? "Active" : "Inactive"}</span>
                  {property.code ? <span className="rounded-full bg-[#edf5f1] px-2.5 py-1 text-xs font-medium text-[#176e61]">{property.code}</span> : null}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#dce4e0] pt-4 text-sm">
                <Metric value={property.floorCount} label="Floors" />
                <Metric value={property.roomCount} label="Rooms" />
                <Metric value={property.bedCount} label="Beds" />
              </div>
              <p className="muted mt-4 text-sm">{property.addressLine1}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="surface-card flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
          <span aria-hidden="true" className="grid size-14 place-items-center rounded-2xl bg-[#e7f2ee] text-2xl text-[#176e61]">⌂</span>
          <h2 className="mt-5 text-xl font-semibold">Start with your first property</h2>
          <p className="muted mt-2 max-w-md leading-6">
            Add a PG location, then create its floors, rooms, and beds to build your inventory.
          </p>
          {canCreate ? (
            <Link className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10564c]" href={`/org/${orgId}/properties/new`}>
              Add your first property
            </Link>
          ) : (
            <p className="muted mt-5 max-w-md text-sm leading-6">No properties are assigned to your account yet. Ask your organization owner to add you to a property.</p>
          )}
        </div>
      )}
    </section>
  );
}

function Metric({ value, label }: Readonly<{ value: number; label: string }>) {
  return <div><strong className="block text-lg">{value}</strong><span className="muted text-xs">{label}</span></div>;
}
