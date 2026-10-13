import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { electricityUseCases } from "@/modules/electricity/application/use-cases";
import { electricityReportFilterSchema } from "@/modules/electricity/application/schemas";
import { AccessDeniedError } from "@/modules/property/domain/inventory";

export async function GET(request: Request, { params }: Readonly<{ params: Promise<{ orgId: string }> }>) {
  const { orgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const query = new URL(request.url).searchParams;
  const parsed = electricityReportFilterSchema.safeParse({
    propertyId: query.get("propertyId") ?? "",
    from: query.get("from") ?? "",
    to: query.get("to") ?? "",
  });
  if (!parsed.success) return Response.json({ error: "INVALID_FILTERS", issues: parsed.error.issues }, { status: 400 });

  try {
    const report = await electricityUseCases.getReport(actor, parsed.data);
    return Response.json({
      data: {
        properties: report.properties,
        totals: Object.fromEntries(Object.entries(report.totals).map(([key, value]) => [key, value.toString()])),
        rows: report.rows.map((row) => ({
          publicId: row.publicId,
          billingMode: row.billingMode,
          periodStart: row.periodStart.toISOString().slice(0, 10),
          periodEnd: row.periodEnd.toISOString().slice(0, 10),
          unitsConsumed: row.unitsConsumed?.toString() ?? null,
          totalAmountPaise: row.totalAmountPaise.toString(),
          collectedPaise: row.collectedPaise.toString(),
          outstandingPaise: row.outstandingPaise.toString(),
          draftInvoicePaise: row.draftInvoicePaise.toString(),
          status: row.status,
          property: row.property,
        })),
      },
    });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    throw error;
  }
}
