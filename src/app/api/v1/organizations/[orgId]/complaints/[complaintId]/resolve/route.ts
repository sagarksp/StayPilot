import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { complaintUseCases } from "@/modules/complaint/application";
import { ComplaintWorkflowError } from "@/modules/complaint/domain/complaint";

export async function POST(request: Request, { params }: Readonly<{ params: Promise<{ orgId: string; complaintId: string }> }>) {
  const { orgId, complaintId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || !("resolutionNote" in body) || typeof body.resolutionNote !== "string") {
    return Response.json({ error: "INVALID_RESOLUTION_NOTE" }, { status: 400 });
  }
  const note = body.resolutionNote;
  try {
    await complaintUseCases.updateForStaff(actor, { complaintId, status: "RESOLVED", resolutionNote: note });
    return Response.json({ data: { id: complaintId, status: "RESOLVED" } });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof ComplaintWorkflowError) return Response.json({ error: error.code }, { status: error.code === "COMPLAINT_NOT_FOUND" ? 404 : 409 });
    throw error;
  }
}
