import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { propertyUseCases } from "@/modules/property/application";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { createBedAction, createFloorAction, createRoomAction } from "@/modules/property/ui/actions";
import { residentUseCases } from "@/modules/resident/application";

export default async function PropertyInventoryPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ orgId: string; propertyId: string }>;
  searchParams: Promise<{ error?: string }>;
}>) {
  const [{ orgId, propertyId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");

  let inventory;
  let assignments;
  try {
    inventory = await propertyUseCases.getInventory(actor, propertyId);
    assignments = await residentUseCases.listCurrentAssignments(actor, propertyId);
  } catch (error) {
    if (error instanceof AccessDeniedError) notFound();
    throw error;
  }
  if (!inventory) notFound();
  const { property, floors, rooms, beds } = inventory;
  const canManage = actor.roles.includes("OWNER") || actor.roles.includes("MANAGER");
  const floorNames = new Map(floors.map((floor) => [floor.id, floor.name]));
  const assignmentByBedId = new Map(assignments.map((assignment) => [assignment.bedId, assignment]));

  return (
    <section className="space-y-8">
      <div>
        <Link className="text-sm font-medium text-[#176e61] hover:underline" href={`/org/${orgId}/properties`}>← Properties</Link>
        <header className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-[#176e61]">Property inventory</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{property.name}</h1>
            <p className="muted mt-2">{property.addressLine1}{property.addressLine2 ? `, ${property.addressLine2}` : ""}, {property.city}, {property.state} {property.postalCode}</p>
          </div>
          {property.code ? <span className="w-fit rounded-full bg-[#edf5f1] px-3 py-1.5 text-sm font-medium text-[#176e61]">{property.code}</span> : null}
        </header>
      </div>

      {query.error === "invalid" ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">Check the required fields and try again.</p> : null}
      {query.error === "duplicate" ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="alert">That floor, room, or bed label already exists in this property. Choose a different label.</p> : null}

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <SummaryCard label="Floors" value={floors.length} />
        <SummaryCard label="Rooms" value={rooms.length} />
        <SummaryCard label="Beds" value={beds.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="surface-card p-5 sm:p-6" aria-labelledby="inventory-heading">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold" id="inventory-heading">Building layout</h2>
              <p className="muted mt-1 text-sm">Floors, rooms, and the beds in each room.</p>
            </div>
          </div>
          {floors.length === 0 ? (
            <p className="muted mt-6 rounded-lg bg-[#f5f7f5] p-5 text-sm">No floors yet. Add the first floor to start organizing rooms.</p>
          ) : (
            <div className="mt-5 space-y-4">
              {floors.map((floor) => {
                const floorRooms = rooms.filter((room) => room.floorId === floor.id);
                return (
                  <section className="rounded-xl border border-[#dce4e0] p-4" key={floor.id}>
                    <header className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold">{floor.name}</h3>
                      <span className="muted text-xs">{floorRooms.length} {floorRooms.length === 1 ? "room" : "rooms"}</span>
                    </header>
                    {floorRooms.length ? (
                      <ul className="mt-3 divide-y divide-[#edf0ee]">
                        {floorRooms.map((room) => (
                          <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between" key={room.id}>
                            <div><p className="text-sm font-medium">Room {room.number}</p><p className="muted mt-0.5 text-xs">{room.bedCount} {room.bedCount === 1 ? "bed" : "beds"}</p></div>
                            <div className="flex flex-wrap gap-2">
                              {beds.filter((bed) => bed.roomId === room.id).map((bed) => {
                                const assignment = assignmentByBedId.get(bed.id);
                                return assignment ? (
                                  <Link className="rounded-full bg-[#eaf4ef] px-2.5 py-1 text-xs font-medium text-[#176e61] hover:bg-[#dcece5]" href={`/org/${orgId}/residents/${assignment.residentId}`} key={bed.id}>
                                    {bed.label} · {assignment.residentName}
                                  </Link>
                                ) : (
                                  <span className="rounded-full bg-[#f1f3f2] px-2.5 py-1 text-xs font-medium text-[#596661]" key={bed.id}>
                                    {bed.label} · Vacant{bed.status !== "ACTIVE" ? ` · ${bed.status.toLowerCase()}` : ""}
                                  </span>
                                );
                              })}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="muted mt-3 text-sm">No rooms on this floor yet.</p>}
                  </section>
                );
              })}
            </div>
          )}
        </section>

        {canManage ? (
          <aside className="space-y-4" aria-label="Add to property inventory">
            <FormCard title="Add a floor" description="Use names such as Ground floor, First floor, or Terrace.">
              <form action={createFloorAction} className="space-y-3">
                <ScopeFields orgId={orgId} propertyId={propertyId} />
                <InputField label="Floor name" name="name" placeholder="e.g. Ground floor" required />
                <InputField label="Floor number (optional)" name="number" placeholder="e.g. 0" type="number" />
                <SubmitButton>Add floor</SubmitButton>
              </form>
            </FormCard>

            <FormCard title="Add a room" description="Choose the floor and enter the room label used by your team.">
              <form action={createRoomAction} className="space-y-3">
                <ScopeFields orgId={orgId} propertyId={propertyId} />
                <label className="block space-y-2 text-sm font-medium" htmlFor="floorId">
                  <span>Floor</span>
                  <select className="min-h-11 w-full rounded-lg border border-[#cfdad5] bg-white px-3 disabled:bg-[#f5f7f5]" id="floorId" name="floorId" required disabled={!floors.length}>
                    <option value="">Select a floor</option>
                    {floors.map((floor) => <option key={floor.id} value={floor.id}>{floor.name}</option>)}
                  </select>
                </label>
                <InputField label="Room label" name="number" placeholder="e.g. 101" required />
                <SubmitButton disabled={!floors.length}>Add room</SubmitButton>
              </form>
            </FormCard>

            <FormCard title="Add a bed" description="Add an individual bed or slot to an existing room.">
              <form action={createBedAction} className="space-y-3">
                <ScopeFields orgId={orgId} propertyId={propertyId} />
                <label className="block space-y-2 text-sm font-medium" htmlFor="roomId">
                  <span>Room</span>
                  <select className="min-h-11 w-full rounded-lg border border-[#cfdad5] bg-white px-3 disabled:bg-[#f5f7f5]" id="roomId" name="roomId" required disabled={!rooms.length}>
                    <option value="">Select a room</option>
                    {rooms.map((room) => <option key={room.id} value={room.id}>{floorNames.get(room.floorId)} · {room.number}</option>)}
                  </select>
                </label>
                <InputField label="Bed label" name="label" placeholder="e.g. Bed A" required />
                <SubmitButton disabled={!rooms.length}>Add bed</SubmitButton>
              </form>
            </FormCard>
          </aside>
        ) : null}
      </div>
    </section>
  );
}

function ScopeFields({ orgId, propertyId }: Readonly<{ orgId: string; propertyId: string }>) {
  return <><input name="orgId" type="hidden" value={orgId} /><input name="propertyId" type="hidden" value={propertyId} /></>;
}

function FormCard({ children, description, title }: Readonly<{ children: React.ReactNode; description: string; title: string }>) {
  return <section className="surface-card p-5"><h2 className="font-semibold">{title}</h2><p className="muted mt-1 text-sm leading-5">{description}</p><div className="mt-4">{children}</div></section>;
}

function InputField({ label, name, placeholder, required = false, type = "text" }: Readonly<{ label: string; name: string; placeholder?: string; required?: boolean; type?: string }>) {
  return <label className="block space-y-2 text-sm font-medium" htmlFor={name}><span>{label}{required ? <span aria-hidden="true"> *</span> : null}</span><input className="min-h-11 w-full rounded-lg border border-[#cfdad5] bg-white px-3 outline-none focus:border-[#176e61] focus:ring-2 focus:ring-[#176e61]/15" id={name} name={name} placeholder={placeholder} required={required} type={type} /></label>;
}

function SubmitButton({ children, disabled = false }: Readonly<{ children: React.ReactNode; disabled?: boolean }>) {
  return <button className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10564c] disabled:cursor-not-allowed disabled:opacity-50" disabled={disabled} type="submit">{children}</button>;
}

function SummaryCard({ label, value }: Readonly<{ label: string; value: number }>) {
  return <div className="surface-card p-4 sm:p-5"><p className="muted text-sm">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>;
}
