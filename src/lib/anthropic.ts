import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// SERVER-ONLY. Never import this module from a Client Component — it reads
// ANTHROPIC_API_KEY and every caller must independently verify
// status = 'approved' first (spec 3.2), since this is the costly operation
// the approval gate exists to protect.

const client = new Anthropic();

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
than omitting it.`;

export async function analyzeFoodPhoto(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
): Promise<FoodPhotoAnalysis> {
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Image },
          },
          {
            type: "text",
            text: "Identify the food items in this photo and estimate their macros.",
          },
        ],
      },
    ],
    output_config: {
      format: zodOutputFormat(FoodPhotoAnalysisSchema),
    },
  });

  if (!response.parsed_output) {
    throw new Error("Claude did not return a parseable food analysis.");
  }
  return response.parsed_output;
}
