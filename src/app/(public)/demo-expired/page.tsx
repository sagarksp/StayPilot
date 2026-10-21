import Link from "next/link";

export default function DemoExpiredPage() {
  return <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
    <section className="surface-card w-full p-8 text-center">
      <p className="text-sm font-semibold text-[#2563eb]">StayPilot demo</p>
      <h1 className="mt-4 text-3xl font-semibold">Your demo period has ended</h1>
      <p className="muted mt-3 leading-7">Your demo workspace is no longer available. Contact the StayPilot team if you need more time or would like to discuss a subscription.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3"><Link className="rounded-lg bg-[#1e3a8a] px-4 py-2.5 font-semibold text-white" href="/demo">Request another demo</Link><Link className="rounded-lg border border-[#dfe5f0] px-4 py-2.5 font-semibold" href="/">Return home</Link></div>
    </section>
  </main>;
}
