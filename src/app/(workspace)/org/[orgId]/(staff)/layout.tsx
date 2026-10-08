import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { OwnerConsoleShell } from "@/components/workspace/owner-console-shell";
import { StaffShell } from "@/components/workspace/staff-shell";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";

export default async function StaffLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ orgId: string }>;
}>) {
  const { orgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor?.roles.some((role) => role === "OWNER" || role === "MANAGER")) {
    redirect(`/org/${orgId}/resident`);
  }

  if (actor.roles.includes("OWNER")) {
    return <OwnerConsoleShell actor={actor}>{children}</OwnerConsoleShell>;
  }

  return <StaffShell isOwner={false} orgId={orgId}>{children}</StaffShell>;
}
