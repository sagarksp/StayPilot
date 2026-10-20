"use client";

import { useState } from "react";

type IssueResponse = Readonly<{
  data?: { invitationUrl: string; emailSent: boolean; expiresAt: string };
  error?: string;
}>;

export function ResidentInvitationCard({ organizationId, residentId, email }: Readonly<{
  organizationId: string;
  residentId: string;
  email: string;
}>) {
  const [pending, setPending] = useState(false);
  const [invitation, setInvitation] = useState<IssueResponse["data"]>();
  const [error, setError] = useState<string | null>(null);

  async function issue() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/organizations/${encodeURIComponent(organizationId)}/residents/${encodeURIComponent(residentId)}/invitation/resend`, { method: "POST" });
      const result = await response.json() as IssueResponse;
      if (!response.ok || !result.data) {
        setError(result.error === "INVITATION_ALREADY_ACCEPTED"
          ? "This resident account is already active."
          : result.error === "RESIDENT_EMAIL_REQUIRED"
            ? "Add an email address to the resident profile before sending an invitation."
            : "We couldn't create the invitation. Check the resident's active stay and email, then try again.");
        return;
      }
      setInvitation(result.data);
    } catch {
      setError("We couldn't reach StayPilot. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function copyLink() {
    if (!invitation) return;
    try {
      await navigator.clipboard.writeText(invitation.invitationUrl);
    } catch {
      setError("Copy was unavailable. Select and copy the invitation link below.");
    }
  }

  return (
    <section className="surface-card p-5 sm:p-6" aria-labelledby="resident-invitation-heading">
      <p className="text-sm font-semibold text-[#2563eb]">RESIDENT ACCESS</p>
      <h2 className="mt-1 text-lg font-semibold" id="resident-invitation-heading">Resident portal invitation</h2>
      <p className="muted mt-2 text-sm">Send an activation link to {email}. Links are single-use and expire after seven days.</p>
      <button className="mt-4 min-h-10 rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={pending} onClick={() => void issue()} type="button">
        {pending ? "Creating invitation…" : "Create or resend activation link"}
      </button>
      {error ? <p className="mt-3 text-sm text-red-700" role="alert">{error}</p> : null}
      {invitation ? <div className="mt-4 rounded-lg border border-[#d8e6de] bg-[#f5faf7] p-4">
        <p className="text-sm font-semibold">{invitation.emailSent ? "Invitation email sent" : "Email unavailable · share this link"}</p>
        <p className="muted mt-1 text-xs">Expires {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(invitation.expiresAt))}.</p>
        <label className="mt-3 block text-xs font-medium" htmlFor="resident-invitation-url">One-time activation link</label>
        <input className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" id="resident-invitation-url" readOnly value={invitation.invitationUrl} onFocus={(event) => event.currentTarget.select()} />
        <button className="mt-2 min-h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium" onClick={() => void copyLink()} type="button">Copy link</button>
        <p className="muted mt-2 text-xs">The link is shown once. Create a new link to replace it if you lose it.</p>
      </div> : null}
    </section>
  );
}
