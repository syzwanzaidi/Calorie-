// Open Food Facts REST API — free, no API key required.
// Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/

const BASE_URL = "https://world.openfoodfacts.org";
const USER_AGENT = "CaloriePlus/1.0 (+https://calorieplus.app)";
const FIELDS =
  "code,product_name,brands,quantity,serving_size,image_small_url,nutriments";

export type OFFProduct = {
  barcode: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  quantity: string | null;
  servingSize: string | null;
  /** Macros per 100g/100ml, as reported by Open Food Facts. */
  per100g: {
    calories: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeProduct(raw: any): OFFProduct | null {
  if (!raw || !raw.product_name) return null;
  const n = raw.nutriments ?? {};
  const kcal =
    n["energy-kcal_100g"] ??
    (n["energy_100g"] != null ? n["energy_100g"] / 4.184 : null);

  return {
    barcode: String(raw.code ?? ""),
    name: raw.product_name,
    brand: raw.brands ?? null,
    imageUrl: raw.image_small_url ?? null,
    quantity: raw.quantity ?? null,
    servingSize: raw.serving_size ?? null,
    per100g: {
      calories: kcal != null ? Math.round(kcal) : null,
      proteinG: n["proteins_100g"] ?? null,
      carbsG: n["carbohydrates_100g"] ?? null,
      fatG: n["fat_100g"] ?? null,
    },
  };
}

export async function searchProducts(
  query: string,
  pageSize = 20,
): Promise<OFFProduct[]> {
  const url = new URL(`${BASE_URL}/api/v2/search`);
  url.searchParams.set("search_terms", query);
  url.searchParams.set("fields", FIELDS);
  url.searchParams.set("page_size", String(pageSize));
  url.searchParams.set("sort_by", "unique_scans_n");

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    // Open Food Facts data changes slowly; cache briefly to keep search snappy.
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Open Food Facts search failed: ${res.status}`);
  const data = await res.json();
  const products = Array.isArray(data.products) ? data.products : [];
  return products
    .map(normalizeProduct)
    .filter((p: OFFProduct | null): p is OFFProduct => p !== null);
}

export async function getProductByBarcode(
  barcode: string,
): Promise<OFFProduct | null> {
  const url = new URL(`${BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}.json`);
  url.searchParams.set("fields", FIELDS);

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  return normalizeProduct({ ...data.product, code: barcode });
}

/** Scale a product's per-100g macros to a given quantity in grams/ml. */
export function scaleToQuantity(per100g: OFFProduct["per100g"], grams: number) {
  const factor = grams / 100;
  return {
    calories: Math.round((per100g.calories ?? 0) * factor),
    proteinG: Math.round((per100g.proteinG ?? 0) * factor * 10) / 10,
    carbsG: Math.round((per100g.carbsG ?? 0) * factor * 10) / 10,
    fatG: Math.round((per100g.fatG ?? 0) * factor * 10) / 10,
  };
}
