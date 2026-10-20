"use client";

import { useState, type FormEvent } from "react";
import type { ManagerTeam } from "../application/manager-invitations";

type PropertyOption = Readonly<{ id: string; name: string }>;
type InviteResponse = Readonly<{ invitationUrl: string; emailSent: boolean }>;

function apiError(code: string) {
  if (code === "INVITATION_PENDING") return "An unexpired invitation already exists for this email.";
  if (code === "MEMBERSHIP_EXISTS") return "This person already has access to the organization.";
  if (code === "PROPERTY_NOT_IN_ORGANIZATION") return "One or more selected properties are unavailable. Refresh and try again.";
  if (code === "LAST_ACTIVE_OWNER") return "The organization must keep at least one active owner.";
  if (code === "MEMBERSHIP_NOT_FOUND") return "This team membership is no longer available. Refresh the page and try again.";
  return "We couldn't complete this invitation. Refresh the page and try again.";
}

export function ManagerInvitations({ orgId, properties, team }: Readonly<{ orgId: string; properties: PropertyOption[]; team: ManagerTeam }>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteResponse | null>(null);
  const [teamState, setTeamState] = useState(team);
  const [managerProperties, setManagerProperties] = useState<Record<string, string[]>>(() => Object.fromEntries(team.members.filter((member) => member.roleCode === "MANAGER").map((member) => [member.id, member.propertyIds])));

  async function refresh() {
    const response = await fetch(`/api/v1/organizations/${orgId}/members`, { cache: "no-store" });
    if (response.ok) {
      const body = await response.json() as { data: ManagerTeam };
      setTeamState(body.data);
      setManagerProperties(Object.fromEntries(body.data.members.filter((member) => member.roleCode === "MANAGER").map((member) => [member.id, member.propertyIds])));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setPending(true);
    setError(null);
    setNotice(null);
    setInvite(null);
    try {
      const form = new FormData(formElement);
      const response = await fetch(`/api/v1/organizations/${orgId}/manager-invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), propertyIds: form.getAll("propertyIds") }),
      });
      const body = await response.json() as { data?: InviteResponse; error?: string };
      if (!response.ok || !body.data) {
        setError(apiError(body.error ?? "unknown"));
        return;
      }
      setInvite(body.data);
      setNotice(body.data.emailSent ? "Invitation email sent. The link is shown once in case you need to share it directly." : "Invitation created. Email delivery isn't configured or didn't respond, so share this one-time link directly.");
      formElement.reset();
      await refresh();
    } catch {
      setError("We couldn't reach StayPilot. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function resend(invitationId: string) {
    setPending(true);
    setError(null);
    setNotice(null);
    setInvite(null);
    try {
      const response = await fetch(`/api/v1/organizations/${orgId}/manager-invitations/${invitationId}/resend`, { method: "POST" });
      const body = await response.json() as { data?: InviteResponse; error?: string };
      if (!response.ok || !body.data) {
        setError(apiError(body.error ?? "unknown"));
        return;
      }
      setInvite(body.data);
      setNotice(body.data.emailSent ? "A new invitation email was sent. The previous link is no longer valid." : "A new link was generated, but email delivery isn't configured or didn't respond. The previous link is no longer valid.");
      await refresh();
    } catch {
      setError("We couldn't reach StayPilot. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function saveProperties(membershipId: string) {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/organizations/${orgId}/managers/${membershipId}/pgs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyIds: managerProperties[membershipId] ?? [] }),
      });
      const body = await response.json() as { data?: { propertyIds: string[] }; error?: string };
      if (!response.ok || !body.data) {
        setError("We couldn't update property access. Refresh the page and try again.");
        return;
      }
      setNotice("Manager property access updated.");
      await refresh();
    } catch {
      setError("We couldn't reach StayPilot. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function setMembershipStatus(membershipId: string, status: "ACTIVE" | "INACTIVE") {
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/organizations/${orgId}/members/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) {
        setError(apiError(body.error ?? "unknown"));
        return;
      }
      setNotice(status === "ACTIVE" ? "Membership enabled." : "Membership disabled.");
      await refresh();
    } catch {
      setError("We couldn't reach StayPilot. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  function toggleManagerProperty(membershipId: string, propertyId: string, checked: boolean) {
    setManagerProperties((current) => {
      const selected = new Set(current[membershipId] ?? []);
      if (checked) selected.add(propertyId);
      else selected.delete(propertyId);
      return { ...current, [membershipId]: [...selected] };
    });
  }

  async function copyLink() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.invitationUrl);
      setNotice("Invitation link copied.");
    } catch {
      setNotice("Copy isn't available in this browser. Select and copy the link below.");
    }
  }

  return <div className="space-y-6">
    <section className="surface-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Invite a manager</h2>
      <p className="muted mt-1 text-sm">The invitation expires in seven days. Assign one or more properties now; you can invite a manager without assigning properties yet.</p>
      <form className="mt-5 space-y-4" onSubmit={submit}>
        <label className="grid gap-1 text-sm font-medium">Email<input className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm" autoComplete="email" maxLength={254} name="email" required type="email" /></label>
        {properties.length ? <fieldset className="space-y-2"><legend className="text-sm font-medium">Property access</legend><div className="grid gap-2 sm:grid-cols-2">{properties.map((property) => <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm" key={property.id}><input name="propertyIds" type="checkbox" value={property.id} /><span>{property.name}</span></label>)}</div></fieldset> : <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Create a property before assigning manager access.</p>}
        {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-800" role="status">{notice}</p> : null}
        {invite ? <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 sm:flex-row sm:items-center"><input aria-label="One-time invitation link" className="min-w-0 flex-1 rounded border border-emerald-200 bg-white px-2 py-2 text-xs" readOnly value={invite.invitationUrl} /><button className="min-h-10 rounded-lg border border-emerald-300 px-3 text-sm font-semibold text-emerald-900" onClick={copyLink} type="button">Copy link</button></div> : null}
        <button className="min-h-11 rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">{pending ? "Working..." : "Create invitation"}</button>
      </form>
    </section>

    <section className="surface-card overflow-hidden">
      <header className="border-b border-slate-200 px-5 py-4 sm:px-6"><h2 className="text-lg font-semibold">Pending invitations</h2><p className="muted mt-1 text-sm">Resending rotates the token and immediately invalidates the previous link.</p></header>
      {teamState.invitations.length ? <ul className="divide-y divide-slate-200">{teamState.invitations.map((invitation) => <li className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6" key={invitation.id}><div><p className="font-medium">{invitation.email} <span className="ml-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{invitation.status.toLowerCase()}</span></p><p className="muted mt-1 text-sm">{invitation.propertyNames.length ? invitation.propertyNames.join(", ") : "No property access assigned"} · Expires {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(invitation.expiresAt))}</p></div><button className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold disabled:opacity-60" disabled={pending} onClick={() => void resend(invitation.id)} type="button">{pending ? "Working..." : "Resend invitation"}</button></li>)}</ul> : <p className="px-5 py-10 text-center text-sm text-slate-600">No manager invitations are waiting for acceptance.</p>}
    </section>

    <section className="surface-card overflow-hidden">
      <header className="border-b border-slate-200 px-5 py-4 sm:px-6"><h2 className="text-lg font-semibold">Team members</h2><p className="muted mt-1 text-sm">Managers can only access the properties listed on their account. Every organization must keep at least one active owner.</p></header>
      {teamState.members.length ? <ul className="divide-y divide-slate-200">{teamState.members.map((member) => <li className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-start sm:px-6" key={member.id}>
        <div className="min-w-0"><p className="font-medium">{member.name}<span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{member.roleCode.toLowerCase()}</span><span className={`ml-2 rounded-full px-2 py-1 text-xs ${member.status === "ACTIVE" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{member.status.toLowerCase()}</span></p><p className="muted mt-1 text-sm">{member.email}{member.roleCode === "MANAGER" ? ` · ${member.propertyNames.length ? member.propertyNames.join(", ") : "No property access"}` : ""}</p></div>
        <div className="flex flex-wrap items-center gap-3">{member.roleCode === "MANAGER" && member.status === "ACTIVE" ? <details><summary className="cursor-pointer text-sm font-semibold text-[#2563eb]">Edit property access</summary><fieldset className="mt-3 space-y-2"><legend className="text-sm font-medium">Properties this manager can access</legend>{properties.map((property) => <label className="flex items-center gap-2 text-sm" key={property.id}><input checked={(managerProperties[member.id] ?? []).includes(property.id)} name={`manager-${member.id}-properties`} onChange={(event) => toggleManagerProperty(member.id, property.id, event.currentTarget.checked)} type="checkbox" value={property.id} /><span>{property.name}</span></label>)}<button className="mt-2 min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold disabled:opacity-60" disabled={pending} onClick={() => void saveProperties(member.id)} type="button">Save property access</button></fieldset></details> : null}<button className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold disabled:opacity-60" disabled={pending} onClick={() => void setMembershipStatus(member.id, member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")} type="button">{member.status === "ACTIVE" ? "Disable access" : "Enable access"}</button></div>
      </li>)}</ul> : <p className="px-5 py-10 text-center text-sm text-slate-600">No owner or manager memberships yet.</p>}
    </section>
  </div>;
}
