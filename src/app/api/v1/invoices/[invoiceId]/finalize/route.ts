import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { billingUseCases } from "@/modules/billing/application/use-cases";
import { AccessDeniedError } from "@/modules/property/domain/inventory";

export async function POST(request: Request, { params }: Readonly<{ params: Promise<{ invoiceId: string }> }>) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  const organizationId = new URL(request.url).searchParams.get("organizationId") ?? "";
  const actor = await getOrganizationActor(organizationId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { invoiceId } = await params;
  try {
    await billingUseCases.finalize(actor, invoiceId);
    return Response.json({ data: { invoiceId, status: "FINALIZED" } });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof Error && error.message === "INVOICE_NOT_DRAFT") return Response.json({ error: "INVOICE_NOT_DRAFT" }, { status: 409 });
    throw error;
  }
}
