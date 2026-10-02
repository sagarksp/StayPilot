import type { ReactNode } from "react";
import { PlatformShell } from "@/components/workspace/platform-shell";

export default function PlatformAdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <PlatformShell>{children}</PlatformShell>;
}
