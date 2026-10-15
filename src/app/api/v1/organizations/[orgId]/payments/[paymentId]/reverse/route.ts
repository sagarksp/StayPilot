import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { reversePaymentSchema } from "@/modules/billing/application/schemas";
import { billingUseCases } from "@/modules/billing/application/use-cases";
import { AccessDeniedError } from "@/modules/property/domain/inventory";

export async function POST(request: Request, { params }: Readonly<{ params: Promise<{ orgId: string; paymentId: string }> }>) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "FORBIDDEN_ORIGIN" }, { status: 403 });
  const { orgId, paymentId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (idempotencyKey.length < 16 || idempotencyKey.length > 100) return Response.json({ error: "INVALID_IDEMPOTENCY_KEY" }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const parsed = reversePaymentSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "INVALID_REVERSAL", issues: parsed.error.issues }, { status: 400 });

  try {
    const reversal = await billingUseCases.reversePayment(actor, paymentId, parsed.data, idempotencyKey);
    return Response.json({ data: { publicId: reversal.publicId, amountPaise: reversal.amountPaise.toString(), replayed: reversal.replayed } }, { status: reversal.replayed ? 200 : 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof Error && ["IDEMPOTENCY_KEY_REUSED", "REVERSAL_EXCEEDS_UNREVERSED_AMOUNT", "PAYMENT_NOT_REVERSIBLE", "INVOICE_CHANGED"].includes(error.message)) return Response.json({ error: error.message }, { status: 409 });
    if (error instanceof Error && error.message === "INVALID_IDEMPOTENCY_KEY") return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
