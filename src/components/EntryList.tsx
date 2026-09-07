import Link from "next/link";
import { deleteFoodEntryAction } from "@/app/(app)/log/actions";
import type { FoodEntryRow } from "@/lib/data/entries";
import type { MealType } from "@/lib/supabase/types";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export function EntryList({ entries }: { entries: FoodEntryRow[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-text-muted border border-hairline rounded-md px-4 py-6 text-center">
        Nothing logged yet today.
      </p>
    );
  }

  const byMeal = new Map<MealType, FoodEntryRow[]>();
  for (const entry of entries) {
    const list = byMeal.get(entry.meal_type) ?? [];
    list.push(entry);
    byMeal.set(entry.meal_type, list);
  }

  return (
    <div className="space-y-6">
      {MEAL_ORDER.filter((m) => byMeal.has(m)).map((meal) => (
        <div key={meal}>
          <h3 className="text-sm text-text-muted mb-2">{MEAL_LABEL[meal]}</h3>
          <ul className="divide-y divide-hairline border border-hairline rounded-md">
            {byMeal.get(meal)!.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate">{entry.name}</p>
                  <p className="text-xs text-text-muted">
                    {entry.quantity}
                    {entry.unit ?? ""} ·{" "}
                    <span style={{ color: "var(--protein)" }}>
                      {Math.round(entry.protein_g)}P
                    </span>{" "}
                    <span style={{ color: "var(--carbs)" }}>
                      {Math.round(entry.carbs_g)}C
                    </span>{" "}
                    <span style={{ color: "var(--fat)" }}>
                      {Math.round(entry.fat_g)}F
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-numeric text-sm">
                    {entry.calories}
                  </span>
                  <Link
                    href={`/log/edit/${entry.id}`}
                    className="text-xs text-text-muted hover:text-text"
                  >
                    Edit
                  </Link>
                  <form action={deleteFoodEntryAction.bind(null, entry.id)}>
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
        </div>
      ))}
    </div>
  );
}
