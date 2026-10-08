"use client";

import { useState } from "react";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient();

export function SignOutButton({ className }: Readonly<{ className: string }>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setPending(true);
    setError(null);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError("Couldn't sign out. Please try again.");
        return;
      }
      window.location.assign("/login");
    } catch {
      setError("Couldn't reach StayPilot. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button className={className} disabled={pending} onClick={handleSignOut} type="button">
        {pending ? "Signing out..." : "Sign out"}
      </button>
      {error ? <p className="mt-2 px-3 text-xs text-red-100" role="alert">{error}</p> : null}
    </div>
  );
}
