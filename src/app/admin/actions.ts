"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import type { UserStatus } from "@/lib/supabase/types";
import {
  addGeminiKey,
  deleteGeminiKey,
  setGeminiKeyActive,
} from "@/lib/data/apiKeys";

export type AdminActionState = { error: string | null; ok?: boolean };

/**
 * Spec 3.4: admin mutations always (1) verify the *requester* is an admin
 * using their own session first, then (2) perform the actual update with
 * the service-role client — never trusting a client-supplied role/status
 * claim, and never doing the write through a client-writable RLS policy.
 */
async function setUserStatus(targetUserId: string, status: UserStatus) {
  const admin = await requireAdmin(); // step 1: verify the requester

  if (targetUserId === admin.id && status !== "approved") {
    throw new Error("You can't change your own approval status.");
  }

  const supabaseAdmin = createAdminClient(); // step 2: service-role write
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      status,
      approved_by: admin.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", targetUserId);

  if (error) throw error;

  revalidatePath("/admin");
}

export async function approveUserAction(userId: string) {
  await setUserStatus(userId, "approved");
}

export async function rejectUserAction(userId: string) {
  await setUserStatus(userId, "rejected");
}

export async function suspendUserAction(userId: string) {
  await setUserStatus(userId, "suspended");
}

export async function reinstateUserAction(userId: string) {
  await setUserStatus(userId, "approved");
}

export type ApiKeyActionState = { error: string | null; ok?: boolean };

export async function addGeminiKeyAction(
  _prevState: ApiKeyActionState,
  formData: FormData,
): Promise<ApiKeyActionState> {
  await requireAdmin();

  const keyValue = String(formData.get("keyValue") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || null;

  if (!keyValue) {
    return { error: "Paste a key value first." };
  }

  try {
    const supabaseAdmin = createAdminClient();
    await addGeminiKey(supabaseAdmin, label, keyValue);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to add key." };
  }

  revalidatePath("/admin");
  return { error: null, ok: true };
}

export async function toggleGeminiKeyAction(id: string, isActive: boolean) {
  await requireAdmin();
  const supabaseAdmin = createAdminClient();
  await setGeminiKeyActive(supabaseAdmin, id, isActive);
  revalidatePath("/admin");
}

export async function deleteGeminiKeyAction(id: string) {
  await requireAdmin();
  const supabaseAdmin = createAdminClient();
  await deleteGeminiKey(supabaseAdmin, id);
  revalidatePath("/admin");
}
