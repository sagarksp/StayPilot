import { redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { financeReportFilterSchema } from "@/modules/billing/application/schemas";
import { billingUseCases } from "@/modules/billing/application/use-cases";

type SearchParams = Promise<{ propertyId?: string; from?: string; to?: string }>;
const money = (paise: bigint) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise) / 100);
const date = (value: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(value);
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (first) => first.toUpperCase());

function todayInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { today: `${values.year}-${values.month}-${values.day}`, monthStart: `${values.year}-${values.month}-01` };
}

export default async function FinanceReportPage({ params, searchParams }: Readonly<{ params: Promise<{ orgId: string }>; searchParams: SearchParams }>) {
  const [{ orgId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) redirect(`/org/${orgId}/resident`);

  const defaults = todayInTimezone(actor.organizationTimezone);
  const parsed = financeReportFilterSchema.safeParse({
    propertyId: query.propertyId ?? "",
    from: query.from ?? defaults.monthStart,
    to: query.to ?? defaults.today,
  });
  const invalidFilters = !parsed.success;
  const filters = parsed.success
    ? { propertyId: parsed.data.propertyId ?? "", from: parsed.data.from || defaults.monthStart, to: parsed.data.to || defaults.today }
    : { propertyId: "", from: defaults.monthStart, to: defaults.today };

  let report: Awaited<ReturnType<typeof billingUseCases.getFinanceReport>>;
  let invalidProperty = false;
  try {
    report = await billingUseCases.getFinanceReport(actor, filters);
  } catch (error) {
    if (!(error instanceof AccessDeniedError) || !filters.propertyId) throw error;
    invalidProperty = true;
    filters.propertyId = "";
    report = await billingUseCases.getFinanceReport(actor, filters);
  }

  const downloadHref = (format: "pdf" | "excel") => {
    const queryParams = new URLSearchParams({ type: "finance", format, ...filters });
    return `/api/v1/organizations/${orgId}/reports/download?${queryParams.toString()}`;
  };

  return <section className="space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold text-[#2563eb]">REPORTS</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Finance and collections</h1><p className="muted mt-2 max-w-3xl leading-6">Review invoice totals, collections, outstanding balances, and security deposit activity for the selected period.</p></div>
      <a className="text-sm font-semibold text-[#1e3a8a] underline-offset-4 hover:underline" href={`/org/${orgId}/reports/electricity`}>All reports</a>
    </header>

    {invalidFilters ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">Some filters were invalid. Showing the current month instead.</p> : null}
    {invalidProperty ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">That property is not available to your account. Showing all accessible properties instead.</p> : null}

    <form className="surface-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_auto] xl:items-end" method="get">
      <label className="grid gap-1 text-xs font-medium text-slate-600">Property<select className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={filters.propertyId} name="propertyId"><option value="">All accessible properties</option>{report.properties.map((property) => <option key={property.publicId} value={property.publicId}>{property.name}</option>)}</select></label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">From<input className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={filters.from} name="from" type="date" /></label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">To<input className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={filters.to} name="to" type="date" /></label>
      <button className="min-h-10 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]" type="submit">Apply filters</button>
    </form>

    <div className="flex flex-wrap gap-2">
      <a className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#1e3a8a] px-4 text-sm font-semibold text-white hover:bg-[#172554]" href={downloadHref("pdf")}>Download PDF</a>
      <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50" href={downloadHref("excel")}>Download Excel</a>
    </div>

    <section aria-label="Finance report totals" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[
        ["Invoices issued", money(report.totals.billedPaise), "Finalized invoices issued during the selected period"],
        ["Net collections", money(report.totals.collectedPaise), "Payments less reversals, excluding deposit ledger entries"],
        ["Current outstanding", money(report.totals.outstandingPaise), "Remaining balance on invoices issued in this period"],
        ["Deposit receipts", money(report.totals.depositReceiptsPaise), "Security deposit receipts recorded during this period"],
        ["Deposit refunds", money(report.totals.depositRefundsPaise), "Refunds recorded during this period"],
      ].map(([title, value, detail]) => <article className="surface-card p-4" key={title}><h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{value}</p><p className="muted mt-1 text-xs leading-5">{detail}</p></article>)}
    </section>

    <section className="surface-card overflow-hidden">
      <header className="border-b border-slate-200 px-5 py-4 sm:px-6"><h2 className="text-lg font-semibold">Financial activity</h2><p className="muted mt-1 text-sm">{report.rows.length} entries · {report.properties.length} accessible {report.properties.length === 1 ? "property" : "properties"}</p></header>
      {report.rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Entry</th><th className="px-4 py-3">Property / resident</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Method</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{report.rows.map((row) => <tr key={row.id}><td className="whitespace-nowrap px-4 py-3">{date(row.date)}</td><td className="px-4 py-3">{label(row.type)}</td><td className="px-4 py-3"><strong className="font-medium">{row.propertyName}</strong><span className="muted mt-1 block text-xs">{row.residentName}</span></td><td className="px-4 py-3">{row.reference}</td><td className="px-4 py-3">{label(row.method)}</td><td className="whitespace-nowrap px-4 py-3 text-right">{money(row.amountPaise)}</td></tr>)}</tbody></table></div> : <p className="muted px-5 py-10 text-center text-sm">No financial activity matches this property and period.</p>}
    </section>
  </section>;
}
