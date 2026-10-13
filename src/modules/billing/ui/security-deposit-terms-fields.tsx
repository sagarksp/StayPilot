const inputClass = "min-h-10 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 outline-none focus:border-[#176e61] focus:ring-2 focus:ring-[#176e61]/15";

export function SecurityDepositTermsFields() {
  return <>
    <label className="block space-y-2 text-sm font-medium" htmlFor="requiredSecurityDeposit"><span>Required security deposit (₹)</span><input className={inputClass} id="requiredSecurityDeposit" name="requiredSecurityDeposit" inputMode="decimal" placeholder="0.00" required /></label>
    <label className="block space-y-2 text-sm font-medium" htmlFor="depositPolicyType"><span>Deposit policy</span><select className={inputClass} id="depositPolicyType" name="depositPolicyType" defaultValue="FIXED" required><option value="FULL_MONTH">Full month’s rent</option><option value="HALF_MONTH">Half month’s rent</option><option value="FIXED">Fixed amount</option><option value="CUSTOM">Custom amount</option></select></label>
  </>;
}
