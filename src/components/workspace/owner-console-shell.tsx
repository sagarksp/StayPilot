"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { SignOutButton } from "@/modules/auth/ui/sign-out-button";
import type { OrganizationActor } from "@/modules/property/domain/inventory";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import styles from "./owner-console-shell.module.css";

type OwnerNavigationItem = Readonly<{
  label: string;
  icon: string;
  route?: string;
  available: boolean;
}>;

const navigation: ReadonlyArray<Readonly<{ title: string; links: ReadonlyArray<OwnerNavigationItem> }>> = [
  { title: "Operations Core", links: [
    { label: "Dashboard", icon: "grid_view", route: "owner", available: true },
    { label: "PG Properties", icon: "apartment", route: "properties", available: true },
    { label: "Floors / Rooms / Beds", icon: "meeting_room", route: "properties", available: true },
    { label: "Residents", icon: "groups", route: "residents", available: true },
    { label: "Reservations", icon: "event_available", route: "reservations", available: true },
  ] },
  { title: "Financials & Billing", links: [
    { label: "Invoices", icon: "receipt_long", route: "finance", available: true },
    { label: "Payments", icon: "account_balance_wallet", available: false },
    { label: "Security Deposits", icon: "lock", available: false },
    { label: "Electricity / Submeter", icon: "bolt", available: false },
  ] },
  { title: "Support & Control", links: [
    { label: "Complaints", icon: "report_problem", available: false },
    { label: "Notices", icon: "campaign", available: false },
    { label: "Reports", icon: "insights", available: false },
    { label: "Staff & Managers", icon: "manage_accounts", available: false },
    { label: "Settings", icon: "tune", available: false },
  ] },
];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "SP";
}

function currentMonth(timezone: string) {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: timezone }).format(new Date());
}

export function OwnerConsoleShell({
  children,
  actor,
}: Readonly<{ children: ReactNode; actor: OrganizationActor }>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ownerPath = `/org/${actor.organizationId}/owner`;
  const propertiesPath = `/org/${actor.organizationId}/properties`;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <Link className={styles.brand} href="/">
            <span className={styles.brandIcon}><WorkspaceIcon name="domain" /></span>
            <span>
              <strong>StayPilot</strong>
              <small>Executive Owner Console</small>
            </span>
          </Link>
          <Link className={styles.organizationCard} href={propertiesPath}>
            <span className={styles.organizationName}>
              <i aria-hidden="true" />
              <span>{actor.organizationName}</span>
            </span>
            <span className={styles.propertyCount}>{actor.propertyCount} PG{actor.propertyCount === 1 ? "" : "s"}</span>
          </Link>
        </div>

        <nav aria-label="Owner workspace" className={styles.navigation}>
          {navigation.map((section) => (
            <div className={styles.navigationSection} key={section.title}>
              <h2>{section.title}</h2>
              <div className={styles.navigationLinks}>
                {section.links.map((item) => {
                  const href = item.available && item.route ? `/org/${actor.organizationId}/${item.route}` : undefined;
                  const selected = item.route === "owner"
                    ? pathname === ownerPath
                    : item.route === "properties"
                      ? pathname?.startsWith(propertiesPath)
                      : Boolean(item.route && pathname?.startsWith(`/org/${actor.organizationId}/${item.route}`));
                  const className = [styles.navigationLink, selected ? styles.navigationLinkActive : ""].filter(Boolean).join(" ");
                  const content = <><WorkspaceIcon name={item.icon} /><span>{item.label}</span></>;
                  return href ? (
                    <Link aria-current={selected ? "page" : undefined} className={className} href={href} key={item.label}>{content}</Link>
                  ) : (
                    <span aria-disabled="true" className={`${className} ${styles.navigationLinkDisabled}`} key={item.label} title="This workspace is not available yet">{content}</span>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={styles.accountBlock}>
          <div className={styles.accountCard}>
            <span aria-hidden="true" className={styles.avatar}>{initials(actor.userName)}</span>
            <span className={styles.accountIdentity}>
              <strong>{actor.userName}</strong>
              <small>Portfolio Owner</small>
            </span>
            <span className={styles.accountRole}>Owner</span>
          </div>
          <SignOutButton className={styles.signOut} />
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.topbarOrganization}>
            <span className={styles.topbarOrganizationName}>{actor.organizationName}</span>
            <WorkspaceIcon name="chevron_right" />
            <Link className={styles.allProperties} href={propertiesPath}>
              <span>All Properties</span>
              <small>({actor.propertyCount})</small>
              <WorkspaceIcon name="arrow_drop_down" />
            </Link>
          </div>
          <div className={styles.currentPeriod}>
            <WorkspaceIcon name="calendar_month" />
            <span>{currentMonth(actor.organizationTimezone)} · MTD</span>
          </div>
          <form action={ownerPath} className={styles.searchForm} role="search">
            <WorkspaceIcon name="search" />
            <input aria-label="Search properties" defaultValue={searchParams.get("q") ?? ""} key={searchParams.get("q") ?? ""} name="q" placeholder="Search properties..." />
          </form>
          <div className={styles.topbarActions}>
            <span className={styles.connectedStatus}><i aria-hidden="true" />Portfolio records</span>
            <Link className={styles.addProperty} href={`/org/${actor.organizationId}/properties/new`}>
              <WorkspaceIcon name="add" />
              <span>New Property</span>
            </Link>
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
