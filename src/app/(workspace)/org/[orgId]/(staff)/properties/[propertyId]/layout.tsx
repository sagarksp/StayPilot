import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { getOrganizationActor } from "@/infrastructure/auth/actor-context";

export default async function ActivePropertyLayout({
  children,
  params,
}: Readonly<{ children: ReactNode; params: Promise<{ orgId: string; propertyId: string }> }>) {
  const { orgId, propertyId } = await params;
  const actor = await getOrganizationActor(orgId);
  if (!actor) redirect("/login");
  if (!actor.activePgIds.includes(propertyId)) notFound();
  return children;
}
