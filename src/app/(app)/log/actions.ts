"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  createFoodEntry,
  deleteFoodEntry,
  updateFoodEntry,
  type NewFoodEntryInput,
} from "@/lib/data/entries";
import type { LogSource, MealType } from "@/lib/supabase/types";

export type LogActionState = { error: string | null; ok?: boolean };

function parseEntryForm(formData: FormData): NewFoodEntryInput {
  return {
    name: String(formData.get("name") ?? "").trim(),
    quantity: Number(formData.get("quantity") ?? 1) || 1,
    unit: (formData.get("unit") as string) || null,
    calories: Math.round(Number(formData.get("calories") ?? 0)),
    proteinG: Number(formData.get("proteinG") ?? 0),
    carbsG: Number(formData.get("carbsG") ?? 0),
    fatG: Number(formData.get("fatG") ?? 0),
    mealType: (formData.get("mealType") as MealType) || "snack",
    source: (formData.get("source") as LogSource) || "manual",
    barcode: (formData.get("barcode") as string) || null,
  };
}

export async function logFoodAction(
  _prevState: LogActionState,
  formData: FormData,
): Promise<LogActionState> {
  // Independent approval check (spec 3.2) — this Server Action is reachable
  // directly, not only through an already-gated page render.
  const user = await requireApproved();

  const input = parseEntryForm(formData);
  if (!input.name) return { error: "Name is required." };
  if (!Number.isFinite(input.calories) || input.calories < 0) {
    return { error: "Calories must be a non-negative number." };
  }

  const supabase = await createClient();
  try {
    await createFoodEntry(supabase, user.id, input);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to log food." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/trends");
  return { error: null, ok: true };
}

/** Plain (formData) => Promise<void> wrapper for use as a bare <form action>. */
export async function logFoodQuickAction(formData: FormData): Promise<void> {
  await logFoodAction({ error: null }, formData);
}

export async function editFoodEntryAction(
  _prevState: LogActionState,
  formData: FormData,
): Promise<LogActionState> {
  await requireApproved();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing entry id." };

  const input = parseEntryForm(formData);
  if (!input.name) return { error: "Name is required." };
  if (!Number.isFinite(input.calories) || input.calories < 0) {
    return { error: "Calories must be a non-negative number." };
  }

  const supabase = await createClient();
  try {
    await updateFoodEntry(supabase, id, input);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update entry.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/trends");
  redirect("/dashboard");
}

export async function updateFoodEntryAction(
  id: string,
  patch: Partial<NewFoodEntryInput>,
) {
  await requireApproved();
  const supabase = await createClient();
  await updateFoodEntry(supabase, id, patch);
  revalidatePath("/dashboard");
  revalidatePath("/trends");
}

export async function deleteFoodEntryAction(id: string) {
  await requireApproved();
  const supabase = await createClient();
  await deleteFoodEntry(supabase, id);
  revalidatePath("/dashboard");
  revalidatePath("/trends");
}
