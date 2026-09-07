import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;
export type WeightLogRow = Database["public"]["Tables"]["weight_logs"]["Row"];

export async function getLatestWeight(
  supabase: Client,
  userId: string,
): Promise<WeightLogRow | null> {
  const { data, error } = await supabase
    .from("weight_logs")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getWeightLogsInRange(
  supabase: Client,
  userId: string,
  from: Date,
  to: Date,
) {
  const { data, error } = await supabase
    .from("weight_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_at", from.toISOString())
    .lt("logged_at", to.toISOString())
    .order("logged_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addWeightLog(
  supabase: Client,
  userId: string,
  weightKg: number,
  loggedAt?: string,
) {
  const { data, error } = await supabase
    .from("weight_logs")
    .insert({
      user_id: userId,
      weight_kg: weightKg,
      logged_at: loggedAt ?? new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
