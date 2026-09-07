import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MealType, LogSource } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;
export type FoodEntryRow = Database["public"]["Tables"]["food_entries"]["Row"];

export type NewFoodEntryInput = {
  name: string;
  quantity: number;
  unit: string | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  mealType: MealType;
  source: LogSource;
  barcode?: string | null;
  loggedAt?: string; // ISO timestamp; defaults to now
};

/** Entries for a given local calendar day, for the day view + macro totals. */
export async function getEntriesForDay(
  supabase: Client,
  userId: string,
  dayStart: Date,
  dayEnd: Date,
) {
  const { data, error } = await supabase
    .from("food_entries")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_at", dayStart.toISOString())
    .lt("logged_at", dayEnd.toISOString())
    .order("logged_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** Entries between two timestamps (inclusive/exclusive), for trend charts. */
export async function getEntriesInRange(
  supabase: Client,
  userId: string,
  from: Date,
  to: Date,
) {
  const { data, error } = await supabase
    .from("food_entries")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_at", from.toISOString())
    .lt("logged_at", to.toISOString())
    .order("logged_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** Most recently logged distinct food names, for one-tap re-logging. */
export async function getRecentEntries(
  supabase: Client,
  userId: string,
  limit = 8,
) {
  const { data, error } = await supabase
    .from("food_entries")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  const seen = new Set<string>();
  const recent: FoodEntryRow[] = [];
  for (const entry of data ?? []) {
    const key = entry.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recent.push(entry);
    if (recent.length >= limit) break;
  }
  return recent;
}

export async function createFoodEntry(
  supabase: Client,
  userId: string,
  input: NewFoodEntryInput,
) {
  const { data, error } = await supabase
    .from("food_entries")
    .insert({
      user_id: userId,
      name: input.name,
      quantity: input.quantity,
      unit: input.unit,
      calories: input.calories,
      protein_g: input.proteinG,
      carbs_g: input.carbsG,
      fat_g: input.fatG,
      meal_type: input.mealType,
      source: input.source,
      barcode: input.barcode ?? null,
      logged_at: input.loggedAt ?? new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateFoodEntry(
  supabase: Client,
  id: string,
  input: Partial<NewFoodEntryInput>,
) {
  const patch: Database["public"]["Tables"]["food_entries"]["Update"] = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.quantity !== undefined) patch.quantity = input.quantity;
  if (input.unit !== undefined) patch.unit = input.unit;
  if (input.calories !== undefined) patch.calories = input.calories;
  if (input.proteinG !== undefined) patch.protein_g = input.proteinG;
  if (input.carbsG !== undefined) patch.carbs_g = input.carbsG;
  if (input.fatG !== undefined) patch.fat_g = input.fatG;
  if (input.mealType !== undefined) patch.meal_type = input.mealType;
  if (input.loggedAt !== undefined) patch.logged_at = input.loggedAt;

  const { data, error } = await supabase
    .from("food_entries")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFoodEntry(supabase: Client, id: string) {
  const { error } = await supabase.from("food_entries").delete().eq("id", id);
  if (error) throw error;
}
