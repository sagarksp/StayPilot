"use client";

import { useState, type FormEvent } from "react";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient();

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
        callbackURL: "/setup",
      });

      if (result.error) {
        setError("We couldn't create your account. Check your details or sign in if you already have an account.");
        return;
      }
      window.location.assign("/setup");
    } catch {
      setError("We couldn't reach StayPilot. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
      <label className="block space-y-2 text-sm font-medium" htmlFor="name">
        <span>Your name</span>
        <input autoComplete="name" className="min-h-11 w-full rounded-lg border border-[#cfdad5] bg-white px-3 text-base outline-none focus:border-[#176e61] focus:ring-2 focus:ring-[#176e61]/15" id="name" name="name" required />
      </label>
      <label className="block space-y-2 text-sm font-medium" htmlFor="email">
        <span>Email</span>
        <input autoComplete="email" className="min-h-11 w-full rounded-lg border border-[#cfdad5] bg-white px-3 text-base outline-none focus:border-[#176e61] focus:ring-2 focus:ring-[#176e61]/15" id="email" name="email" required type="email" />
      </label>
      <label className="block space-y-2 text-sm font-medium" htmlFor="password">
        <span>Password</span>
        <input autoComplete="new-password" className="min-h-11 w-full rounded-lg border border-[#cfdad5] bg-white px-3 text-base outline-none focus:border-[#176e61] focus:ring-2 focus:ring-[#176e61]/15" id="password" name="password" minLength={8} required type="password" />
      </label>
      {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
      <button className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10564c] disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
