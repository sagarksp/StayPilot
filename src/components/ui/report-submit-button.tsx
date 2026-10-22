"use client";

import { useEffect, useRef, useState } from "react";

export function ReportSubmitButton({
  className,
  label,
  loadingLabel,
}: Readonly<{ className: string; label: string; loadingLabel: string }>) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const form = buttonRef.current?.form;
    if (!form) return;
    const handleSubmit = () => setPending(true);
    form.addEventListener("submit", handleSubmit);
    return () => form.removeEventListener("submit", handleSubmit);
  }, []);

  return (
    <button aria-busy={pending} className={className} disabled={pending} ref={buttonRef} type="submit">
      {pending ? <><span aria-hidden="true" className="report-submit-spinner" />{loadingLabel}</> : label}
    </button>
  );
}
