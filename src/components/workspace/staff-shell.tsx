"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import { SignOutButton } from "@/modules/auth/ui/sign-out-button";
import type { OrganizationActor } from "@/modules/property/domain/inventory";
import styles from "./staff-shell.module.css";
import { NotificationBell } from "./notification-bell";
import { HeaderTools } from "./header-tools";

const navigation = [
  {
    title: "Workspace",
    links: [{ href: "manager", label: "Overview", icon: "grid_view" }],
  },
  {
    title: "Portfolio",
    links: [
      { href: "properties", label: "Properties", icon: "domain" },
      { href: "residents", label: "Residents", icon: "groups" },
      { href: "reservations", label: "Reservations", icon: "event_available" },
    ],
  },
  {
    title: "Operations",
    links: [
      { href: "complaints", label: "Complaints", icon: "campaign" },
      { href: "notices", label: "Notices", icon: "campaign" },
      { href: "food", label: "Food", icon: "restaurant" },
      { href: "electricity", label: "Electricity", icon: "bolt" },
    ],
  },
  {
    title: "Finance & reports",
    links: [
      { href: "finance", label: "Invoices", icon: "receipt_long" },
      { href: "payments", label: "Payments", icon: "payments" },
      { href: "deposit-transfers", label: "Deposit transfers", icon: "account_balance_wallet" },
      { href: "reports/electricity", label: "Reports", icon: "insights" },
      { href: "audit", label: "Audit log", icon: "history" },
    ],
  },
] as const;

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "SP";
}

export function StaffShell({
  children,
  actor,
}: Readonly<{ children: ReactNode; actor: OrganizationActor }>) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const workspaceRoot = `/org/${actor.organizationId}`;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <Link className={styles.brand} href="/">
            <span className={styles.brandIcon}><WorkspaceIcon name="domain" /></span>
            <span className={styles.brandCopy}>
              <strong>StayPilot</strong>
              <small>Manager workspace</small>
            </span>
          </Link>
          <div className={styles.organizationCard}>
            <span aria-hidden="true" className={styles.organizationMark}>{actor.organizationName.slice(0, 1).toUpperCase()}</span>
            <span className={styles.organizationName}>
              <small>Organization</small>
              <strong>{actor.organizationName}</strong>
            </span>
            <span aria-label="Active organization" className={styles.activeDot} />
          </div>
        </div>

        <nav aria-label="Manager workspace" className={`${styles.navigation} ${mobileMenuOpen ? styles.navigationOpen : ""}`} id="manager-workspace-menu">
          <button aria-controls="manager-workspace-menu-list" aria-expanded={mobileMenuOpen} className={styles.mobileMenuToggle} onClick={() => setMobileMenuOpen(true)} type="button">
            <WorkspaceIcon name="table_rows" />Menu
          </button>
          <div className={styles.mobileMenuHeader}>
            <strong>Manager workspace</strong>
            <button aria-label="Close manager workspace menu" className={styles.mobileMenuClose} onClick={() => setMobileMenuOpen(false)} type="button">Close</button>
          </div>
          <div id="manager-workspace-menu-list">
            {navigation.map((section) => (
              <section className={styles.navigationSection} key={section.title}>
                <h2>{section.title}</h2>
                <div className={styles.navigationLinks}>
                  {section.links.map((item) => {
                    const href = `${workspaceRoot}/${item.href}`;
                    const selected = item.href === "manager"
                      ? pathname === href
                      : pathname === href || pathname.startsWith(`${href}/`);
                    const className = [styles.navigationLink, selected ? styles.navigationLinkActive : ""]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <Link aria-current={selected ? "page" : undefined} className={className} href={href} key={item.href} onClick={() => setMobileMenuOpen(false)}>
                        <WorkspaceIcon name={item.icon} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </nav>

        <div className={styles.accountBlock}>
          <div className={styles.accountCard}>
            <span aria-hidden="true" className={styles.avatar}>{initials(actor.userName)}</span>
            <span className={styles.accountIdentity}>
              <strong>{actor.userName}</strong>
              <small>Property manager</small>
            </span>
          </div>
          <SignOutButton className={styles.signOut} />
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.topbarIdentity}>
            <span aria-hidden="true" className={styles.topbarDot} />
            <span className={styles.topbarOrganization}>{actor.organizationName}</span>
            <span className={styles.topbarDivider}>/</span>
            <span className={styles.topbarSection}>Operations</span>
          </div>
          <NotificationBell organizationId={actor.organizationId} />
          <div className={styles.topbarTools}><HeaderTools /></div>
          <div className={styles.topbarAccount}>
            <span className={styles.topbarGreeting}>Signed in as</span>
            <strong>{actor.userName}</strong>
            <span aria-hidden="true" className={styles.topbarAvatar}>{initials(actor.userName)}</span>
          </div>
        </header>
        <main className={styles.main}>
          <div className={styles.content}>{children}</div>
        </main>
      </div>
    </div>
  );
}
