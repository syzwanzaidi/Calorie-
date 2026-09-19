"use client";

import { useActionState } from "react";
import {
  addGeminiKeyAction,
  toggleGeminiKeyAction,
  deleteGeminiKeyAction,
  type ApiKeyActionState,
} from "@/app/(app)/settings/actions";
import type { GeminiApiKeyRow } from "@/lib/data/apiKeys";

const initialState: ApiKeyActionState = { error: null };

function maskKey(key: string): string {
  if (key.length <= 10) return "•".repeat(key.length);
  return `${key.slice(0, 6)}${"•".repeat(8)}${key.slice(-4)}`;
}

export function ApiKeysPanel({ keys }: { keys: GeminiApiKeyRow[] }) {
  const [state, formAction, pending] = useActionState(
    addGeminiKeyAction,
    initialState,
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Your own Gemini API key for photo food-recognition, free to get at{" "}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="text-accent underline"
        >
          aistudio.google.com/apikey
        </a>
        . Bringing your own means your usage never competes with anyone
        else&apos;s free-tier limit. Add a second one here as a spare — if the
        first hits its limit, the app automatically falls back to the next.
      </p>

      {keys.length === 0 ? (
        <p className="text-sm text-text-muted border border-hairline rounded-md px-4 py-3">
          No key of your own yet — photo logging will use a shared fallback
          key if one is available, which may hit its limit faster since
          other users share it too.
        </p>
      ) : (
        <ul className="divide-y divide-hairline border border-hairline rounded-md">
          {keys.map((key) => (
            <li
              key={key.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className={key.is_active ? "" : "text-text-muted line-through"}>
                  {key.label || "Untitled key"}
                </p>
                <p className="text-xs text-text-muted font-numeric">
                  {maskKey(key.key_value)}
                </p>
                {key.last_error_at && (
                  <p className="text-xs text-protein truncate max-w-sm">
                    Last error {new Date(key.last_error_at).toLocaleString("en-GB")}:{" "}
                    {key.last_error}
                  </p>
                )}
                {key.last_used_at && (
                  <p className="text-xs text-text-muted">
                    Last used {new Date(key.last_used_at).toLocaleString("en-GB")}
                  </p>
                )}
              </div>
              <div className="flex gap-3 shrink-0">
                <form action={toggleGeminiKeyAction.bind(null, key.id, !key.is_active)}>
                  <button
                    type="submit"
                    className="text-xs text-text-muted hover:text-text"
                  >
                    {key.is_active ? "Deactivate" : "Activate"}
                  </button>
                </form>
                <form action={deleteGeminiKeyAction.bind(null, key.id)}>
                  <button
                    type="submit"
                    className="text-xs text-text-muted hover:text-protein"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-col sm:flex-row gap-3">
        <input
          name="label"
          placeholder="Label (optional)"
          className="rounded-md border border-hairline bg-surface px-3 py-2 text-sm sm:w-48"
        />
        <input
          name="keyValue"
          placeholder="Paste Gemini API key…"
          required
          className="flex-1 rounded-md border border-hairline bg-surface px-3 py-2 text-sm font-numeric"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-60 shrink-0"
        >
          {pending ? "Adding…" : "Add key"}
        </button>
      </form>
      {state.error && (
        <p className="text-sm text-protein" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}
