"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type ImagePreviewProps = Readonly<{
  src: string;
  alt: string;
  caption: string;
  detail?: string;
  className?: string;
}>;

export function ImagePreview({ src, alt, caption, detail, className = "" }: ImagePreviewProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return <>
    <button aria-haspopup="dialog" className={`group flex w-full max-w-sm items-center gap-3 rounded-2xl border border-[#dbeafe] bg-white p-3 text-left shadow-sm transition hover:border-[#bfdbfe] hover:bg-[#fbfdfb] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 ${className}`} onClick={() => setOpen(true)} type="button">
      <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#eff6ff] to-[#dbeafe] text-[#2563eb]">
        <svg className="size-6" fill="none" viewBox="0 0 24 24"><path d="M3.75 6.75A2.25 2.25 0 0 1 6 4.5h12a2.25 2.25 0 0 1 2.25 2.25v10.5A2.25 2.25 0 0 1 18 19.5H6a2.25 2.25 0 0 1-2.25-2.25V6.75Z" stroke="currentColor" strokeWidth="1.5"/><circle cx="9" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="m4.5 16.5 4.25-4.25a1.77 1.77 0 0 1 2.5 0l1.25 1.25 1.25-1.25a1.77 1.77 0 0 1 2.5 0l3.25 3.25" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"/></svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#263b37]" title={caption}>{caption}</span>
        <span className="mt-1 block text-xs text-[#64748b]">{detail ?? "Image file"}</span>
      </span>
      <span className="shrink-0 rounded-lg bg-[#2563eb] px-3 py-2 text-xs font-semibold text-white transition group-hover:bg-[#1e40af]">Preview</span>
    </button>
    <dialog aria-label={`Image preview: ${caption}`} className="m-auto w-[min(96vw,64rem)] max-w-none overflow-hidden rounded-2xl border border-white/20 bg-transparent p-0 text-[#172b4d] shadow-2xl backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }} onClose={() => setOpen(false)} ref={dialogRef}>
      <div className="overflow-hidden rounded-2xl bg-white">
        <header className="flex items-center gap-4 border-b border-[#dce3ed] px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2563eb]">Image preview</p><h2 className="mt-0.5 truncate text-sm font-semibold sm:text-base" title={caption}>{caption}</h2>{detail ? <p className="mt-0.5 text-xs text-[#64748b]">{detail}</p> : null}</div>
          <button aria-label="Close image preview" autoFocus className="grid size-10 shrink-0 place-items-center rounded-full border border-[#dbeafe] bg-white text-[#53647e] transition hover:bg-[#eff6ff] hover:text-[#172b4d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]" onClick={() => setOpen(false)} type="button"><svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8"/></svg></button>
        </header>
        <div className="relative h-[min(72vh,52rem)] min-h-64 overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_#ffffff_0%,_#eff6ff_48%,_#eaf1fb_100%)]">
          <Image alt={alt} className="object-contain p-3 sm:p-6" fill sizes="(max-width: 1024px) 96vw, 1024px" src={src} unoptimized />
        </div>
      </div>
    </dialog>
  </>;
}
