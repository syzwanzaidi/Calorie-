"use client";

import { logFoodQuickAction } from "@/app/(app)/log/actions";
import type { FoodEntryRow } from "@/lib/data/entries";

export function QuickRelog({ entries }: { entries: FoodEntryRow[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map((entry) => (
        <form key={entry.id} action={logFoodQuickAction}>
          <input type="hidden" name="name" value={entry.name} />
          <input type="hidden" name="quantity" value={entry.quantity} />
          <input type="hidden" name="unit" value={entry.unit ?? ""} />
          <input type="hidden" name="calories" value={entry.calories} />
          <input type="hidden" name="proteinG" value={entry.protein_g} />
          <input type="hidden" name="carbsG" value={entry.carbs_g} />
          <input type="hidden" name="fatG" value={entry.fat_g} />
          <input type="hidden" name="mealType" value={entry.meal_type} />
          <input type="hidden" name="source" value={entry.source} />
          <button
            type="submit"
            className="rounded-full border border-hairline px-3 py-1.5 text-sm hover:border-accent"
            title={`${entry.calories} kcal`}
          >
            + {entry.name}
          </button>
        </form>
      ))}
    </div>
  );
}
