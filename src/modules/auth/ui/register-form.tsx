"use client";

import { useState, type FormEvent } from "react";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient();

export function RegisterForm({ ownerInviteToken, invitedOwner }: Readonly<{ ownerInviteToken?: string; invitedOwner?: { name: string; email: string } }>) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function resendVerification() {
    if (!verificationEmail) return;
    setPending(true);
    setError(null);
    try {
      const result = await authClient.sendVerificationEmail({ email: verificationEmail, callbackURL: ownerInviteToken ? `/setup?invite=${encodeURIComponent(ownerInviteToken)}` : "/setup" });
      if (result.error) setError("We couldn't resend the verification email. Wait a moment and try again.");
      else setResent(true);
    } catch {
      setError("We couldn't reach StayPilot. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const form = new FormData(event.currentTarget);
      const result = await authClient.signUp.email({
        name: String(form.get("name") ?? "").trim(),
        email: String(form.get("email") ?? "").trim(),
        password: String(form.get("password") ?? ""),
        callbackURL: ownerInviteToken ? `/setup?invite=${encodeURIComponent(ownerInviteToken)}` : "/setup",
      });

      if (result.error) {
        setError("We couldn't create your account. Check your details or sign in if you already have an account.");
        return;
      }
      setVerificationEmail(String(form.get("email") ?? "").trim());
    } catch {
      setError("We couldn't reach StayPilot. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (verificationEmail) return <div className="mt-7 space-y-5">
    <p className="rounded-lg border border-[#dbeafe] bg-[#eff8f3] p-4 text-sm leading-6 text-[#24594b]" role="status">If this account needs verification, a link has been sent to <strong>{verificationEmail}</strong>. Open it within one hour to continue setting up your workspace. Already registered? <a className="font-semibold underline" href="/login">Sign in</a>.</p>
    {resent ? <p className="text-sm text-slate-600" role="status">If the account still needs verification, a fresh link has been sent.</p> : null}
    {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
    <button className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-semibold text-[#2563eb] hover:bg-[#f5f8f6] disabled:cursor-wait disabled:opacity-60" disabled={pending} onClick={() => void resendVerification()} type="button">{pending ? "Sending link..." : "Resend verification email"}</button>
  </div>;

  return (
    <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
      <label className="block space-y-2 text-sm font-medium" htmlFor="name">
        <span>Your name</span>
        <input autoComplete="name" className="min-h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-base outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15" defaultValue={invitedOwner?.name} id="name" name="name" readOnly={Boolean(invitedOwner)} required />
      </label>
      <label className="block space-y-2 text-sm font-medium" htmlFor="email">
        <span>Email</span>
        <input autoComplete="email" className="min-h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-base outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15" defaultValue={invitedOwner?.email} id="email" name="email" readOnly={Boolean(invitedOwner)} required type="email" />
      </label>
      <label className="block space-y-2 text-sm font-medium" htmlFor="password">
        <span>Password</span>
        <input autoComplete="new-password" className="min-h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-base outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15" id="password" name="password" minLength={8} required type="password" />
      </label>
      {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
      <button className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
