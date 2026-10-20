import { redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { billingUseCases } from "@/modules/billing/application/use-cases";
import { depositReportFilterSchema, type DepositReportFilters } from "@/modules/billing/application/schemas";
import { AccessDeniedError } from "@/modules/property/domain/inventory";

type SearchParams = Promise<{ propertyId?: string; from?: string; to?: string; transactionType?: string }>;
const entryTypes = ["RECEIPT", "TRANSFER_IN", "TRANSFER_OUT", "DEDUCTION", "REFUND", "RENT_CREDIT"] as const;
const money = (paise: bigint) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise) / 100);
const date = (value: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(value);
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (first) => first.toUpperCase());

function monthWindow(timezone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return { from: `${parts.year}-${parts.month}-01`, to: `${parts.year}-${parts.month}-${parts.day}` };
}

export default async function DepositsReportPage({ params, searchParams }: Readonly<{ params: Promise<{ orgId: string }>; searchParams: SearchParams }>) {
  const [{ orgId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) redirect(`/org/${orgId}/resident`);

  const defaults = monthWindow(actor.organizationTimezone);
  const parsed = depositReportFilterSchema.safeParse({
    propertyId: query.propertyId ?? "",
    from: query.from ?? defaults.from,
    to: query.to ?? defaults.to,
    transactionType: query.transactionType ?? "",
  });
  const invalidFilters = !parsed.success;
  const filters: { propertyId: string; from: string; to: string; transactionType: DepositReportFilters["transactionType"] } = parsed.success
    ? { propertyId: parsed.data.propertyId ?? "", from: parsed.data.from ?? "", to: parsed.data.to ?? "", transactionType: parsed.data.transactionType ?? "" }
    : { propertyId: "", from: defaults.from, to: defaults.to, transactionType: "" };

  let report: Awaited<ReturnType<typeof billingUseCases.getDepositReport>>;
  let invalidProperty = false;
  try {
    report = await billingUseCases.getDepositReport(actor, filters);
  } catch (error) {
    if (!(error instanceof AccessDeniedError) || !filters.propertyId) throw error;
    invalidProperty = true;
    filters.propertyId = "";
    report = await billingUseCases.getDepositReport(actor, filters);
  }

  const downloadHref = (format: "pdf" | "excel") => {
    const queryParams = new URLSearchParams({ type: "deposits", format, ...filters, transactionType: filters.transactionType ?? "" });
    return `/api/v1/organizations/${orgId}/reports/download?${queryParams.toString()}`;
  };

  return <section className="space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold text-[#2563eb]">REPORTS</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Security deposits</h1><p className="muted mt-2 max-w-3xl leading-6">Review the current amount held, required deposits, and ledger activity by property and date.</p></div>
      <a className="text-sm font-semibold text-[#1e3a8a] underline-offset-4 hover:underline" href={`/org/${orgId}/reports/electricity`}>All reports</a>
    </header>

    {invalidFilters ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">Some filters were invalid. Showing this month instead.</p> : null}
    {invalidProperty ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">That property is not available to your account. Showing all accessible properties instead.</p> : null}

    <form className="surface-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_1.2fr_auto] xl:items-end" method="get">
      <label className="grid gap-1 text-xs font-medium text-slate-600">Property<select className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={filters.propertyId} name="propertyId"><option value="">All accessible properties</option>{report.properties.map((property) => <option key={property.publicId} value={property.publicId}>{property.name}</option>)}</select></label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">Activity from<input className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={filters.from} name="from" type="date" /></label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">Activity to<input className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={filters.to} name="to" type="date" /></label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">Entry type<select className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={filters.transactionType} name="transactionType"><option value="">All entry types</option>{entryTypes.map((entryType) => <option key={entryType} value={entryType}>{label(entryType)}</option>)}</select></label>
      <button className="min-h-10 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]" type="submit">Apply filters</button>
    </form>

    <div className="flex flex-wrap gap-2">
      <a className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#1e3a8a] px-4 text-sm font-semibold text-white hover:bg-[#172554]" href={downloadHref("pdf")}>Download PDF</a>
      <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50" href={downloadHref("excel")}>Download Excel</a>
    </div>

    <section aria-label="Security deposit totals" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[
        ["Current held", money(report.totals.heldPaise), "Balance as of now; includes reservation deposits without an account"],
        ["Required on open accounts", money(report.totals.requiredPaise), "Required deposit for accounts awaiting completion"],
        ["Receipts in period", money(report.totals.receivedPaise), "Receipt entries matching these filters"],
        ["Refunds in period", money(report.totals.refundedPaise), "Refund entries matching these filters"],
        ["Deductions in period", money(report.totals.deductedPaise), "Deduction entries matching these filters"],
      ].map(([title, value, detail]) => <article className="surface-card p-4" key={title}><h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{value}</p><p className="muted mt-1 text-xs leading-5">{detail}</p></article>)}
    </section>

    <section className="surface-card overflow-hidden">
      <header className="border-b border-slate-200 px-5 py-4 sm:px-6"><h2 className="text-lg font-semibold">Deposit ledger</h2><p className="muted mt-1 text-sm">{report.rows.length} matching {report.rows.length === 1 ? "entry" : "entries"} for the selected activity period</p></header>
      {report.rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Entry</th><th className="px-4 py-3">Property</th><th className="px-4 py-3">Resident</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Method</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{report.rows.map((row) => <tr key={row.id}><td className="whitespace-nowrap px-4 py-3">{date(row.date)}</td><td className="px-4 py-3">{label(row.type)}</td><td className="px-4 py-3">{row.propertyName}</td><td className="px-4 py-3">{row.residentName}</td><td className="max-w-xs truncate px-4 py-3">{row.reference}</td><td className="px-4 py-3">{label(row.method)}</td><td className="whitespace-nowrap px-4 py-3 text-right">{money(row.amountPaise)}</td></tr>)}</tbody></table></div> : <p className="muted px-5 py-10 text-center text-sm">No deposit entries match this property, entry type, and activity period.</p>}
    </section>
  </section>;
}
