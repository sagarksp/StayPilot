import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { complaintUseCases } from "@/modules/complaint/application";
import { ComplaintAttachmentError, getComplaintAttachmentDownloadUrl } from "@/modules/complaint/infrastructure/attachments";

export async function GET(_request: Request, { params }: Readonly<{ params: Promise<{ orgId: string; complaintId: string; attachmentId: string }> }>) {
  const { orgId, complaintId, attachmentId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    const complaint = actor.roles.includes("OWNER") || actor.roles.includes("MANAGER")
      ? await complaintUseCases.getForStaff(actor, complaintId)
      : await complaintUseCases.getForResident(actor, complaintId);
    if (!complaint) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    throw error;
  }
  try {
    const url = await getComplaintAttachmentDownloadUrl(complaintId, attachmentId);
    return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) {
    if (error instanceof ComplaintAttachmentError && error.code === "ATTACHMENT_NOT_FOUND") return Response.json({ error: error.code }, { status: 404 });
    if (error instanceof ComplaintAttachmentError && error.code === "STORAGE_NOT_CONFIGURED") return Response.json({ error: error.code }, { status: 503 });
    throw error;
  }
}
