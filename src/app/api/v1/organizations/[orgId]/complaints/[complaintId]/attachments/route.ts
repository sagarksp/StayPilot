import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { AccessDeniedError } from "@/modules/property/domain/inventory";
import { complaintUseCases } from "@/modules/complaint/application";
import { ComplaintAttachmentError, createComplaintAttachment, MAX_COMPLAINT_ATTACHMENT_BYTES } from "@/modules/complaint/infrastructure/attachments";

const maxRequestBytes = MAX_COMPLAINT_ATTACHMENT_BYTES + 128 * 1024;

class RequestBodyTooLargeError extends Error {}

async function readBoundedBody(request: Request, limit: number) {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > limit) {
      await reader.cancel();
      throw new RequestBodyTooLargeError();
    }
    chunks.push(value);
  }
  return new Blob(chunks.map((chunk) => new Uint8Array(chunk).buffer as ArrayBuffer));
}

export async function POST(request: Request, { params }: Readonly<{ params: Promise<{ orgId: string; complaintId: string }> }>) {
  const { orgId, complaintId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const isStaff = actor.roles.includes("OWNER") || actor.roles.includes("MANAGER");
  try {
    const complaint = isStaff
      ? await complaintUseCases.getForStaff(actor, complaintId)
      : await complaintUseCases.getForResident(actor, complaintId);
    if (!complaint) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  } catch (error) {
    if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    throw error;
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maxRequestBytes) return Response.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
  const contentType = request.headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("multipart/form-data;")) return Response.json({ error: "INVALID_FILE" }, { status: 400 });
  let form: FormData;
  try {
    const body = await readBoundedBody(request, maxRequestBytes);
    form = await new Request(request.url, { method: "POST", headers: { "content-type": contentType }, body }).formData();
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return Response.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
    return Response.json({ error: "INVALID_FILE" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "INVALID_FILE" }, { status: 400 });
  try {
    const data = await createComplaintAttachment({ complaintId, uploaderId: actor.userId, file });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof ComplaintAttachmentError) {
      const status = error.code === "STORAGE_NOT_CONFIGURED" ? 503 : error.code === "FILE_TOO_LARGE" ? 413 : error.code === "ATTACHMENT_NOT_FOUND" ? 404 : error.code === "ATTACHMENT_LIMIT" ? 409 : 400;
      return Response.json({ error: error.code }, { status });
    }
    throw error;
  }
}
