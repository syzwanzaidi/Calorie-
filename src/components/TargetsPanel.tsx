"use client";

import { useActionState } from "react";
import {
  setAutoTargetsAction,
  setManualTargetsAction,
  type SettingsActionState,
} from "@/app/(app)/settings/actions";
import type { TargetRow } from "@/lib/data/targets";

const initialState: SettingsActionState = { error: null };

export function TargetsPanel({ current }: { current: TargetRow | null }) {
  const [autoState, autoAction, autoPending] = useActionState(
    setAutoTargetsAction,
    initialState,
  );
  const [manualState, manualAction, manualPending] = useActionState(
    setManualTargetsAction,
    initialState,
  );

  return (
    <div className="space-y-6">
      {current && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center border border-hairline rounded-md p-4">
          <div>
            <p className="font-numeric text-lg">{current.calories}</p>
            <p className="text-xs text-text-muted">kcal</p>
          </div>
          <div>
            <p className="font-numeric text-lg" style={{ color: "var(--protein)" }}>
              {current.protein_g}
            </p>
            <p className="text-xs text-text-muted">protein g</p>
          </div>
          <div>
            <p className="font-numeric text-lg" style={{ color: "var(--carbs)" }}>
              {current.carbs_g}
            </p>
            <p className="text-xs text-text-muted">carbs g</p>
          </div>
          <div>
            <p className="font-numeric text-lg" style={{ color: "var(--fat)" }}>
              {current.fat_g}
            </p>
            <p className="text-xs text-text-muted">fat g</p>
          </div>
          <p className="col-span-2 sm:col-span-4 text-xs text-text-muted">
            {current.source === "auto" ? "Auto-calculated" : "Manually set"} ·
            effective {new Date(current.effective_from).toLocaleDateString("en-GB")}
          </p>
        </div>
      )}

      <div>
        <h3 className="text-sm mb-2">Auto-calculate (Mifflin-St Jeor)</h3>
        <form action={autoAction}>
          {autoState.error && (
            <p className="text-sm text-protein mb-2" role="alert">
              {autoState.error}
            </p>
          )}
          <button
            type="submit"
            disabled={autoPending}
            className="rounded-md border border-hairline px-4 py-2 text-sm hover:border-accent disabled:opacity-60"
          >
            {autoPending ? "Calculating…" : "Recalculate from profile + latest weight"}
          </button>
        </form>
      </div>

      <div>
        <h3 className="text-sm mb-2">Manual override</h3>
        <form action={manualAction} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <input
            name="calories"
            type="number"
            min="0"
            placeholder="kcal"
            defaultValue={current?.calories}
            className="rounded-md border border-hairline bg-surface px-2 py-2 text-sm"
          />
          <input
            name="proteinG"
            type="number"
            min="0"
            placeholder="protein g"
            defaultValue={current?.protein_g}
            className="rounded-md border border-hairline bg-surface px-2 py-2 text-sm"
          />
          <input
            name="carbsG"
            type="number"
            min="0"
            placeholder="carbs g"
            defaultValue={current?.carbs_g}
            className="rounded-md border border-hairline bg-surface px-2 py-2 text-sm"
          />
          <input
            name="fatG"
            type="number"
            min="0"
            placeholder="fat g"
            defaultValue={current?.fat_g}
            className="rounded-md border border-hairline bg-surface px-2 py-2 text-sm"
          />
          {manualState.error && (
            <p className="col-span-2 sm:col-span-4 text-sm text-protein" role="alert">
              {manualState.error}
            </p>
          )}
          <button
            type="submit"
            disabled={manualPending}
            className="col-span-2 sm:col-span-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
          >
            {manualPending ? "Saving…" : "Set manual targets"}
          </button>
        </form>
      </div>
    </div>
  );
}
