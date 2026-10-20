import type { ComplaintSummary } from "../domain/complaint";
import type { ResidentStaySummary } from "@/modules/resident/domain/resident";
import { createComplaintAction } from "./actions";
import { ComplaintAttachments } from "./complaint-attachments";
import styles from "./resident-complaints.module.css";

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
  return <section className={styles.section} aria-labelledby="complaints-heading" id="support-heading">
    <header className={styles.intro}><p>Support</p><h2 id="complaints-heading">Maintenance and service requests</h2><p>Report an issue to your property team and track its status here.</p></header>
    {created ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">Your complaint was submitted to the property team.</p> : null}
    {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">{message}</p> : null}
    {currentStays.length ? <form action={createComplaintAction} className={`surface-card grid min-w-0 gap-4 p-5 md:p-6 ${styles.requestForm}`}>
      <input name="orgId" type="hidden" value={orgId} />
      <h3 className="font-semibold md:col-span-2">Create a request</h3>
      <label className="grid min-w-0 gap-1 text-sm font-medium">Stay<select className={styles.formSelect} name="stayId" required>{currentStays.map((stay) => <option key={stay.id} value={stay.id}>{stay.propertyName} · Room {stay.roomNumber} · Bed {stay.bedLabel}</option>)}</select></label>
      <label className="grid min-w-0 gap-1 text-sm font-medium">Category<select className={styles.formSelect} name="category" required>{categories.map((category) => <option key={category} value={category}>{label(category)}</option>)}</select></label>
      <label className="grid min-w-0 gap-1 text-sm font-medium md:col-span-2">Title<input className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm" maxLength={180} minLength={3} name="title" placeholder="Briefly describe the issue" required /></label>
      <label className="grid min-w-0 gap-1 text-sm font-medium md:col-span-2">Details<textarea className="rounded-lg border border-slate-300 px-3 py-2 text-sm" maxLength={4000} minLength={10} name="description" placeholder="Tell us what happened and where" required rows={4} /></label>
      <div className="md:col-span-2"><button className="min-h-11 rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]" type="submit">Submit request</button></div>
    </form> : <p className="surface-card muted p-5 text-sm">A complaint can be submitted once your stay begins.</p>}
    {complaints.length ? <div className={styles.complaintList}>{complaints.map((complaint) => <article className={`surface-card ${styles.complaintCard}`} key={complaint.id}>
      <div className={styles.requestTop}><div className={styles.requestIdentity}><p className={styles.requestEyebrow}>{label(complaint.category)} · {complaint.propertyName}</p><h3>{complaint.title}</h3></div><span className={styles.requestStatus}>{label(complaint.status)}</span></div>
      <p className={styles.requestDescription}>{complaint.description}</p>
      {complaint.assignedToName ? <p className="muted mt-2 text-xs">Assigned to {complaint.assignedToName}</p> : null}
      <p className="muted mt-2 text-xs">Submitted {date(complaint.createdAt)} · Room {complaint.roomNumber} · Bed {complaint.bedLabel}</p>
      <div className="mt-4 border-t border-slate-200 pt-4"><ComplaintAttachments attachments={complaint.attachments} complaintId={complaint.id} orgId={orgId} /></div>
      {complaint.events.length > 1 ? <details className="mt-3"><summary className="cursor-pointer text-sm font-medium text-[#2563eb]">Request updates</summary><ul className="mt-2 space-y-2 border-l-2 border-slate-200 pl-3">{complaint.events.filter((event) => event.type !== "CREATED").map((event) => <li className="text-sm" key={event.id}><strong>{event.toStatus ? label(event.toStatus) : label(event.type)}</strong>{event.note ? <span> · {event.note}</span> : null}<p className="muted mt-0.5 text-xs">{date(event.createdAt)} · {event.actorName}</p></li>)}</ul></details> : null}
    </article>)}</div> : <p className="surface-card muted p-5 text-sm">You have not submitted any requests.</p>}
  </section>;
}
