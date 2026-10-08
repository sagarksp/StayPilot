export default function ResidentHomePage() {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#176e61]">Resident portal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome to StayPilot</h1>
        <p className="muted mt-2 max-w-2xl leading-6">Your organization is preparing resident services. When they are enabled, your stay details, bills, receipts, and requests will appear here.</p>
      </header>
      <section className="surface-card border-l-4 border-l-[#176e61] p-5 sm:p-6" aria-labelledby="portal-status-heading">
        <p className="text-sm font-semibold text-[#176e61]">PORTAL SETUP</p>
        <h2 className="mt-2 text-xl font-semibold" id="portal-status-heading">Your account is connected</h2>
        <p className="muted mt-2 max-w-2xl text-sm leading-6">For an immediate question about your stay or payment, contact your property manager directly. This portal will show your organization’s updates as those services become available.</p>
      </section>
    </section>
  );
}
