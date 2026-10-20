import { ZodError } from "zod";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { ResidentDocumentError } from "@/modules/resident-document/domain/resident-document";
import { residentDocumentUseCases } from "@/modules/resident-document/application";

export async function PATCH(request: Request, { params }: RouteContext<"/api/v1/organizations/[orgId]/residents/[residentId]/documents/[documentId]">) {
  const { orgId, residentId, documentId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  try {
    await residentDocumentUseCases.reviewForStaff(actor, residentId, documentId, body);
    return Response.json({ data: { status: "REVIEWED" } });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof ZodError) return Response.json({ error: "INVALID_REVIEW", issues: error.issues }, { status: 400 });
    if (error instanceof ResidentDocumentError) return Response.json({ error: error.code }, { status: error.code === "DOCUMENT_NOT_FOUND" ? 404 : 409 });
    throw error;
  }
}
