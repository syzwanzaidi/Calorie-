import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const mealTypeEnum = pgEnum("meal_type", [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
]);
export const logSourceEnum = pgEnum("log_source", [
  "manual",
  "barcode",
  "photo",
]);
export const goalEnum = pgEnum("goal", ["cut", "maintain", "bulk"]);
export const activityLevelEnum = pgEnum("activity_level", [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
]);
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const userStatusEnum = pgEnum("user_status", [
  "pending",
  "approved",
  "rejected",
  "suspended",
]);

// Extends Supabase's auth.users with app-specific profile + access-control data.
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  displayName: text("display_name"),
  heightCm: real("height_cm"),
  sex: text("sex"),
  birthYear: integer("birth_year"),
  activityLevel: activityLevelEnum("activity_level").default("moderate"),
  goal: goalEnum("goal").default("maintain"),

  role: userRoleEnum("role").notNull().default("user"),
  status: userStatusEnum("status").notNull().default("pending"),
  approvedBy: uuid("approved_by"), // profiles.id of the admin who approved/rejected
  approvedAt: timestamp("approved_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const targets = pgTable("targets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  calories: integer("calories").notNull(),
  proteinG: integer("protein_g").notNull(),
  carbsG: integer("carbs_g").notNull(),
  fatG: integer("fat_g").notNull(),
  source: text("source").notNull().default("manual"), // 'auto' | 'manual'
  effectiveFrom: timestamp("effective_from", {
    withTimezone: true,
  }).defaultNow(),
});

export const foodEntries = pgTable("food_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: real("quantity").notNull().default(1),
  unit: text("unit"),
  calories: integer("calories").notNull(),
  proteinG: real("protein_g").notNull(),
  carbsG: real("carbs_g").notNull(),
  fatG: real("fat_g").notNull(),
  mealType: mealTypeEnum("meal_type").notNull().default("snack"),
  source: logSourceEnum("source").notNull().default("manual"),
  barcode: text("barcode"),
  loggedAt: timestamp("logged_at", { withTimezone: true }).defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const weightLogs = pgTable("weight_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  weightKg: real("weight_kg").notNull(),
  loggedAt: timestamp("logged_at", { withTimezone: true }).defaultNow(),
});

// Server-only secret store for the AI photo-analysis provider (currently
// Gemini). RLS is enabled with zero policies (see supabase/03_gemini_keys.sql)
// — not even an admin's own session can read/write this table; only the
// service-role client can, which is why every access goes through
// src/lib/data/apiKeys.ts using createAdminClient(), never the request-scoped
// client. Multiple active keys let the app fail over automatically when one
// hits its quota (src/lib/gemini.ts).
export const geminiApiKeys = pgTable("gemini_api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  label: text("label"),
  keyValue: text("key_value").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
  lastError: text("last_error"),
});

export const profilesRelations = relations(profiles, ({ many }) => ({
  targets: many(targets),
  foodEntries: many(foodEntries),
  weightLogs: many(weightLogs),
}));

export const targetsRelations = relations(targets, ({ one }) => ({
  profile: one(profiles, {
    fields: [targets.userId],
    references: [profiles.id],
  }),
}));

export const foodEntriesRelations = relations(foodEntries, ({ one }) => ({
  profile: one(profiles, {
    fields: [foodEntries.userId],
    references: [profiles.id],
  }),
}));

export const weightLogsRelations = relations(weightLogs, ({ one }) => ({
  profile: one(profiles, {
    fields: [weightLogs.userId],
    references: [profiles.id],
  }),
}));

export type Profile = typeof profiles.$inferSelect;
export type Target = typeof targets.$inferSelect;
export type NewTarget = typeof targets.$inferInsert;
export type FoodEntry = typeof foodEntries.$inferSelect;
export type NewFoodEntry = typeof foodEntries.$inferInsert;
export type WeightLog = typeof weightLogs.$inferSelect;
export type NewWeightLog = typeof weightLogs.$inferInsert;
export type GeminiApiKey = typeof geminiApiKeys.$inferSelect;
export type NewGeminiApiKey = typeof geminiApiKeys.$inferInsert;
