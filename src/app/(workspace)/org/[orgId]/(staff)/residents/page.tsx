import Link from "next/link";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { residentUseCases } from "@/modules/resident/application";
import { createResidentWithStayAction } from "@/modules/resident/ui/actions";
import { RentTermsFields } from "@/modules/billing/ui/rent-terms-fields";

function todayInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function errorMessage(code?: string) {
  switch (code) {
    case "invalid": return "Check the resident details, phone number, bed, and move-in date.";
    case "bed-taken": return "That bed is no longer available. Choose another available bed.";
    case "future-date": return "Move-in dates can’t be in the future in this first version.";
    default: return null;
  }
}

export default async function ResidentsPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ error?: string }>;
}>) {
  const [{ orgId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");

  const [residents, availableBeds] = await Promise.all([
    residentUseCases.listResidents(actor),
    residentUseCases.listAvailableBeds(actor),
  ]);
  const activeResidents = residents.filter((resident) => resident.currentStay).length;
  const message = errorMessage(query.error);
  const today = todayInTimezone(actor.organizationTimezone);

  return (
    <section className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-[#176e61]">PEOPLE &amp; OCCUPANCY</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Residents</h1>
          <p className="muted mt-2 max-w-2xl leading-6">
            Manage resident contact records, current bed assignments, and stay history for properties you can access.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3">
          <Summary label="Residents" value={residents.length} />
          <Summary label="Currently staying" value={activeResidents} />
          <Summary label="Available beds" value={availableBeds.length} />
        </div>
      </header>

      <div className="flex flex-col justify-between gap-3 rounded-xl border border-[#c9ded6] bg-[#f1f7f4] p-4 sm:flex-row sm:items-center sm:px-5">
        <p className="text-sm leading-6 text-slate-700">Expecting someone new? Reserve a bed first; their resident profile is created with the reservation.</p>
        <Link className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10564c]" href={`/org/${orgId}/reservations`}>Create reservation</Link>
      </div>

      {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">{message}</p> : null}

      <details className="surface-card p-5 sm:p-6">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
          <span>
            <span className="block text-lg font-semibold">Move in a resident now</span>
            <span className="muted mt-1 block text-sm">Create the resident record and start their stay with an available bed.</span>
          </span>
          <span aria-hidden="true" className="rounded-lg bg-[#176e61] px-4 py-2.5 text-sm font-semibold text-white">Start a stay</span>
        </summary>
        <div className="mt-5 border-t border-[#e2e8f0] pt-5">
          {availableBeds.length ? (
            <form action={createResidentWithStayAction} className="grid gap-4 sm:grid-cols-2">
              <input name="orgId" type="hidden" value={orgId} />
              <Field label="Full name" name="name" placeholder="Resident name" required />
              <Field label="Phone number" name="phone" placeholder="+91 98765 43210" required type="tel" />
              <Field label="Email (optional)" name="email" placeholder="resident@example.com" type="email" />
              <label className="block space-y-2 text-sm font-medium" htmlFor="bedId">
                <span>Available bed <span aria-hidden="true">*</span></span>
                <select className={inputClass} id="bedId" name="bedId" required defaultValue="">
                  <option disabled value="">Choose a property, room, and bed</option>
                  {availableBeds.map((bed) => (
                    <option key={bed.id} value={bed.id}>{bed.propertyName} · {bed.floorName} · Room {bed.roomNumber} · {bed.label}</option>
                  ))}
                </select>
              </label>
              <Field label="Move-in date" name="startDate" required defaultValue={today} type="date" />
              <RentTermsFields />
              <div className="flex items-end sm:col-span-2">
                <button className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#176e61] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#10564c] sm:w-auto" type="submit">Create resident and start stay</button>
              </div>
            </form>
          ) : (
            <div className="rounded-xl bg-[#f5f7f5] p-5">
              <h2 className="font-semibold">No available beds</h2>
              <p className="muted mt-1 max-w-2xl text-sm leading-6">
                Add beds in Property Inventory, then make sure the property, floor, room, and bed are active before assigning a resident.
              </p>
              <Link className="mt-4 inline-flex rounded-lg border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm font-semibold text-[#176e61]" href={`/org/${orgId}/properties`}>Open properties</Link>
            </div>
          )}
        </div>
      </details>

      <section className="surface-card overflow-hidden" aria-labelledby="resident-list-heading">
        <header className="flex flex-col justify-between gap-2 border-b border-[#e2e8f0] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="text-lg font-semibold" id="resident-list-heading">Resident records</h2>
            <p className="muted mt-1 text-sm">{residents.length} {residents.length === 1 ? "resident" : "residents"} in your accessible properties</p>
          </div>
          <span className="rounded-full bg-[#eaf4ef] px-3 py-1 text-xs font-semibold text-[#176e61]">Live records</span>
        </header>
        {residents.length ? (
          <div className="grid gap-3 p-3 sm:p-4">
            {residents.map((resident) => {
              const stay = resident.currentStay ?? resident.latestStay;
              return (
                <Link className="group grid gap-3 rounded-xl border border-[#e2e8f0] bg-white px-4 py-4 transition hover:border-[#c9ded6] hover:bg-[#f7faf8] sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:px-5" href={`/org/${orgId}/residents/${resident.id}`} key={resident.id}>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm font-semibold group-hover:text-[#176e61]">{resident.name}</strong>
                    <span className="muted mt-1 block truncate text-xs">{resident.phone}</span>
                  </span>
                  <span className="min-w-0 text-sm">
                    {stay ? <><strong className="block truncate font-medium">{stay.propertyName}</strong><span className="muted mt-1 block truncate text-xs">{stay.floorName} · Room {stay.roomNumber} · {stay.bedLabel}</span></> : <span className="muted">No recorded stay</span>}
                  </span>
                  <span className="text-sm">
                    {resident.currentStay ? <><span className="inline-flex rounded-full bg-[#eaf5ef] px-2.5 py-1 text-xs font-semibold text-[#256b4c]">Currently staying</span><span className="muted mt-1 block text-xs">Since {formatDate(resident.currentStay.startDate)}</span></> : <><span className="inline-flex rounded-full bg-[#f1f3f2] px-2.5 py-1 text-xs font-semibold text-[#596661]">Checked out</span><span className="muted mt-1 block text-xs">{stay?.endDate ? `Ended ${formatDate(stay.endDate)}` : "No active bed assignment"}</span></>}
                  </span>
                  <span aria-hidden="true" className="text-sm font-semibold text-[#176e61]">View <span>→</span></span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-12 text-center sm:px-6">
            <WorkspaceIcon className="material-symbols-outlined text-4xl text-[#176e61]" name="groups" />
            <h3 className="mt-3 font-semibold">No residents recorded yet</h3>
            <p className="muted mx-auto mt-1 max-w-md text-sm leading-6">Create a reservation for an incoming resident, or start a stay now for someone who has already arrived.</p>
            <Link className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10564c]" href={`/org/${orgId}/reservations`}>Create reservation</Link>
          </div>
        )}
      </section>
    </section>
  );
}

const inputClass = "min-h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 outline-none focus:border-[#176e61] focus:ring-2 focus:ring-[#176e61]/15";

function Field({ label, name, placeholder, required = false, type = "text", defaultValue }: Readonly<{
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  defaultValue?: string;
}>) {
  return (
    <label className="block space-y-2 text-sm font-medium" htmlFor={name}>
      <span>{label}{required ? <span aria-hidden="true"> *</span> : null}</span>
      <input className={inputClass} defaultValue={defaultValue} id={name} name={name} placeholder={placeholder} required={required} type={type} />
    </label>
  );
}

function Summary({ label, value }: Readonly<{ label: string; value: number }>) {
  return <div className="surface-card min-w-0 px-2 py-2 sm:min-w-[120px] sm:px-4"><p className="muted text-[11px] leading-4 sm:text-xs">{label}</p><p className="mt-0.5 text-xl font-semibold">{value}</p></div>;
}
