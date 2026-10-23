"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createAuthClient } from "better-auth/react";
import { requestPasswordRecovery, type PasswordRecoveryResult } from "@/app/(auth)/forgot-password/actions";
import { FirstPlatformAdminForm } from "@/modules/auth/ui/first-platform-admin-form";

const authClient = createAuthClient();
const inputClass = "min-h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-base outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15";
const buttonClass = "inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] disabled:cursor-wait disabled:opacity-60";

export function PasswordResetRequestForm() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<PasswordRecoveryResult | null>(null);
  const [email, setEmail] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const form = new FormData(event.currentTarget);
      const enteredEmail = String(form.get("email") ?? "").trim();
      setEmail(enteredEmail);
      setResult(await requestPasswordRecovery(enteredEmail));
    } catch {
      setResult("error");
    } finally {
      setPending(false);
    }
  }

  if (result === "first-admin") {
    return (
      <div className="mt-7 space-y-5">
        <p className="rounded-lg border border-[#dbeafe] bg-[#eff8f3] p-4 text-sm leading-6 text-[#24594b]" role="status">
          This developer email is configured for platform access, but there is no account for it in this database yet. Create the first account below, then verify your email before signing in.
        </p>
        <FirstPlatformAdminForm email={email} />
      </div>
    );
  }

  if (result === "verify-admin") {
    return (
      <div className="mt-7 space-y-5">
        <p className="rounded-lg border border-[#dbeafe] bg-[#eff8f3] p-4 text-sm leading-6 text-[#24594b]" role="status">
          This developer account exists but its email is not verified. We requested verification and password reset emails for {email}. Verify your address before signing in, then use the reset link to set a new password.
        </p>
        <p className="text-center text-sm"><Link className="font-semibold text-[#2563eb] hover:underline" href="/login">Back to sign in</Link></p>
      </div>
    );
  }

  if (result === "sent") {
    return (
      <div className="mt-7 space-y-5">
        <p className="rounded-lg border border-[#dbeafe] bg-[#eff8f3] p-4 text-sm leading-6 text-[#24594b]" role="status">
          If an account matches that email, a reset request has been recorded. Check your inbox and spam folder. Reset links expire in one hour.
        </p>
        <button className={`${buttonClass} border border-[#cbd5e1] bg-white text-[#2563eb] hover:bg-[#f5f8f6]`} onClick={() => setResult(null)} type="button">
          Request another link
        </button>
        <p className="text-center text-sm"><Link className="font-semibold text-[#2563eb] hover:underline" href="/login">Back to sign in</Link></p>
      </div>
    );
  }

  const errorMessage = result === "rate-limited"
    ? "Too many reset requests. Wait one minute, then request a new link."
    : result === "error"
      ? "We couldn't send the reset request. Check your email settings or try again in a moment."
      : null;

  return (
    <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
      <label className="block space-y-2 text-sm font-medium" htmlFor="email">
        <span>Email</span>
        <input autoComplete="email" className={inputClass} id="email" name="email" required type="email" />
      </label>
      {errorMessage ? <p className="text-sm text-red-700" role="alert">{errorMessage}</p> : null}
      <button className={buttonClass} disabled={pending} type="submit">
        {pending ? "Sending link..." : "Send reset link"}
      </button>
      <p className="text-center text-sm"><Link className="font-semibold text-[#2563eb] hover:underline" href="/login">Back to sign in</Link></p>
    </form>
  );
}

export function PasswordResetForm({ token, invalidLink = false }: Readonly<{ token: string | null; invalidLink?: boolean }>) {
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmPassword") ?? "");
    if (newPassword !== confirmation) {
      setError("The passwords don't match.");
      setPending(false);
      return;
    }

    try {
      const result = await authClient.resetPassword({ newPassword, token: token ?? undefined });
      if (result.error) {
        const errorCode = result.error.code ?? "";
        console.error("Password reset submission failed.", {
          status: result.error.status,
          code: errorCode,
        });
        if (/INVALID_TOKEN|TOKEN_EXPIRED/i.test(errorCode)) {
          setError("This reset link is invalid or expired. Request a new one to continue.");
        } else {
          setError("We couldn't update your password. Please try again or request a new reset link.");
        }
        return;
      }
      if (result.data?.status !== true) {
        setError("We couldn't update your password. Please try again or request a new reset link.");
        return;
      }
      setComplete(true);
    } catch {
      setError("We couldn't reach StayPilot. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (complete) {
    return (
      <div className="mt-7 space-y-5">
        <p className="rounded-lg border border-[#dbeafe] bg-[#eff8f3] p-4 text-sm leading-6 text-[#24594b]" role="status">
          Your password has been updated. Sign in with your new password to continue.
        </p>
        <Link className={`${buttonClass} no-underline`} href="/login">Continue to sign in</Link>
      </div>
    );
  }

  if (!token || invalidLink) {
    return (
      <div className="mt-7 space-y-5">
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900" role="alert">
          This reset link is missing, invalid, or expired. Request a new link to continue.
        </p>
        <Link className={`${buttonClass} no-underline`} href="/forgot-password">Request another link</Link>
      </div>
    );
  }

  return (
    <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
      <label className="block space-y-2 text-sm font-medium" htmlFor="password">
        <span>New password</span>
        <input autoComplete="new-password" className={inputClass} id="password" maxLength={128} minLength={8} name="password" required type="password" />
      </label>
      <label className="block space-y-2 text-sm font-medium" htmlFor="confirmPassword">
        <span>Confirm new password</span>
        <input autoComplete="new-password" className={inputClass} id="confirmPassword" maxLength={128} minLength={8} name="confirmPassword" required type="password" />
      </label>
      {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
      <button className={buttonClass} disabled={pending} type="submit">
        {pending ? "Updating password..." : "Update password"}
      </button>
    </form>
  );
}
