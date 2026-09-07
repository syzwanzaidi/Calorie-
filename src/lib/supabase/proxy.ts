import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

const PUBLIC_ROUTES = new Set(["/", "/login", "/signup"]);

function landingRouteFor(status: string, role: string): string {
  if (role === "admin") return "/admin";
  if (status === "approved") return "/dashboard";
  if (status === "pending") return "/pending";
  return "/denied"; // rejected | suspended
}

/**
 * Refreshes the Supabase session and enforces the approval-gate access
 * control described in the spec (Section 3.2):
 *   pending   -> only /pending is reachable
 *   approved  -> normal app access
 *   rejected/
 *   suspended -> only /denied is reachable
 *   admin     -> /admin, gated separately by role
 *
 * This is the first of two independent enforcement layers — Row Level
 * Security (see supabase/rls.sql) is the second, so bypassing this proxy
 * (e.g. by calling a Server Action directly) still cannot read/write data
 * for a non-approved user.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not remove this call. It refreshes the auth token and is
  // also what makes getUser() below trustworthy (it re-validates against
  // Supabase Auth rather than trusting a possibly-stale cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user) {
    if (PUBLIC_ROUTES.has(pathname)) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, role")
    .eq("id", user.id)
    .single();

  const status = profile?.status ?? "pending";
  const role = profile?.role ?? "user";

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    return NextResponse.redirect(url);
  };

  // Signed-in users shouldn't see the auth forms.
  if (pathname === "/login" || pathname === "/signup") {
    return redirectTo(landingRouteFor(status, role));
  }

  if (pathname.startsWith("/admin")) {
    if (role !== "admin") return redirectTo(landingRouteFor(status, role));
    return response;
  }

  if (pathname === "/pending") {
    if (status !== "pending") return redirectTo(landingRouteFor(status, role));
    return response;
  }

  if (pathname === "/denied") {
    if (status !== "rejected" && status !== "suspended") {
      return redirectTo(landingRouteFor(status, role));
    }
    return response;
  }

  // Everything else under the app shell requires approval (admins included).
  if (status !== "approved" && role !== "admin") {
    return redirectTo(status === "pending" ? "/pending" : "/denied");
  }

  return response;
}
