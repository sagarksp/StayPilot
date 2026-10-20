import { redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { complaintCategories } from "@/modules/complaint/domain/complaint";
import { complaintReportFilterSchema } from "@/modules/complaint/application/schemas";
import { complaintUseCases } from "@/modules/complaint/application";
import { electricityReportFilterSchema } from "@/modules/electricity/application/schemas";
import { electricityUseCases } from "@/modules/electricity/application/use-cases";

type SearchParams = Promise<{ type?: string; propertyId?: string; from?: string; to?: string; asOf?: string; category?: string; status?: string; transactionType?: string }>;
type ReportType = "electricity" | "complaints";
const money = (paise: bigint) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise) / 100);
const date = (value: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(value);
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (first) => first.toUpperCase());

function todayInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { today: `${values.year}-${values.month}-${values.day}`, monthStart: `${values.year}-${values.month}-01` };
}

function Downloads({ orgId, type, propertyId, from, to, category = "", status = "" }: Readonly<{
  orgId: string;
  type: ReportType;
  propertyId: string;
  from: string;
  to: string;
  category?: string;
  status?: string;
}>) {
  const makeHref = (format: "pdf" | "excel") => {
    const query = new URLSearchParams({ type, format, propertyId, from, to, category, status });
    return `/api/v1/organizations/${orgId}/reports/download?${query.toString()}`;
  };
  return <div className="flex flex-wrap gap-2">
    <a className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#1e3a8a] px-4 text-sm font-semibold text-white hover:bg-[#172554]" href={makeHref("pdf")}>Download PDF</a>
    <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50" href={makeHref("excel")}>Download Excel</a>
  </div>;
}

export default async function ElectricityReportPage({ params, searchParams }: Readonly<{ params: Promise<{ orgId: string }>; searchParams: SearchParams }>) {
  const [{ orgId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) redirect(`/org/${orgId}/resident`);

  if (query.type === "finance") {
    const filters = new URLSearchParams({ propertyId: query.propertyId ?? "", from: query.from ?? "", to: query.to ?? "" });
    redirect(`/org/${orgId}/reports/finance?${filters.toString()}`);
  }
  if (query.type === "occupancy") {
    const filters = new URLSearchParams({ propertyId: query.propertyId ?? "", asOf: query.asOf ?? "" });
    redirect(`/org/${orgId}/reports/occupancy?${filters.toString()}`);
  }
  if (query.type === "reservations") {
    const filters = new URLSearchParams({ propertyId: query.propertyId ?? "", from: query.from ?? "", to: query.to ?? "", status: query.status ?? "" });
    redirect(`/org/${orgId}/reports/reservations?${filters.toString()}`);
  }
  if (query.type === "deposits") {
    const filters = new URLSearchParams({ propertyId: query.propertyId ?? "", from: query.from ?? "", to: query.to ?? "", transactionType: query.transactionType ?? "" });
    redirect(`/org/${orgId}/reports/deposits?${filters.toString()}`);
  }

  const type: ReportType = query.type === "complaints" ? "complaints" : "electricity";
  const defaults = todayInTimezone(actor.organizationTimezone);
  const requested = {
    propertyId: query.propertyId ?? "",
    from: query.from ?? defaults.monthStart,
    to: query.to ?? defaults.today,
  };
  let invalidFilters = false;
  let invalidProperty = false;
  let electricityFilters: { propertyId: string; from: string; to: string } = requested;
  let complaintFilters: { propertyId: string; from: string; to: string; category: string; status: string } = {
    ...requested,
    category: query.category ?? "",
    status: query.status ?? "",
  };
  let electricityReport: Awaited<ReturnType<typeof electricityUseCases.getReport>> | null = null;
  let complaintReport: Awaited<ReturnType<typeof complaintUseCases.getReportForStaff>> | null = null;

  if (type === "electricity") {
    const parsed = electricityReportFilterSchema.safeParse(requested);
    invalidFilters = !parsed.success;
    electricityFilters = parsed.success
      ? { propertyId: parsed.data.propertyId ?? "", from: parsed.data.from ?? defaults.monthStart, to: parsed.data.to ?? defaults.today }
      : { propertyId: "", from: defaults.monthStart, to: defaults.today };
    try {
      electricityReport = await electricityUseCases.getReport(actor, electricityFilters);
    } catch (error) {
      if (!(error instanceof AccessDeniedError) || !electricityFilters.propertyId) throw error;
      invalidProperty = true;
      electricityFilters = { ...electricityFilters, propertyId: "" };
      electricityReport = await electricityUseCases.getReport(actor, electricityFilters);
    }
  } else {
    const parsed = complaintReportFilterSchema.safeParse(complaintFilters);
    invalidFilters = !parsed.success;
    complaintFilters = parsed.success ? {
      propertyId: parsed.data.propertyId ?? "",
      from: parsed.data.from || defaults.monthStart,
      to: parsed.data.to || defaults.today,
      category: parsed.data.category ?? "",
      status: parsed.data.status ?? "",
    } : { propertyId: "", from: defaults.monthStart, to: defaults.today, category: "", status: "" };
    try {
      complaintReport = await complaintUseCases.getReportForStaff(actor, complaintFilters);
    } catch (error) {
      if (!(error instanceof AccessDeniedError) || !complaintFilters.propertyId) throw error;
      invalidProperty = true;
      complaintFilters = { ...complaintFilters, propertyId: "" };
      complaintReport = await complaintUseCases.getReportForStaff(actor, complaintFilters);
    }
  }

  const properties = type === "electricity" ? electricityReport!.properties : complaintReport!.properties;
  const activePropertyId = type === "electricity" ? electricityFilters.propertyId ?? "" : complaintFilters.propertyId;
  const reportPropertyCount = properties.length;
  const activeFrom = type === "electricity" ? electricityFilters.from ?? "" : complaintFilters.from;
  const activeTo = type === "electricity" ? electricityFilters.to ?? "" : complaintFilters.to;

  return <section className="space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold text-[#2563eb]">REPORTS</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Operational reports</h1><p className="muted mt-2 max-w-3xl leading-6">Choose a report type, filter the records, and download a formatted PDF or Excel workbook.</p></div>
    </header>

    <form className="surface-card grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" method="get">
      <label className="grid gap-1 text-xs font-medium text-slate-600">Report category<select className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={type} name="type"><option value="electricity">Electricity billing and collections</option><option value="complaints">Maintenance and service complaints</option><option value="finance">Finance and collections</option><option value="occupancy">Property occupancy</option><option value="reservations">Reservations</option><option value="deposits">Security deposits</option></select></label>
      <button className="min-h-10 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]" type="submit">Open report</button>
    </form>

    {invalidFilters ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">Some filters were invalid. Showing the current month instead.</p> : null}
    {invalidProperty ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">That property is not available to your account. Showing all accessible properties instead.</p> : null}

    {type === "electricity" ? <>
      <form className="surface-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_auto] lg:items-end" method="get">
        <input name="type" type="hidden" value="electricity" />
        <label className="grid gap-1 text-xs font-medium text-slate-600">Property<select className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={activePropertyId} name="propertyId"><option value="">All accessible properties</option>{properties.map((property) => <option key={property.publicId} value={property.publicId}>{property.name}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-medium text-slate-600">Billing period from<input className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={activeFrom} name="from" type="date"/></label>
        <label className="grid gap-1 text-xs font-medium text-slate-600">Billing period to<input className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={activeTo} name="to" type="date"/></label>
        <button className="min-h-10 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]" type="submit">Apply filters</button>
      </form>
      <Downloads orgId={orgId} type="electricity" propertyId={activePropertyId} from={activeFrom} to={activeTo} />
      <section aria-label="Electricity report totals" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Finalized bills", money(electricityReport!.totals.billedPaise), "Source bill totals finalized for these periods"],
          ["Collected", money(electricityReport!.totals.collectedPaise), "Payments applied to finalized electricity invoices"],
          ["Outstanding", money(electricityReport!.totals.outstandingPaise), "Remaining balance on finalized electricity invoices"],
          ["Drafts awaiting action", `${money(electricityReport!.totals.draftBillsPaise)} bills · ${money(electricityReport!.totals.draftInvoicesPaise)} invoices`, "Draft bills and invoices are reported separately"],
        ].map(([title, value, detail]) => <article className="surface-card p-4" key={title}><h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{value}</p><p className="muted mt-1 text-xs leading-5">{detail}</p></article>)}
      </section>
      <section className="surface-card overflow-hidden">
        <header className="border-b border-slate-200 px-5 py-4 sm:px-6"><h2 className="text-lg font-semibold">Billing periods</h2><p className="muted mt-1 text-sm">{electricityReport!.rows.length} {electricityReport!.rows.length === 1 ? "bill" : "bills"} · {reportPropertyCount} accessible {reportPropertyCount === 1 ? "property" : "properties"}</p></header>
        {electricityReport!.rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Property / period</th><th className="px-4 py-3">Mode</th><th className="px-4 py-3">Units</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Bill total</th><th className="px-4 py-3 text-right">Collected</th><th className="px-4 py-3 text-right">Outstanding</th></tr></thead><tbody className="divide-y divide-slate-100">{electricityReport!.rows.map((row) => <tr key={row.publicId}><td className="px-4 py-3"><strong className="font-medium">{row.property.name}</strong><span className="muted mt-1 block text-xs">{date(row.periodStart)} – {date(row.periodEnd)}</span></td><td className="px-4 py-3">{label(row.billingMode)}</td><td className="px-4 py-3">{row.unitsConsumed?.toString() ?? "—"}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{row.status}</span>{row.draftInvoicePaise > BigInt(0) ? <span className="muted mt-1 block text-xs">Invoice drafts: {money(row.draftInvoicePaise)}</span> : null}</td><td className="px-4 py-3 text-right">{money(row.totalAmountPaise)}</td><td className="px-4 py-3 text-right">{money(row.collectedPaise)}</td><td className="px-4 py-3 text-right">{money(row.outstandingPaise)}</td></tr>)}</tbody></table></div> : <p className="muted px-5 py-10 text-center text-sm">No electricity bills match this property and billing period.</p>}
      </section>
    </> : <>
      <form className="surface-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] xl:items-end" method="get">
        <input name="type" type="hidden" value="complaints" />
        <label className="grid gap-1 text-xs font-medium text-slate-600">Property<select className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={activePropertyId} name="propertyId"><option value="">All accessible properties</option>{properties.map((property) => <option key={property.publicId} value={property.publicId}>{property.name}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-medium text-slate-600">Submitted from<input className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={activeFrom} name="from" type="date"/></label>
        <label className="grid gap-1 text-xs font-medium text-slate-600">Submitted to<input className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={activeTo} name="to" type="date"/></label>
        <label className="grid gap-1 text-xs font-medium text-slate-600">Complaint category<select className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={complaintFilters.category} name="category"><option value="">All categories</option>{complaintCategories.map((category) => <option key={category} value={category}>{label(category)}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-medium text-slate-600">Status<select className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={complaintFilters.status} name="status"><option value="">All statuses</option>{["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>
        <button className="min-h-10 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]" type="submit">Apply filters</button>
      </form>
      <Downloads orgId={orgId} type="complaints" propertyId={activePropertyId} from={activeFrom} to={activeTo} category={complaintFilters.category} status={complaintFilters.status} />
      <section aria-label="Complaint report totals" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total requests", String(complaintReport!.rows.length)],
          ["Open", String(complaintReport!.rows.filter((row) => row.status === "OPEN").length)],
          ["In progress", String(complaintReport!.rows.filter((row) => row.status === "IN_PROGRESS").length)],
          ["Resolved / closed", String(complaintReport!.rows.filter((row) => row.status === "RESOLVED" || row.status === "CLOSED").length)],
        ].map(([title, value]) => <article className="surface-card p-4" key={title}><h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{value}</p></article>)}
      </section>
      <section className="surface-card overflow-hidden">
        <header className="border-b border-slate-200 px-5 py-4 sm:px-6"><h2 className="text-lg font-semibold">Maintenance and service requests</h2><p className="muted mt-1 text-sm">{complaintReport!.rows.length} {complaintReport!.rows.length === 1 ? "request" : "requests"} · {reportPropertyCount} accessible {reportPropertyCount === 1 ? "property" : "properties"}</p></header>
        {complaintReport!.rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Category</th><th className="px-4 py-3">Request</th><th className="px-4 py-3">Property</th><th className="px-4 py-3">Resident / room</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Assigned to</th><th className="px-4 py-3">Submitted</th></tr></thead><tbody className="divide-y divide-slate-100">{complaintReport!.rows.map((row) => <tr key={row.id}><td className="px-4 py-3">{label(row.category)}</td><td className="max-w-xs px-4 py-3"><strong className="font-medium">{row.title}</strong><span className="muted mt-1 block truncate text-xs">{row.description}</span></td><td className="px-4 py-3">{row.propertyName}</td><td className="px-4 py-3">{row.residentName}<span className="muted mt-1 block text-xs">Room {row.roomNumber} · Bed {row.bedLabel}</span></td><td className="px-4 py-3">{label(row.status)}</td><td className="px-4 py-3">{row.assignedToName ?? "Unassigned"}</td><td className="px-4 py-3">{date(row.createdAt)}</td></tr>)}</tbody></table></div> : <p className="muted px-5 py-10 text-center text-sm">No complaints match these filters.</p>}
      </section>
    </>}
  </section>;
}
