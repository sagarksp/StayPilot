"use client";

import { useState } from "react";
import { createFoodMenuAction, updateFoodMenuAction } from "./actions";

type MealType = { publicId: string; name: string };
type Menu = {
  publicId: string;
  title: string | null;
  validFrom: Date;
  validTo: Date;
  items: { menuDate: Date; dishName: string; description: string | null; mealType: { name: string } }[];
};
type Dish = { date: string; mealTypeId: string; dishName: string; description: string };

const input = "min-h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900";
const label = "grid min-w-0 gap-1 text-xs font-medium text-slate-600";
const dateValue = (date: Date) => date.toISOString().slice(0, 10);

export function FoodMenuForm({
  orgId,
  propertyId,
  mealTypes,
  initialFrom,
  initialTo,
  menu,
}: Readonly<{
  orgId: string;
  propertyId: string;
  mealTypes: MealType[];
  initialFrom: string;
  initialTo: string;
  menu?: Menu;
}>) {
  const [dishes, setDishes] = useState<Dish[]>(() => menu
    ? menu.items.map((item) => ({
      date: dateValue(item.menuDate),
      mealTypeId: mealTypes.find((type) => type.name === item.mealType.name)?.publicId ?? "",
      dishName: item.dishName,
      description: item.description ?? "",
    }))
    : [{ date: initialFrom, mealTypeId: mealTypes[0]?.publicId ?? "", dishName: "", description: "" }]);

  const updateDish = (index: number, changes: Partial<Dish>) => setDishes((current) => current.map((dish, row) => row === index ? { ...dish, ...changes } : dish));
  const addDish = () => setDishes((current) => [...current, { date: initialFrom, mealTypeId: mealTypes[0]?.publicId ?? "", dishName: "", description: "" }]);

  return <form action={menu ? updateFoodMenuAction : createFoodMenuAction} className="grid min-w-0 gap-4 rounded-lg border border-slate-200 p-4">
    <input name="orgId" type="hidden" value={orgId}/>
    <input name="propertyId" type="hidden" value={propertyId}/>
    {menu ? <input name="menuId" type="hidden" value={menu.publicId}/> : null}
    <input name="itemsJson" type="hidden" value={JSON.stringify(dishes)}/>

    <div className="grid min-w-0 gap-3 sm:grid-cols-3">
      <label className={label}>Menu name <span className="font-normal">(optional)</span><input className={input} defaultValue={menu?.title ?? ""} maxLength={160} name="title" placeholder="This week’s menu"/></label>
      <label className={label}>First day<input className={input} defaultValue={menu ? dateValue(menu.validFrom) : initialFrom} name="validFrom" required type="date"/></label>
      <label className={label}>Last day<input className={input} defaultValue={menu ? dateValue(menu.validTo) : initialTo} name="validTo" required type="date"/></label>
    </div>

    <div className="grid gap-3">
      <div><h4 className="text-sm font-semibold">Dishes</h4><p className="muted mt-1 text-xs">Add each dish for the day and meal when it will be served.</p></div>
      {dishes.map((dish, index) => <fieldset className="grid min-w-0 gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.5fr_1.5fr_auto]" key={index}>
        <legend className="sr-only">Dish {index + 1}</legend>
        <label className={label}>Day<input className={input} onChange={(event) => updateDish(index, { date: event.target.value })} required type="date" value={dish.date}/></label>
        <label className={label}>Meal<select className={input} onChange={(event) => updateDish(index, { mealTypeId: event.target.value })} required value={dish.mealTypeId}><option value="">Choose meal</option>{mealTypes.map((type) => <option key={type.publicId} value={type.publicId}>{type.name}</option>)}</select></label>
        <label className={label}>Dish<input className={input} maxLength={255} onChange={(event) => updateDish(index, { dishName: event.target.value })} placeholder="Vegetable pulao" required value={dish.dishName}/></label>
        <label className={label}>Details <span className="font-normal">(optional)</span><input className={input} maxLength={500} onChange={(event) => updateDish(index, { description: event.target.value })} placeholder="Served with raita" value={dish.description}/></label>
        <button aria-label={`Remove dish ${index + 1}`} className="min-h-10 self-end rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-50" disabled={dishes.length === 1} onClick={() => setDishes((current) => current.filter((_, row) => row !== index))} type="button">Remove</button>
      </fieldset>)}
      <button className="min-h-10 justify-self-start rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={addDish} type="button">+ Add another dish</button>
    </div>

    <p className="muted text-xs">Residents can view the published menu. Create a separate poll below when you need residents to confirm whether they will eat.</p>
    <button className="min-h-10 w-full rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50" disabled={!mealTypes.length} type="submit">{menu ? "Save menu changes" : "Publish menu"}</button>
  </form>;
}
