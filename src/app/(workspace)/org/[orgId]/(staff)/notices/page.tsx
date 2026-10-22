import { redirect } from "next/navigation";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { noticeUseCases } from "@/modules/notice/application/use-cases";
import { PublishNoticeButton } from "@/modules/notice/ui/publish-notice-button";
import { archiveNoticeAction, publishNoticeAction } from "@/modules/notice/ui/actions";

const input = "min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900";
const label = "grid gap-1 text-xs font-medium text-slate-600";
const button = "min-h-10 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50";

function today(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateLabel(value: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: timezone }).format(value);
}

export default async function NoticesPage({ params, searchParams }: Readonly<{
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ published?: string; archived?: string; error?: string }>;
}>) {
  const [{ orgId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) redirect(`/org/${orgId}/resident`);
  const { properties, notices } = await noticeUseCases.getStaffPage(actor);
  const isOwner = actor.roles.includes("OWNER");

  return <section className="space-y-6">
    <header><p className="text-sm font-semibold uppercase tracking-wide text-[#2563eb]">Support and control</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Notices</h1><p className="muted mt-2 max-w-3xl leading-6">Publish important updates for residents. A notice appears on the resident dashboard for the selected property, or across the organization when an owner sends it to all properties.</p></header>
    {query.published ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">Notice published for residents.</p> : null}
    {query.archived ? <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm" role="status">Notice withdrawn from resident dashboards.</p> : null}
    {query.error === "invalid" ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">Enter a title and message.</p> : null}
    {query.error === "expiry" ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">Choose today or a future expiry date in your organization’s timezone.</p> : null}

    <form action={publishNoticeAction} className="surface-card grid gap-4 p-5 sm:p-6">
      <input name="orgId" type="hidden" value={orgId}/>
      <div><h2 className="text-lg font-semibold">Publish a notice</h2><p className="muted mt-1 text-sm">Residents will see it as soon as you publish.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>Who should see it?<select className={input} name="propertyId" required={!isOwner}><option value="" disabled={!isOwner}>{isOwner ? "All properties" : "Choose a property"}</option>{properties.map((property) => <option key={property.publicId} value={property.publicId}>{property.name}</option>)}</select></label>
        <label className={label}>Hide after <span className="font-normal">(optional)</span><input className={input} min={today(actor.organizationTimezone)} name="expiresOn" type="date"/></label>
      </div>
      <label className={label}>Title<input className={input} maxLength={160} minLength={3} name="title" placeholder="Water maintenance on Friday" required/></label>
      <label className={label}>Message<textarea className={`${input} min-h-32 py-2`} maxLength={5000} minLength={5} name="body" placeholder="Share the details residents need to know." required/></label>
      <PublishNoticeButton className={`${button} w-full sm:w-fit`} disabled={!properties.length && !isOwner} />
      {!properties.length && !isOwner ? <p className="muted text-xs">Ask the owner to assign a property before publishing notices.</p> : null}
    </form>

    <details className="surface-card group overflow-hidden" aria-labelledby="notice-history-heading">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden"><span><h2 className="text-xl font-semibold" id="notice-history-heading">Notice history</h2><span className="muted mt-1 block text-sm">{notices.length} published or withdrawn notices</span></span><WorkspaceIcon className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" name="arrow_drop_down" /></summary>
      <div className="space-y-3 border-t border-slate-200 p-4 sm:p-5">{notices.length ? <div className="grid gap-3">{notices.map((notice) => {
        const archived = Boolean(notice.archivedAt);
        const canArchive = !archived && (isOwner || Boolean(notice.property));
        return <article className="surface-card space-y-3 p-4 sm:p-5" key={notice.publicId}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{notice.title}</h3><p className="muted mt-1 text-xs">{notice.property?.name ?? "All properties"} · Published {dateLabel(notice.publishedAt, actor.organizationTimezone)}{notice.expiresOn ? ` · Hides ${dateLabel(notice.expiresOn, actor.organizationTimezone)}` : " · No expiry"}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${archived ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-800"}`}>{archived ? "Withdrawn" : "Published"}</span></div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{notice.body}</p>
          {canArchive ? <form action={archiveNoticeAction}><input name="orgId" type="hidden" value={orgId}/><input name="noticeId" type="hidden" value={notice.publicId}/><button className="min-h-9 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50" type="submit">Withdraw notice</button></form> : null}
        </article>;
      })}</div> : <p className="muted p-2 text-sm">No notices have been published yet.</p>}</div>
    </details>
  </section>;
}
