"use client";

import { useState, type FormEvent } from "react";
import { registerPlatformAdminAccount, type PlatformAdminRegistrationResult } from "@/app/(auth)/register/platform-admin-action";

const inputClass = "min-h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-base outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15";
const buttonClass = "inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-wait disabled:opacity-60";

const messages: Partial<Record<PlatformAdminRegistrationResult["status"], string>> = {
  created: "A verification link has been sent if email delivery is configured. Verify your email, then sign in to open the developer dashboard.",
  "verification-sent": "A fresh verification link has been sent. Check your inbox and spam folder before signing in.",
  existing: "This developer account already exists. Use the password reset link to recover access.",
  "not-allowed": "This email is not listed in PLATFORM_ADMIN_EMAILS for this deployment.",
  invalid: "Enter your name, an allowed email address, and a password between 8 and 128 characters.",
  error: "We couldn't set up the account or send a verification email. Check the email settings and try again.",
};

export function PlatformAdminRegistrationForm() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<PlatformAdminRegistrationResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    try {
      setResult(await registerPlatformAdminAccount(new FormData(event.currentTarget)));
    } catch {
      setResult({ status: "error" });
    } finally {
      setPending(false);
    }
  }

  const isSuccess = result?.status === "created" || result?.status === "verification-sent";

  return (
    <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
      <label className="block space-y-2 text-sm font-medium" htmlFor="admin-name">
        <span>Your name</span>
        <input autoComplete="name" className={inputClass} id="admin-name" maxLength={180} minLength={2} name="name" required />
      </label>
      <label className="block space-y-2 text-sm font-medium" htmlFor="admin-email">
        <span>Developer email</span>
        <input autoComplete="email" className={inputClass} id="admin-email" maxLength={254} name="email" required type="email" />
      </label>
      <label className="block space-y-2 text-sm font-medium" htmlFor="admin-password">
        <span>Password</span>
        <input autoComplete="new-password" className={inputClass} id="admin-password" maxLength={128} minLength={8} name="password" required type="password" />
      </label>
      {result ? <p className={`rounded-lg border p-3 text-sm leading-6 ${isSuccess ? "border-[#dbeafe] bg-[#eff8f3] text-[#24594b]" : "border-red-200 bg-red-50 text-red-800"}`} role={isSuccess ? "status" : "alert"}>{messages[result.status]}</p> : null}
      <button className={buttonClass} disabled={pending} type="submit">{pending ? "Setting up account..." : "Create developer account"}</button>
    </form>
  );
}
