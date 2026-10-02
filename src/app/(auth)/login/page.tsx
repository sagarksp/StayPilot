export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
      <section className="surface-card w-full p-8 md:p-10">
        <p className="text-sm font-semibold text-[#176e61]">StayPilot</p>
        <h1 className="mt-4 text-3xl font-semibold">Sign in</h1>
        <p className="muted mt-3 leading-7">
          Authentication will be connected after the session library and global
          identity mapping are selected.
        </p>
        <div className="mt-7 rounded-xl border border-dashed border-[#b9cbc5] bg-[#f7faf8] p-4 text-sm text-[#63716e]">
          Sign-in form placeholder
        </div>
      </section>
    </main>
  );
}
