import Link from "next/link";

export default function PublicHomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 md:px-10">
      <header className="flex items-center justify-between">
        <Link className="text-lg font-bold tracking-tight text-[#176e61]" href="/">
          StayPilot
        </Link>
        <span className="text-sm text-[#63716e]">PG operations workspace</span>
      </header>

      <section className="grid flex-1 items-center gap-10 py-16 md:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#176e61]">
            Built for day-to-day PG operations
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            Keep every stay, space, and payment in view.
          </h1>
          <p className="muted mt-6 max-w-xl text-lg leading-8">
            StayPilot brings property operations and resident self-service into
            one tenant-aware workspace.
          </p>
        </div>

        <div className="surface-card p-7 md:p-9">
          <p className="text-sm font-semibold text-[#176e61]">Application scaffold</p>
          <h2 className="mt-3 text-2xl font-semibold">The workspace foundation is ready.</h2>
          <p className="muted mt-3 leading-7">
            Authentication, tenant data, and business workflows will be connected
            in their approved milestones.
          </p>
          <div className="mt-7 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-[#e9f2ef] px-3 py-1.5 text-[#10564c]">Next.js</span>
            <span className="rounded-full bg-[#e9f2ef] px-3 py-1.5 text-[#10564c]">Modules</span>
            <span className="rounded-full bg-[#e9f2ef] px-3 py-1.5 text-[#10564c]">MySQL</span>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#dce4e0] py-5 text-sm text-[#63716e]">
        StayPilot · Multi-tenant PG management
      </footer>
    </main>
  );
}
