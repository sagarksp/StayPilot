import Link from "next/link";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { notFound, redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { residentUseCases } from "@/modules/resident/application";
import { assignResidentBedAction, checkOutResidentAction, setResidentRentTermsAction } from "@/modules/resident/ui/actions";
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
    case "invalid": return "Check the selected bed and date, then try again.";
    case "bed-taken": return "That bed is no longer available. Select another available bed.";
    case "future-date": return "Move-in and move-out dates cannot be in the future.";
    case "date-order": return "Move-out cannot be earlier than the move-in date.";
    case "already-active": return "This resident already has an active bed assignment.";
    case "stay-ended": return "That stay has already ended or is no longer available.";
    default: return null;
  }
}

export default async function ResidentDetailPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ orgId: string; residentId: string }>;
  searchParams: Promise<{ error?: string }>;
}>) {
  const [{ orgId, residentId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");

  let resident;
  let availableBeds;
  try {
    [resident, availableBeds] = await Promise.all([
      residentUseCases.getResident(actor, residentId),
      residentUseCases.listAvailableBeds(actor),
    ]);
  } catch (error) {
    if (error instanceof AccessDeniedError) notFound();
    throw error;
  }
  if (!resident) notFound();

  const currentStay = resident.stays.find((stay) => stay.status === "ACTIVE") ?? null;
  const today = todayInTimezone(actor.organizationTimezone);
  const message = errorMessage(query.error);

  return (
    <section className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm font-medium text-[#176e61] hover:underline" href={`/org/${orgId}/residents`}>
        <span aria-hidden="true">←</span> Residents
      </Link>

      {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">{message}</p> : null}

      <header className="surface-card flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-start sm:p-7">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#eaf4ef] text-[#176e61]"><WorkspaceIcon name="person" /></span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#176e61]">RESIDENT PROFILE</p>
            <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight">{resident.name}</h1>
            <p className="muted mt-2 text-sm">{resident.phone}{resident.email ? ` · ${resident.email}` : ""}</p>
          </div>
        </div>
        {currentStay ? <span className="w-fit rounded-full bg-[#eaf5ef] px-3 py-1.5 text-sm font-semibold text-[#256b4c]">Currently staying</span> : <span className="w-fit rounded-full bg-[#f1f3f2] px-3 py-1.5 text-sm font-semibold text-[#596661]">Checked out</span>}
      </header>

      {currentStay ? (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="surface-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#176e61]">CURRENT BED ASSIGNMENT</p>
                <h2 className="mt-2 text-xl font-semibold">{currentStay.propertyName}</h2>
                <p className="muted mt-1 text-sm">{currentStay.floorName} · Room {currentStay.roomNumber}</p>
              </div>
              <span className="rounded-lg bg-[#eaf4ef] px-4 py-2 text-sm font-semibold text-[#176e61]">{currentStay.bedLabel}</span>
            </div>
            <div className="mt-6 grid gap-3 border-t border-[#e2e8f0] pt-5 sm:grid-cols-2">
              <Detail label="Move-in date" value={formatDate(currentStay.startDate)} />
              <Detail label="Stay status" value="Active" />
              <Detail label="Monthly rent" value={currentStay.rent ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(currentStay.rent.amountPaise) / 100) : "Rent terms not set"} />
              <Detail label="Billing cycle" value={currentStay.rent ? (currentStay.rent.billingCycleType === "MOVE_IN_DAY" ? "Move-in day each month" : `Day ${currentStay.rent.billingDay} each month`) : "Required for invoices"} />
            </div>
            <details className="mt-5 border-t border-[#e2e8f0] pt-4">
              <summary className="cursor-pointer text-sm font-semibold text-[#176e61]">{currentStay.rent ? "Update rent terms" : "Add rent terms"}</summary>
              <p className="muted mt-2 text-sm">Changes take effect today and keep earlier rent rates in the stay history.</p>
              <form action={setResidentRentTermsAction} className="mt-4 grid gap-4 sm:grid-cols-2">
                <input name="orgId" type="hidden" value={orgId} />
                <input name="residentId" type="hidden" value={resident.id} />
                <input name="stayId" type="hidden" value={currentStay.id} />
                <RentTermsFields />
                <div className="sm:col-span-2"><button className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#176e61] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#10564c]" type="submit">Save rent terms</button></div>
              </form>
            </details>
          </div>
          <section className="surface-card p-5 sm:p-6" aria-labelledby="checkout-heading">
            <p className="text-sm font-semibold text-[#176e61]">END THIS STAY</p>
            <h2 className="mt-1 text-lg font-semibold" id="checkout-heading">Check out resident</h2>
            <p className="muted mt-2 text-sm leading-6">Checking out records the end date and makes this bed available for another resident.</p>
            <form action={checkOutResidentAction} className="mt-5 space-y-4">
              <input name="orgId" type="hidden" value={orgId} />
              <input name="residentId" type="hidden" value={resident.id} />
              <input name="stayId" type="hidden" value={currentStay.id} />
              <label className="block space-y-2 text-sm font-medium" htmlFor="endDate">
                <span>Move-out date</span>
                <input className={inputClass} defaultValue={today} id="endDate" max={today} name="endDate" required type="date" />
              </label>
              <button className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[#d5b9ac] bg-white px-4 py-2.5 text-sm font-semibold text-[#85482f] hover:bg-[#fff8f5]" type="submit">Check out resident</button>
            </form>
          </section>
        </section>
      ) : (
        <section className="surface-card p-5 sm:p-6" aria-labelledby="assign-heading">
          <p className="text-sm font-semibold text-[#176e61]">NEW STAY</p>
          <h2 className="mt-1 text-xl font-semibold" id="assign-heading">Assign an available bed</h2>
          <p className="muted mt-2 max-w-2xl text-sm leading-6">This resident has no active bed assignment. Select an available bed to start a new stay; previous stays remain in the history below.</p>
          {availableBeds.length ? (
            <form action={assignResidentBedAction} className="mt-5 grid gap-4 sm:grid-cols-2">
              <input name="orgId" type="hidden" value={orgId} />
              <input name="residentId" type="hidden" value={resident.id} />
              <label className="block space-y-2 text-sm font-medium" htmlFor="bedId">
                <span>Available bed</span>
                <select className={inputClass} id="bedId" name="bedId" required defaultValue="">
                  <option disabled value="">Choose a property, room, and bed</option>
                  {availableBeds.map((bed) => <option key={bed.id} value={bed.id}>{bed.propertyName} · {bed.floorName} · Room {bed.roomNumber} · {bed.label}</option>)}
                </select>
              </label>
              <label className="block space-y-2 text-sm font-medium" htmlFor="startDate">
                <span>Move-in date</span>
                <input className={inputClass} defaultValue={today} id="startDate" max={today} name="startDate" required type="date" />
              </label>
              <RentTermsFields />
              <div className="sm:col-span-2">
                <button className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#176e61] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#10564c]" type="submit">Assign bed and start stay</button>
              </div>
            </form>
          ) : (
            <p className="mt-5 rounded-lg bg-[#f5f7f5] p-4 text-sm text-[#596661]">There are no available beds in the properties you can access. Add or free a bed before starting another stay.</p>
          )}
        </section>
      )}

      <section className="surface-card overflow-hidden" aria-labelledby="stay-history-heading">
        <header className="border-b border-[#e2e8f0] px-5 py-4 sm:px-6">
          <h2 className="font-semibold" id="stay-history-heading">Stay history</h2>
          <p className="muted mt-1 text-sm">Recorded bed assignments for this resident</p>
        </header>
        {resident.stays.length ? (
          <div className="divide-y divide-[#e2e8f0]">
            {resident.stays.map((stay) => (
              <article className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6" key={stay.id}>
                <div>
                  <h3 className="font-semibold">{stay.propertyName} · Room {stay.roomNumber} · {stay.bedLabel}</h3>
                  <p className="muted mt-1 text-sm">{stay.floorName} · {formatDate(stay.startDate)}{stay.endDate ? ` to ${formatDate(stay.endDate)}` : " to present"}</p>
                </div>
                <span className={stay.status === "ACTIVE" ? "w-fit rounded-full bg-[#eaf5ef] px-2.5 py-1 text-xs font-semibold text-[#256b4c]" : "w-fit rounded-full bg-[#f1f3f2] px-2.5 py-1 text-xs font-semibold text-[#596661]"}>{stay.status === "ACTIVE" ? "Active" : "Ended"}</span>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted px-5 py-8 text-sm sm:px-6">No stay history is visible in your assigned properties.</p>
        )}
      </section>
    </section>
  );
}

const inputClass = "min-h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 outline-none focus:border-[#176e61] focus:ring-2 focus:ring-[#176e61]/15";

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div><p className="muted text-xs">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}
