import { ZodError } from "zod";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";
import { ResidentDocumentError } from "@/modules/resident-document/domain/resident-document";
import { MAX_RESIDENT_DOCUMENT_BYTES } from "@/modules/resident-document/infrastructure/private-storage";
import { residentDocumentUseCases } from "@/modules/resident-document/application";
import { AccessDeniedError } from "@/modules/property/domain/inventory";

const maxRequestBytes = MAX_RESIDENT_DOCUMENT_BYTES + 128 * 1024;
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

function errorResponse(error: unknown) {
  if (error instanceof AccessDeniedError) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  if (error instanceof ZodError) return Response.json({ error: "INVALID_DOCUMENT_TYPE", issues: error.issues }, { status: 400 });
  if (error instanceof ResidentDocumentError) {
    const status = error.code === "STORAGE_NOT_CONFIGURED" ? 503 : error.code === "FILE_TOO_LARGE" ? 413 : error.code === "DOCUMENT_LIMIT" ? 409 : 400;
    return Response.json({ error: error.code }, { status });
  }
  throw error;
}

export async function GET(_request: Request, { params }: RouteContext<"/api/v1/organizations/[orgId]/me/documents">) {
  const { orgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  try {
    return Response.json({ data: await residentDocumentUseCases.listForResident(actor) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, { params }: RouteContext<"/api/v1/organizations/[orgId]/me/documents">) {
  const { orgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  if (Number(request.headers.get("content-length") ?? 0) > maxRequestBytes) return Response.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
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
    const data = await residentDocumentUseCases.uploadForResident(actor, { documentType: form.get("documentType") }, file);
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
