import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

// SERVER-ONLY. Never import this module from a Client Component — it reads
// GEMINI_API_KEY and every caller must independently verify
// status = 'approved' first (spec 3.2), since this is the operation the
// approval gate exists to protect.
//
// Swapped from the Claude API to the Gemini API (free tier available) at
// the user's request — see the photo-logging note in README.md.

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Fast, multimodal, current as of this build (verified against the live
// ListModels endpoint, not just docs — Gemini's model line moves quickly).
// A free-tier key gets lower scheduling priority than a paid one, so the
// newest model occasionally comes back 503 "high demand" under load — tried
// live during development. MODELS is an ordered fallback chain, and each is
// retried with backoff before moving to the next, rather than failing the
// whole request on one transient overload.
const MODELS = ["gemini-3.8-flash", "gemini-2.5-flash"];
const RETRYABLE_STATUS = new Set([429, 503]);
// Kept low: each attempt while overloaded can itself take several seconds
// (observed up to ~20s total for 2 attempts during testing), and this all
// has to fit inside the route's maxDuration on Vercel.
const RETRIES_PER_MODEL = 1;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function statusOf(err: unknown): number | undefined {
  return (err as { status?: number } | undefined)?.status;
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

async function generateWithFallback(
  base64Image: string,
  mediaType: string,
) {
  let lastErr: unknown;

  for (const model of MODELS) {
    for (let attempt = 0; attempt <= RETRIES_PER_MODEL; attempt++) {
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
          },
        });
      } catch (err) {
        lastErr = err;
        const retryable = RETRYABLE_STATUS.has(statusOf(err) ?? 0);
        if (!retryable) break; // not a transient-overload error — try the next model, don't waste retries
        if (attempt < RETRIES_PER_MODEL) {
          await sleep(500 * 2 ** attempt); // 500ms, then 1s
        }
      }
    }
  }

  throw lastErr;
}

export async function analyzeFoodPhoto(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
): Promise<FoodPhotoAnalysis> {
  const response = await generateWithFallback(base64Image, mediaType);

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
