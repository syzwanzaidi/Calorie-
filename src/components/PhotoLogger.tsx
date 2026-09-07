"use client";

import { useRef, useState } from "react";
import { logFoodAction } from "@/app/(app)/log/actions";
import type { MealType } from "@/lib/supabase/types";

type DraftItem = {
  name: string;
  estimatedQuantity: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: "low" | "medium" | "high";
  mealType: MealType;
  logged: boolean;
};

const CONFIDENCE_LABEL: Record<DraftItem["confidence"], string> = {
  low: "Low confidence — check this",
  medium: "Medium confidence",
  high: "High confidence",
};

export function PhotoLogger() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [items, setItems] = useState<DraftItem[] | null>(null);

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((prev) =>
      prev
        ? prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
        : prev,
    );
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setItems(null);
    setNotes(null);
    setPreviewUrl(URL.createObjectURL(file));
    setAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/log/photo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't analyze that photo.");
        return;
      }
      setItems(
        (data.items as Omit<DraftItem, "mealType" | "logged">[]).map((item) => ({
          ...item,
          mealType: "snack" as MealType,
          logged: false,
        })),
      );
      setNotes(data.notes ?? null);
    } catch {
      setError("Couldn't analyze that photo. Check your connection and try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-md border border-hairline px-4 py-3 text-sm hover:border-accent"
        >
          {previewUrl ? "Take/choose a different photo" : "Take or upload a photo"}
        </button>

        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Food photo preview"
            className="max-h-64 w-full rounded-md border border-hairline object-cover"
          />
        )}
      </div>

      {analyzing && <p className="text-sm text-text-muted">Analyzing photo…</p>}
      {error && (
        <p className="text-sm text-protein" role="alert">
          {error}
        </p>
      )}
      {notes && <p className="text-sm text-text-muted">{notes}</p>}

      {items && items.length === 0 && (
        <p className="text-sm text-text-muted">
          Couldn&apos;t identify any food in that photo. Try a clearer shot or log
          it manually.
        </p>
      )}

      {items && items.length > 0 && (
        <ul className="space-y-4">
          {items.map((item, i) => (
            <li
              key={i}
              className={`border border-hairline rounded-md p-4 space-y-3 ${
                item.logged ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-text-muted">{item.estimatedQuantity}</p>
                </div>
                <span
                  className={`shrink-0 text-xs rounded-full px-2 py-1 ${
                    item.confidence === "low"
                      ? "text-protein"
                      : "text-text-muted"
                  }`}
                  style={{
                    border: "1px solid var(--hairline)",
                  }}
                >
                  {CONFIDENCE_LABEL[item.confidence]}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <label className="text-xs text-text-muted">
                  Calories
                  <input
                    type="number"
                    value={item.calories}
                    disabled={item.logged}
                    onChange={(e) =>
                      updateItem(i, { calories: Number(e.target.value) || 0 })
                    }
                    className="mt-1 w-full rounded-md border border-hairline bg-surface px-2 py-1 font-numeric text-sm"
                  />
                </label>
                <label className="text-xs" style={{ color: "var(--protein)" }}>
                  Protein
                  <input
                    type="number"
                    value={item.proteinG}
                    disabled={item.logged}
                    onChange={(e) =>
                      updateItem(i, { proteinG: Number(e.target.value) || 0 })
                    }
                    className="mt-1 w-full rounded-md border border-hairline bg-surface px-2 py-1 font-numeric text-sm"
                  />
                </label>
                <label className="text-xs" style={{ color: "var(--carbs)" }}>
                  Carbs
                  <input
                    type="number"
                    value={item.carbsG}
                    disabled={item.logged}
                    onChange={(e) =>
                      updateItem(i, { carbsG: Number(e.target.value) || 0 })
                    }
                    className="mt-1 w-full rounded-md border border-hairline bg-surface px-2 py-1 font-numeric text-sm"
                  />
                </label>
                <label className="text-xs" style={{ color: "var(--fat)" }}>
                  Fat
                  <input
                    type="number"
                    value={item.fatG}
                    disabled={item.logged}
                    onChange={(e) =>
                      updateItem(i, { fatG: Number(e.target.value) || 0 })
                    }
                    className="mt-1 w-full rounded-md border border-hairline bg-surface px-2 py-1 font-numeric text-sm"
                  />
                </label>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={item.mealType}
                  disabled={item.logged}
                  onChange={(e) =>
                    updateItem(i, { mealType: e.target.value as MealType })
                  }
                  className="rounded-md border border-hairline bg-surface px-2 py-1.5 text-sm"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>

                <form
                  action={async (formData) => {
                    await logFoodAction({ error: null }, formData);
                    updateItem(i, { logged: true });
                  }}
                  className="flex-1"
                >
                  <input type="hidden" name="name" value={item.name} />
                  <input type="hidden" name="quantity" value="1" />
                  <input type="hidden" name="unit" value={item.estimatedQuantity} />
                  <input type="hidden" name="calories" value={item.calories} />
                  <input type="hidden" name="proteinG" value={item.proteinG} />
                  <input type="hidden" name="carbsG" value={item.carbsG} />
                  <input type="hidden" name="fatG" value={item.fatG} />
                  <input type="hidden" name="mealType" value={item.mealType} />
                  <input type="hidden" name="source" value="photo" />
                  <button
                    type="submit"
                    disabled={item.logged}
                    className="w-full rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-black disabled:opacity-60"
                  >
                    {item.logged ? "Logged" : "Log it"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
