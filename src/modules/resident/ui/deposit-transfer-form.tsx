"use client";

import { useState } from "react";
import type { DepositTransferAccountOption } from "@/modules/resident/domain/resident";
import { transferSecurityDepositAction } from "./actions";

function money(paise: bigint) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(paise) / 100);
}

function isOpenStay(account: DepositTransferAccountOption) {
  return account.stayStatus === "ACTIVE" || account.stayStatus === "NOTICE_PERIOD";
}

export function DepositTransferForm({ orgId, accounts }: Readonly<{
  orgId: string;
  accounts: readonly DepositTransferAccountOption[];
}>) {
  const eligibleAccounts = accounts.filter(isOpenStay);
  const sourceCandidates = eligibleAccounts.filter((source) => source.balancePaise > BigInt(0)
    && eligibleAccounts.some((destination) => destination.stayId !== source.stayId
      && destination.residentId === source.residentId
      && destination.requiredAmountPaise > destination.balancePaise));
  const [sourceStayId, setSourceStayId] = useState(sourceCandidates[0]?.stayId ?? "");
  const [destinationStayId, setDestinationStayId] = useState("");
  const source = sourceCandidates.find((account) => account.stayId === sourceStayId);
  const destinations = source
    ? eligibleAccounts.filter((destination) => destination.stayId !== source.stayId
      && destination.residentId === source.residentId
      && destination.requiredAmountPaise > destination.balancePaise)
    : [];

  if (!sourceCandidates.length) {
    return <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">A deposit can only move between open stays belonging to the same resident. No resident currently has both a source balance and another stay with deposit capacity.</div>;
  }

  return <form action={transferSecurityDepositAction} className="deposit-transfer-form mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
    <input name="orgId" type="hidden" value={orgId} />
    <label className="grid gap-1 text-sm font-medium">Resident’s stay<select className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" name="sourceStayId" onChange={(event) => { setSourceStayId(event.currentTarget.value); setDestinationStayId(""); }} required value={sourceStayId}>
      {sourceCandidates.map((account) => <option key={account.stayId} value={account.stayId}>{account.residentName} · {account.propertyName} · Room {account.roomNumber}, Bed {account.bedLabel} · Available {money(account.balancePaise)}</option>)}
    </select></label>
    <label className="grid gap-1 text-sm font-medium">Transfer to this resident’s stay<select className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm" name="destinationStayId" onChange={(event) => setDestinationStayId(event.currentTarget.value)} required value={destinationStayId}>
      <option disabled value="">Choose a destination stay</option>
      {destinations.map((account) => <option key={account.stayId} value={account.stayId}>{account.propertyName} · Room {account.roomNumber}, Bed {account.bedLabel} · Deposit remaining {money(account.requiredAmountPaise - account.balancePaise)}</option>)}
    </select></label>
    <p className="muted text-xs leading-5 sm:col-span-2">Security deposits can move between different stays for the same resident. They cannot be transferred to another person.</p>
    <label className="grid gap-1 text-sm font-medium">Amount (₹)<input className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm" inputMode="decimal" max="90000000" min="0.01" name="amount" placeholder="0.00" required step="0.01" type="number" /></label>
    <label className="grid gap-1 text-sm font-medium sm:col-span-2">Reason<textarea className="rounded-lg border border-slate-300 px-3 py-2 text-sm" maxLength={400} minLength={3} name="reason" placeholder="Explain why this deposit is being moved" required rows={3} /></label>
    <div className="sm:col-span-2"><button className="min-h-11 rounded-lg bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]" type="submit">Transfer deposit</button></div>
  </form>;
}
