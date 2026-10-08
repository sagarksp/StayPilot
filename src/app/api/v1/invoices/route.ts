import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { billingUseCases } from "@/modules/billing/application/use-cases";
import { AccessDeniedError } from "@/modules/property/domain/inventory";

export async function GET(request: Request) {
  const organizationId = new URL(request.url).searchParams.get("organizationId") ?? "";
  const actor = await getOrganizationActor(organizationId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    const invoices = await billingUseCases.listInvoices(actor);
    return Response.json({ data: invoices.map((invoice) => ({ ...invoice, totalPaise: invoice.totalPaise.toString(), items: invoice.items.map((item) => ({ ...item, amountPaise: item.amountPaise.toString() })) })) });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    throw error;
  }
}
