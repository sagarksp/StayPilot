import { redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { billingUseCases } from "@/modules/billing/application/use-cases";
import { finalizeInvoiceAction } from "@/modules/billing/ui/actions";

const money = (paise: bigint) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise) / 100);
const date = (value: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(value);

export default async function FinancePage({ params, searchParams }: Readonly<{ params: Promise<{ orgId: string }>; searchParams: Promise<{ finalized?: string; error?: string }> }>) {
  const [{ orgId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) redirect(`/org/${orgId}/resident`);
  const invoices = await billingUseCases.listInvoices(actor);
  return <section className="space-y-6">
    <header>
      <p className="text-sm font-semibold text-[#176e61]">FINANCE</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Invoices</h1>
      <p className="muted mt-2 max-w-2xl leading-6">Review rent drafts for your accessible properties. Drafts are generated five days before rent is due and only become final after you approve them.</p>
    </header>
    {query.finalized ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">Invoice finalized. Its rent and period are now recorded as a financial snapshot.</p> : null}
    {query.error === "invoice-changed" ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">This draft has changed or was already finalized. Refresh to see its current status.</p> : null}
    <div className="surface-card overflow-hidden">
      <header className="border-b border-[#e2e8f0] px-5 py-4 sm:px-6"><h2 className="text-lg font-semibold">Rent invoices</h2><p className="muted mt-1 text-sm">{invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}</p></header>
      {invoices.length ? <div className="divide-y divide-[#e2e8f0]">{invoices.map((invoice) => <article className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6" key={invoice.publicId}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{invoice.residentStay.resident.name}</h3><span className={invoice.status === "DRAFT" ? "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800" : "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"}>{invoice.status}</span></div>
          <p className="muted mt-1 text-sm">{invoice.property.name} · Room {invoice.residentStay.bed.room.number} · Bed {invoice.residentStay.bed.label}</p>
          <p className="muted mt-1 text-sm">{invoice.invoiceNumber} · {date(invoice.billingPeriodStart)} – {date(invoice.billingPeriodEnd)} · Due {date(invoice.dueDate)}</p>
          <p className="mt-3 text-sm">{invoice.items.map((item) => item.description).join(" · ")}</p>
        </div>
        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end"><strong className="text-lg">{money(invoice.totalPaise)}</strong>{invoice.status === "DRAFT" ? <form action={finalizeInvoiceAction}><input name="orgId" type="hidden" value={orgId} /><input name="invoiceId" type="hidden" value={invoice.publicId} /><button className="min-h-10 rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10564c]" type="submit">Review and finalize</button></form> : <span className="text-xs text-slate-500">Finalized {invoice.finalizedAt ? date(invoice.finalizedAt) : ""}</span>}</div>
      </article>)}</div> : <div className="px-5 py-14 text-center sm:px-6"><h2 className="font-semibold">No rent invoices yet</h2><p className="muted mx-auto mt-2 max-w-lg text-sm leading-6">Drafts appear five days before a stay’s billing date. New stays need rent terms, and the scheduled billing endpoint must be configured with CRON_SECRET.</p></div>}
    </div>
  </section>;
}
