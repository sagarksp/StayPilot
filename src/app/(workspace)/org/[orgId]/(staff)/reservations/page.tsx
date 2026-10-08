import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { reservationUseCases } from "@/modules/reservation/application";
import { cancelReservationAction, createReservationAction, moveInReservationAction } from "@/modules/reservation/ui/actions";
import { RentTermsFields } from "@/modules/billing/ui/rent-terms-fields";

const inputClass = "min-h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 outline-none focus:border-[#176e61] focus:ring-2 focus:ring-[#176e61]/15";
const formatDate = (date: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);

function todayInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function message(error?: string) {
  switch (error) {
    case "invalid": return "Check the resident details, bed, dates, and notes, then try again.";
    case "bed-unavailable": return "That bed is occupied or reserved during those dates. Choose another bed or date range.";
    case "resident-reserved": return "This resident already has an active reservation.";
    case "resident-active": return "A resident with an active stay cannot be reserved again.";
    case "start-past": return "Reservations must start today or later.";
    case "move-in-range": return "The move-in date must fall within the reservation period.";
    case "move-in-future": return "Move-in must happen today or earlier.";
    case "not-active": return "That reservation has already been changed. Refresh the page to see its current status.";
    case "date-order": return "The end date must be on or after the start date.";
    default: return null;
  }
}

export default async function ReservationsPage({ params, searchParams }: Readonly<{
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ error?: string }>;
}>) {
  const [{ orgId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) redirect(`/org/${orgId}/residents`);

  await reservationUseCases.expireReservations(actor);
  const [reservations, candidates, overview] = await Promise.all([
    reservationUseCases.listReservations(actor),
    reservationUseCases.listCandidates(actor),
    reservationUseCases.getOverview(actor),
  ]);
  const today = todayInTimezone(actor.organizationTimezone);
  const alert = message(query.error);
  const active = reservations.filter((item) => item.status === "ACTIVE");
  const history = reservations.filter((item) => item.status !== "ACTIVE");

  return (
    <section className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-[#176e61]">BOOKINGS &amp; OCCUPANCY</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Reservations</h1>
          <p className="muted mt-2 max-w-2xl leading-6">Reserve an available bed for a new or returning resident. A reservation holds the bed; confirming move-in starts the resident stay.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Summary label="Active reservations" value={overview.activeCount} />
          <Summary label="Beds reserved today" value={overview.reservedBedCountToday} />
        </div>
      </header>

      {alert ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">{alert}</p> : null}

      <details className="surface-card p-5 sm:p-6" open={Boolean(alert) || overview.activeCount === 0}>
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
          <span><span className="block text-lg font-semibold">Create a reservation</span><span className="muted mt-1 block text-sm">Choose a resident and the dates they need a bed.</span></span>
          <span className="rounded-lg bg-[#176e61] px-4 py-2.5 text-sm font-semibold text-white">New reservation</span>
        </summary>
        <div className="mt-5 border-t border-[#e2e8f0] pt-5">
          {candidates.beds.length ? (
            <form action={createReservationAction} className="grid gap-4 sm:grid-cols-2">
              <input name="orgId" type="hidden" value={orgId} />
              {candidates.residents.length ? (
                <>
                  <label className="block space-y-2 text-sm font-medium sm:col-span-2" htmlFor="residentId">
                    <span>Existing resident <span className="font-normal text-slate-500">(optional)</span></span>
                    <select className={inputClass} id="residentId" name="residentId" defaultValue="">
                      <option value="">New resident — enter contact details below</option>
                      {candidates.residents.map((resident) => <option key={resident.id} value={resident.id}>{resident.name} · {resident.phone}</option>)}
                    </select>
                  </label>
                  <p className="muted text-sm sm:col-span-2">To add a new resident, leave the selector set to “New resident” and enter their name and phone number.</p>
                </>
              ) : (
                <div className="rounded-lg bg-[#f5f7f5] p-4 text-sm sm:col-span-2">
                  <strong className="block">New resident</strong>
                  <span className="muted mt-1 block">A resident profile will be created when you save this reservation.</span>
                </div>
              )}
              <Field label="Resident name" name="newResidentName" required={!candidates.residents.length} />
              <Field label="Phone number" name="newResidentPhone" type="tel" required={!candidates.residents.length} />
              <Field label="Email (optional)" name="newResidentEmail" type="email" />
              <label className="block space-y-2 text-sm font-medium" htmlFor="bedId">
                <span>Available bed</span>
                <select className={inputClass} id="bedId" name="bedId" required defaultValue="">
                  <option disabled value="">Choose a property, room, and bed</option>
                  {candidates.beds.map((bed) => <option key={bed.id} value={bed.id}>{bed.propertyName} · {bed.floorName} · Room {bed.roomNumber} · {bed.label}</option>)}
                </select>
              </label>
              <Field label="Reservation starts" name="reservationStartDate" type="date" required min={today} defaultValue={today} />
              <Field label="Reservation ends" name="reservationEndDate" type="date" required min={today} />
              <Field label="Expected move-in (optional)" name="expectedMoveInDate" type="date" min={today} />
              <label className="block space-y-2 text-sm font-medium sm:col-span-2" htmlFor="notes">
                <span>Notes <span className="font-normal text-slate-500">(optional)</span></span>
                <textarea className={`${inputClass} min-h-24 py-3`} id="notes" name="notes" maxLength={2000} />
              </label>
              <div className="sm:col-span-2">
              <button className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#176e61] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#10564c]" type="submit">Save reservation</button>
              </div>
            </form>
          ) : (
            <div className="rounded-xl bg-[#f5f7f5] p-5">
              <h2 className="font-semibold">No beds are available to reserve</h2>
              <p className="muted mt-1 max-w-2xl text-sm leading-6">Add an active bed or check whether a current stay or reservation already uses the beds in your assigned properties.</p>
              <Link className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-semibold text-[#176e61]" href={`/org/${orgId}/properties`}>Review properties</Link>
            </div>
          )}
        </div>
      </details>

      <ReservationList title="Active reservations" items={active} orgId={orgId} today={today} />
      <ReservationList title="Reservation history" items={history} orgId={orgId} today={today} />
    </section>
  );
}

function Summary({ label, value }: Readonly<{ label: string; value: number }>) {
  return <div className="surface-card min-w-32 px-4 py-3"><span className="muted block text-xs">{label}</span><strong className="mt-1 block text-2xl">{value}</strong></div>;
}

function Field({ label, name, type = "text", required = false, min, defaultValue }: Readonly<{ label: string; name: string; type?: string; required?: boolean; min?: string; defaultValue?: string }>) {
  return <label className="block space-y-2 text-sm font-medium" htmlFor={name}><span>{label}{required ? <span aria-hidden="true"> *</span> : null}</span><input className={inputClass} id={name} name={name} type={type} required={required} min={min} defaultValue={defaultValue} /></label>;
}

function ReservationList({ title, items, orgId, today }: Readonly<{ title: string; items: Awaited<ReturnType<typeof reservationUseCases.listReservations>>; orgId: string; today: string }>) {
  return (
    <section className="surface-card overflow-hidden">
      <header className="border-b border-[#e2e8f0] px-5 py-4 sm:px-6"><h2 className="text-lg font-semibold">{title}</h2><p className="muted mt-1 text-sm">{items.length} {items.length === 1 ? "reservation" : "reservations"}</p></header>
      {items.length ? (
        <div className="divide-y divide-[#e2e8f0]">
          {items.map((item) => {
            const startsOnOrBeforeToday = item.reservationStartDate.toISOString().slice(0, 10) <= today;
            return (
              <article className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-6" key={item.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.residentName}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "ACTIVE" ? "bg-[#eaf4ef] text-[#176e61]" : "bg-slate-100 text-slate-700"}`}>{statusLabel(item.status)}</span></div>
                  <p className="muted mt-1 text-sm">{item.residentPhone}{item.residentEmail ? ` · ${item.residentEmail}` : ""}</p>
                  <p className="mt-3 text-sm font-medium">{item.bed.propertyName} · {item.bed.floorName} · Room {item.bed.roomNumber} · {item.bed.label}</p>
                  <p className="muted mt-1 text-sm">{formatDate(item.reservationStartDate)} – {formatDate(item.reservationEndDate)}{item.expectedMoveInDate ? ` · Expected move-in ${formatDate(item.expectedMoveInDate)}` : ""}</p>
                  {item.notes ? <p className="muted mt-2 whitespace-pre-wrap text-sm">{item.notes}</p> : null}
                  {item.cancellationReason ? <p className="muted mt-2 text-sm">Cancellation reason: {item.cancellationReason}</p> : null}
                </div>
                {item.status === "ACTIVE" ? (
                  <div className="flex flex-col gap-2 sm:min-w-52 sm:items-end">
                    {startsOnOrBeforeToday ? (
                      <form action={moveInReservationAction} className="grid gap-2 sm:w-72">
                        <input name="orgId" type="hidden" value={orgId} /><input name="reservationId" type="hidden" value={item.id} />
                        <input className={`${inputClass} min-h-10`} aria-label={`Move-in date for ${item.residentName}`} name="moveInDate" type="date" min={item.reservationStartDate.toISOString().slice(0, 10)} max={today} defaultValue={today} required />
                        <RentTermsFields />
                        <button className="min-h-10 rounded-lg bg-[#176e61] px-3 text-sm font-semibold text-white hover:bg-[#10564c]" type="submit">Confirm move-in</button>
                      </form>
                    ) : <p className="max-w-52 text-sm text-slate-600">Move-in can be recorded from {formatDate(item.reservationStartDate)}.</p>}
                    <details className="text-sm">
                      <summary className="cursor-pointer text-slate-600">Cancel reservation</summary>
                      <form action={cancelReservationAction} className="mt-2 flex flex-col gap-2">
                        <input name="orgId" type="hidden" value={orgId} /><input name="reservationId" type="hidden" value={item.id} />
                        <label className="sr-only" htmlFor={`cancel-${item.id}`}>Cancellation reason</label>
                        <input className={inputClass} id={`cancel-${item.id}`} name="reason" maxLength={500} placeholder="Reason (optional)" />
                        <button className="min-h-10 rounded-lg border border-[#cbd5e1] px-3 font-semibold text-slate-700" type="submit">Confirm cancellation</button>
                      </form>
                    </details>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : <p className="muted px-5 py-10 text-center text-sm sm:px-6">No reservations in this section.</p>}
    </section>
  );
}

function statusLabel(status: string) { return status === "MOVED_IN" ? "Moved in" : status.charAt(0) + status.slice(1).toLowerCase(); }
