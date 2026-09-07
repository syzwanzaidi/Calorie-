import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

/**
 * Supabase client for use in Server Components, Server Actions, and Route
 * Handlers. Reads/writes the auth session via cookies.
 *
 * NOTE: `setAll` will throw when called from a Server Component (cookies are
 * read-only there) — that's expected and safe to ignore as long as the proxy
 * (src/proxy.ts) is refreshing the session on every request.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — ignore, proxy handles refresh.
          }
        },
      },
    },
  );
}

/**
 * Admin client using the service role key. Bypasses RLS entirely.
 * SERVER-ONLY. Never import this from a Client Component or expose its
 * result to the client. Used only for admin approve/reject/suspend actions.
 */
export function createAdminClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // No-op: the admin client never manages a browser session.
        },
      },
    },
  );
}
