import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { ResidentDocumentError } from "../domain/resident-document";

const bucket = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION;
const s3 = region && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  ? new S3Client({ region, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } })
  : region ? new S3Client({ region }) : null;

export const MAX_RESIDENT_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ACTIVE_RESIDENT_DOCUMENTS = 10;

function storage() {
  if (!bucket || !s3) throw new ResidentDocumentError("STORAGE_NOT_CONFIGURED");
  return { bucket, s3 };
}

export function detectDocumentContentType(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  if (bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-") return "application/pdf";
  return null;
}

function safeName(name: string) {
  const cleaned = name.replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim().slice(0, 255);
  return cleaned || "resident-document";
}

export async function putResidentDocument(organizationPublicId: string, residentPublicId: string, file: File) {
  const { bucket: targetBucket, s3: client } = storage();
  if (!file.size) throw new ResidentDocumentError("INVALID_FILE");
  if (file.size > MAX_RESIDENT_DOCUMENT_BYTES) throw new ResidentDocumentError("FILE_TOO_LARGE");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = detectDocumentContentType(bytes);
  if (!contentType || file.type !== contentType) throw new ResidentDocumentError("INVALID_FILE");
  const objectKey = `organizations/${organizationPublicId}/residents/${residentPublicId}/kyc/${randomUUID()}`;
  await client.send(new PutObjectCommand({ Bucket: targetBucket, Key: objectKey, Body: bytes, ContentType: contentType, ServerSideEncryption: "AES256" }));
  return {
    objectKey,
    contentType,
    byteSize: bytes.byteLength,
    originalName: safeName(file.name),
    cleanup: async () => client.send(new DeleteObjectCommand({ Bucket: targetBucket, Key: objectKey })).catch(() => undefined),
  };
}

export async function getResidentDocumentDownloadUrl(input: { objectKey: string; originalName: string; contentType: string }, inline = false) {
  const { bucket: targetBucket, s3: client } = storage();
  const command = new GetObjectCommand({
    Bucket: targetBucket,
    Key: input.objectKey,
    ResponseContentType: input.contentType,
    ResponseContentDisposition: `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(input.originalName)}`,
    ResponseCacheControl: "private, no-store",
  });
  return getSignedUrl(client, command, { expiresIn: 60 });
}
