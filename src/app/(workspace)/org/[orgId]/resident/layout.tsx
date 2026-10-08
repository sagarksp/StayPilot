import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { ResidentPortalShell } from "@/components/workspace/resident-portal-shell";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";

export default async function ResidentLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ orgId: string }>;
}>) {
  const { orgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.roles.includes("RESIDENT")) notFound();

  return <ResidentPortalShell orgId={orgId} organizationName={actor.organizationName}>{children}</ResidentPortalShell>;
}
