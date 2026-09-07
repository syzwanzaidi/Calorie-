import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { analyzeFoodPhoto } from "@/lib/gemini";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

// Vision + structured-output extraction can take longer than the platform
// default (10s on Vercel), more so with the retry/fallback in src/lib/gemini.ts
// (observed up to ~20s under real overload during testing). Raise this
// route's ceiling; actual enforced cap still depends on your Vercel plan.
export const maxDuration = 45;

export async function POST(request: NextRequest) {
  // Spec 3.2: this is the costly operation the approval gate exists to
  // protect, so it MUST independently re-verify status = 'approved' here,
  // not just rely on the proxy having gated the page that links to it.
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.profile.status !== "approved" && user.profile.role !== "admin") {
    return NextResponse.json(
      { error: "Your account isn't approved yet." },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No photo provided." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported image type. Use JPEG, PNG, or WebP." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo is too large (max 8MB)." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  try {
    const analysis = await analyzeFoodPhoto(
      base64,
      file.type as "image/jpeg" | "image/png" | "image/webp",
    );
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Photo analysis failed", err);
    const status = (err as { status?: number } | undefined)?.status;
    const overloaded = status === 429 || status === 503;
    return NextResponse.json(
      {
        error: overloaded
          ? "Gemini is under heavy load right now (common on the free tier). Wait a few seconds and try again, or log it manually."
          : "Couldn't analyze that photo. Try again or log it manually.",
      },
      { status: 502 },
    );
  }
}
