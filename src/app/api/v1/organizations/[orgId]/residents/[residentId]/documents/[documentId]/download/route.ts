import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { ResidentDocumentError } from "@/modules/resident-document/domain/resident-document";
import { residentDocumentUseCases } from "@/modules/resident-document/application";

export async function GET(request: Request, { params }: RouteContext<"/api/v1/organizations/[orgId]/residents/[residentId]/documents/[documentId]/download">) {
  const { orgId, residentId, documentId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    const inline = new URL(request.url).searchParams.get("preview") === "1";
    const url = await residentDocumentUseCases.downloadForStaff(actor, residentId, documentId, inline);
    return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    if (error instanceof ResidentDocumentError) {
      const status = error.code === "STORAGE_NOT_CONFIGURED" ? 503 : 404;
      return Response.json({ error: error.code }, { status });
    }
    throw error;
  }
}
