"use client";

import { useEffect, useState } from "react";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";
import styles from "./header-tools.module.css";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function HeaderTools() {
  const [now, setNow] = useState<Date | null>(null);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    let savedTheme: string | null = null;
    try {
      savedTheme = window.localStorage.getItem("staypilot-theme");
    } catch {
      // The toggle still works for this session when browser storage is unavailable.
    }
    const initialTheme: Theme = savedTheme === "dark" ? "dark" : "light";
    setTheme(initialTheme);
    applyTheme(initialTheme);
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    try {
      window.localStorage.setItem("staypilot-theme", nextTheme);
    } catch {
      // Keep the selected theme active for this session.
    }
  }

  const date = now ? new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(now) : "Loading date";
  const time = now ? new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(now) : "--:--:--";

  return <div className={styles.tools}>
    <button aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} className={styles.themeButton} onClick={toggleTheme} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} type="button">
      <WorkspaceIcon name={theme === "dark" ? "light_mode" : "dark_mode"} />
    </button>
    <div aria-label={now ? `Current date and time: ${date}, ${time}` : "Current date and time"} className={styles.clock}>
      <span className={styles.clockDate}>{date}</span>
      <time className={styles.clockTime} dateTime={now?.toISOString()}>{time}</time>
    </div>
  </div>;
}
