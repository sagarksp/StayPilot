import type { ReactNode } from "react";

/**
 * Scaffold-only organization boundary. Add the session and membership guard
 * here before rendering any tenant-owned data.
 */
export default function OrganizationLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
