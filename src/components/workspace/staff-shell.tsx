import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutButton } from "@/modules/auth/ui/sign-out-button";

const staffResources = [
  { href: "manager", label: "Overview" },
  { href: "properties", label: "Properties" },
  { href: "residents", label: "Residents" },
  { href: "reservations", label: "Reservations" },
  { href: "finance", label: "Invoices" },
];

export function StaffShell({
  children,
  isOwner,
  orgId,
}: Readonly<{ children: ReactNode; isOwner: boolean; orgId: string }>) {
  const resources = isOwner
    ? [{ href: "owner", label: "Overview" }, ...staffResources]
    : staffResources;

  return (
    <div className="min-h-screen bg-[#fbfbfa] md:grid md:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="bg-[#0e3a43] px-5 py-6 text-white md:min-h-screen">
        <Link className="text-lg font-bold tracking-tight" href="/">
          StayPilot
        </Link>
        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#a9c7bf]">
          {isOwner ? "Owner workspace" : "Manager workspace"}
        </p>
        <nav aria-label="Staff resources" className="mt-8 space-y-1">
          {resources.map((resource) => (
            <Link
              className="shell-link"
              href={`/org/${orgId}/${resource.href}`}
              key={resource.href}
            >
              {resource.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 border-t border-white/15 pt-4">
          <SignOutButton className="shell-link w-full cursor-pointer border-0 bg-transparent text-left disabled:cursor-wait disabled:opacity-60" />
        </div>
        <p className="mt-8 border-t border-white/15 pt-5 text-xs leading-5 text-[#a9c7bf]">
          Properties, residents, and reservations are managed within this organization.
        </p>
      </aside>
      <main className="min-w-0 px-5 py-8 md:px-10 md:py-10">
        <div className="mx-auto w-full max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}
