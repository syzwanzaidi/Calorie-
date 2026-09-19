"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { logFoodAction } from "@/app/(app)/log/actions";
import { scaleToQuantity, type OFFProduct } from "@/lib/openfoodfacts";
import type { MealType } from "@/lib/supabase/types";
import { EntryForm } from "@/components/EntryForm";

export function SearchLogger({ initialProduct }: { initialProduct?: OFFProduct }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OFFProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [manual, setManual] = useState(false);
  const [selected, setSelected] = useState<OFFProduct | null>(
    initialProduct ?? null,
  );
  const [quantity, setQuantity] = useState(100);
  const [mealType, setMealType] = useState<MealType>("snack");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) return;
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/food-search?q=${encodeURIComponent(query)}`,
        );
        const data = await res.json();
        setResults(data.products ?? []);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Derived, not stored — avoids syncing "clear results" state from an effect.
  const visibleResults = query.trim().length < 2 ? [] : results;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await logFoodAction({ error: null }, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setSelected(null);
      setQuery("");
      setResults([]);
    });
  }

  if (selected) {
    const scaled = scaleToQuantity(selected.per100g, quantity);
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="text-sm text-text-muted hover:text-text"
        >
          ← Back to results
        </button>

        <div className="border border-hairline rounded-md p-4">
          <p className="font-medium">{selected.name}</p>
          {selected.brand && (
            <p className="text-sm text-text-muted">{selected.brand}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" htmlFor="quantity-g">
              Quantity (g)
            </label>
            <input
              id="quantity-g"
              type="number"
              min="1"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 0)}
              className="w-full rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm mb-1" htmlFor="meal-type">
              Meal
            </label>
            <select
              id="meal-type"
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className="w-full rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="font-numeric text-lg">{scaled.calories}</p>
              <p className="text-xs text-text-muted">kcal</p>
            </div>
            <div>
              <p className="font-numeric text-lg" style={{ color: "var(--protein)" }}>
                {scaled.proteinG}
              </p>
              <p className="text-xs text-text-muted">protein</p>
            </div>
            <div>
              <p className="font-numeric text-lg" style={{ color: "var(--carbs)" }}>
                {scaled.carbsG}
              </p>
              <p className="text-xs text-text-muted">carbs</p>
            </div>
            <div>
              <p className="font-numeric text-lg" style={{ color: "var(--fat)" }}>
                {scaled.fatG}
              </p>
              <p className="text-xs text-text-muted">fat</p>
            </div>
          </div>

          <input type="hidden" name="name" value={selected.name} />
          <input type="hidden" name="quantity" value={quantity} />
          <input type="hidden" name="unit" value="g" />
          <input type="hidden" name="calories" value={scaled.calories} />
          <input type="hidden" name="proteinG" value={scaled.proteinG} />
          <input type="hidden" name="carbsG" value={scaled.carbsG} />
          <input type="hidden" name="fatG" value={scaled.fatG} />
          <input type="hidden" name="mealType" value={mealType} />
          <input type="hidden" name="source" value="manual" />
          {selected.barcode && (
            <input type="hidden" name="barcode" value={selected.barcode} />
          )}

          {error && (
            <p className="text-sm text-protein" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-accent px-3 py-2 font-medium text-black disabled:opacity-60"
          >
            {isPending ? "Logging…" : "Log it"}
          </button>
        </form>
      </div>
    );
  }

  if (manual) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setManual(false)}
          className="text-sm text-text-muted hover:text-text"
        >
          ← Back to search
        </button>
        <EntryForm
          action={logFoodAction}
          submitLabel="Log it"
          initial={{
            name: query,
            quantity: 1,
            unit: "",
            calories: 0,
            proteinG: 0,
            carbsG: 0,
            fatG: 0,
            mealType: "snack",
            source: "manual",
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search for a food…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        className="w-full rounded-md border border-hairline bg-surface px-3 py-2 outline-none focus:border-accent"
      />

      <p className="text-sm text-text-muted">
        Cooked dishes (nasi lemak, roti canai from a stall…) won&apos;t show up
        here — Open Food Facts only covers packaged products with a barcode.{" "}
        <button
          type="button"
          onClick={() => setManual(true)}
          className="text-accent underline"
        >
          Log it manually
        </button>{" "}
        instead, or try the photo scanner.
      </p>

      {searching && <p className="text-sm text-text-muted">Searching…</p>}

      <ul className="divide-y divide-hairline border border-hairline rounded-md empty:border-none empty:divide-none">
        {visibleResults.map((product, i) => (
          <li key={`${product.barcode}-${i}`}>
            <button
              type="button"
              onClick={() => {
                setSelected(product);
                setQuantity(100);
              }}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-surface"
            >
              <div className="min-w-0">
                <p className="truncate">{product.name}</p>
                {product.brand && (
                  <p className="truncate text-xs text-text-muted">
                    {product.brand}
                  </p>
                )}
              </div>
              <span className="shrink-0 font-numeric text-sm text-text-muted">
                {product.per100g.calories ?? "—"} kcal/100g
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
