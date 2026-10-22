import { redirect } from "next/navigation";
import { ReportSubmitButton } from "@/components/ui/report-submit-button";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { occupancyReportFilterSchema } from "@/modules/property/application/schemas";
import { propertyUseCases } from "@/modules/property/application";

type SearchParams = Promise<{ propertyId?: string; asOf?: string }>;
const percent = (value: number) => `${value.toFixed(1)}%`;

function todayInTimezone(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));
}

export default async function OccupancyReportPage({ params, searchParams }: Readonly<{ params: Promise<{ orgId: string }>; searchParams: SearchParams }>) {
  const [{ orgId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) redirect(`/org/${orgId}/resident`);

  const defaultDate = todayInTimezone(actor.organizationTimezone);
  const parsed = occupancyReportFilterSchema.safeParse({ propertyId: query.propertyId ?? "", asOf: query.asOf || defaultDate });
  const invalidFilters = !parsed.success;
  const filters = parsed.success
    ? { propertyId: parsed.data.propertyId ?? "", asOf: parsed.data.asOf }
    : { propertyId: "", asOf: defaultDate };

  let report: Awaited<ReturnType<typeof propertyUseCases.getOccupancyReport>>;
  let invalidProperty = false;
  try {
    report = await propertyUseCases.getOccupancyReport(actor, filters);
  } catch (error) {
    if (!(error instanceof AccessDeniedError) || !filters.propertyId) throw error;
    invalidProperty = true;
    filters.propertyId = "";
    report = await propertyUseCases.getOccupancyReport(actor, filters);
  }

  const downloadHref = (format: "pdf" | "excel") => {
    const queryParams = new URLSearchParams({ type: "occupancy", format, ...filters });
    return `/api/v1/organizations/${orgId}/reports/download?${queryParams.toString()}`;
  };

  return <section className="space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold text-[#2563eb]">REPORTS</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Property occupancy</h1><p className="muted mt-2 max-w-3xl leading-6">See occupied, reserved, available, and maintenance beds across your accessible properties.</p></div>
      <a className="text-sm font-semibold text-[#1e3a8a] underline-offset-4 hover:underline" href={`/org/${orgId}/reports/electricity`}>All reports</a>
    </header>

    {invalidFilters ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">The report date was invalid. Showing today instead.</p> : null}
    {invalidProperty ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">That property is not available to your account. Showing all accessible properties instead.</p> : null}

    <form className="surface-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[1.3fr_1fr_auto] xl:items-end" method="get">
      <label className="grid gap-1 text-xs font-medium text-slate-600">Property<select className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={filters.propertyId} name="propertyId"><option value="">All accessible properties</option>{report.properties.map((property) => <option key={property.publicId} value={property.publicId}>{property.name}</option>)}</select></label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">Occupancy as of<input className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={filters.asOf} name="asOf" type="date" /></label>
      <ReportSubmitButton className="report-filter-submit min-h-10 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]" label="Apply filters" loadingLabel="Loading report..." />
    </form>

    <div className="flex flex-wrap gap-2">
      <a className="report-download report-download--pdf inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold" href={downloadHref("pdf")}>Download PDF</a>
      <a className="report-download report-download--excel inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold" href={downloadHref("excel")}>Download Excel</a>
    </div>

    <section aria-label="Occupancy report totals" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[
        ["Operational beds", report.totals.operationalBeds, "Active beds in active properties"],
        ["Occupied", report.totals.occupiedBeds, "Beds with an active stay on this date"],
        ["Reserved", report.totals.reservedBeds, "Unoccupied beds reserved on this date"],
        ["Available", report.totals.availableBeds, "Operational beds ready to assign"],
        ["Occupancy", percent(report.totals.occupancyPercent), `${formatDate(filters.asOf)} · maintenance beds excluded`],
      ].map(([title, value, detail]) => <article className="surface-card p-4" key={title}><h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{value}</p><p className="muted mt-1 text-xs leading-5">{detail}</p></article>)}
    </section>

    <section className="surface-card overflow-hidden">
      <header className="border-b border-slate-200 px-5 py-4 sm:px-6"><h2 className="text-lg font-semibold">Occupancy by property</h2><p className="muted mt-1 text-sm">{report.rows.length} accessible {report.rows.length === 1 ? "property" : "properties"} · as of {formatDate(filters.asOf)}</p></header>
      {report.rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Property</th><th className="px-4 py-3 text-right">Operational</th><th className="px-4 py-3 text-right">Occupied</th><th className="px-4 py-3 text-right">Reserved</th><th className="px-4 py-3 text-right">Available</th><th className="px-4 py-3 text-right">Maintenance</th><th className="px-4 py-3 text-right">Occupancy</th></tr></thead><tbody className="divide-y divide-slate-100">{report.rows.map((row) => <tr key={row.propertyId}><td className="px-4 py-3 font-medium">{row.propertyName}</td><td className="px-4 py-3 text-right">{row.operationalBeds}</td><td className="px-4 py-3 text-right">{row.occupiedBeds}</td><td className="px-4 py-3 text-right">{row.reservedBeds}</td><td className="px-4 py-3 text-right">{row.availableBeds}</td><td className="px-4 py-3 text-right">{row.maintenanceBeds}</td><td className="px-4 py-3 text-right font-semibold">{percent(row.occupancyPercent)}</td></tr>)}</tbody></table></div> : <p className="muted px-5 py-10 text-center text-sm">No active properties are available for this report.</p>}
    </section>
  </section>;
}
