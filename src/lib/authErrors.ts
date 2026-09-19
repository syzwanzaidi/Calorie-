import type { AuthError } from "@supabase/supabase-js";

/**
 * Supabase Auth errors aren't always user-presentable — a mid-outage network
 * failure can surface as `error.message === "<none>"` (seen for real during
 * development when the Supabase project was paused/restoring, status 521/522
 * from Cloudflare). Map anything that isn't a clear, actionable message to a
 * generic "try again" string instead of leaking internals to the login form.
 */
export function friendlyAuthError(error: AuthError): string {
  const name = error.name;
  const message = error.message?.trim();

  if (
    name === "AuthRetryableFetchError" ||
    !message ||
    message === "<none>" ||
    (error.status !== undefined && error.status >= 500)
  ) {
    return "Couldn't reach the server. Check your connection and try again in a moment.";
  }

  return message;
}
