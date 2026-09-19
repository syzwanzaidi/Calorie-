"use server";

import { revalidatePath } from "next/cache";
import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setTargets } from "@/lib/data/targets";
import { addWeightLog, getLatestWeight } from "@/lib/data/weight";
import { calculateTargets, ageFromBirthYear } from "@/lib/tdee";
import type { ActivityLevel, Goal } from "@/lib/supabase/types";
import {
  addMyGeminiKey,
  setGeminiKeyActive,
  deleteGeminiKey,
} from "@/lib/data/apiKeys";

export type SettingsActionState = { error: string | null; ok?: boolean };

export async function updateProfileAction(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const user = await requireApproved();
  const supabase = await createClient();

  const displayName = String(formData.get("displayName") ?? "").trim() || null;
  const heightCm = Number(formData.get("heightCm") ?? 0) || null;
  const sex = (formData.get("sex") as string) || null;
  const birthYear = Number(formData.get("birthYear") ?? 0) || null;
  const activityLevel = (formData.get("activityLevel") as ActivityLevel) || null;
  const goal = (formData.get("goal") as Goal) || null;

  // Only ever these six columns — role/status/approved_by/approved_at are
  // additionally locked server-side by the protect_profile_admin_columns
  // trigger (supabase/02_rls.sql), so this is defense in depth, not the only
  // thing stopping a privilege-escalation attempt here.
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      height_cm: heightCm,
      sex,
      birth_year: birthYear,
      activity_level: activityLevel,
      goal,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { error: null, ok: true };
}

export async function setAutoTargetsAction(
  _prevState: SettingsActionState,
  _formData: FormData,
): Promise<SettingsActionState> {
  const user = await requireApproved();
  const supabase = await createClient();
  const { profile } = user;

  if (!profile.height_cm || !profile.sex || !profile.birth_year) {
    return {
      error:
        "Add your height, sex, and birth year above before calculating targets.",
    };
  }

  const latestWeight = await getLatestWeight(supabase, user.id);
  if (!latestWeight) {
    return { error: "Log your current weight first (below) to calculate targets." };
  }

  const targets = calculateTargets({
    weightKg: latestWeight.weight_kg,
    heightCm: profile.height_cm,
    age: ageFromBirthYear(profile.birth_year),
    sex: profile.sex === "female" ? "female" : "male",
    activityLevel: (profile.activity_level ?? "moderate") as ActivityLevel,
    goal: (profile.goal ?? "maintain") as Goal,
  });

  await setTargets(supabase, user.id, { ...targets, source: "auto" });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { error: null, ok: true };
}

export async function setManualTargetsAction(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const user = await requireApproved();
  const supabase = await createClient();

  const calories = Math.round(Number(formData.get("calories") ?? 0));
  const proteinG = Math.round(Number(formData.get("proteinG") ?? 0));
  const carbsG = Math.round(Number(formData.get("carbsG") ?? 0));
  const fatG = Math.round(Number(formData.get("fatG") ?? 0));

  if ([calories, proteinG, carbsG, fatG].some((n) => !Number.isFinite(n) || n < 0)) {
    return { error: "All target fields must be non-negative numbers." };
  }

  await setTargets(supabase, user.id, {
    calories,
    proteinG,
    carbsG,
    fatG,
    source: "manual",
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { error: null, ok: true };
}

export async function addWeightAction(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const user = await requireApproved();
  const supabase = await createClient();

  const weightKg = Number(formData.get("weightKg") ?? 0);
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    return { error: "Enter a valid weight." };
  }

  await addWeightLog(supabase, user.id, weightKg);

  revalidatePath("/settings");
  revalidatePath("/trends");
  return { error: null, ok: true };
}

export type ApiKeyActionState = { error: string | null; ok?: boolean };

export async function addGeminiKeyAction(
  _prevState: ApiKeyActionState,
  formData: FormData,
): Promise<ApiKeyActionState> {
  const user = await requireApproved();
  const supabase = await createClient();

  const keyValue = String(formData.get("keyValue") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || null;

  if (!keyValue) {
    return { error: "Paste a key value first." };
  }

  try {
    // Request-scoped client — RLS (auth.uid() = user_id) is what actually
    // ties this key to the caller, not just the user.id passed here.
    await addMyGeminiKey(supabase, user.id, label, keyValue);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to add key." };
  }

  revalidatePath("/settings");
  return { error: null, ok: true };
}

export async function toggleGeminiKeyAction(id: string, isActive: boolean) {
  await requireApproved();
  const supabase = await createClient();
  // RLS scopes this update to rows the caller owns — passing a stranger's
  // key id here just matches zero rows, not someone else's key.
  await setGeminiKeyActive(supabase, id, isActive);
  revalidatePath("/settings");
}

export async function deleteGeminiKeyAction(id: string) {
  await requireApproved();
  const supabase = await createClient();
  await deleteGeminiKey(supabase, id);
  revalidatePath("/settings");
}
