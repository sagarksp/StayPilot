import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { complaintUseCases } from "@/modules/complaint/application";
import { updateComplaintSchema } from "@/modules/complaint/application/schemas";
import { ComplaintWorkflowError } from "@/modules/complaint/domain/complaint";

export async function GET(_request: Request, { params }: Readonly<{ params: Promise<{ orgId: string; complaintId: string }> }>) {
  const { orgId, complaintId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    const complaint = actor.roles.includes("OWNER") || actor.roles.includes("MANAGER")
      ? await complaintUseCases.getForStaff(actor, complaintId)
      : await complaintUseCases.getForResident(actor, complaintId);
    return complaint ? Response.json({ data: complaint }) : Response.json({ error: "NOT_FOUND" }, { status: 404 });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    throw error;
  }
}

export async function PATCH(request: Request, { params }: Readonly<{ params: Promise<{ orgId: string; complaintId: string }> }>) {
  const { orgId, complaintId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const parsed = updateComplaintSchema.safeParse({ ...(typeof body === "object" && body !== null ? body : {}), complaintId });
  if (!parsed.success) return Response.json({ error: "INVALID_UPDATE", issues: parsed.error.issues }, { status: 400 });
  try {
    await complaintUseCases.updateForStaff(actor, {
      complaintId,
      status: parsed.data.status,
      category: parsed.data.category,
      ...(parsed.data.assignedToId !== undefined ? { assignedToId: parsed.data.assignedToId ?? "" } : {}),
      resolutionNote: parsed.data.resolutionNote ?? "",
    });
    const data = await complaintUseCases.getForStaff(actor, complaintId);
    return data ? Response.json({ data }) : Response.json({ error: "NOT_FOUND" }, { status: 404 });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof ComplaintWorkflowError) return Response.json({ error: error.code }, { status: error.code === "COMPLAINT_NOT_FOUND" ? 404 : 409 });
    throw error;
  }
}
