import { redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { auditUseCases } from "@/modules/audit/application/use-cases";

const dateTime = (value: Date, timezone: string) => new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: timezone,
}).format(value);

export default async function AuditLogPage({
  params,
}: Readonly<{ params: Promise<{ orgId: string }> }>) {
  const { orgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) redirect(`/org/${orgId}/resident`);

  const events = await auditUseCases.listRecent(actor);

  return <section className="space-y-6">
    <header>
      <p className="text-sm font-semibold text-[#2563eb]">WORKSPACE HISTORY</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Audit log</h1>
      <p className="muted mt-2 max-w-3xl leading-6">Recent financial and resident lifecycle actions, with the staff member and property recorded for each event.</p>
    </header>

    <section aria-label="Recent audit events" className="surface-card overflow-hidden">
      {events.length ? <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Property</th><th className="px-4 py-3">Staff member</th><th className="px-4 py-3">Details</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {events.map((event) => <tr key={event.publicId}>
              <td className="whitespace-nowrap px-4 py-3">{dateTime(event.createdAt, actor.organizationTimezone)}</td>
              <td className="px-4 py-3 font-medium">{event.actionCode.replaceAll("_", " ").toLowerCase()}</td>
              <td className="px-4 py-3">{event.property?.name ?? "Organization"}</td>
              <td className="px-4 py-3">{event.actorName}</td>
              <td className="max-w-md px-4 py-3 text-slate-600">{event.summary}</td>
            </tr>)}
          </tbody>
        </table>
      </div> : <p className="px-5 py-12 text-center text-sm text-slate-600">No audit events have been recorded yet.</p>}
      {events.length === 100 ? <p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">Showing the latest 100 events.</p> : null}
    </section>
  </section>;
}
