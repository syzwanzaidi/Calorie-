"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import type { UserStatus } from "@/lib/supabase/types";

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
