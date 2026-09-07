const MACRO_COLOR_VAR: Record<"calories" | "protein" | "carbs" | "fat", string> = {
  calories: "var(--accent)",
  protein: "var(--protein)",
  carbs: "var(--carbs)",
  fat: "var(--fat)",
};

export function Meter({
  label,
  value,
  target,
  unit,
  metric,
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  metric: "calories" | "protein" | "carbs" | "fat";
}) {
  const pct = target > 0 ? Math.min(1, Math.max(0, value / target)) : 0;
  const over = value > target;
  const color = MACRO_COLOR_VAR[metric];

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm text-text-muted">{label}</span>
        <span className="font-numeric text-sm">
          <span style={{ color }}>{Math.round(value)}</span>
          <span className="text-text-muted font-normal">
            {" "}
            / {Math.round(target)}
            {unit}
          </span>
        </span>
      </div>
      <div
        className="h-2 w-full rounded-full"
        style={{ background: "color-mix(in oklab, " + color + " 18%, transparent)" }}
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={Math.round(target)}
        aria-label={label}
      >
        <div
          className="h-2 rounded-full transition-[width]"
          style={{
            width: `${pct * 100}%`,
            background: over ? MACRO_COLOR_VAR.protein : color,
          }}
        />
      </div>
    </div>
  );
}
