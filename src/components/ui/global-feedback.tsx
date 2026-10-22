"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Toast = Readonly<{ id: number; message: string; tone: "success" | "error" }>;

const toastDurations = { success: 2_000, error: 2_000 } as const;
const flashQueryKeys = [
  "allocation-updated", "allocations-calculated", "archived", "bill-created", "bill-finalized", "billing-created", "billing-error", "billing-updated", "created", "demo-error", "demo-updated", "error",
  "complaint-created", "complaint-error", "food-availability", "food-availability-error", "food-error", "food-updated", "food-voted",
  "finalized", "meter-created", "meter-retired", "owner-error", "owner-invited", "paid", "payment-recorded", "payment-reversed", "payment-reviewed",
  "meal-types-saved", "menu-published", "menu-updated", "poll-closed", "poll-created",
  "profile", "profile-error", "property-error", "property-updated", "published", "reading-recorded", "saved", "settings-updated", "status-error", "status-updated",
  "submitted", "transferred", "updated", "verified",
];

export function GlobalFeedback() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextToastId = useRef(0);
  const lastRouteKey = useRef<string | null>(null);
  const busyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const finishActivity = useCallback(() => {
    if (busyTimer.current) clearTimeout(busyTimer.current);
    busyTimer.current = null;
    setBusy(false);
  }, []);

  const beginActivity = useCallback(() => {
    setBusy(true);
    if (busyTimer.current) clearTimeout(busyTimer.current);
    busyTimer.current = setTimeout(finishActivity, 15_000);
  }, [finishActivity]);

  const dismissToast = useCallback((id: number) => {
    const timer = toastTimers.current.get(id);
    if (timer) clearTimeout(timer);
    toastTimers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    if (lastRouteKey.current === null) {
      lastRouteKey.current = routeKey;
      return;
    }
    if (lastRouteKey.current !== routeKey) {
      lastRouteKey.current = routeKey;
      finishActivity();
    }
  }, [finishActivity, routeKey]);

  useEffect(() => {
    const showMessage = (message: string, tone: Toast["tone"]) => {
      const id = ++nextToastId.current;
      setToasts((current) => [...current.slice(-3), { id, message, tone }]);
      toastTimers.current.set(id, setTimeout(() => dismissToast(id), toastDurations[tone]));
    };

    const captureMessages = (root: ParentNode) => {
      const candidates: Element[] = [];
      if (root instanceof Element && root.matches('[role="status"], [role="alert"]')) candidates.push(root);
      candidates.push(...root.querySelectorAll('[role="status"], [role="alert"]'));
      let capturedAny = false;

      for (const element of candidates) {
        if (element.closest("[data-global-feedback-root]")) continue;
        const message = element.textContent?.replace(/\s+/g, " ").trim();
        if (!message || element.getAttribute("data-global-feedback-message") === message) continue;
        element.setAttribute("data-global-feedback-captured", "true");
        element.setAttribute("data-global-feedback-message", message);
        finishActivity();
        showMessage(message, element.getAttribute("role") === "alert" ? "error" : "success");
        capturedAny = true;
      }

      if (capturedAny) {
        const url = new URL(window.location.href);
        let changed = false;
        for (const key of flashQueryKeys) {
          if (url.searchParams.has(key)) {
            url.searchParams.delete(key);
            changed = true;
          }
        }
        if (changed) window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
      }
    };

    captureMessages(document.body);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element) captureMessages(node);
          else if (node.parentElement) captureMessages(node.parentElement);
        }
        if (record.type === "characterData" && record.target.parentElement) captureMessages(record.target.parentElement);
      }
    });
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download") || link.closest("[data-no-global-loader]")) return;
      const nextUrl = new URL(link.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;
      if (nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search && nextUrl.hash) return;
      if (nextUrl.pathname === window.location.pathname && nextUrl.search === window.location.search) return;
      beginActivity();
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.matches("[data-no-global-loader]") || form.target === "_blank" || !form.hasAttribute("action")) return;
      beginActivity();
    };
    const onPopState = () => beginActivity();

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("pagehide", finishActivity);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("pagehide", finishActivity);
      if (busyTimer.current) clearTimeout(busyTimer.current);
      for (const timer of toastTimers.current.values()) clearTimeout(timer);
      toastTimers.current.clear();
    };
  }, [beginActivity, dismissToast, finishActivity]);

  return (
    <div data-global-feedback-root>
      {busy ? <div aria-label="Loading" aria-valuemax={100} aria-valuemin={0} className="global-activity" role="progressbar"><span className="global-activity__spinner" aria-hidden="true" /><span>Working...</span></div> : null}
      <div aria-label="Notifications" className="global-toast-stack" data-global-feedback-root>
        {toasts.map((toast) => (
          <div className={`global-toast global-toast--${toast.tone}`} key={toast.id} role={toast.tone === "error" ? "alert" : "status"}>
            <span aria-hidden="true" className="global-toast__icon">
              {toast.tone === "error" ? (
                <svg fill="none" viewBox="0 0 24 24"><path d="M12 8v5m0 3h.01M10.3 3.86 2.7 17a2 2 0 0 0 1.73 3h15.14a2 2 0 0 0 1.73-3l-7.6-13.14a2 2 0 0 0-3.46 0Z" /></svg>
              ) : (
                <svg fill="none" viewBox="0 0 24 24"><path d="m4.5 12.5 5 5L19.5 7" /></svg>
              )}
            </span>
            <div className="global-toast__copy">
              <strong>{toast.tone === "error" ? "Action needs attention" : "Success"}</strong>
              <p>{toast.message}</p>
            </div>
            <button aria-label="Dismiss notification" className="global-toast__close" onClick={() => dismissToast(toast.id)} type="button">
              <svg aria-hidden="true" fill="none" viewBox="0 0 20 20"><path d="m5 5 10 10M15 5 5 15" /></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
