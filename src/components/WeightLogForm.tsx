"use client";

import { useActionState } from "react";
import { addWeightAction, type SettingsActionState } from "@/app/(app)/settings/actions";

const initialState: SettingsActionState = { error: null };

export function WeightLogForm({ latestWeightKg }: { latestWeightKg: number | null }) {
  const [state, formAction, pending] = useActionState(addWeightAction, initialState);

  return (
    <div className="space-y-3">
      {latestWeightKg !== null && (
        <p className="text-sm text-text-muted">
          Latest: <span className="font-numeric">{latestWeightKg}</span> kg
        </p>
      )}
      <form action={formAction} className="flex items-end gap-3">
        <div>
          <label className="block text-sm mb-1" htmlFor="weightKg">
            Weight (kg)
          </label>
          <input
            id="weightKg"
            name="weightKg"
            type="number"
            step="0.1"
            min="0"
            required
            className="w-32 rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
        >
          {pending ? "Logging…" : "Log weight"}
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
