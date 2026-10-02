export default function PropertiesPage() {
  return (
    <section className="space-y-3">
      <p className="text-sm font-semibold text-[#176e61]">Shared staff resource</p>
      <h1 className="text-3xl font-semibold tracking-tight">Properties</h1>
      <p className="muted max-w-2xl leading-7">
        Owner and Manager use the same property pages. Property scope and
        available actions will be determined by server-side authorization.
      </p>
    </section>
  );
}
