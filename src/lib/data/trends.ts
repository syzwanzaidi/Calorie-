import { formatDateISO, addDays } from "@/lib/date";
import type { FoodEntryRow } from "@/lib/data/entries";
import type { WeightLogRow } from "@/lib/data/weight";

export type DailyTotal = {
  date: string; // YYYY-MM-DD
  label: string; // short display label, e.g. "Mon 3"
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

/** Buckets entries into per-day totals for the last `days` days (oldest first). */
export function aggregateDailyTotals(
  entries: FoodEntryRow[],
  rangeStart: Date,
  days: number,
): DailyTotal[] {
  const buckets = new Map<string, DailyTotal>();
  for (let i = 0; i < days; i++) {
    const date = addDays(rangeStart, i);
    const key = formatDateISO(date);
    buckets.set(key, {
      date: key,
      label: date.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
      }),
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    });
  }

  for (const entry of entries) {
    const key = formatDateISO(new Date(entry.logged_at));
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.calories += entry.calories;
    bucket.proteinG += entry.protein_g;
    bucket.carbsG += entry.carbs_g;
    bucket.fatG += entry.fat_g;
  }

  return Array.from(buckets.values());
}

export type WeightPoint = { date: string; label: string; weightKg: number };

export function toWeightPoints(logs: WeightLogRow[]): WeightPoint[] {
  return logs.map((log) => {
    const date = new Date(log.logged_at);
    return {
      date: formatDateISO(date),
      label: date.toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
      weightKg: log.weight_kg,
    };
  });
}
