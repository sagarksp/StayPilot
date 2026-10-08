"use client";

import type { ReactNode } from "react";
import { WorkspaceIcon } from "@/components/ui/workspace-icon";

export function PrintSummaryButton({
  children,
  className,
}: Readonly<{ children?: ReactNode; className: string }>) {
  return (
    <button className={className} onClick={() => window.print()} type="button">
      {children ?? <><WorkspaceIcon name="download" /><span>Executive Summary</span></>}
    </button>
  );
}
