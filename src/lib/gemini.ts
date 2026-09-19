import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import {
  listActiveKeysForUser,
  listAdminFallbackKeys,
  markGeminiKeyUsed,
  markGeminiKeyError,
  type GeminiApiKeyRow,
} from "@/lib/data/apiKeys";

// SERVER-ONLY. Never import this module from a Client Component — every
// caller must independently verify status = 'approved' first (spec 3.2),
// since this is the operation the approval gate exists to protect.
//
// Swapped from the Claude API to the Gemini API (free tier available) at
// the user's request — see the photo-logging note in README.md. Keys are
// per-user, managed at Settings → AI photo analysis, not a single env var —
// each user brings their own so one person's usage can't eat into another's
// free-tier quota (see src/lib/data/apiKeys.ts). Resolution order per call:
// the calling user's own active keys, then an admin's as a fallback for
// someone who hasn't added their own yet, then GEMINI_API_KEY as a last
// resort. Within each key, the model/retry chain below still applies.

// Fast, multimodal, current as of this build (verified against the live
// ListModels endpoint, not just docs — Gemini's model line moves quickly).
// A free-tier key gets lower scheduling priority than a paid one, so the
// newest model occasionally comes back 429/503 under load — tried live
// during development. MODELS is an ordered fallback chain tried per key.
const MODELS = ["gemini-3.8-flash", "gemini-2.5-flash"];
const RETRYABLE_STATUS = new Set([429, 503]);

// The @google/genai SDK retries 429/5xx internally BY DEFAULT — up to 5
// attempts with backoff up to 60s — completely invisible to the caller.
// Stacked under this module's own model/key fallback, that turned one real
// test into a 131-SECOND call (measured live) before finally succeeding,
// which would blow well past any Vercel function timeout. Every call below
// disables that (`retryOptions: { attempts: 1 }`) and sets an explicit
// per-request ceiling instead, so *this* module is the only thing retrying.
const PER_CALL_TIMEOUT_MS = 12_000;
// Soft wall-clock budget for the whole operation (all keys, all models),
// leaving margin under the route's maxDuration (45s) — see
// src/app/api/log/photo/route.ts. Checked before each individual attempt so
// it holds regardless of how many keys a user has configured.
const TOTAL_DEADLINE_MS = 38_000;

function statusOf(err: unknown): number | undefined {
  return (err as { status?: number } | undefined)?.status;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const FoodPhotoItemSchema = z.object({
  name: z.string().describe("The food or drink item's name"),
  estimatedQuantity: z
    .string()
    .describe('Estimated portion, e.g. "1 cup", "150g", "1 medium banana"'),
  calories: z.number().describe("Estimated calories for this portion"),
  proteinG: z.number().describe("Estimated protein in grams for this portion"),
  carbsG: z.number().describe("Estimated carbohydrates in grams for this portion"),
  fatG: z.number().describe("Estimated fat in grams for this portion"),
  confidence: z
    .enum(["low", "medium", "high"])
    .describe("How confident the estimate is, given what's visible in the photo"),
});

const FoodPhotoAnalysisSchema = z.object({
  items: z
    .array(FoodPhotoItemSchema)
    .describe("Every distinct food/drink item visible in the photo"),
  notes: z
    .string()
    .nullable()
    .describe(
      "Any caveats worth surfacing to the user, e.g. obscured items, mixed dishes that are hard to separate. Null if none.",
    ),
});

export type FoodPhotoAnalysis = z.infer<typeof FoodPhotoAnalysisSchema>;

const SYSTEM_PROMPT = `You are a nutrition estimation assistant for a calorie-tracking app. \
Given a photo of food, identify each distinct food/drink item and estimate its \
portion size and macros (calories, protein, carbs, fat) as eaten. Use standard \
nutrition knowledge and visual portion cues (plate size, utensils, packaging). \
Be conservative and realistic — this is a draft the user will review and edit \
before saving, never auto-saved, so it's fine to be approximate. If you can't \
tell what something is, make your best guess and mark confidence "low" rather \
than omitting it. Respond with JSON matching the given schema only.`;

/**
 * Tries every model in MODELS against a single API key, each attempt capped
 * at PER_CALL_TIMEOUT_MS with the SDK's own retrying disabled (see the note
 * above `PER_CALL_TIMEOUT_MS`). Stops early — without making a doomed
 * request — once `deadline` has passed.
 */
async function generateWithOneKey(
  apiKey: string,
  base64Image: string,
  mediaType: string,
  deadline: number,
) {
  const ai = new GoogleGenAI({ apiKey });
  let lastErr: unknown;

  for (const model of MODELS) {
    if (Date.now() >= deadline) {
      throw lastErr ?? new Error("Timed out before this key could be tried.");
    }
    try {
      return await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: base64Image, mimeType: mediaType } },
              {
                text: "Identify the food items in this photo and estimate their macros.",
              },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(FoodPhotoAnalysisSchema),
          httpOptions: {
            timeout: PER_CALL_TIMEOUT_MS,
            retryOptions: { attempts: 1 }, // 1 = no SDK-internal retry
          },
        },
      });
    } catch (err) {
      lastErr = err;
      if (!RETRYABLE_STATUS.has(statusOf(err) ?? 0)) break; // not transient — no point trying the next model either
    }
  }

  throw lastErr;
}

/**
 * Tries the calling user's own active keys first (oldest-added first), then
 * falls back to an admin's keys, then GEMINI_API_KEY, each against the full
 * model/retry chain above. A key that fails is recorded (fire-and-forget —
 * never blocks the request on a logging write) and the next candidate is
 * tried, so one exhausted key degrades the app to "a bit slower" rather
 * than "photo logging is down," as long as some key somewhere still works.
 */
async function generateWithFallback(
  userId: string,
  base64Image: string,
  mediaType: string,
) {
  const adminClient = createAdminClient();
  let ownKeys: GeminiApiKeyRow[] = [];
  let fallbackKeys: GeminiApiKeyRow[] = [];
  try {
    [ownKeys, fallbackKeys] = await Promise.all([
      listActiveKeysForUser(adminClient, userId),
      listAdminFallbackKeys(adminClient, userId),
    ]);
  } catch {
    // DB unreachable — fall through to the env var below rather than fail outright.
  }

  // Env var acts as a bootstrap/safety-net key, tried last, in case no keys
  // are configured yet or the table is temporarily unreachable.
  const envKey = process.env.GEMINI_API_KEY;
  const allDbKeys = [...ownKeys, ...fallbackKeys];
  const candidates: { id: string | null; keyValue: string }[] = [
    ...allDbKeys.map((k) => ({ id: k.id, keyValue: k.key_value })),
    ...(envKey && !allDbKeys.some((k) => k.key_value === envKey)
      ? [{ id: null, keyValue: envKey }]
      : []),
  ];

  if (candidates.length === 0) {
    throw new Error(
      "No Gemini API key configured. Add one at Settings → AI photo analysis.",
    );
  }

  const deadline = Date.now() + TOTAL_DEADLINE_MS;
  let lastErr: unknown;
  for (const candidate of candidates) {
    if (Date.now() >= deadline) break; // out of time — stop before another doomed attempt
    try {
      const response = await generateWithOneKey(
        candidate.keyValue,
        base64Image,
        mediaType,
        deadline,
      );
      if (candidate.id) void markGeminiKeyUsed(adminClient, candidate.id);
      return response;
    } catch (err) {
      lastErr = err;
      if (candidate.id) {
        void markGeminiKeyError(adminClient, candidate.id, messageOf(err));
      }
    }
  }

  throw lastErr;
}

export async function analyzeFoodPhoto(
  userId: string,
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
): Promise<FoodPhotoAnalysis> {
  const response = await generateWithFallback(userId, base64Image, mediaType);

  const text = response.text;
  if (!text) {
    throw new Error("Gemini did not return a response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned a non-JSON response.");
  }

  const result = FoodPhotoAnalysisSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Gemini's response didn't match the expected shape: ${result.error.message}`,
    );
  }
  return result.data;
}
