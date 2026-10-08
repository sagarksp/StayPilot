const fieldClass = "min-h-11 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 outline-none focus:border-[#176e61] focus:ring-2 focus:ring-[#176e61]/15";

export function RentTermsFields() {
  return <>
    <label className="block space-y-2 text-sm font-medium">
      <span>Monthly rent (₹)</span>
      <input className={fieldClass} inputMode="decimal" min="0.01" name="monthlyRent" placeholder="12000.00" required step="0.01" type="number" />
    </label>
    <label className="block space-y-2 text-sm font-medium">
      <span>Billing cycle</span>
      <select className={fieldClass} defaultValue="MOVE_IN_DAY" name="billingCycleType">
        <option value="MOVE_IN_DAY">Move-in day each month</option>
        <option value="FIXED_DAY">Fixed day each month</option>
      </select>
    </label>
    <label className="block space-y-2 text-sm font-medium">
      <span>Fixed billing day <span className="font-normal text-slate-500">(only for fixed day)</span></span>
      <select className={fieldClass} defaultValue="" name="billingDay">
        <option value="">Select a day</option>
        {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day}</option>)}
      </select>
    </label>
  </>;
}
