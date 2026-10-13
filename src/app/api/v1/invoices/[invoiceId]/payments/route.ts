import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { recordPaymentSchema } from "@/modules/billing/application/schemas";
import { billingUseCases } from "@/modules/billing/application/use-cases";
import { AccessDeniedError } from "@/modules/property/domain/inventory";

export async function POST(request: Request, { params }: Readonly<{ params: Promise<{ invoiceId: string }> }>) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  const organizationId = new URL(request.url).searchParams.get("organizationId") ?? "";
  const actor = await getOrganizationActor(organizationId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const { invoiceId } = await params;
  const parsed = recordPaymentSchema.safeParse({ ...(typeof body === "object" && body !== null ? body : {}), invoiceId });
  if (!parsed.success) return Response.json({ error: "INVALID_PAYMENT", issues: parsed.error.issues }, { status: 400 });

  try {
    const payment = await billingUseCases.recordPayment(actor, parsed.data);
    return Response.json({ data: { publicId: payment.publicId, amountPaise: payment.amountPaise.toString() } }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof Error && error.message === "PAYMENT_EXCEEDS_BALANCE") return Response.json({ error: "PAYMENT_EXCEEDS_BALANCE" }, { status: 409 });
    if (error instanceof Error && (error.message === "INVOICE_NOT_PAYABLE" || error.message === "INVOICE_CHANGED")) return Response.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
