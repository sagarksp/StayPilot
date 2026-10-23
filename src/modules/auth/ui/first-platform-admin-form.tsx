"use client";

import { useState, type FormEvent } from "react";
import { createAuthClient } from "better-auth/react";
import { authorizeFirstPlatformAdminSignup, type PlatformAdminBootstrapResult } from "@/app/(auth)/forgot-password/actions";

const inputClass = "min-h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 text-base outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15";
const buttonClass = "inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-wait disabled:opacity-60";
const authClient = createAuthClient();

const messages: Record<PlatformAdminBootstrapResult, string> = {
  allowed: "",
  created: "Account created. Check your inbox for the verification link, then sign in to open the platform dashboard.",
  "verification-sent": "This account is awaiting email verification. A fresh verification link was requested; check your inbox and spam folder.",
  existing: "This developer account already exists. Use password recovery to get a reset link.",
  "not-allowed": "This email is not configured for platform access. Check PLATFORM_ADMIN_EMAILS.",
  invalid: "Enter your name and a password between 8 and 128 characters.",
  error: "We couldn't create the account or send its verification link. Check the database and email settings, then try again.",
};

export function FirstPlatformAdminForm({ email }: Readonly<{ email: string }>) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<PlatformAdminBootstrapResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    try {
      const form = new FormData(event.currentTarget);
      const name = String(form.get("name") ?? "").trim();
      const password = String(form.get("password") ?? "");
      if (name.length < 2 || name.length > 180 || password.length < 8 || password.length > 128) {
        setResult("invalid");
        return;
      }

      const authorization = await authorizeFirstPlatformAdminSignup(email);
      if (authorization !== "allowed") {
        setResult(authorization);
        return;
      }

      const signup = await authClient.signUp.email({ name, email, password, callbackURL: "/platform-admin" });
      setResult(signup.error ? "error" : "created");
    } catch {
      setResult("error");
    } finally {
      setPending(false);
    }
  }

  const isSuccess = result === "created" || result === "verification-sent";

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block space-y-2 text-sm font-medium" htmlFor="platform-admin-name">
        <span>Your name</span>
        <input autoComplete="name" className={inputClass} id="platform-admin-name" maxLength={180} minLength={2} name="name" required />
      </label>
      <label className="block space-y-2 text-sm font-medium" htmlFor="platform-admin-email">
        <span>Developer email</span>
        <input autoComplete="email" className={inputClass} id="platform-admin-email" name="email" readOnly type="email" value={email} />
      </label>
      <label className="block space-y-2 text-sm font-medium" htmlFor="platform-admin-password">
        <span>Create a password</span>
        <input autoComplete="new-password" className={inputClass} id="platform-admin-password" maxLength={128} minLength={8} name="password" required type="password" />
      </label>
      {result ? <p className={`rounded-lg border p-3 text-sm leading-6 ${isSuccess ? "border-[#dbeafe] bg-[#eff8f3] text-[#24594b]" : "border-red-200 bg-red-50 text-red-800"}`} role={isSuccess ? "status" : "alert"}>{result === "created" ? "Account created. Check your inbox for the verification link, then sign in to open the platform dashboard." : messages[result]}</p> : null}
      <button className={buttonClass} disabled={pending} type="submit">{pending ? "Creating account..." : "Create developer account"}</button>
    </form>
  );
}
