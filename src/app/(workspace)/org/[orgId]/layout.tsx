import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";

/**
 * Scaffold-only organization boundary. Add the session and membership guard
 * here before rendering any tenant-owned data.
 */
export default async function OrganizationLayout({
  children,
  params,
}: Readonly<{ children: ReactNode; params: Promise<{ orgId: string }> }>) {
  const { orgId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");

  return children;
}
