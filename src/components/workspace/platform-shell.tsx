import Link from "next/link";
import type { ReactNode } from "react";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { SignOutButton } from "@/modules/auth/ui/sign-out-button";
import { HeaderTools } from "./header-tools";
import { MobileNavigationDrawer } from "./mobile-navigation-drawer";
import styles from "./platform-shell.module.css";

export function PlatformShell({ children, adminEmail }: Readonly<{ children: ReactNode; adminEmail: string }>) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandRow}>
          <Link aria-label="StayPilot platform admin dashboard" className={styles.brand} href="/platform-admin">
            <strong>StayPilot</strong>
            <span>Platform admin</span>
          </Link>
          <MobileNavigationDrawer title="Platform administration" leadingActions={<HeaderTools compact />}>
            <div className={styles.mobileMenu}>
              <p>This workspace is separate from organization operations.</p>
              <Link href="/platform-admin#demo-requests-content-section"><WorkspaceIcon name="mail" /><span>Demo requests</span></Link>
              <Link href="/platform-admin#subscription-settings-content-section"><WorkspaceIcon name="receipt" /><span>Pricing and PG invoices</span></Link>
              <Link href="/platform-admin#invoice-activity-content-section"><WorkspaceIcon name="payments" /><span>Invoices and payments</span></Link>
              <Link href="/platform-admin#organizations-content-section"><WorkspaceIcon name="groups" /><span>Organizations</span></Link>
              <Link href="/platform-admin#pg-access-content-section"><WorkspaceIcon name="domain" /><span>All PGs</span></Link>
              <div className={styles.mobileAccount}>
                <span>{adminEmail}</span>
                <SignOutButton className={styles.mobileSignOut} />
              </div>
            </div>
          </MobileNavigationDrawer>
        </div>
        <p className={styles.description}>This workspace is separate from organization operations.</p>
        <div className={styles.account}>
          <p>{adminEmail}</p>
          <SignOutButton className={styles.signOut} />
        </div>
      </aside>
      <main className={styles.main}>
        <div className={styles.content}>
          <div className={styles.tools}><HeaderTools /></div>
          {children}
        </div>
      </main>
    </div>
  );
}
