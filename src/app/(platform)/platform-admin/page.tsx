import { platformAdminOverview } from "@/infrastructure/platform-admin/prisma-platform-admin-overview";
import styles from "./platform-admin.module.css";

function date(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(value);
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (first) => first.toUpperCase());
}

export default async function PlatformAdminHomePage() {
  const overview = await platformAdminOverview.getOverview();

  return <div className={styles.page}>
    <header className={styles.heading}>
      <div><p className={styles.eyebrow}>Platform operations</p><h1>Organization overview</h1><p>Monitor tenant setup and account activity across StayPilot.</p></div>
      <span className={styles.readOnly}><span />Read only</span>
    </header>

    <section aria-label="Platform totals" className={styles.metrics}>
      <article className={styles.metric}><span>Organizations</span><strong>{overview.organizationCount}</strong><small>All tenant workspaces</small></article>
      <article className={styles.metric}><span>Active</span><strong>{overview.activeOrganizationCount}</strong><small>Available organization workspaces</small></article>
      <article className={styles.metric}><span>Properties</span><strong>{overview.propertyCount}</strong><small>Non-archived properties</small></article>
      <article className={styles.metric}><span>Active memberships</span><strong>{overview.activeMembershipCount}</strong><small>Staff and resident accounts</small></article>
    </section>

    <section aria-labelledby="organizations-heading" className={styles.directory}>
      <header><div><p className={styles.eyebrow}>Tenant directory</p><h2 id="organizations-heading">Organizations</h2></div><span>{overview.organizationCount} total</span></header>
      {overview.organizations.length ? <div className={styles.tableWrap}><table><thead><tr><th scope="col">Organization</th><th scope="col">Status</th><th scope="col">Properties</th><th scope="col">Active memberships</th><th scope="col">Timezone</th><th scope="col">Created</th></tr></thead><tbody>{overview.organizations.map((organization) => <tr key={organization.publicId}><th scope="row"><span>{organization.name}</span><small>{organization.publicId}</small></th><td><span className={`${styles.status} ${organization.status === "ACTIVE" ? styles.statusActive : styles.statusOther}`}><span />{statusLabel(organization.status)}</span></td><td>{organization.propertyCount}</td><td>{organization.activeMembershipCount}</td><td>{organization.timezone}</td><td>{date(organization.createdAt)}</td></tr>)}</tbody></table></div> : <p className={styles.empty}>No organizations have been created yet.</p>}
      <p className={styles.note}>{overview.otherOrganizationCount} organization{overview.otherOrganizationCount === 1 ? "" : "s"} currently have a non-active status. Status changes and tenant access controls are not available in this read-only directory.</p>
    </section>
  </div>;
}
