import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { residentUseCases } from "@/modules/resident/application";
import { securityDepositTransferSchema } from "@/modules/resident/application/schemas";
import { ResidentWorkflowError } from "@/modules/resident/domain/resident";

export async function POST(
  request: Request,
  { params }: Readonly<{ params: Promise<{ orgId: string; stayId: string }> }>,
) {
  const { orgId, stayId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const parsed = securityDepositTransferSchema.safeParse({
    ...(typeof body === "object" && body !== null ? body : {}),
    sourceStayId: stayId,
  });
  if (!parsed.success) return Response.json({ error: "INVALID_TRANSFER", issues: parsed.error.issues }, { status: 400 });
  try {
    await residentUseCases.transferSecurityDeposit(actor, parsed.data);
    return Response.json({ data: { sourceStayId: stayId, destinationStayId: parsed.data.destinationStayId, amountPaise: parsed.data.amountPaise.toString(), status: "TRANSFERRED" } }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof ResidentWorkflowError) {
      const status = error.code === "DEPOSIT_TRANSFER_INVALID" ? 404 : 409;
      return Response.json({ error: error.code }, { status });
    }
    throw error;
  }
}
