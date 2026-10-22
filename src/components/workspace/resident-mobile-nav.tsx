import Link from "next/link";
import type { ReactNode } from "react";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { MobileNavigationDrawer } from "./mobile-navigation-drawer";
import styles from "./resident-portal-shell.module.css";

export function ResidentMobileNav({ orgId, leadingActions }: Readonly<{ orgId: string; leadingActions?: ReactNode }>) {
  const base = `/org/${orgId}/resident`;
  const links = [
    { label: "Home", icon: "domain", href: `${base}#top` },
    { label: "Bills", icon: "receipt_long", href: `${base}#invoices-heading` },
    { label: "Food", icon: "restaurant", href: `${base}#food-heading` },
    { label: "Notices", icon: "campaign", href: `${base}#notices-heading` },
    { label: "Support", icon: "support_agent", href: `${base}#support-heading` },
    { label: "Stay profile", icon: "person", href: `${base}#stay-heading` },
  ];

  return (
    <MobileNavigationDrawer title="Resident portal" leadingActions={leadingActions}>
      <div className={styles.mobileMenuItems}>
        {links.map((link) => (
          <Link className={styles.mobileMoreLink} href={link.href} key={link.label}>
            <WorkspaceIcon name={link.icon} />
            <span>{link.label}</span>
          </Link>
        ))}
      </div>
    </MobileNavigationDrawer>
  );
}
