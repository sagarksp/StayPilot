import type { ReactNode } from "react";

const shapes: Record<string, ReactNode> = {
  apartment: <><path d="M4 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17" /><path d="M2 21h20M8 7h1m3 0h1M8 11h1m3 0h1M8 15h1m3 0h1m4-5h2v11h-2" /></>,
  domain: <><path d="M3 21h18M5 21V5l7-3 7 3v16M9 8h1m4 0h1M9 12h1m4 0h1M10 21v-5h4v5" /></>,
  grid_view: <><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></>,
  meeting_room: <><path d="M4 21V4a1 1 0 0 1 1-1h11v18M2 21h20M16 8h4v13M12 12h.01" /></>,
  door_open: <><path d="M4 21V4a1 1 0 0 1 1-1h11v18M2 21h20M12 12h.01" /></>,
  groups: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1" /></>,
  event_available: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18m-13 5 2 2 4-4" /></>,
  calendar_today: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" /></>,
  calendar_month: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M8 14h2m4 0h2m-8 3h2m4 0h2" /></>,
  receipt_long: <><path d="M5 3h14v18l-3-2-3 2-3-2-3 2-2-2V3Z" /><path d="M8 8h8M8 12h8M8 16h4" /></>,
  account_balance_wallet: <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v16H6a3 3 0 0 1-3-3V7a.5.5 0 0 1 1-.5Z" /><path d="M3 8h17m-5 5h5m-4 0h.01" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 5v2" /></>,
  verified_user: <><path d="m12 22 1.5-.7A12 12 0 0 0 20 10V5l-8-3-8 3v5a12 12 0 0 0 6.5 11.3L12 22Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
  bolt: <path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z" />,
  report_problem: <><path d="M10.3 4.3 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></>,
  campaign: <><path d="M3 11v2a2 2 0 0 0 2 2h2l10 5V4L7 9H5a2 2 0 0 0-2 2Zm4 4 2 6h4l-2-4" /><path d="m20 9 2-2m-2 10 2 2" /></>,
  insights: <><path d="M3 3v18h18M7 14l4-4 3 3 6-7" /><path d="M17 6h3v3" /></>,
  manage_accounts: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1m4-12 1 .6v2.8l-1 .6-1.5-.8-1.5.8-1-.6V8.6l1-.6 1.5.8L19 8Z" /></>,
  tune: <><path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M2 14h4m4-6h4m4 8h4" /></>,
  chevron_right: <path d="m9 18 6-6-6-6" />,
  arrow_drop_down: <path d="m7 10 5 5 5-5" />,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
  add: <path d="M12 5v14m-7-7h14" />,
  add_circle: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8m-4-4h8" /></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4" /></>,
  account_balance: <><path d="m3 9 9-6 9 6M4 10h16M5 10v9m4-9v9m6-9v9m4-9v9M3 21h18" /></>,
  request_quote: <><path d="M5 3h14v18l-3-2-3 2-3-2-3 2-2-2V3Z" /><path d="M9 9h6m-6 4h6m-6 4h3" /></>,
  payments: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20m-10 2v4m-2-2h4" /></>,
  pending_actions: <><circle cx="11" cy="12" r="8" /><path d="M11 8v4l3 2m5-9 2-2M18 3h3v3" /></>,
  bar_chart: <><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" /><rect x="13" y="8" width="3" height="10" /><rect x="19" y="5" width="2" height="13" /></>,
  history: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8m0-5v5h5m4-1v5l3 2" /></>,
  add_home_work: <><path d="M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-7M7 21v-8h7v8M2 21h13m-8-12h.01" /><path d="M18 14v6m-3-3h6" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  print: <><path d="M7 8V3h10v5m0 9h3v-8H4v8h3m0-3h10v7H7v-7Z" /><path d="M17 11h.01" /></>,
  table_rows: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 4v16" /></>,
  location_on: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  person: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
};

export function WorkspaceIcon({
  name,
  className,
}: Readonly<{ name: string; className?: string }>) {
  return (
    <svg
      aria-hidden="true"
      className={className ?? "material-symbols-outlined"}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {shapes[name] ?? <><circle cx="12" cy="12" r="8" /><path d="M12 8v8m-4-4h8" /></>}
    </svg>
  );
}
