import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Every function here takes an admin (service-role) client on purpose —
// gemini_api_keys has zero RLS policies (supabase/03_gemini_keys.sql), so
// the request-scoped client can never read/write it, admin session or not.
// Callers must gate with requireAdmin() themselves before calling in from a
// Server Action (see src/app/admin/actions.ts).

type Client = SupabaseClient<Database>;
export type GeminiApiKeyRow = Database["public"]["Tables"]["gemini_api_keys"]["Row"];

export async function listGeminiKeys(adminClient: Client): Promise<GeminiApiKeyRow[]> {
  const { data, error } = await adminClient
    .from("gemini_api_keys")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

/** Active keys only, oldest first — the order analyzeFoodPhoto() tries them in. */
export async function listActiveGeminiKeys(
  adminClient: Client,
): Promise<GeminiApiKeyRow[]> {
  const { data, error } = await adminClient
    .from("gemini_api_keys")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addGeminiKey(
  adminClient: Client,
  label: string | null,
  keyValue: string,
) {
  const { error } = await adminClient
    .from("gemini_api_keys")
    .insert({ label, key_value: keyValue, is_active: true });
  if (error) throw error;
}

export async function setGeminiKeyActive(
  adminClient: Client,
  id: string,
  isActive: boolean,
) {
  const { error } = await adminClient
    .from("gemini_api_keys")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteGeminiKey(adminClient: Client, id: string) {
  const { error } = await adminClient.from("gemini_api_keys").delete().eq("id", id);
  if (error) throw error;
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
