import type { Metadata } from "next";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { GlobalFeedback } from "@/components/ui/global-feedback";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "StayPilot",
    template: "%s | StayPilot",
  },
  description: "A workspace for managing PG operations and resident stays.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link crossOrigin="anonymous" href="https://fonts.gstatic.com" rel="preconnect" />
      </head>
      <body>
        <Suspense fallback={null}><GlobalFeedback /></Suspense>
        {children}
      </body>
    </html>
  );
}
