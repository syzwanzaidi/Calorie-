import type { ActivityLevel, Goal } from "@/lib/supabase/types";

// The Mifflin-St Jeor formula only has two branches; the `sex` column itself
// is a free-text string (spec's schema), constrained here to what the
// formula needs.
export type Sex = "male" | "female";

/**
 * TDEE / macro target calculation (spec Section 12 — resolved here).
 *
 * Formula: Mifflin-St Jeor for BMR, standard activity multipliers, and a
 * simple +/-% adjustment for cut/bulk. Protein is set relative to
 * bodyweight (appropriate for a gym-goer audience) rather than as a
 * percentage of calories, fat is a fixed % of calories, and carbs fill the
 * remainder.
 */

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2, // little or no exercise
  light: 1.375, // light exercise 1-3 days/week
  moderate: 1.55, // moderate exercise 3-5 days/week
  active: 1.725, // hard exercise 6-7 days/week
  very_active: 1.9, // very hard exercise + physical job
};

const GOAL_ADJUSTMENT: Record<Goal, number> = {
  cut: -0.2, // -20%
  maintain: 0,
  bulk: 0.15, // +15%
};

const PROTEIN_G_PER_KG: Record<Goal, number> = {
  cut: 2.0, // higher protein to preserve lean mass in a deficit
  maintain: 1.8,
  bulk: 1.8,
};

const FAT_PERCENT_OF_CALORIES = 0.28;

export function calculateBMR(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
}): number {
  const { weightKg, heightCm, age, sex } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function calculateTDEE(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
}): number {
  const bmr = calculateBMR(params);
  return bmr * ACTIVITY_MULTIPLIERS[params.activityLevel];
}

export type MacroTargets = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export function calculateTargets(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  goal: Goal;
}): MacroTargets {
  const tdee = calculateTDEE(params);
  const calories = Math.round(tdee * (1 + GOAL_ADJUSTMENT[params.goal]));

  const proteinG = Math.round(params.weightKg * PROTEIN_G_PER_KG[params.goal]);
  const fatG = Math.round((calories * FAT_PERCENT_OF_CALORIES) / 9);
  const carbsCalories = calories - proteinG * 4 - fatG * 9;
  const carbsG = Math.max(0, Math.round(carbsCalories / 4));

  return { calories, proteinG, carbsG, fatG };
}

export function ageFromBirthYear(birthYear: number): number {
  return new Date().getUTCFullYear() - birthYear;
}
