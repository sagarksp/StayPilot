"use client";

import { useState, type FormEvent } from "react";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient();

export function InvitationAcceptance({ token, email, organizationName, propertyNames, roleCode, residentName, signedInEmail }: Readonly<{
  token: string;
  email: string;
  organizationName: string;
  propertyNames: string[];
  roleCode: "MANAGER" | "RESIDENT";
  residentName: string | null;
  signedInEmail: string | null;
}>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callbackURL = `/invite/${encodeURIComponent(token)}`;
  const loginURL = `/login?callbackURL=${encodeURIComponent(callbackURL)}`;
  const roleName = roleCode === "RESIDENT" ? "resident" : "manager";

  async function accept() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/auth/invitations/${encodeURIComponent(token)}/accept`, { method: "POST" });
      const body = await response.json() as { data?: { redirectTo: string }; error?: string };
      if (!response.ok || !body.data) {
        if (body.error === "UNAUTHORIZED") {
          setError("You aren't signed in. Sign in with the invited email address, then open this invitation again.");
        } else if (response.status >= 500) {
          setError("We couldn't accept the invitation right now. Please try again in a moment.");
        } else {
          setError("This link may have expired, already been used, or replaced by a newer invitation. Ask the owner for the current link.");
        }
        return;
      }
      window.location.assign(body.data.redirectTo);
    } catch {
      setError("We couldn't reach StayPilot. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const form = new FormData(event.currentTarget);
      const result = await authClient.signUp.email({
        name: String(form.get("name") ?? "").trim(),
        email,
        password: String(form.get("password") ?? ""),
        callbackURL,
      });
      if (result.error) {
        setError("An account may already exist for this email. Sign in with the invited email to accept the invitation.");
        return;
      }
      await accept();
    } catch {
      setError("We couldn't create your account. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function switchAccount() {
    setPending(true);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError("Couldn't sign out. Please try again.");
        return;
      }
      window.location.assign(loginURL);
    } catch {
      setError("Couldn't reach StayPilot. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
    <section className="surface-card w-full p-8 md:p-10">
      <p className="text-sm font-semibold text-[#176e61]">StayPilot · {roleName} invitation</p>
      <h1 className="mt-4 text-3xl font-semibold">{roleCode === "RESIDENT" ? "Activate your StayPilot account" : `Join ${organizationName}`}</h1>
      <p className="muted mt-3 leading-7">This invitation is for <strong>{email}</strong> as a {roleName}{residentName ? ` for ${residentName}` : ""} at {organizationName}.</p>
      {roleCode === "MANAGER" ? <p className="muted mt-2 text-sm">Property access: {propertyNames.length ? propertyNames.join(", ") : "No properties assigned yet. Ask the owner to assign access."}</p> : <p className="muted mt-2 text-sm">After activation, you can view your stay details, bills, deposit activity, and support requests.</p>}
      {error ? <p className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error} <a className="font-semibold underline" href={loginURL}>Sign in</a></p> : null}
      {signedInEmail?.toLowerCase() === email.toLowerCase() ? <button className="mt-6 min-h-11 w-full rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={pending} onClick={() => void accept()} type="button">{pending ? "Accepting..." : "Accept invitation"}</button>
        : signedInEmail ? <div className="mt-6 space-y-3"><p className="text-sm text-amber-900">You are signed in as {signedInEmail}. Sign out and continue with the invited address.</p><button className="min-h-11 w-full rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={pending} onClick={() => void switchAccount()} type="button">{pending ? "Signing out..." : "Switch account"}</button></div>
          : <form className="mt-6 space-y-4" onSubmit={createAccount}>
            <label className="grid gap-1 text-sm font-medium">Your name<input autoComplete="name" className="min-h-11 rounded-lg border border-slate-300 px-3" maxLength={180} minLength={1} name="name" required /></label>
            <label className="grid gap-1 text-sm font-medium">Create password<input autoComplete="new-password" className="min-h-11 rounded-lg border border-slate-300 px-3" minLength={8} name="password" required type="password" /></label>
            <button className="min-h-11 w-full rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "Activating..." : "Create account and accept"}</button>
            <p className="text-center text-sm text-slate-600">Already have an account? <a className="font-semibold text-[#176e61] underline" href={loginURL}>Sign in</a></p>
          </form>}
    </section>
  </main>;
}
