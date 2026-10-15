import { redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { complaintUseCases } from "@/modules/complaint/application";
import { updateComplaintAction } from "@/modules/complaint/ui/actions";
import type { ComplaintStatus } from "@/modules/complaint/domain/complaint";
import { ComplaintAttachments } from "@/modules/complaint/ui/complaint-attachments";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (first) => first.toUpperCase());
}

function date(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(value);
}

function errorMessage(code?: string) {
  switch (code) {
    case "invalid": return "Check the selected status and fields.";
    case "not-found": return "That complaint is no longer available in your assigned properties.";
    case "invalid-transition": return "That status change is not allowed. Refresh to see the current status.";
    case "invalid-assignee": return "Choose a manager assigned to this property.";
    case "resolution-note-required": return "Add a resolution note before resolving the complaint.";
    default: return null;
  }
}

export default async function ComplaintsPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ error?: string }>;
}>) {
  const [{ orgId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) redirect(`/org/${orgId}/resident`);
  const complaints = await complaintUseCases.listForStaff(actor);
  const message = errorMessage(query.error);

  return <section className="space-y-6">
    <header><p className="text-sm font-semibold text-[#176e61]">SUPPORT</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Complaints</h1><p className="muted mt-2 max-w-3xl leading-6">Review resident maintenance and service requests, assign them to a property manager, and record status updates.</p></header>
    {message ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">{message}</p> : null}
    <div className="surface-card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2e8f0] px-5 py-4 sm:px-6"><div><h2 className="text-lg font-semibold">Resident requests</h2><p className="muted mt-1 text-sm">Showing the latest {complaints.length} complaints you can access.</p></div><div className="flex gap-2 text-xs"><span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">{complaints.filter((item) => item.status === "OPEN").length} open</span><span className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-800">{complaints.filter((item) => item.status === "IN_PROGRESS").length} in progress</span></div></header>
      {complaints.length ? <div className="divide-y divide-[#e2e8f0]">{complaints.map((complaint) => {
        const nextStatuses: ComplaintStatus[] = complaint.status === "OPEN" ? ["OPEN", "IN_PROGRESS"] : complaint.status === "IN_PROGRESS" ? ["IN_PROGRESS", "RESOLVED"] : complaint.status === "RESOLVED" ? ["RESOLVED", "CLOSED"] : ["CLOSED"];
        return <article className="space-y-4 px-5 py-5 sm:px-6" key={complaint.id}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold">{complaint.title}</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{label(complaint.status)}</span></div><p className="muted mt-1 text-sm">{label(complaint.category)} · {complaint.propertyName} · Room {complaint.roomNumber} · Bed {complaint.bedLabel}</p><p className="muted mt-1 text-sm">{complaint.residentName} · Submitted {date(complaint.createdAt)}</p></div></div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{complaint.description}</p>
          <ComplaintAttachments attachments={complaint.attachments} complaintId={complaint.id} orgId={orgId} />
          {complaint.status !== "CLOSED" ? <form action={updateComplaintAction} className="grid gap-3 rounded-lg border border-[#e2e8f0] bg-[#fbfcfb] p-4 sm:grid-cols-2">
            <input name="orgId" type="hidden" value={orgId} /><input name="complaintId" type="hidden" value={complaint.id} />
            <label className="grid gap-1 text-sm font-medium">Status<select className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" defaultValue={complaint.status} name="status">{nextStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>
            <label className="grid gap-1 text-sm font-medium">Assigned manager<select className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" defaultValue={complaint.assignedToId ?? ""} name="assignedToId"><option value="">Unassigned</option>{complaint.assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name}</option>)}</select></label>
            {complaint.status === "IN_PROGRESS" ? <label className="grid gap-1 text-sm font-medium sm:col-span-2">Resolution note <span className="muted text-xs">Required only when changing status to Resolved.</span><textarea className="rounded-md border border-slate-300 px-3 py-2 text-sm" maxLength={1000} name="resolutionNote" rows={2} /></label> : null}
            <div className="sm:col-span-2"><button className="min-h-10 rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10564c]" type="submit">Save update</button></div>
          </form> : <p className="text-sm font-medium text-emerald-800">This complaint is closed.</p>}
          {complaint.events.length ? <details><summary className="cursor-pointer text-sm font-medium text-[#176e61]">Activity ({complaint.events.length})</summary><ul className="mt-3 space-y-2 border-l-2 border-slate-200 pl-4">{complaint.events.map((event) => <li className="text-sm" key={event.id}><strong>{event.toStatus ? label(event.toStatus) : label(event.type)}</strong>{event.note ? <span> · {event.note}</span> : null}<p className="muted mt-0.5 text-xs">{date(event.createdAt)} · {event.actorName}</p></li>)}</ul></details> : null}
        </article>;
      })}</div> : <div className="px-5 py-12 text-center"><h2 className="font-semibold">No complaints yet</h2><p className="muted mt-2 text-sm">Resident requests will appear here.</p></div>}
    </div>
  </section>;
}
