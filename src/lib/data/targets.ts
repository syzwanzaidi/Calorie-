import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;
export type TargetRow = Database["public"]["Tables"]["targets"]["Row"];

export async function getCurrentTargets(
  supabase: Client,
  userId: string,
): Promise<TargetRow | null> {
  const { data, error } = await supabase
    .from("targets")
    .select("*")
    .eq("user_id", userId)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setTargets(
  supabase: Client,
  userId: string,
  input: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    source: "auto" | "manual";
  },
) {
  // New row inserted on every change so history is preserved (spec 6.2).
  const { data, error } = await supabase
    .from("targets")
    .insert({
      user_id: userId,
      calories: input.calories,
      protein_g: input.proteinG,
      carbs_g: input.carbsG,
      fat_g: input.fatG,
      source: input.source,
      effective_from: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
