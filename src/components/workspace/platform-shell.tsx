import Link from "next/link";
import type { ReactNode } from "react";

export function PlatformShell({ children }: Readonly<{ children: ReactNode }>) {
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
      </aside>
      <main className="min-w-0 px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
