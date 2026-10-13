import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { electricityReportFilterSchema } from "@/modules/electricity/application/schemas";
import { electricityUseCases } from "@/modules/electricity/application/use-cases";
import { AccessDeniedError } from "@/modules/property/domain/inventory";

type SearchParams = Promise<{ propertyId?: string; from?: string; to?: string }>;
const money = (paise: bigint) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise) / 100);
const date = (value: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(value);

function todayInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { today: `${values.year}-${values.month}-${values.day}`, monthStart: `${values.year}-${values.month}-01` };
}

export default async function ElectricityReportPage({ params, searchParams }: Readonly<{ params: Promise<{ orgId: string }>; searchParams: SearchParams }>) {
  const [{ orgId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) redirect(`/org/${orgId}/resident`);

  const defaults = todayInTimezone(actor.organizationTimezone);
  const requested = {
    propertyId: query.propertyId ?? "",
    from: query.from ?? defaults.monthStart,
    to: query.to ?? defaults.today,
  };
  const parsed = electricityReportFilterSchema.safeParse(requested);
  const filters = parsed.success ? parsed.data : { propertyId: "", from: defaults.monthStart, to: defaults.today };
  let report;
  let invalidProperty = false;
  try {
    report = await electricityUseCases.getReport(actor, filters);
  } catch (error) {
    if (!(error instanceof AccessDeniedError) || !filters.propertyId) throw error;
    invalidProperty = true;
    report = await electricityUseCases.getReport(actor, { ...filters, propertyId: "" });
  }
  const pendingInvoices = report.totals.draftInvoicesPaise;

  return <section className="space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold text-[#176e61]">REPORTS</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Electricity billing and collections</h1><p className="muted mt-2 max-w-3xl leading-6">Review finalized electricity charges and the invoice collections tied to each billing period. Date filters use the bill period.</p></div>
      <Link className="text-sm font-semibold text-[#176e61] underline-offset-4 hover:underline" href={`/org/${orgId}/electricity`}>Manage electricity bills</Link>
    </header>

    <form className="surface-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_auto] lg:items-end" method="get">
      <label className="grid gap-1 text-xs font-medium text-slate-600">Property<select className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={filters.propertyId ?? ""} name="propertyId"><option value="">All accessible properties</option>{report.properties.map((property) => <option key={property.publicId} value={property.publicId}>{property.name}</option>)}</select></label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">Billing period from<input className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={filters.from} name="from" type="date"/></label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">Billing period to<input className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={filters.to} name="to" type="date"/></label>
      <button className="min-h-10 rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10564c]" type="submit">Apply filters</button>
    </form>
    {!parsed.success ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">The requested filters were invalid. Showing the current month instead.</p> : null}
    {invalidProperty ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">That property is not available to your account. Showing all accessible properties instead.</p> : null}

    <section aria-label="Electricity report totals" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ["Finalized bills", money(report.totals.billedPaise), "Source bill totals finalized for these periods"],
        ["Collected", money(report.totals.collectedPaise), "Payments applied to finalized electricity invoices"],
        ["Outstanding", money(report.totals.outstandingPaise), "Remaining balance on finalized electricity invoices"],
        ["Drafts awaiting action", `${money(report.totals.draftBillsPaise)} bills · ${money(pendingInvoices)} invoices`, "Draft bills and invoices are reported separately"],
      ].map(([title, value, detail]) => <article className="surface-card p-4" key={title}><h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{value}</p><p className="muted mt-1 text-xs leading-5">{detail}</p></article>)}
    </section>

    <section className="surface-card overflow-hidden">
      <header className="border-b border-slate-200 px-5 py-4 sm:px-6"><h2 className="text-lg font-semibold">Billing periods</h2><p className="muted mt-1 text-sm">{report.rows.length} {report.rows.length === 1 ? "bill" : "bills"} · {report.properties.length} accessible {report.properties.length === 1 ? "property" : "properties"}</p></header>
      {report.rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Property / period</th><th className="px-4 py-3">Mode</th><th className="px-4 py-3">Units</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Bill total</th><th className="px-4 py-3 text-right">Collected</th><th className="px-4 py-3 text-right">Outstanding</th></tr></thead><tbody className="divide-y divide-slate-100">{report.rows.map((row) => <tr key={row.publicId}><td className="px-4 py-3"><strong className="font-medium">{row.property.name}</strong><span className="muted mt-1 block text-xs">{date(row.periodStart)} – {date(row.periodEnd)}</span></td><td className="px-4 py-3">{row.billingMode.replaceAll("_", " ")}</td><td className="px-4 py-3">{row.unitsConsumed?.toString() ?? "—"}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{row.status}</span>{row.draftInvoicePaise > BigInt(0) ? <span className="muted mt-1 block text-xs">Invoice drafts: {money(row.draftInvoicePaise)}</span> : null}</td><td className="px-4 py-3 text-right">{money(row.totalAmountPaise)}</td><td className="px-4 py-3 text-right">{money(row.collectedPaise)}</td><td className="px-4 py-3 text-right">{money(row.outstandingPaise)}</td></tr>)}</tbody></table></div> : <p className="muted px-5 py-10 text-center text-sm">No electricity bills match this property and billing period.</p>}
    </section>
  </section>;
}
