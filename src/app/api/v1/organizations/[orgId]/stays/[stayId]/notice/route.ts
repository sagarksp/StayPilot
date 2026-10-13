import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { moveOutNoticeSchema } from "@/modules/resident/application/schemas";
import { residentUseCases } from "@/modules/resident/application";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { ResidentWorkflowError } from "@/modules/resident/domain/resident";

export async function POST(request: Request, { params }: Readonly<{ params: Promise<{ orgId: string; stayId: string }> }>) {
  const { orgId, stayId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const parsed = moveOutNoticeSchema.safeParse({
    ...(typeof body === "object" && body !== null ? body : {}),
    stayId,
  });
  if (!parsed.success) return Response.json({ error: "INVALID_NOTICE", issues: parsed.error.issues }, { status: 400 });
  try {
    await residentUseCases.recordMoveOutNotice(actor, { ...parsed.data, lockInOverrideReason: parsed.data.lockInOverrideReason ?? "" });
    return Response.json({ data: { stayId, status: "NOTICE_PERIOD", requestedCheckoutDate: parsed.data.requestedCheckoutDate } }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof ResidentWorkflowError) {
      const status = error.code === "STAY_NOT_ACTIVE" ? 404 : 409;
      return Response.json({ error: error.code }, { status });
    }
    throw error;
  }
}
