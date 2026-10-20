"use client";

import { useState, type FormEvent } from "react";
import { createAuthClient } from "better-auth/react";
import Link from "next/link";

const authClient = createAuthClient();

export function SignInForm({ callbackURL = "/workspace" }: Readonly<{ callbackURL?: string }>) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  async function resendVerification() {
    if (!verificationEmail) return;
    setPending(true);
    setError(null);
    try {
      const result = await authClient.sendVerificationEmail({ email: verificationEmail, callbackURL });
      if (result.error) setError("We couldn't resend the verification email. Wait a moment and try again.");
      else setVerificationSent(true);
    } catch {
      setError("We couldn't reach StayPilot. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const form = new FormData(event.currentTarget);
      const result = await authClient.signIn.email({
        email: String(form.get("email") ?? "").trim(),
        password: String(form.get("password") ?? ""),
        callbackURL,
      });

      if (result.error) {
        if (result.error.code === "EMAIL_NOT_VERIFIED") {
          setVerificationEmail(String(form.get("email") ?? "").trim());
          setError("Verify your email before signing in. We sent a fresh verification link if this account needs one.");
        } else if (result.error.code === "INVALID_ORIGIN" || result.error.code === "MISSING_OR_NULL_ORIGIN") {
          setError("The sign-in page is using a different address than the app configuration. Open StayPilot using the host configured in APP_URL.");
        } else if (result.error.status === 429) {
          setError("There have been too many sign-in attempts. Wait a minute, then try again.");
        } else if (result.error.status >= 500) {
          setError("The sign-in service couldn't complete your request. Please try again in a moment.");
        } else {
          setError("We couldn't sign you in with those details. Check your email and password, then try again.");
        }
        return;
      }
      window.location.assign(callbackURL);
    } catch {
      setError("We couldn't reach StayPilot. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
      <label className="block space-y-2 text-sm font-medium" htmlFor="email">
        <span>Email</span>
        <input
          autoComplete="email"
          className="min-h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-base outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
          id="email"
          name="email"
          required
          type="email"
        />
      </label>
      <label className="block space-y-2 text-sm font-medium" htmlFor="password">
        <span>Password</span>
        <input
          autoComplete="current-password"
          className="min-h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-base outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
          id="password"
          name="password"
          required
          type="password"
        />
      </label>
      <p className="-mt-2 text-right text-sm">
        <Link className="font-semibold text-[#2563eb] hover:underline" href="/forgot-password">Forgot password?</Link>
      </p>
      {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
      {verificationEmail ? <div className="space-y-2"><button className="text-sm font-semibold text-[#2563eb] underline disabled:opacity-60" disabled={pending} onClick={() => void resendVerification()} type="button">{pending ? "Sending link..." : "Resend verification email"}</button>{verificationSent ? <p className="text-sm text-slate-600" role="status">If the account still needs verification, a fresh link has been sent.</p> : null}</div> : null}
      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] disabled:cursor-wait disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
