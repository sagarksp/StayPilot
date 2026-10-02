import type { ReactNode } from "react";
import { StaffShell } from "@/components/workspace/staff-shell";

export default async function StaffLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ orgId: string }>;
}>) {
  const { orgId } = await params;

  return <StaffShell orgId={orgId}>{children}</StaffShell>;
}
