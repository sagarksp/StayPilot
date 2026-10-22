import { redirect } from "next/navigation";
import { ReportSubmitButton } from "@/components/ui/report-submit-button";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { reservationReportFilterSchema } from "@/modules/reservation/application/schemas";
import { reservationUseCases } from "@/modules/reservation/application";

type SearchParams = Promise<{ propertyId?: string; from?: string; to?: string; status?: string }>;
const money = (paise: bigint) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise) / 100);
const date = (value: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(value);
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (first) => first.toUpperCase());

function monthWindow(timezone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit" }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  const year = Number(parts.year);
  const month = Number(parts.month);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${parts.year}-${parts.month}-01`, to: `${parts.year}-${parts.month}-${String(lastDay).padStart(2, "0")}` };
}

export default async function ReservationsReportPage({ params, searchParams }: Readonly<{ params: Promise<{ orgId: string }>; searchParams: SearchParams }>) {
  const [{ orgId }, query] = await Promise.all([params, searchParams]);
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("OWNER") && !actor.roles.includes("MANAGER")) redirect(`/org/${orgId}/resident`);

  const defaults = monthWindow(actor.organizationTimezone);
  const parsed = reservationReportFilterSchema.safeParse({
    propertyId: query.propertyId ?? "",
    from: query.from ?? defaults.from,
    to: query.to ?? defaults.to,
    status: query.status ?? "",
  });
  const invalidFilters = !parsed.success;
  const filters = parsed.success
    ? { propertyId: parsed.data.propertyId ?? "", from: parsed.data.from ?? "", to: parsed.data.to ?? "", status: parsed.data.status ?? "" }
    : { propertyId: "", from: defaults.from, to: defaults.to, status: "" };

  let report: Awaited<ReturnType<typeof reservationUseCases.getReport>>;
  let invalidProperty = false;
  try {
    report = await reservationUseCases.getReport(actor, filters);
  } catch (error) {
    if (!(error instanceof AccessDeniedError) || !filters.propertyId) throw error;
    invalidProperty = true;
    filters.propertyId = "";
    report = await reservationUseCases.getReport(actor, filters);
  }

  const downloadHref = (format: "pdf" | "excel") => {
    const queryParams = new URLSearchParams({ type: "reservations", format, ...filters });
    return `/api/v1/organizations/${orgId}/reports/download?${queryParams.toString()}`;
  };

  return <section className="space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold text-[#2563eb]">REPORTS</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Reservations</h1><p className="muted mt-2 max-w-3xl leading-6">Track bookings by their stay window, current status, property, and advance deposit.</p></div>
      <a className="text-sm font-semibold text-[#1e3a8a] underline-offset-4 hover:underline" href={`/org/${orgId}/reports/electricity`}>All reports</a>
    </header>

    {invalidFilters ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">Some filters were invalid. Showing this month instead.</p> : null}
    {invalidProperty ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">That property is not available to your account. Showing all accessible properties instead.</p> : null}

    <form className="surface-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_1fr_auto] xl:items-end" method="get">
      <label className="grid gap-1 text-xs font-medium text-slate-600">Property<select className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={filters.propertyId} name="propertyId"><option value="">All accessible properties</option>{report.properties.map((property) => <option key={property.publicId} value={property.publicId}>{property.name}</option>)}</select></label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">Stay window from<input className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={filters.from} name="from" type="date" /></label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">Stay window to<input className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={filters.to} name="to" type="date" /></label>
      <label className="grid gap-1 text-xs font-medium text-slate-600">Status<select className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" defaultValue={filters.status} name="status"><option value="">All statuses</option>{["ACTIVE", "MOVED_IN", "CANCELLED", "EXPIRED"].map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>
      <ReportSubmitButton className="report-filter-submit min-h-10 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]" label="Apply filters" loadingLabel="Loading report..." />
    </form>

    <div className="flex flex-wrap gap-2">
      <a className="report-download report-download--pdf inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold" href={downloadHref("pdf")}>Download PDF</a>
      <a className="report-download report-download--excel inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold" href={downloadHref("excel")}>Download Excel</a>
    </div>

    <section aria-label="Reservation report totals" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[
        ["Reservations", report.totals.total, "Bookings overlapping this stay window"],
        ["Active", report.totals.active, "Reservations still awaiting move-in or cancellation"],
        ["Moved in", report.totals.movedIn, "Reservations converted to resident stays"],
        ["Cancelled / expired", report.totals.cancelled + report.totals.expired, "Reservations no longer active"],
        ["Deposit received", money(report.totals.prepaidDepositPaise), "Advance security deposit receipts"],
      ].map(([title, value, detail]) => <article className="surface-card p-4" key={title}><h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{value}</p><p className="muted mt-1 text-xs leading-5">{detail}</p></article>)}
    </section>

    <section className="surface-card overflow-hidden">
      <header className="border-b border-slate-200 px-5 py-4 sm:px-6"><h2 className="text-lg font-semibold">Reservation activity</h2><p className="muted mt-1 text-sm">{report.rows.length} matching reservations · stay windows overlap the selected date range</p></header>
      {report.rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Resident</th><th className="px-4 py-3">Property / bed</th><th className="px-4 py-3">Stay window</th><th className="px-4 py-3">Expected move-in</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Deposit received</th></tr></thead><tbody className="divide-y divide-slate-100">{report.rows.map((row) => <tr key={row.id}><td className="px-4 py-3 font-medium">{row.residentName}</td><td className="px-4 py-3"><strong className="font-medium">{row.propertyName}</strong><span className="muted mt-1 block text-xs">Room {row.roomNumber} · Bed {row.bedLabel}</span></td><td className="whitespace-nowrap px-4 py-3">{date(row.startDate)} – {date(row.endDate)}</td><td className="whitespace-nowrap px-4 py-3">{row.expectedMoveInDate ? date(row.expectedMoveInDate) : "Not set"}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{label(row.status)}</span></td><td className="whitespace-nowrap px-4 py-3 text-right">{money(row.prepaidDepositPaise)}</td></tr>)}</tbody></table></div> : <p className="muted px-5 py-10 text-center text-sm">No reservations match this property, status, and stay window.</p>}
    </section>
  </section>;
}
