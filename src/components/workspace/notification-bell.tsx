"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import styles from "./notification-bell.module.css";

type NotificationItem = Readonly<{
  publicId: string;
  title: string;
  message: string;
  actionUrl: string;
  readAt: string | null;
  createdAt: string;
}>;

export function NotificationBell({ organizationId, visibility = "all", mobileHeader = false }: Readonly<{ organizationId: string; visibility?: "all" | "mobile" | "desktop"; mobileHeader?: boolean }>) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const endpoint = `/api/v1/organizations/${organizationId}/notifications`;

  const load = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json() as { data?: NotificationItem[] };
      setItems(result.data ?? []);
      setLoaded(true);
    } catch {
      // Keep the shell usable if notifications cannot be reached.
    }
  }, [endpoint]);

  useEffect(() => {
    if (visibility === "all") {
      void load();
      return;
    }
    const viewport = window.matchMedia("(max-width: 1100px)");
    const sync = () => {
      if ((visibility === "mobile") === viewport.matches) void load();
    };
    sync();
    viewport.addEventListener("change", sync);
    return () => viewport.removeEventListener("change", sync);
  }, [load, visibility]);

  async function markRead(id: string) {
    setItems((current) => current.map((item) => item.publicId === id && !item.readAt
      ? { ...item, readAt: new Date().toISOString() }
      : item));
    try {
      await fetch(`${endpoint}/${id}/read`, { method: "POST" });
    } catch {
      void load();
    }
  }

  const unreadCount = items.filter((item) => !item.readAt).length;
  return (
    <div className={styles.container}>
      <button aria-expanded={open} aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"} className={styles.trigger} onClick={() => setOpen((value) => !value)} type="button">
        <WorkspaceIcon name="notifications" />
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && <section aria-label="Notifications" className={`${styles.panel} ${mobileHeader ? styles.mobileHeaderPanel : ""}`}>
        <header className={styles.panelHeader}>
          <strong>Notifications</strong>
          <button aria-label="Close notifications" className={styles.close} onClick={() => setOpen(false)} type="button">×</button>
        </header>
        {!loaded && <p className={styles.empty}>Loading notifications…</p>}
        {loaded && items.length === 0 && <p className={styles.empty}>You’re all caught up.</p>}
        {loaded && items.length > 0 && <ul className={styles.list}>
          {items.map((item) => <li className={item.readAt ? styles.readItem : styles.unreadItem} key={item.publicId}>
            <Link href={item.actionUrl} onClick={() => { setOpen(false); void markRead(item.publicId); }}>
              <span className={styles.itemTitle}>{item.title}</span>
              <span className={styles.message}>{item.message}</span>
              <time dateTime={item.createdAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</time>
            </Link>
          </li>)}
        </ul>}
      </section>}
    </div>
  );
}
