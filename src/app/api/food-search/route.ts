import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { searchProducts } from "@/lib/openfoodfacts";

export async function GET(request: NextRequest) {
  // Independent approval check (spec 3.2), even though this route sits
  // behind an already-gated page.
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.profile.status !== "approved" && user.profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ products: [] });
  }

  try {
    const products = await searchProducts(q);
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json(
      { error: "Search failed. Try again." },
      { status: 502 },
    );
  }
}
