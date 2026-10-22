"use client";

import { useFormStatus } from "react-dom";

export function PublishNoticeButton({ className, disabled }: Readonly<{ className: string; disabled: boolean }>) {
  const { pending } = useFormStatus();

  return (
    <button aria-busy={pending} className={className} disabled={disabled || pending} type="submit">
      {pending ? <><span aria-hidden="true" className="report-submit-spinner" />Publishing...</> : "Publish notice"}
    </button>
  );
}
