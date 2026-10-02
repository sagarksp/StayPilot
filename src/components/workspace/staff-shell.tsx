import Link from "next/link";
import type { ReactNode } from "react";

const staffResources = [
  { href: "properties", label: "Properties" },
  { href: "residents", label: "Residents" },
  { href: "reservations", label: "Reservations" },
];

export function StaffShell({
  children,
  orgId,
}: Readonly<{ children: ReactNode; orgId: string }>) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[250px_1fr]">
      <aside className="bg-[#153f39] px-5 py-6 text-white md:min-h-screen">
        <Link className="text-lg font-bold tracking-tight" href="/">
          StayPilot
        </Link>
        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#a9c7bf]">
          Staff workspace
        </p>
        <nav aria-label="Staff resources" className="mt-8 space-y-1">
          {staffResources.map((resource) => (
            <Link
              className="shell-link"
              href={`/org/${orgId}/${resource.href}`}
              key={resource.href}
            >
              {resource.label}
            </Link>
          ))}
        </nav>
        <p className="mt-8 border-t border-white/15 pt-5 text-xs leading-5 text-[#a9c7bf]">
          Owner and Manager share these operational resource routes. Their
          dashboards and permissions remain role-aware.
        </p>
      </aside>
      <main className="min-w-0 px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
