import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;
export type GeminiApiKeyRow = Database["public"]["Tables"]["gemini_api_keys"]["Row"];

// --- Per-user (request-scoped client, RLS-enforced: auth.uid() = user_id) ---
// Mirrors the pattern in src/lib/data/entries.ts etc. — RLS is the real
// enforcement, the explicit .eq("user_id", ...) filters below are defense
// in depth / query-shape clarity, not the only thing stopping cross-user access.

export async function listMyGeminiKeys(
  supabase: Client,
  userId: string,
): Promise<GeminiApiKeyRow[]> {
  const { data, error } = await supabase
    .from("gemini_api_keys")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addMyGeminiKey(
  supabase: Client,
  userId: string,
  label: string | null,
  keyValue: string,
) {
  const { error } = await supabase
    .from("gemini_api_keys")
    .insert({ user_id: userId, label, key_value: keyValue, is_active: true });
  if (error) throw error;
}

export async function setGeminiKeyActive(supabase: Client, id: string, isActive: boolean) {
  const { error } = await supabase
    .from("gemini_api_keys")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteGeminiKey(supabase: Client, id: string) {
  const { error } = await supabase.from("gemini_api_keys").delete().eq("id", id);
  if (error) throw error;
}

// --- Cross-user (admin/service-role client only) ---
// Used by src/lib/gemini.ts to resolve the fallback tier: a user with no
// key of their own borrows an admin's, which requires bypassing RLS since
// that row isn't theirs. Never exposed through a Server Action to the client.

export async function listActiveKeysForUser(
  adminClient: Client,
  userId: string,
): Promise<GeminiApiKeyRow[]> {
  const { data, error } = await adminClient
    .from("gemini_api_keys")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** Active keys belonging to any admin, for a user who has none of their own. */
export async function listAdminFallbackKeys(
  adminClient: Client,
  excludeUserId: string,
): Promise<GeminiApiKeyRow[]> {
  const { data: admins, error: adminsErr } = await adminClient
    .from("profiles")
    .select("id")
    .eq("role", "admin");
  if (adminsErr) throw adminsErr;

  const adminIds = admins.map((a) => a.id).filter((id) => id !== excludeUserId);
  if (adminIds.length === 0) return [];

  const { data, error } = await adminClient
    .from("gemini_api_keys")
    .select("*")
    .in("user_id", adminIds)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function markGeminiKeyUsed(adminClient: Client, id: string) {
  await adminClient
    .from("gemini_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", id);
}

export async function markGeminiKeyError(
  adminClient: Client,
  id: string,
  message: string,
) {
  await adminClient
    .from("gemini_api_keys")
    .update({ last_error_at: new Date().toISOString(), last_error: message })
    .eq("id", id);
}
