import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "@/modules/auth/ui/sign-out-button";

export function ResidentPortalShell({
  children,
  orgId,
  organizationName,
}: Readonly<{ children: ReactNode; orgId: string; organizationName: string }>) {
  return (
    <div className="min-h-screen bg-[#f7f9f8]">
      <header className="border-b border-[#dce4e0] bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link className="text-lg font-bold tracking-tight text-[#176e61]" href="/">
              StayPilot
            </Link>
            <p className="mt-1 text-xs text-[#63716e]">{organizationName} · Resident portal</p>
          </div>
          <nav aria-label="Resident portal" className="flex flex-wrap gap-1">
            <Link className="portal-link bg-[#e9f2ef] text-[#10564c]" href={`/org/${orgId}/resident`}>
              Home
            </Link>
            <SignOutButton className="portal-link cursor-pointer border-0 bg-transparent text-sm disabled:cursor-wait disabled:opacity-60" />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-5 py-8 md:py-10">{children}</main>
    </div>
  );
}
