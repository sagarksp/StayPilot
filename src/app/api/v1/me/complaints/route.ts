import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { complaintUseCases } from "@/modules/complaint/application";
import { createComplaintSchema } from "@/modules/complaint/application/schemas";
import { ComplaintWorkflowError } from "@/modules/complaint/domain/complaint";

export async function GET(request: Request) {
  const orgId = new URL(request.url).searchParams.get("orgId");
  if (!orgId) return Response.json({ error: "ORGANIZATION_REQUIRED" }, { status: 400 });
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    const data = await complaintUseCases.listForResident(actor);
    return Response.json({ data });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    throw error;
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || !("orgId" in body) || typeof body.orgId !== "string") {
    return Response.json({ error: "ORGANIZATION_REQUIRED" }, { status: 400 });
  }
  const orgId = body.orgId;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const parsed = createComplaintSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "INVALID_COMPLAINT", issues: parsed.error.issues }, { status: 400 });
  try {
    const id = await complaintUseCases.createForResident(actor, parsed.data);
    return Response.json({ data: { id, status: "OPEN" } }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof ComplaintWorkflowError) return Response.json({ error: error.code }, { status: 409 });
    throw error;
  }
}
