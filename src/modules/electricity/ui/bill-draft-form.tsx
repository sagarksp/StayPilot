"use client";

import { useMemo, useState } from "react";
import { createElectricityBillAction } from "./actions";

type MeterOption = Readonly<{
  publicId: string;
  meterNumber: string;
  scopeType: string;
}>;
type ReadingOption = Readonly<{
  id: string;
  meterId: string;
  meterNumber: string;
  readingValue: string;
  readingAt: string;
}>;

const field = "min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900";
const label = "grid gap-1 text-xs font-medium text-slate-600";
const button = "min-h-10 rounded-lg bg-[#176e61] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10564c]";
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));

export function ElectricityBillDraftForm({
  orgId,
  propertyId,
  propertyName,
  defaultMode,
  defaultUnitRate,
  meters,
  readings,
}: Readonly<{
  orgId: string;
  propertyId: string;
  propertyName: string;
  defaultMode: "ROOM_METER" | "FLOOR_METER" | "MANUAL";
  defaultUnitRate: string;
  meters: readonly MeterOption[];
  readings: readonly ReadingOption[];
}>) {
  const [mode, setMode] = useState<"MANUAL" | "ROOM_METER" | "FLOOR_METER">(defaultMode);
  const [meterId, setMeterId] = useState("");
  const [previousReadingId, setPreviousReadingId] = useState("");
  const [currentReadingId, setCurrentReadingId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const meterType = mode === "ROOM_METER" ? "ROOM" : mode === "FLOOR_METER" ? "FLOOR" : null;
  const compatibleMeters = useMemo(() => meterType ? meters.filter((meter) => meter.scopeType === meterType) : [], [meterType, meters]);
  const compatibleReadings = useMemo(() => readings.filter((reading) => reading.meterId === meterId), [meterId, readings]);
  const eligiblePreviousReadings = periodStart ? compatibleReadings.filter((reading) => reading.readingAt <= periodStart) : [];
  const previousReading = compatibleReadings.find((reading) => reading.id === previousReadingId);
  const eligibleCurrentReadings = previousReading && periodEnd
    ? compatibleReadings.filter((reading) => reading.readingAt >= periodEnd && reading.readingAt > previousReading.readingAt && Number(reading.readingValue) > Number(previousReading.readingValue))
    : [];

  function changeMode(nextMode: typeof mode) {
    setMode(nextMode);
    setMeterId("");
    setPreviousReadingId("");
    setCurrentReadingId("");
  }

  function changeMeter(nextMeterId: string) {
    setMeterId(nextMeterId);
    setPreviousReadingId("");
    setCurrentReadingId("");
  }

  function changePeriodStart(value: string) {
    setPeriodStart(value);
    setPreviousReadingId("");
    setCurrentReadingId("");
  }

  function changePeriodEnd(value: string) {
    setPeriodEnd(value);
    setPreviousReadingId("");
    setCurrentReadingId("");
  }

  return <form action={createElectricityBillAction} className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
    <input name="orgId" type="hidden" value={orgId}/>
    <input name="propertyId" type="hidden" value={propertyId}/>
    <label className={label}>Billing mode<select className={field} name="billingMode" onChange={(event) => changeMode(event.target.value as typeof mode)} value={mode}><option value="MANUAL">Manual total</option><option value="ROOM_METER">Room meter</option><option value="FLOOR_METER">Floor meter</option></select></label>
    <label className={label}>Period start<input className={field} max={periodEnd || undefined} name="periodStart" onChange={(event) => changePeriodStart(event.target.value)} required type="date" value={periodStart}/></label>
    <label className={label}>Period end<input className={field} min={periodStart || undefined} name="periodEnd" onChange={(event) => changePeriodEnd(event.target.value)} required type="date" value={periodEnd}/></label>
    {mode === "MANUAL" ? <label className={label}>Total amount (₹)<input className={field} inputMode="decimal" name="totalAmount" placeholder="0.00" required type="number" min="0.01" step="0.01"/></label> : <>
      <label className={label}>Meter<select className={field} name="meterId" onChange={(event) => changeMeter(event.target.value)} required value={meterId}><option value="">Choose a {meterType?.toLowerCase()} meter</option>{compatibleMeters.map((meter) => <option key={meter.publicId} value={meter.publicId}>{meter.meterNumber}</option>)}</select></label>
      <label className={label}>Previous reading<select className={field} name="previousReadingId" onChange={(event) => { setPreviousReadingId(event.target.value); setCurrentReadingId(""); }} required value={previousReadingId}><option value="">{periodStart ? "Choose a reading on or before start" : "Choose billing dates first"}</option>{eligiblePreviousReadings.map((reading) => <option key={reading.id} value={reading.id}>{reading.readingValue} · {dateLabel(reading.readingAt)}</option>)}</select></label>
      <label className={label}>Current reading<select className={field} name="currentReadingId" onChange={(event) => setCurrentReadingId(event.target.value)} required value={currentReadingId}><option value="">{periodEnd ? "Choose a later reading on or after end" : "Choose billing dates first"}</option>{eligibleCurrentReadings.map((reading) => <option key={reading.id} value={reading.id}>{reading.readingValue} · {dateLabel(reading.readingAt)}</option>)}</select></label>
      <label className={label}>Rate per unit (₹)<input className={field} defaultValue={defaultUnitRate} inputMode="decimal" name="unitRate" placeholder="Set a rate in property electricity settings" required type="number" min="0.01" step="0.01"/></label>
    </>}
    <button className={`${button} sm:col-span-2 lg:col-span-4`} type="submit">Create draft bill for {propertyName}</button>
  </form>;
}
