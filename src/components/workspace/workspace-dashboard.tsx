export function WorkspaceDashboard({
  description,
  eyebrow,
  title,
}: Readonly<{
  description: string;
  eyebrow: string;
  title: string;
}>) {
  return (
    <section className="space-y-3">
      <p className="text-sm font-semibold text-[#176e61]">{eyebrow}</p>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="muted max-w-2xl leading-7">{description}</p>
      <div className="surface-card mt-8 p-6 text-sm text-[#63716e]">
        Dashboard data will be loaded through tenant-scoped reporting queries.
      </div>
    </section>
  );
}
