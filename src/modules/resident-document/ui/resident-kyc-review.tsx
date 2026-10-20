"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImagePreview } from "@/components/ui/image-preview";
import type { ResidentDocumentSummary } from "../domain/resident-document";

const labels: Record<ResidentDocumentSummary["type"], string> = {
  GOVERNMENT_ID: "Government ID",
  ADDRESS_PROOF: "Address proof",
  PROFILE_PHOTO: "Profile photo",
  OTHER: "Other document",
};

function reviewErrorMessage(code: string | undefined) {
  switch (code) {
    case "UNAUTHENTICATED": return "Your session expired. Sign in again, then retry the review.";
    case "FORBIDDEN": return "You don't have access to review this resident's documents.";
    case "INVALID_REVIEW": return "The review note must be 500 characters or fewer, and a note is required when requesting an update.";
    case "DOCUMENT_NOT_FOUND": return "This document is no longer available. Refresh the page and try again.";
    case "REVIEW_NOT_ALLOWED": return "This document has already been reviewed. Refresh the page to see its latest status.";
    default: return "This document could not be reviewed. Refresh and try again.";
  }
}

export function ResidentKycReview({ organizationId, residentId, documents }: Readonly<{
  organizationId: string;
  residentId: string;
  documents: readonly ResidentDocumentSummary[];
}>) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const basePath = `/api/v1/organizations/${encodeURIComponent(organizationId)}/residents/${encodeURIComponent(residentId)}/documents`;

  async function review(documentId: string, status: "VERIFIED" | "REJECTED") {
    const reviewNote = notes[documentId]?.trim() ?? "";
    if (status === "REJECTED" && !reviewNote) {
      setMessage("Add a short note before requesting an update.");
      return;
    }
    setBusyId(documentId);
    setMessage("");
    try {
      const response = await fetch(`${basePath}/${encodeURIComponent(documentId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, ...(reviewNote ? { reviewNote } : {}) }),
      });
      if (!response.ok) {
        let errorCode: string | undefined;
        try {
          const result = await response.json() as { error?: unknown };
          if (typeof result.error === "string") errorCode = result.error;
        } catch {
          // Fall back to the generic message when the response has no JSON body.
        }
        throw new Error(reviewErrorMessage(errorCode));
      }
      router.refresh();
      setMessage("Review saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This document could not be reviewed. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  return <section className="surface-card overflow-hidden" aria-labelledby="kyc-review-heading">
    <header className="border-b border-[#e2e8f0] px-5 py-4 sm:px-6"><p className="text-xs font-semibold tracking-wide text-[#2563eb]">PRIVATE FILES</p><h2 className="mt-1 font-semibold" id="kyc-review-heading">Identity documents</h2><p className="muted mt-1 text-sm">Review resident uploads. Access and review actions are recorded in the audit log.</p></header>
    {documents.length ? <ul className="divide-y divide-[#e2e8f0] px-5 sm:px-6">
      {documents.map((document) => <li className="py-4" key={document.id}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold">{labels[document.type]}</p><p className="muted mt-1 break-all text-xs">{document.name} · {document.uploadedByName ?? "Resident"}</p><p className="muted mt-1 text-xs">Uploaded {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(document.createdAt))}</p>{document.contentType.startsWith("image/") ? <ImagePreview alt={document.name} caption={document.name} className="mt-3" detail="Uploaded image" src={`${basePath}/${encodeURIComponent(document.id)}/download?preview=1`} /> : null}</div><div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${document.status === "VERIFIED" ? "bg-emerald-50 text-emerald-800" : document.status === "REJECTED" ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-900"}`}>{document.status}</span><a className="text-sm font-semibold text-[#2563eb] hover:underline" href={`${basePath}/${encodeURIComponent(document.id)}/download`}>View file</a></div></div>
        {document.reviewNote ? <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900">Previous note: {document.reviewNote}</p> : null}
        {document.status === "PENDING" ? <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end"><label className="grid gap-1 text-xs font-semibold" htmlFor={`review-note-${document.id}`}>Note for resident<textarea className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" id={`review-note-${document.id}`} maxLength={500} onChange={(event) => { const note = event.currentTarget.value; setNotes((current) => ({ ...current, [document.id]: note })); }} placeholder="Required when requesting an update" value={notes[document.id] ?? ""} /></label><button className="min-h-10 rounded-lg border border-rose-300 px-3 text-sm font-semibold text-rose-800 disabled:opacity-50" disabled={busyId === document.id} onClick={() => void review(document.id, "REJECTED")} type="button">Request update</button><button className="min-h-10 rounded-lg bg-[#2563eb] px-3 text-sm font-semibold text-white disabled:opacity-50" disabled={busyId === document.id} onClick={() => void review(document.id, "VERIFIED")} type="button">Verify</button></div> : null}
      </li>)}
    </ul> : <p className="muted px-5 py-7 text-sm sm:px-6">No resident documents have been uploaded.</p>}
    {message ? <p className="px-5 pb-4 text-xs" role="status">{message}</p> : null}
  </section>;
}
