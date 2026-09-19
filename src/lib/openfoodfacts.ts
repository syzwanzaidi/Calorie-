// Open Food Facts — free, no API key required.
//
// Two different services, deliberately:
// - Search: search.openfoodfacts.org ("Search-a-licious", their newer
//   Elasticsearch-backed search). The legacy world.openfoodfacts.org
//   /api/v2/search endpoint (and /cgi/search.pl) turned out to be
//   unreliable in practice — verified live: it returned 503s under normal
//   load, and even when it returned 200 its `search_terms` filter was
//   silently not applied (unrelated queries came back with identical
//   results). Search-a-licious does not have either problem and also
//   returns noticeably better results for non-Western queries (verified
//   against Malaysian food terms — "teh tarik", "kopi o", "milo ais" all
//   correctly surfaced en:malaysia-tagged products; the old endpoint did not).
// - Barcode lookup: world.openfoodfacts.org/api/v2/product/{barcode}.json —
//   this one has always been reliable and is unaffected by the search issue.
//
// Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
//       https://search.openfoodfacts.org/docs

const PRODUCT_BASE_URL = "https://world.openfoodfacts.org";
const SEARCH_BASE_URL = "https://search.openfoodfacts.org";
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

  // The product-lookup endpoint returns `brands` as a comma-separated
  // string; Search-a-licious returns it as a string array. Normalize both.
  const brand = Array.isArray(raw.brands)
    ? raw.brands.join(", ") || null
    : (raw.brands ?? null);

  return {
    barcode: String(raw.code ?? ""),
    name: raw.product_name,
    brand,
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
  const url = new URL(`${SEARCH_BASE_URL}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("fields", FIELDS);
  url.searchParams.set("page_size", String(pageSize));

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    // Open Food Facts data changes slowly; cache briefly to keep search snappy.
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Open Food Facts search failed: ${res.status}`);
  const data = await res.json();
  const hits = Array.isArray(data.hits) ? data.hits : [];
  return hits
    .map(normalizeProduct)
    .filter((p: OFFProduct | null): p is OFFProduct => p !== null);
}

export async function getProductByBarcode(
  barcode: string,
): Promise<OFFProduct | null> {
  const url = new URL(
    `${PRODUCT_BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}.json`,
  );
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
