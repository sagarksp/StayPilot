"use server";

import { redirect } from "next/navigation";
import { createDemoRequest } from "@/infrastructure/demo-requests/prisma-demo-requests";

export async function submitDemoRequest(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phoneCountryCode = String(formData.get("phoneCountryCode") ?? "").trim();
  const phoneNumber = String(formData.get("phoneNumber") ?? "").replace(/[()\s.-]/g, "");
  const address = String(formData.get("address") ?? "").trim();
  if (name.length < 2 || name.length > 180 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !/^\+[1-9]\d{0,3}$/.test(phoneCountryCode) || !/^\d{5,20}$/.test(phoneNumber) || address.length < 5 || address.length > 500) {
    redirect("/demo?error=invalid");
  }
  const created = await createDemoRequest({ name, email, phoneCountryCode, phoneNumber, address });
  if (!created) redirect("/demo?error=limit");
  redirect("/demo?submitted=yes");
}
