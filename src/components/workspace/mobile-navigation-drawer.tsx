"use client";

import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import styles from "./mobile-navigation-drawer.module.css";

export function MobileNavigationDrawer({ title, children, leadingActions }: Readonly<{ title: string; children: ReactNode; leadingActions?: ReactNode }>) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable.item(0);
      const last = focusable.item(focusable.length - 1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);

  function closeAfterNavigation(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("a")) setOpen(false);
  }

  return (
    <>
      <div className={styles.controls}>
        {leadingActions ? <div className={styles.leadingActions}>{leadingActions}</div> : null}
        <button
          aria-controls={open ? id : undefined}
          aria-expanded={open}
          aria-label={`Open ${title} menu`}
          className={styles.trigger}
          onClick={() => setOpen(true)}
          ref={triggerRef}
          type="button"
        >
          <WorkspaceIcon name="menu" />
        </button>
      </div>
      {open ? (
        <div className={styles.backdrop} onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <nav aria-label={title} aria-modal="true" className={styles.drawer} id={id} ref={drawerRef} role="dialog">
            <div className={styles.header}>
              <strong>{title}</strong>
              <button aria-label={`Close ${title} menu`} className={styles.close} onClick={() => setOpen(false)} ref={closeRef} type="button">
                <WorkspaceIcon name="close" />
              </button>
            </div>
            <div className={styles.content} onClick={closeAfterNavigation}>{children}</div>
          </nav>
        </div>
      ) : null}
    </>
  );
}
