import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export async function listAllProfiles(adminClient: Client): Promise<ProfileRow[]> {
  const { data, error } = await adminClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export type UsageStats = { entryCount: number; lastActiveAt: string | null };

/**
 * Per-user entry counts + last-logged timestamp, for the admin "All users"
 * table. food_entries RLS has no admin bypass (by design — see
 * supabase/02_rls.sql), so this must run through the service-role client,
 * same as the status mutations in admin/actions.ts.
 *
 * Fetches all rows and aggregates client-side — fine at this app's scale
 * (a single founder + an approved-by-hand user base); swap for a Postgres
 * view/RPC (`group by user_id`) if that stops being true.
 */
export async function getUsageStats(
  adminClient: Client,
): Promise<Map<string, UsageStats>> {
  const { data, error } = await adminClient
    .from("food_entries")
    .select("user_id, logged_at");
  if (error) throw error;

  const stats = new Map<string, UsageStats>();
  for (const row of data ?? []) {
    const existing = stats.get(row.user_id) ?? { entryCount: 0, lastActiveAt: null };
    existing.entryCount += 1;
    if (!existing.lastActiveAt || row.logged_at > existing.lastActiveAt) {
      existing.lastActiveAt = row.logged_at;
    }
    stats.set(row.user_id, existing);
  }
  return stats;
}
