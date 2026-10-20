import Link from "next/link";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import type { ReactNode } from "react";
import { SignOutButton } from "@/modules/auth/ui/sign-out-button";
import styles from "./resident-portal-shell.module.css";
import { NotificationBell } from "./notification-bell";
import { HeaderTools } from "./header-tools";

export function ResidentPortalShell({
  children,
  orgId,
  organizationName,
}: Readonly<{ children: ReactNode; orgId: string; organizationName: string }>) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link aria-label="StayPilot resident home" className={styles.brandBlock} href={`/org/${orgId}/resident`}>
            <span className={styles.brandMark}><WorkspaceIcon name="domain" /></span>
            <span className={styles.brandCopy}><span className={styles.brandName}>StayPilot</span><span className={styles.organization}>{organizationName} · Resident Hub</span></span>
          </Link>
          <nav aria-label="Resident portal" className={styles.desktopNav}>
            <Link className={`${styles.navLink} ${styles.navLinkActive}`} href={`/org/${orgId}/resident`}><WorkspaceIcon name="domain" />Home</Link>
            <Link className={styles.navLink} href={`/org/${orgId}/resident#invoices-heading`}><WorkspaceIcon name="receipt_long" />Bills</Link>
            <Link className={styles.navLink} href={`/org/${orgId}/resident#food-heading`}><WorkspaceIcon name="restaurant" />Food</Link>
            <Link className={styles.navLink} href={`/org/${orgId}/resident#notices-heading`}><WorkspaceIcon name="campaign" />Notices</Link>
            <Link className={styles.navLink} href={`/org/${orgId}/resident#support-heading`}><WorkspaceIcon name="support_agent" />Support</Link>
          </nav>
          <NotificationBell organizationId={orgId} />
          <HeaderTools />
          <SignOutButton className={styles.signOut} />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
