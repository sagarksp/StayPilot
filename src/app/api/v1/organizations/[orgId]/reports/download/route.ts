import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { renderExcelWorkbook, renderPdf, type ReportExport } from "@/infrastructure/reports/report-export";
import { complaintReportFilterSchema } from "@/modules/complaint/application/schemas";
import { complaintUseCases } from "@/modules/complaint/application";
import { electricityReportFilterSchema } from "@/modules/electricity/application/schemas";
import { electricityUseCases } from "@/modules/electricity/application/use-cases";
import { depositReportFilterSchema, financeReportFilterSchema } from "@/modules/billing/application/schemas";
import { billingUseCases } from "@/modules/billing/application/use-cases";
import { occupancyReportFilterSchema } from "@/modules/property/application/schemas";
import { propertyUseCases } from "@/modules/property/application";
import { reservationReportFilterSchema } from "@/modules/reservation/application/schemas";
import { reservationUseCases } from "@/modules/reservation/application";
import { AccessDeniedError } from "@/modules/property/domain/inventory";

const money = (paise: bigint) => `INR ${(Number(paise) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value: Date) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(value);
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (first) => first.toUpperCase());
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

function filterSummary(propertyName: string | undefined, from: string, to: string) {
  return [
    `Property: ${propertyName ?? "All accessible properties"}`,
    `Period: ${from ? date(day(from)) : "Any date"} to ${to ? date(day(to)) : "Any date"}`,
  ];
}

function response(report: ReportExport, format: string, filename: string) {
  if (format === "pdf") {
    return new Response(renderPdf(report), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  }
  return new Response(renderExcelWorkbook(report), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(request: Request, { params }: Readonly<{ params: Promise<{ orgId: string }> }>) {
  const { orgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const query = new URL(request.url).searchParams;
  const type = query.get("type") ?? "electricity";
  const format = query.get("format") ?? "pdf";
  if (!( ["electricity", "complaints", "finance", "occupancy", "reservations", "deposits"] as const).includes(type as "electricity" | "complaints" | "finance" | "occupancy" | "reservations" | "deposits")) return Response.json({ error: "INVALID_REPORT_TYPE" }, { status: 400 });
  if (format !== "pdf" && format !== "excel") return Response.json({ error: "INVALID_FORMAT" }, { status: 400 });

  try {
    let report: ReportExport;
    if (type === "electricity") {
      const parsed = electricityReportFilterSchema.safeParse({
        propertyId: query.get("propertyId") ?? "",
        from: query.get("from") ?? "",
        to: query.get("to") ?? "",
      });
      if (!parsed.success) return Response.json({ error: "INVALID_FILTERS" }, { status: 400 });
      const data = await electricityUseCases.getReport(actor, parsed.data);
      const propertyName = data.properties.find((property) => property.publicId === parsed.data.propertyId)?.name;
      report = {
        title: "Electricity billing and collections",
        subtitle: "Finalized electricity charges, payments, and outstanding balances by billing period.",
        filters: filterSummary(propertyName, parsed.data.from ?? "", parsed.data.to ?? ""),
        generatedAt: new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: actor.organizationTimezone }).format(new Date()),
        summary: [
          { label: "Finalized bills", value: money(data.totals.billedPaise) },
          { label: "Collected", value: money(data.totals.collectedPaise) },
          { label: "Outstanding", value: money(data.totals.outstandingPaise) },
          { label: "Draft bills", value: money(data.totals.draftBillsPaise) },
        ],
        columns: [
          { label: "Property / period", weight: 25 },
          { label: "Mode", weight: 12 },
          { label: "Units", weight: 8 },
          { label: "Status", weight: 13 },
          { label: "Bill total", weight: 14 },
          { label: "Collected", weight: 14 },
          { label: "Outstanding", weight: 14 },
        ],
        rows: data.rows.map((row) => [
          `${row.property.name} / ${date(row.periodStart)} - ${date(row.periodEnd)}`,
          label(row.billingMode),
          row.unitsConsumed?.toString() ?? "-",
          row.status,
          money(row.totalAmountPaise),
          money(row.collectedPaise),
          money(row.outstandingPaise),
        ]),
      };
    } else if (type === "complaints") {
      const parsed = complaintReportFilterSchema.safeParse({
        propertyId: query.get("propertyId") ?? "",
        from: query.get("from") ?? "",
        to: query.get("to") ?? "",
        category: query.get("category") ?? "",
        status: query.get("status") ?? "",
      });
      if (!parsed.success) return Response.json({ error: "INVALID_FILTERS" }, { status: 400 });
      const data = await complaintUseCases.getReportForStaff(actor, parsed.data);
      const propertyName = data.properties.find((property) => property.publicId === parsed.data.propertyId)?.name;
      const rows = data.rows;
      const statusCount = (status: string) => rows.filter((row) => row.status === status).length;
      const filters = filterSummary(propertyName, parsed.data.from ?? "", parsed.data.to ?? "");
      if (parsed.data.category) filters.push(`Complaint category: ${label(parsed.data.category)}`);
      if (parsed.data.status) filters.push(`Status: ${label(parsed.data.status)}`);
      report = {
        title: "Maintenance and service complaints",
        subtitle: "Resident requests reported to the property team, with assignment and resolution status.",
        filters,
        generatedAt: new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: actor.organizationTimezone }).format(new Date()),
        summary: [
          { label: "Total requests", value: String(rows.length) },
          { label: "Open", value: String(statusCount("OPEN")) },
          { label: "In progress", value: String(statusCount("IN_PROGRESS")) },
          { label: "Resolved / closed", value: String(statusCount("RESOLVED") + statusCount("CLOSED")) },
        ],
        columns: [
          { label: "Category", weight: 12 },
          { label: "Request", weight: 22 },
          { label: "Property", weight: 14 },
          { label: "Resident / room", weight: 18 },
          { label: "Status", weight: 12 },
          { label: "Assigned to", weight: 12 },
          { label: "Submitted", weight: 10 },
        ],
        rows: rows.map((row) => [
          label(row.category),
          row.title,
          row.propertyName,
          `${row.residentName} / ${row.roomNumber} - ${row.bedLabel}`,
          label(row.status),
          row.assignedToName ?? "Unassigned",
          date(row.createdAt),
        ]),
      };
    } else if (type === "finance") {
      const parsed = financeReportFilterSchema.safeParse({
        propertyId: query.get("propertyId") ?? "",
        from: query.get("from") ?? "",
        to: query.get("to") ?? "",
      });
      if (!parsed.success) return Response.json({ error: "INVALID_FILTERS" }, { status: 400 });
      const data = await billingUseCases.getFinanceReport(actor, parsed.data);
      const propertyName = data.properties.find((property) => property.publicId === parsed.data.propertyId)?.name;
      report = {
        title: "Finance and collections",
        subtitle: "Invoice billing, net payments, outstanding balances, and security deposit movements.",
        filters: filterSummary(propertyName, parsed.data.from ?? "", parsed.data.to ?? ""),
        generatedAt: new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: actor.organizationTimezone }).format(new Date()),
        summary: [
          { label: "Invoices issued", value: money(data.totals.billedPaise) },
          { label: "Net collections", value: money(data.totals.collectedPaise) },
          { label: "Current outstanding", value: money(data.totals.outstandingPaise) },
          { label: "Deposit receipts", value: money(data.totals.depositReceiptsPaise) },
          { label: "Deposit refunds", value: money(data.totals.depositRefundsPaise) },
        ],
        columns: [
          { label: "Date", weight: 11 },
          { label: "Entry", weight: 14 },
          { label: "Property", weight: 14 },
          { label: "Resident", weight: 18 },
          { label: "Reference", weight: 19 },
          { label: "Method", weight: 10 },
          { label: "Amount", weight: 14 },
        ],
        rows: data.rows.map((row) => [
          date(row.date),
          label(row.type),
          row.propertyName,
          row.residentName,
          row.reference,
          label(row.method),
          money(row.amountPaise),
        ]),
      };
    } else if (type === "occupancy") {
      const parsed = occupancyReportFilterSchema.safeParse({
        propertyId: query.get("propertyId") ?? "",
        asOf: query.get("asOf") ?? "",
      });
      if (!parsed.success) return Response.json({ error: "INVALID_FILTERS" }, { status: 400 });
      const data = await propertyUseCases.getOccupancyReport(actor, parsed.data);
      const propertyName = data.properties.find((property) => property.publicId === parsed.data.propertyId)?.name;
      report = {
        title: "Property occupancy",
        subtitle: "Operational bed occupancy and availability on the selected date.",
        filters: [`Property: ${propertyName ?? "All accessible properties"}`, `As of: ${date(day(parsed.data.asOf))}`],
        generatedAt: new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: actor.organizationTimezone }).format(new Date()),
        summary: [
          { label: "Operational beds", value: String(data.totals.operationalBeds) },
          { label: "Occupied", value: String(data.totals.occupiedBeds) },
          { label: "Reserved", value: String(data.totals.reservedBeds) },
          { label: "Available", value: String(data.totals.availableBeds) },
          { label: "Occupancy", value: `${data.totals.occupancyPercent.toFixed(1)}%` },
        ],
        columns: [
          { label: "Property", weight: 25 },
          { label: "Operational beds", weight: 15 },
          { label: "Occupied", weight: 12 },
          { label: "Reserved", weight: 12 },
          { label: "Available", weight: 12 },
          { label: "Maintenance", weight: 12 },
          { label: "Occupancy", weight: 12 },
        ],
        rows: data.rows.map((row) => [
          row.propertyName,
          String(row.operationalBeds),
          String(row.occupiedBeds),
          String(row.reservedBeds),
          String(row.availableBeds),
          String(row.maintenanceBeds),
          `${row.occupancyPercent.toFixed(1)}%`,
        ]),
      };
    } else if (type === "reservations") {
      const parsed = reservationReportFilterSchema.safeParse({
        propertyId: query.get("propertyId") ?? "",
        from: query.get("from") ?? "",
        to: query.get("to") ?? "",
        status: query.get("status") ?? "",
      });
      if (!parsed.success) return Response.json({ error: "INVALID_FILTERS" }, { status: 400 });
      const data = await reservationUseCases.getReport(actor, parsed.data);
      const propertyName = data.properties.find((property) => property.publicId === parsed.data.propertyId)?.name;
      const filters = [
        `Property: ${propertyName ?? "All accessible properties"}`,
        `Stay window: ${parsed.data.from ? date(day(parsed.data.from)) : "Any date"} to ${parsed.data.to ? date(day(parsed.data.to)) : "Any date"}`,
      ];
      if (parsed.data.status) filters.push(`Status: ${label(parsed.data.status)}`);
      report = {
        title: "Reservation activity",
        subtitle: "Reservations whose stay window overlaps the selected period, including current lifecycle status.",
        filters,
        generatedAt: new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: actor.organizationTimezone }).format(new Date()),
        summary: [
          { label: "Reservations", value: String(data.totals.total) },
          { label: "Active", value: String(data.totals.active) },
          { label: "Moved in", value: String(data.totals.movedIn) },
          { label: "Cancelled / expired", value: String(data.totals.cancelled + data.totals.expired) },
          { label: "Deposit received", value: money(data.totals.prepaidDepositPaise) },
        ],
        columns: [
          { label: "Resident", weight: 18 },
          { label: "Property", weight: 14 },
          { label: "Room / bed", weight: 12 },
          { label: "Stay window", weight: 20 },
          { label: "Expected move-in", weight: 12 },
          { label: "Status", weight: 12 },
          { label: "Deposit", weight: 12 },
        ],
        rows: data.rows.map((row) => [
          row.residentName,
          row.propertyName,
          `${row.roomNumber} / ${row.bedLabel}`,
          `${date(row.startDate)} - ${date(row.endDate)}`,
          row.expectedMoveInDate ? date(row.expectedMoveInDate) : "Not set",
          label(row.status),
          money(row.prepaidDepositPaise),
        ]),
      };
    } else {
      const parsed = depositReportFilterSchema.safeParse({
        propertyId: query.get("propertyId") ?? "",
        from: query.get("from") ?? "",
        to: query.get("to") ?? "",
        transactionType: query.get("transactionType") ?? "",
      });
      if (!parsed.success) return Response.json({ error: "INVALID_FILTERS" }, { status: 400 });
      const data = await billingUseCases.getDepositReport(actor, parsed.data);
      const propertyName = data.properties.find((property) => property.publicId === parsed.data.propertyId)?.name;
      const filters = filterSummary(propertyName, parsed.data.from ?? "", parsed.data.to ?? "");
      if (parsed.data.transactionType) filters.push(`Entry type: ${label(parsed.data.transactionType)}`);
      report = {
        title: "Security deposit activity",
        subtitle: "Current held balances and security deposit ledger entries for the selected period.",
        filters,
        generatedAt: new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: actor.organizationTimezone }).format(new Date()),
        summary: [
          { label: "Current held", value: money(data.totals.heldPaise) },
          { label: "Required on open accounts", value: money(data.totals.requiredPaise) },
          { label: "Receipts in period", value: money(data.totals.receivedPaise) },
          { label: "Refunds in period", value: money(data.totals.refundedPaise) },
          { label: "Deductions in period", value: money(data.totals.deductedPaise) },
        ],
        columns: [
          { label: "Date", weight: 11 },
          { label: "Entry", weight: 14 },
          { label: "Property", weight: 15 },
          { label: "Resident", weight: 16 },
          { label: "Reference", weight: 22 },
          { label: "Method", weight: 10 },
          { label: "Amount", weight: 12 },
        ],
        rows: data.rows.map((row) => [
          date(row.date),
          label(row.type),
          row.propertyName,
          row.residentName,
          row.reference,
          label(row.method),
          money(row.amountPaise),
        ]),
      };
    }

    const suffix = new Date().toISOString().slice(0, 10);
    return response(report, format, `staypilot-${type}-report-${suffix}`);
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    throw error;
  }
}
