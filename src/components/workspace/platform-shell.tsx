import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "@/modules/auth/ui/sign-out-button";
import { HeaderTools } from "./header-tools";

export function PlatformShell({ children, adminEmail }: Readonly<{ children: ReactNode; adminEmail: string }>) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[250px_1fr]">
      <aside className="bg-[#392a32] px-5 py-6 text-white md:min-h-screen">
        <Link className="text-lg font-bold tracking-tight" href="/">
          StayPilot
        </Link>
        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#dbc4d0]">
          Platform admin
        </p>
        <p className="mt-8 text-sm leading-6 text-[#dbc4d0]">
          This workspace is separate from organization operations.
        </p>
        <div className="mt-8 border-t border-white/15 pt-5">
          <p className="break-all text-xs text-[#dbc4d0]">{adminEmail}</p>
          <SignOutButton className="mt-4 min-h-10 rounded-md border border-white/20 px-3 text-sm font-semibold text-white hover:bg-white/10" />
        </div>
      </aside>
      <main className="min-w-0 px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-6 flex justify-end"><HeaderTools /></div>
          {children}
        </div>
      </main>
    </div>
  );
}
