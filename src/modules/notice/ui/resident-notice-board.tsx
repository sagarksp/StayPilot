type Notice = Readonly<{
  publicId: string;
  title: string;
  body: string;
  publishedAt: Date;
  expiresOn: Date | null;
  property: Readonly<{ name: string }> | null;
}>;

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export function ResidentNoticeBoard({ notices }: Readonly<{ notices: readonly Notice[] }>) {
  return <section aria-labelledby="notices-heading" className="surface-card space-y-4 p-5 sm:p-6" id="notices-heading">
    <header>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#2563eb]">Updates</p>
      <h2 className="mt-1 text-xl font-semibold">Notices</h2>
      <p className="muted mt-1 text-sm">Important updates from your property team.</p>
    </header>
    {notices.length ? <div className="grid gap-3">{notices.map((notice) => <article className="rounded-lg border border-slate-200 p-4" key={notice.publicId}>
      <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-semibold">{notice.title}</h3><time className="muted text-xs" dateTime={notice.publishedAt.toISOString()}>{dateLabel(notice.publishedAt)}</time></div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{notice.body}</p>
      <p className="muted mt-3 text-xs">{notice.property?.name ?? "All properties"}{notice.expiresOn ? ` · Until ${dateLabel(notice.expiresOn)}` : " · No expiry"}</p>
    </article>)}</div> : <p className="muted rounded-lg bg-slate-50 p-4 text-sm">There are no current notices.</p>}
  </section>;
}
