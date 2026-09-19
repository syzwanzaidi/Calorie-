"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { friendlyAuthError } from "@/lib/authErrors";

export type AuthActionState = { error: string | null };

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName || null } },
  });

  if (error) {
    return { error: friendlyAuthError(error) };
  }

  // Email confirmation is disabled (spec 3.1), so this signs the user in
  // immediately. A `profiles` row is created with status='pending' by the
  // on_auth_user_created trigger (supabase/01_profiles_trigger.sql).
  redirect("/pending");
}
