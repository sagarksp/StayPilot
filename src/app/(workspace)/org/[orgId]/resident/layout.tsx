import type { ReactNode } from "react";
import { ResidentPortalShell } from "@/components/workspace/resident-portal-shell";

export default async function ResidentLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ orgId: string }>;
}>) {
  const { orgId } = await params;

  return <ResidentPortalShell orgId={orgId}>{children}</ResidentPortalShell>;
}
