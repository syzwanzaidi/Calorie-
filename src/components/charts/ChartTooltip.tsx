"use client";

// Shared tooltip styling for all Recharts charts — surface + hairline border,
// text tokens only (never the series color on the label text itself).

type Payload = {
  name?: string;
  value?: number | string;
  color?: string;
  unit?: string;
}[];

export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Payload;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-md border border-hairline bg-surface px-3 py-2 text-sm shadow-sm">
      {label && <p className="text-text-muted mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-text-muted">{entry.name}</span>
          <span className="font-numeric ml-auto pl-3">
            {entry.value}
            {entry.unit ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}
