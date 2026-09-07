import { requireApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getEntriesInRange } from "@/lib/data/entries";
import { getCurrentTargets } from "@/lib/data/targets";
import { getWeightLogsInRange } from "@/lib/data/weight";
import { addDays, dayRange } from "@/lib/date";
import { aggregateDailyTotals, toWeightPoints } from "@/lib/data/trends";
import { CaloriesTrendChart } from "@/components/charts/CaloriesTrendChart";
import { MacroTrendChart } from "@/components/charts/MacroTrendChart";
import { WeightTrendChart } from "@/components/charts/WeightTrendChart";

const DAYS = 14;
const WEIGHT_DAYS = 90;

export default async function TrendsPage() {
  const user = await requireApproved();
  const supabase = await createClient();

  const { start: todayStart, end: todayEnd } = dayRange(new Date());
  const rangeStart = addDays(todayStart, -(DAYS - 1));
  const weightRangeStart = addDays(todayStart, -(WEIGHT_DAYS - 1));

  const [entries, targets, weightLogs] = await Promise.all([
    getEntriesInRange(supabase, user.id, rangeStart, todayEnd),
    getCurrentTargets(supabase, user.id),
    getWeightLogsInRange(supabase, user.id, weightRangeStart, todayEnd),
  ]);

  const daily = aggregateDailyTotals(entries, rangeStart, DAYS);
  const weightPoints = toWeightPoints(weightLogs);

  return (
    <div className="space-y-6">
      <h1 className="text-lg text-text-muted">Last {DAYS} days</h1>
      <CaloriesTrendChart data={daily} target={targets?.calories ?? null} />
      <MacroTrendChart data={daily} />
      <WeightTrendChart data={weightPoints} />
    </div>
  );
}
