import type { ComplaintSummary } from "../domain/complaint";
import type { ResidentStaySummary } from "@/modules/resident/domain/resident";
import { createComplaintAction } from "./actions";

const categories = ["ELECTRICITY", "PLUMBING", "CLEANING", "FOOD", "WIFI", "FURNITURE", "SECURITY", "OTHER"] as const;

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (first) => first.toUpperCase());
}

function date(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(value);
}

function complaintError(code?: string) {
  switch (code) {
    case "invalid": return "Enter a title and details for your complaint.";
    case "no-active-stay": return "A current stay is required to submit a complaint.";
    default: return null;
  }
}

export function ResidentComplaints({
  orgId,
  stays,
  complaints,
  errorCode,
  created,
}: Readonly<{
  orgId: string;
  stays: readonly ResidentStaySummary[];
  complaints: readonly ComplaintSummary[];
  errorCode?: string;
  created?: string;
}>) {
  const currentStays = stays.filter((stay) => ["ACTIVE", "NOTICE_PERIOD"].includes(stay.status));
  const message = complaintError(errorCode);
  return <section className="space-y-4" aria-labelledby="complaints-heading">
    <div><p className="text-sm font-semibold text-[#176e61]">SUPPORT</p><h2 className="mt-1 text-xl font-semibold" id="complaints-heading">Maintenance and service requests</h2><p className="muted mt-1 text-sm">Report an issue to your property team and track its status here.</p></div>
    {created ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">Your complaint was submitted to the property team.</p> : null}
    {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">{message}</p> : null}
    {currentStays.length ? <form action={createComplaintAction} className="surface-card grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
      <input name="orgId" type="hidden" value={orgId} />
      <h3 className="font-semibold sm:col-span-2">Create a request</h3>
      <label className="grid gap-1 text-sm font-medium">Stay<select className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" name="stayId" required>{currentStays.map((stay) => <option key={stay.id} value={stay.id}>{stay.propertyName} · Room {stay.roomNumber} · Bed {stay.bedLabel}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium">Category<select className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" name="category" required>{categories.map((category) => <option key={category} value={category}>{label(category)}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-medium sm:col-span-2">Title<input className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm" maxLength={180} minLength={3} name="title" placeholder="Briefly describe the issue" required /></label>
      <label className="grid gap-1 text-sm font-medium sm:col-span-2">Details<textarea className="rounded-lg border border-slate-300 px-3 py-2 text-sm" maxLength={4000} minLength={10} name="description" placeholder="Tell us what happened and where" required rows={4} /></label>
      <div className="sm:col-span-2"><button className="min-h-11 rounded-lg bg-[#176e61] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#10564c]" type="submit">Submit request</button></div>
    </form> : <p className="surface-card muted p-5 text-sm">A complaint can be submitted once your stay begins.</p>}
    {complaints.length ? <div className="space-y-3">{complaints.map((complaint) => <article className="surface-card p-5" key={complaint.id}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#176e61]">{label(complaint.category)} · {complaint.propertyName}</p><h3 className="mt-1 font-semibold">{complaint.title}</h3></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{label(complaint.status)}</span></div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{complaint.description}</p>
      {complaint.assignedToName ? <p className="muted mt-2 text-xs">Assigned to {complaint.assignedToName}</p> : null}
      <p className="muted mt-2 text-xs">Submitted {date(complaint.createdAt)} · Room {complaint.roomNumber} · Bed {complaint.bedLabel}</p>
      {complaint.events.length > 1 ? <details className="mt-3"><summary className="cursor-pointer text-sm font-medium text-[#176e61]">Request updates</summary><ul className="mt-2 space-y-2 border-l-2 border-slate-200 pl-3">{complaint.events.filter((event) => event.type !== "CREATED").map((event) => <li className="text-sm" key={event.id}><strong>{event.toStatus ? label(event.toStatus) : label(event.type)}</strong>{event.note ? <span> · {event.note}</span> : null}<p className="muted mt-0.5 text-xs">{date(event.createdAt)} · {event.actorName}</p></li>)}</ul></details> : null}
    </article>)}</div> : <p className="surface-card muted p-5 text-sm">You have not submitted any requests.</p>}
  </section>;
}
