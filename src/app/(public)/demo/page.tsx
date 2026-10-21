import Link from "next/link";
import { submitDemoRequest } from "./actions";

const callingCodes = [
  ["Afghanistan", "+93"], ["Albania", "+355"], ["Algeria", "+213"], ["American Samoa", "+1"], ["Andorra", "+376"], ["Angola", "+244"], ["Anguilla", "+1"], ["Antigua and Barbuda", "+1"], ["Argentina", "+54"], ["Aruba", "+297"], ["Armenia", "+374"], ["Australia", "+61"], ["Austria", "+43"], ["Azerbaijan", "+994"],
  ["Bahamas", "+1"], ["Barbados", "+1"], ["Belarus", "+375"], ["Belize", "+501"], ["Benin", "+229"], ["Bermuda", "+1"], ["Burkina Faso", "+226"], ["Burundi", "+257"],
  ["Bahrain", "+973"], ["Bangladesh", "+880"], ["Belgium", "+32"], ["Bhutan", "+975"], ["Bolivia", "+591"], ["Bosnia and Herzegovina", "+387"], ["Botswana", "+267"], ["Brazil", "+55"], ["Brunei", "+673"], ["Bulgaria", "+359"],
  ["Cambodia", "+855"], ["Cameroon", "+237"], ["Canada", "+1"], ["Cape Verde", "+238"], ["Central African Republic", "+236"], ["Chad", "+235"], ["Chile", "+56"], ["China", "+86"], ["Colombia", "+57"], ["Comoros", "+269"], ["Congo", "+242"], ["Congo (DRC)", "+243"], ["Cuba", "+53"], ["Curaçao", "+599"], ["Côte d’Ivoire", "+225"], ["Costa Rica", "+506"], ["Croatia", "+385"], ["Cyprus", "+357"], ["Czechia", "+420"],
  ["Djibouti", "+253"], ["Dominica", "+1"], ["El Salvador", "+503"], ["Equatorial Guinea", "+240"], ["Eritrea", "+291"], ["Eswatini", "+268"],
  ["Denmark", "+45"], ["Dominican Republic", "+1"], ["Ecuador", "+593"], ["Egypt", "+20"], ["Estonia", "+372"], ["Ethiopia", "+251"], ["Finland", "+358"], ["France", "+33"], ["Georgia", "+995"], ["Germany", "+49"],
  ["Gabon", "+241"], ["Gambia", "+220"], ["Guinea", "+224"], ["Guinea-Bissau", "+245"], ["Guyana", "+592"], ["Haiti", "+509"], ["Honduras", "+504"], ["Hong Kong", "+852"], ["Hungary", "+36"], ["Iceland", "+354"], ["India", "+91"], ["Indonesia", "+62"], ["Iran", "+98"], ["Iraq", "+964"], ["Ireland", "+353"], ["Israel", "+972"], ["Italy", "+39"], ["Jamaica", "+1"], ["Japan", "+81"], ["Jordan", "+962"],
  ["Kazakhstan", "+7"], ["Kenya", "+254"], ["Kiribati", "+686"], ["Kuwait", "+965"], ["Kyrgyzstan", "+996"], ["Laos", "+856"], ["Latvia", "+371"], ["Lesotho", "+266"], ["Liberia", "+231"], ["Libya", "+218"], ["Liechtenstein", "+423"], ["Lithuania", "+370"], ["Luxembourg", "+352"], ["Macau", "+853"], ["Madagascar", "+261"], ["Malawi", "+265"], ["Malaysia", "+60"], ["Mali", "+223"], ["Maldives", "+960"], ["Malta", "+356"], ["Marshall Islands", "+692"], ["Mauritania", "+222"], ["Mauritius", "+230"], ["Mexico", "+52"], ["Micronesia", "+691"], ["Moldova", "+373"], ["Monaco", "+377"], ["Montenegro", "+382"], ["Montserrat", "+1"], ["Mozambique", "+258"], ["Myanmar", "+95"], ["Namibia", "+264"], ["Nauru", "+674"], ["Nepal", "+977"], ["Netherlands", "+31"], ["Nicaragua", "+505"], ["Niger", "+227"], ["North Korea", "+850"],
  ["New Zealand", "+64"], ["Nigeria", "+234"], ["Norway", "+47"], ["Oman", "+968"], ["Pakistan", "+92"], ["Palau", "+680"], ["Palestine", "+970"], ["Panama", "+507"], ["Papua New Guinea", "+675"], ["Paraguay", "+595"], ["Peru", "+51"], ["Philippines", "+63"], ["Poland", "+48"], ["Portugal", "+351"], ["Puerto Rico", "+1"], ["Qatar", "+974"], ["Romania", "+40"], ["Russia", "+7"], ["Rwanda", "+250"], ["Samoa", "+685"], ["San Marino", "+378"], ["São Tomé and Príncipe", "+239"], ["Saudi Arabia", "+966"], ["Senegal", "+221"], ["Serbia", "+381"], ["Seychelles", "+248"], ["Sierra Leone", "+232"], ["Singapore", "+65"], ["Slovakia", "+421"], ["Slovenia", "+386"], ["Solomon Islands", "+677"], ["Somalia", "+252"], ["South Africa", "+27"], ["South Korea", "+82"], ["South Sudan", "+211"], ["Spain", "+34"], ["Sri Lanka", "+94"], ["St Kitts and Nevis", "+1"], ["St Lucia", "+1"], ["St Vincent and the Grenadines", "+1"], ["Sudan", "+249"], ["Suriname", "+597"], ["Sweden", "+46"], ["Switzerland", "+41"], ["Syria", "+963"], ["Taiwan", "+886"], ["Tajikistan", "+992"], ["Tanzania", "+255"], ["Thailand", "+66"], ["Timor-Leste", "+670"], ["Togo", "+228"], ["Tonga", "+676"], ["Trinidad and Tobago", "+1"], ["Tunisia", "+216"], ["Turkey", "+90"], ["Turkmenistan", "+993"], ["Tuvalu", "+688"], ["Uganda", "+256"], ["Ukraine", "+380"], ["United Arab Emirates", "+971"], ["United Kingdom", "+44"], ["United States", "+1"], ["Uruguay", "+598"], ["Uzbekistan", "+998"], ["Vanuatu", "+678"], ["Venezuela", "+58"], ["Vietnam", "+84"], ["Yemen", "+967"], ["Zambia", "+260"], ["Zimbabwe", "+263"],
] as const;

type DemoPageProps = Readonly<{ searchParams: Promise<{ submitted?: string; error?: string }> }>;

export default async function DemoRequestPage({ searchParams }: DemoPageProps) {
  const query = await searchParams;
  return (
    <main className="min-h-screen bg-[#f5f7fb] px-5 py-12 text-[#172333]">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <section className="max-w-xl">
          <Link className="text-sm font-semibold text-[#1e3a8a]" href="/">← StayPilot</Link>
          <p className="mt-12 text-sm font-semibold uppercase tracking-[0.18em] text-[#b27b26]">Guided product demo</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">See how StayPilot can simplify your PG operations.</h1>
          <p className="mt-5 text-lg leading-8 text-[#637081]">Share your contact details and our developer will review your request. If approved, you’ll receive a secure setup link for a time-limited demo workspace.</p>
          <div className="mt-8 grid gap-3 text-sm text-[#445268] sm:grid-cols-2">
            <p className="rounded-xl border border-[#dfe5f0] bg-white p-4">Property, room, and bed inventory</p>
            <p className="rounded-xl border border-[#dfe5f0] bg-white p-4">Resident, billing, and payment workflows</p>
            <p className="rounded-xl border border-[#dfe5f0] bg-white p-4">Food voting and resident availability</p>
            <p className="rounded-xl border border-[#dfe5f0] bg-white p-4">Complaints, notices, and team operations</p>
          </div>
          <p className="mt-6 text-xs leading-5 text-[#718096]">The demo period begins after you verify your email and finish workspace setup. Do not submit sensitive personal or financial information.</p>
        </section>

        <section className="surface-card rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm sm:p-8" aria-labelledby="request-title">
          <h2 className="text-2xl font-semibold" id="request-title">Request demo access</h2>
          <p className="mt-2 text-sm text-[#637081]">We’ll use these details to follow up about your request.</p>
          {query.submitted === "yes" ? <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">Your request has been sent to the StayPilot developer. If approved, setup instructions will be emailed to you.</div> : null}
          {query.error === "invalid" ? <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">Please check each field and try again.</div> : null}
          {query.error === "limit" ? <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">We already received several requests from this email today. Please try again tomorrow.</div> : null}
          <form action={submitDemoRequest} className="mt-6 grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">Full name<input autoComplete="name" className="rounded-lg border border-[#cbd5e1] px-3 py-2.5 font-normal outline-none focus:border-[#1e3a8a]" maxLength={180} minLength={2} name="name" required /></label>
            <label className="grid gap-1.5 text-sm font-medium">Gmail or other email<input autoComplete="email" className="rounded-lg border border-[#cbd5e1] px-3 py-2.5 font-normal outline-none focus:border-[#1e3a8a]" maxLength={254} name="email" required type="email" /></label>
            <fieldset className="grid gap-1.5">
              <legend className="mb-1.5 text-sm font-medium">Phone number</legend>
              <div className="grid grid-cols-[minmax(145px,0.8fr)_1fr] gap-2">
                <select aria-label="Country calling code" className="min-w-0 rounded-lg border border-[#cbd5e1] bg-white px-2 py-2.5 text-sm outline-none focus:border-[#1e3a8a]" defaultValue="+91" name="phoneCountryCode" required>
                  {callingCodes.map(([country, code], index) => <option key={`${country}-${code}-${index}`} value={code}>{country} ({code})</option>)}
                </select>
                <input autoComplete="tel-national" className="min-w-0 rounded-lg border border-[#cbd5e1] px-3 py-2.5 text-sm outline-none focus:border-[#1e3a8a]" inputMode="tel" maxLength={24} name="phoneNumber" placeholder="Phone number" required />
              </div>
            </fieldset>
            <label className="grid gap-1.5 text-sm font-medium">City and business address<textarea autoComplete="street-address" className="min-h-24 resize-y rounded-lg border border-[#cbd5e1] px-3 py-2.5 font-normal outline-none focus:border-[#1e3a8a]" maxLength={500} minLength={5} name="address" required /></label>
            <button className="mt-1 rounded-lg bg-[#1e3a8a] px-4 py-3 font-semibold text-white transition hover:bg-[#172554]" type="submit">Send demo request</button>
          </form>
          <p className="mt-5 text-center text-sm text-[#637081]">Already have an account? <Link className="font-semibold text-[#1e3a8a] hover:underline" href="/login">Sign in</Link></p>
        </section>
      </div>
    </main>
  );
}
