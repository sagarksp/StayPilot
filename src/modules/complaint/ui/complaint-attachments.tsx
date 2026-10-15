"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";
import type { ComplaintAttachmentSummary } from "../domain/complaint";

const maxBytes = 10 * 1024 * 1024;
const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function size(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ComplaintAttachments({ orgId, complaintId, attachments }: Readonly<{
  orgId: string;
  complaintId: string;
  attachments: readonly ComplaintAttachmentSummary[];
}>) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const path = `/api/v1/organizations/${encodeURIComponent(orgId)}/complaints/${encodeURIComponent(complaintId)}/attachments`;

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0] ?? null;
    setFile(selected);
    setMessage(selected && selected.size > maxBytes ? "Files must be 10 MB or smaller." : "");
    if (selected && !acceptedTypes.includes(selected.type)) setMessage("Choose a JPG, PNG, WebP, or PDF file.");
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || file.size > maxBytes || !acceptedTypes.includes(file.type)) return;
    const formElement = event.currentTarget;
    setBusy(true);
    setMessage("");
    const form = new FormData();
    form.set("file", file);
    try {
      const response = await fetch(path, { method: "POST", body: form });
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { error?: string };
        const errors: Record<string, string> = {
          ATTACHMENT_LIMIT: "This request already has the maximum of five attachments.",
          INVALID_FILE: "Choose a valid JPG, PNG, WebP, or PDF file.",
          FILE_TOO_LARGE: "Files must be 10 MB or smaller.",
          STORAGE_NOT_CONFIGURED: "File storage is not configured yet. Contact your administrator.",
        };
        throw new Error(errors[result.error ?? ""] ?? "The file could not be uploaded. Try again.");
      }
      setFile(null);
      formElement.reset();
      router.refresh();
      setMessage("File uploaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The file could not be uploaded. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="space-y-3" aria-label="Complaint attachments">
    {attachments.length ? <ul className="space-y-2">{attachments.map((attachment) => <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm" key={attachment.id}>
      <span className="min-w-0 truncate font-medium">{attachment.name}<span className="muted ml-2 text-xs">{size(attachment.byteSize)}</span></span>
      <a className="shrink-0 font-semibold text-[#176e61] hover:underline" href={`${path}/${encodeURIComponent(attachment.id)}`}>Download</a>
    </li>)}</ul> : <p className="muted text-sm">No files attached.</p>}
    {attachments.length < 5 ? <form className="flex flex-wrap items-end gap-2" onSubmit={upload}>
      <label className="grid min-w-0 flex-1 gap-1 text-xs font-medium text-slate-700">Attach a photo or PDF<input accept="image/jpeg,image/png,image/webp,application/pdf" className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs" onChange={chooseFile} type="file" /></label>
      <button className="min-h-10 rounded-lg border border-[#176e61] px-3 py-2 text-sm font-semibold text-[#176e61] hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={busy || !file || Boolean(message)} type="submit">{busy ? "Uploading…" : "Upload"}</button>
    </form> : null}
    <p className="muted text-xs">Up to 5 files, 10 MB each. JPG, PNG, WebP, or PDF.</p>
    {message ? <p className="text-xs" role="status">{message}</p> : null}
  </section>;
}
