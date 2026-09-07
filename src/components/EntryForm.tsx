"use client";

import { useActionState } from "react";
import type { MealType, LogSource } from "@/lib/supabase/types";

export type EntryFormValues = {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  mealType: MealType;
  source: LogSource;
  barcode?: string;
};

type ActionState = { error: string | null; ok?: boolean };

export function EntryForm({
  action,
  initial,
  submitLabel = "Save",
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initial: EntryFormValues;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="space-y-4">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="source" value={initial.source} />
      {initial.barcode && (
        <input type="hidden" name="barcode" value={initial.barcode} />
      )}

      <div>
        <label className="block text-sm mb-1" htmlFor="name">
          Food
        </label>
        <input
          id="name"
          name="name"
          defaultValue={initial.name}
          required
          className="w-full rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1" htmlFor="quantity">
            Quantity
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            step="any"
            min="0"
            defaultValue={initial.quantity}
            className="w-full rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-sm mb-1" htmlFor="unit">
            Unit
          </label>
          <input
            id="unit"
            name="unit"
            placeholder="g, ml, serving…"
            defaultValue={initial.unit}
            className="w-full rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1" htmlFor="mealType">
          Meal
        </label>
        <select
          id="mealType"
          name="mealType"
          defaultValue={initial.mealType}
          className="w-full rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
        >
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </select>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-sm mb-1" htmlFor="calories">
            Calories
          </label>
          <input
            id="calories"
            name="calories"
            type="number"
            step="1"
            min="0"
            defaultValue={initial.calories}
            className="w-full rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </div>
        <div>
          <label
            className="block text-sm mb-1"
            style={{ color: "var(--protein)" }}
            htmlFor="proteinG"
          >
            Protein
          </label>
          <input
            id="proteinG"
            name="proteinG"
            type="number"
            step="any"
            min="0"
            defaultValue={initial.proteinG}
            className="w-full rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </div>
        <div>
          <label
            className="block text-sm mb-1"
            style={{ color: "var(--carbs)" }}
            htmlFor="carbsG"
          >
            Carbs
          </label>
          <input
            id="carbsG"
            name="carbsG"
            type="number"
            step="any"
            min="0"
            defaultValue={initial.carbsG}
            className="w-full rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </div>
        <div>
          <label
            className="block text-sm mb-1"
            style={{ color: "var(--fat)" }}
            htmlFor="fatG"
          >
            Fat
          </label>
          <input
            id="fatG"
            name="fatG"
            type="number"
            step="any"
            min="0"
            defaultValue={initial.fatG}
            className="w-full rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
          />
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-protein" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-accent px-3 py-2 font-medium text-black disabled:opacity-60"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
