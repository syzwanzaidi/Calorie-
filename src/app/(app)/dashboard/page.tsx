import Link from "next/link";
import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getEntriesForDay, getRecentEntries } from "@/lib/data/entries";
import { getCurrentTargets } from "@/lib/data/targets";
import { dayRange } from "@/lib/date";
import { Meter } from "@/components/Meter";
import { EntryList } from "@/components/EntryList";
import { QuickRelog } from "@/components/QuickRelog";

export default async function DashboardPage() {
  const user = await requireApproved();
  const supabase = await createClient();

  const { start, end } = dayRange(new Date());
  const [entries, targets, recent] = await Promise.all([
    getEntriesForDay(supabase, user.id, start, end),
    getCurrentTargets(supabase, user.id),
    getRecentEntries(supabase, user.id),
  ]);

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      proteinG: acc.proteinG + e.protein_g,
      carbsG: acc.carbsG + e.carbs_g,
      fatG: acc.fatG + e.fat_g,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  const remaining = targets ? targets.calories - totals.calories : null;

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-lg text-text-muted">Today</h1>
          {remaining !== null && (
            <p className="font-numeric text-3xl">
              {remaining >= 0 ? remaining : 0}
              <span className="text-sm text-text-muted font-normal ml-1">
                kcal {remaining >= 0 ? "remaining" : "over"}
              </span>
            </p>
          )}
        </div>

        {!targets ? (
          <p className="text-sm text-text-muted border border-hairline rounded-md px-4 py-3">
            No targets set yet.{" "}
            <Link href="/settings" className="text-accent underline">
              Set up your calorie and macro targets
            </Link>{" "}
            to see progress here.
          </p>
        ) : (
          <div className="space-y-4 border border-hairline rounded-md p-4">
            <Meter
              label="Calories"
              value={totals.calories}
              target={targets.calories}
              unit=""
              metric="calories"
            />
            <Meter
              label="Protein"
              value={totals.proteinG}
              target={targets.protein_g}
              unit="g"
              metric="protein"
            />
            <Meter
              label="Carbs"
              value={totals.carbsG}
              target={targets.carbs_g}
              unit="g"
              metric="carbs"
            />
            <Meter
              label="Fat"
              value={totals.fatG}
              target={targets.fat_g}
              unit="g"
              metric="fat"
            />
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg">Log food</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/log/search"
            className="rounded-md border border-hairline px-4 py-3 text-center text-sm hover:border-accent"
          >
            Search
          </Link>
          <Link
            href="/log/scan"
            className="rounded-md border border-hairline px-4 py-3 text-center text-sm hover:border-accent"
          >
            Scan barcode
          </Link>
          <Link
            href="/log/photo"
            className="rounded-md border border-hairline px-4 py-3 text-center text-sm hover:border-accent"
          >
            Photo
          </Link>
        </div>
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="text-lg mb-3">Quick re-log</h2>
          <QuickRelog entries={recent} />
        </section>
      )}

      <section>
        <h2 className="text-lg mb-3">Today&apos;s entries</h2>
        <EntryList entries={entries} />
      </section>
    </div>
  );
}
