"use client";

import Link from "next/link";
import { useState } from "react";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import styles from "./resident-portal-shell.module.css";

export function ResidentMobileNav({ orgId }: Readonly<{ orgId: string }>) {
  const [moreOpen, setMoreOpen] = useState(false);
  const base = `/org/${orgId}/resident`;

  return <nav aria-label="Resident dashboard" className={styles.mobileNav} onKeyDown={(event) => { if (event.key === "Escape") setMoreOpen(false); }}>
    {moreOpen ? <div className={styles.mobileMoreMenu} id="resident-more-links">
      <Link className={styles.mobileMoreLink} href={`${base}#notices-heading`} onClick={() => setMoreOpen(false)}><WorkspaceIcon name="campaign" /><span>Notices</span></Link>
      <Link className={styles.mobileMoreLink} href={`${base}#support-heading`} onClick={() => setMoreOpen(false)}><WorkspaceIcon name="support_agent" /><span>Support</span></Link>
      <Link className={styles.mobileMoreLink} href={`${base}#stay-heading`} onClick={() => setMoreOpen(false)}><WorkspaceIcon name="person" /><span>Stay profile</span></Link>
    </div> : null}
    <Link className={`${styles.mobileNavLink} ${styles.mobileNavLinkActive}`} href={`${base}#top`}><WorkspaceIcon name="domain" /><span>Home</span></Link>
    <Link className={styles.mobileNavLink} href={`${base}#invoices-heading`}><WorkspaceIcon name="receipt_long" /><span>Bills</span></Link>
    <Link className={styles.mobileNavLink} href={`${base}#food-heading`}><WorkspaceIcon name="restaurant" /><span>Food</span></Link>
    <button aria-controls="resident-more-links" aria-expanded={moreOpen} className={`${styles.mobileNavLink} ${moreOpen ? styles.mobileNavLinkActive : ""}`} onClick={() => setMoreOpen((open) => !open)} type="button"><WorkspaceIcon name="more_horiz" /><span>More</span></button>
  </nav>;
}
