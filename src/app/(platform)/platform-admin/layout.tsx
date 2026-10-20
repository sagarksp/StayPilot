import type { ReactNode } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { PlatformShell } from "@/components/workspace/platform-shell";
import { auth } from "@/infrastructure/auth/auth";
import { isPlatformAdminIdentity } from "@/infrastructure/auth/platform-admin-access";

export default async function PlatformAdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login?callbackURL=%2Fplatform-admin");
  if (!isPlatformAdminIdentity(session.user)) notFound();

  return <PlatformShell adminEmail={session.user.email}>{children}</PlatformShell>;
}
