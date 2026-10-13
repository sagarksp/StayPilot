import { redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { propertyUseCases } from "@/modules/property/application";
import { updatePropertyStayPolicyAction } from "@/modules/property/ui/actions";

export default async function SettingsPage({ params, searchParams }: Readonly<{
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}>) {
  const [{ orgId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("OWNER")) redirect(`/org/${orgId}/manager`);
  const policies = await propertyUseCases.listStayPolicies(actor);

  return <section className="space-y-7">
    <header><p className="text-sm font-semibold text-[#176e61]">SUPPORT & CONTROL</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Property settings</h1><p className="muted mt-2 max-w-3xl leading-6">Set move-out notice and lock-in terms for new stays at each property. Existing stays keep the lock-in terms recorded when they began.</p></header>
    {query.error === "invalid" ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">Enter a notice period from 0 to 365 days and a lock-in from 0 to 120 months.</p> : null}
    {query.saved ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">Property policies saved. New stays will use these terms.</p> : null}
    <section className="surface-card divide-y divide-slate-200 overflow-hidden" aria-label="Move-out policies">
      {policies.length ? policies.map((policy) => <form action={updatePropertyStayPolicyAction} className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-end sm:p-6" key={policy.propertyId}>
        <input name="orgId" type="hidden" value={orgId}/><input name="propertyId" type="hidden" value={policy.propertyId}/>
        <div><h2 className="font-semibold">{policy.propertyName}</h2><p className="muted mt-1 text-xs">Applies to stays that start after this setting is saved.</p></div>
        <label className="grid gap-1 text-xs font-medium text-slate-600">Move-out notice period (days)<input className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={policy.noticePeriodDays} max="365" min="0" name="noticePeriodDays" required type="number"/></label>
        <label className="grid gap-1 text-xs font-medium text-slate-600">Lock-in period (months)<input className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={policy.lockInMonths} max="120" min="0" name="lockInMonths" required type="number"/></label>
        <button className="min-h-10 rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10564c]" type="submit">Save policy</button>
      </form>) : <p className="muted p-6 text-sm">Create a property before setting move-out policies.</p>}
    </section>
  </section>;
}
