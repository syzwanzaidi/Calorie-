"use client";

import { useActionState } from "react";
import { updateProfileAction, type SettingsActionState } from "@/app/(app)/settings/actions";
import type { Profile } from "@/lib/auth";

const initialState: SettingsActionState = { error: null };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm mb-1" htmlFor="displayName">
          Name
        </label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={profile.display_name ?? ""}
          className="w-full rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1" htmlFor="heightCm">
            Height (cm)
          </label>
          <input
            id="heightCm"
            name="heightCm"
            type="number"
            step="any"
            min="0"
            defaultValue={profile.height_cm ?? ""}
            className="w-full rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="birthYear">
            Birth year
          </label>
          <input
            id="birthYear"
            name="birthYear"
            type="number"
            step="1"
            min="1900"
            defaultValue={profile.birth_year ?? ""}
            className="w-full rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1" htmlFor="sex">
            Sex
          </label>
          <select
            id="sex"
            name="sex"
            defaultValue={profile.sex ?? ""}
            className="w-full rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
          >
            <option value="">Select…</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <p className="mt-1 text-xs text-text-muted">Used for the TDEE formula.</p>
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="activityLevel">
            Activity level
          </label>
          <select
            id="activityLevel"
            name="activityLevel"
            defaultValue={profile.activity_level ?? "moderate"}
            className="w-full rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
          >
            <option value="sedentary">Sedentary</option>
            <option value="light">Light (1-3 days/wk)</option>
            <option value="moderate">Moderate (3-5 days/wk)</option>
            <option value="active">Active (6-7 days/wk)</option>
            <option value="very_active">Very active</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1" htmlFor="goal">
          Goal
        </label>
        <select
          id="goal"
          name="goal"
          defaultValue={profile.goal ?? "maintain"}
          className="w-full rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
        >
          <option value="cut">Cut</option>
          <option value="maintain">Maintain</option>
          <option value="bulk">Bulk</option>
        </select>
      </div>

      {state.error && (
        <p className="text-sm text-protein" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && <p className="text-sm text-accent">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
