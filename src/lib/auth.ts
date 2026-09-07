import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

// The canonical runtime shape for a profile row: snake_case, matching what
// the Supabase client actually returns (PostgREST), not Drizzle's
// camelCase-mapped $inferSelect type — that type only describes what you'd
// get by querying through Drizzle, which this app deliberately doesn't do
// at runtime (see the note in getSessionUser below).
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type SessionUser = {
  id: string;
  email: string | null;
  profile: Profile;
};

/**
 * Loads the current authenticated user + their profile row. Returns null if
 * not signed in.
 *
 * NOTE: this deliberately goes through the request-scoped Supabase client
 * (respecting RLS via the user's own JWT), not the Drizzle/postgres.js
 * connection in src/db — that connection authenticates as a role that
 * bypasses RLS, which is fine for schema/migrations but would silently
 * defeat RLS as an enforcement layer (spec 3.2) if used for per-request
 * reads. See src/lib/data/* for the pattern used elsewhere in the app.
 *
 * Does NOT enforce approval status — callers that need the approval gate
 * should use `requireApproved` / `requireAdmin` instead.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return { id: user.id, email: user.email ?? null, profile: profile as Profile };
}

/**
 * Second enforcement layer (defense in depth alongside src/proxy.ts and RLS —
 * see spec Section 3.2). Use in Server Components / Server Actions / Route
 * Handlers that must never run for a non-approved user, even if the proxy
 * were somehow bypassed.
 */
export async function requireApproved(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.profile.role === "admin") return user;
  if (user.profile.status === "pending") redirect("/pending");
  if (user.profile.status !== "approved") redirect("/denied");
  return user;
}

/** Same as requireApproved, but also requires role = 'admin'. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.profile.role !== "admin") redirect("/dashboard");
  return user;
}
