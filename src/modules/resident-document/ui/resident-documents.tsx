"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePreview } from "@/components/ui/image-preview";
import type { ResidentDocumentSummary } from "../domain/resident-document";

const maxBytes = 10 * 1024 * 1024;
const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const labels: Record<ResidentDocumentSummary["type"], string> = {
  GOVERNMENT_ID: "Government ID",
  ADDRESS_PROOF: "Address proof",
  PROFILE_PHOTO: "Profile photo",
  OTHER: "Other document",
};

function displaySize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ResidentDocuments({ organizationId, documents, canUpload }: Readonly<{ organizationId: string; documents: readonly ResidentDocumentSummary[]; canUpload: boolean }>) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
  const imagePreviewUrl = useRef<string | null>(null);
  const [documentType, setDocumentType] = useState<ResidentDocumentSummary["type"]>("GOVERNMENT_ID");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => () => {
    if (imagePreviewUrl.current) URL.revokeObjectURL(imagePreviewUrl.current);
  }, []);

  function clearImagePreview() {
    if (imagePreviewUrl.current) URL.revokeObjectURL(imagePreviewUrl.current);
    imagePreviewUrl.current = null;
    setImagePreview(null);
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0] ?? null;
    setFile(selected);
    clearImagePreview();
    if (selected?.type.startsWith("image/")) {
      const url = URL.createObjectURL(selected);
      imagePreviewUrl.current = url;
      setImagePreview({ file: selected, url });
    }
    if (selected && selected.size > maxBytes) setMessage("Files must be 10 MB or smaller.");
    else if (selected && !acceptedTypes.includes(selected.type)) setMessage("Choose a JPG, PNG, WebP, or PDF file.");
    else setMessage("");
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || file.size > maxBytes || !acceptedTypes.includes(file.type)) return;
    const formElement = event.currentTarget;
    const form = new FormData();
    form.set("documentType", documentType);
    form.set("file", file);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/organizations/${encodeURIComponent(organizationId)}/me/documents`, { method: "POST", body: form });
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { error?: string };
        const errors: Record<string, string> = {
          DOCUMENT_LIMIT: "You have reached the active document limit. Contact your property team for help.",
          INVALID_FILE: "Choose a valid JPG, PNG, WebP, or PDF file.",
          INVALID_DOCUMENT_TYPE: "Choose a document category.",
          FILE_TOO_LARGE: "Files must be 10 MB or smaller.",
          STORAGE_NOT_CONFIGURED: "Private document storage is not configured. Contact your property team.",
        };
        throw new Error(errors[result.error ?? ""] ?? "The document could not be uploaded. Try again.");
      }
      setFile(null);
      clearImagePreview();
      formElement.reset();
      setDocumentType("GOVERNMENT_ID");
      router.refresh();
      setMessage("Document uploaded for review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The document could not be uploaded. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="surface-card p-5 sm:p-6" aria-labelledby="documents-heading" id="documents-heading">
    <div><p className="text-sm font-semibold text-[#2563eb]">PRIVATE FILES</p><h2 className="mt-1 text-xl font-semibold">Identity documents</h2><p className="muted mt-2 text-sm">Upload a clear photo or PDF. Only you and staff with access to your property can view these files.</p></div>
    {documents.length ? <ul className="mt-4 divide-y divide-[#e2e8f0]">
      {documents.map((document) => <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between" key={document.id}>
        <div className="min-w-0"><p className="font-semibold">{labels[document.type]}</p><p className="muted mt-1 break-all text-xs">{document.name} · {displaySize(document.byteSize)}</p>{document.contentType.startsWith("image/") ? <ImagePreview alt={document.name} caption={document.name} className="mt-3" detail={displaySize(document.byteSize)} src={`/api/v1/organizations/${encodeURIComponent(organizationId)}/me/documents/${encodeURIComponent(document.id)}/download?preview=1`} /> : null}{document.reviewNote ? <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900">Staff note: {document.reviewNote}</p> : null}</div>
        <div className="flex shrink-0 items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${document.status === "VERIFIED" ? "bg-emerald-50 text-emerald-800" : document.status === "REJECTED" ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-900"}`}>{document.status === "PENDING" ? "In review" : document.status === "VERIFIED" ? "Verified" : "Update needed"}</span><a className="text-sm font-semibold text-[#2563eb] hover:underline" href={`/api/v1/organizations/${encodeURIComponent(organizationId)}/me/documents/${encodeURIComponent(document.id)}/download`}>Download</a></div>
      </li>)}
    </ul> : <p className="muted mt-4 rounded-lg bg-[#f5f7fb] p-4 text-sm">No identity documents uploaded yet.</p>}
    {canUpload ? <form className="mt-5 grid gap-3 border-t border-[#e2e8f0] pt-5 sm:grid-cols-[minmax(150px,0.7fr)_minmax(0,1fr)_auto] sm:items-end" onSubmit={upload}>
      <label className="grid gap-1 text-xs font-semibold" htmlFor="resident-document-type">Document category<select className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" id="resident-document-type" onChange={(event) => setDocumentType(event.currentTarget.value as ResidentDocumentSummary["type"])} value={documentType}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="grid min-w-0 gap-1 text-xs font-semibold" htmlFor="resident-document-file">Choose a file<input accept="image/jpeg,image/png,image/webp,application/pdf" className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs" id="resident-document-file" onChange={chooseFile} type="file" /></label>
      <button className="min-h-10 rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={busy || !file || Boolean(message)} type="submit">{busy ? "Uploading…" : "Upload for review"}</button>
      {file?.type.startsWith("image/") && imagePreview?.file === file ? <ImagePreview alt={`Preview of ${file.name}`} caption={file.name} className="sm:col-span-3" detail={`${displaySize(file.size)} · Ready to upload`} src={imagePreview.url} /> : null}
    </form> : <p className="muted mt-4 border-t border-[#e2e8f0] pt-4 text-sm">New documents can be submitted while you have an active or notice-period stay.</p>}
    {canUpload ? <p className="muted mt-2 text-xs">Up to 10 active documents, 10 MB each. JPG, PNG, WebP, or PDF.</p> : null}
    {message ? <p className="mt-2 text-xs" role="status">{message}</p> : null}
  </section>;
}
