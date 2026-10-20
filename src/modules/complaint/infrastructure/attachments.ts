import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { prisma } from "@/infrastructure/db/prisma";

export const MAX_COMPLAINT_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_COMPLAINT_ATTACHMENTS = 5;

const contentTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const bucket = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION;
const s3 = region && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  ? new S3Client({ region, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } })
  : region ? new S3Client({ region }) : null;

export type ComplaintAttachmentSummary = Readonly<{
  id: string;
  name: string;
  contentType: string;
  byteSize: number;
  createdAt: Date;
}>;

export class ComplaintAttachmentError extends Error {
  constructor(readonly code: "STORAGE_NOT_CONFIGURED" | "INVALID_FILE" | "FILE_TOO_LARGE" | "ATTACHMENT_LIMIT" | "ATTACHMENT_NOT_FOUND") {
    super(code);
    this.name = "ComplaintAttachmentError";
  }
}

function storage() {
  if (!bucket || !s3) throw new ComplaintAttachmentError("STORAGE_NOT_CONFIGURED");
  return { bucket, s3 };
}

function detectContentType(bytes: Uint8Array) {
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  if (bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-") return "application/pdf";
  return null;
}

function safeName(name: string) {
  const cleaned = name.replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim().slice(0, 255);
  return cleaned || "attachment";
}

export async function createComplaintAttachment(input: {
  complaintId: string;
  uploaderId: string;
  file: File;
}): Promise<ComplaintAttachmentSummary> {
  const { bucket: targetBucket, s3: client } = storage();
  if (!input.file.size) throw new ComplaintAttachmentError("INVALID_FILE");
  if (input.file.size > MAX_COMPLAINT_ATTACHMENT_BYTES) throw new ComplaintAttachmentError("FILE_TOO_LARGE");
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  const actualContentType = detectContentType(bytes);
  if (!actualContentType || !contentTypes.has(input.file.type) || input.file.type !== actualContentType) throw new ComplaintAttachmentError("INVALID_FILE");

  const [complaint, uploader] = await Promise.all([
    prisma.complaint.findUnique({ where: { publicId: input.complaintId }, select: { id: true, organization: { select: { publicId: true } } } }),
    prisma.user.findUnique({ where: { publicId: input.uploaderId }, select: { id: true } }),
  ]);
  if (!complaint || !uploader) throw new ComplaintAttachmentError("ATTACHMENT_NOT_FOUND");

  const objectKey = `organizations/${complaint.organization.publicId}/complaints/${input.complaintId}/${randomUUID()}`;
  await client.send(new PutObjectCommand({ Bucket: targetBucket, Key: objectKey, Body: bytes, ContentType: actualContentType, ServerSideEncryption: "AES256" }));
  try {
    const saved = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM complaints WHERE id = ${complaint.id} FOR UPDATE`;
      const count = await tx.complaintAttachment.count({ where: { complaintId: complaint.id } });
      if (count >= MAX_COMPLAINT_ATTACHMENTS) throw new ComplaintAttachmentError("ATTACHMENT_LIMIT");
      return tx.complaintAttachment.create({
        data: { complaintId: complaint.id, uploadedById: uploader.id, objectKey, originalName: safeName(input.file.name), contentType: actualContentType, byteSize: bytes.byteLength },
        select: { publicId: true, originalName: true, contentType: true, byteSize: true, createdAt: true },
      });
    });
    return { id: saved.publicId, name: saved.originalName, contentType: saved.contentType, byteSize: saved.byteSize, createdAt: saved.createdAt };
  } catch (error) {
    await client.send(new DeleteObjectCommand({ Bucket: targetBucket, Key: objectKey })).catch(() => undefined);
    throw error;
  }
}

export async function getComplaintAttachmentDownloadUrl(complaintId: string, attachmentId: string, inline = false) {
  const { bucket: targetBucket, s3: client } = storage();
  const attachment = await prisma.complaintAttachment.findFirst({
    where: { publicId: attachmentId, complaint: { publicId: complaintId } },
    select: { objectKey: true, originalName: true, contentType: true },
  });
  if (!attachment) throw new ComplaintAttachmentError("ATTACHMENT_NOT_FOUND");
  const command = new GetObjectCommand({
    Bucket: targetBucket,
    Key: attachment.objectKey,
    ResponseContentType: attachment.contentType,
    ResponseContentDisposition: `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
    ResponseCacheControl: "private, no-store",
  });
  return getSignedUrl(client, command, { expiresIn: 60 });
}
