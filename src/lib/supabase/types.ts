// Hand-written to mirror src/db/schema.ts (Postgres column names, snake_case).
// If the schema changes, regenerate with:
//   npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts
// and re-apply the `export type Database` wrapper if needed.
//
// Every table needs `Relationships` (even if empty) and the schema needs
// `Views`/`Functions` (even if empty) — @supabase/postgrest-js's GenericTable
// / GenericSchema constraints require them, and omitting them makes every
// query silently resolve to `never` instead of a type error.

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type Goal = "cut" | "maintain" | "bulk";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type LogSource = "manual" | "barcode" | "photo";
export type UserRole = "user" | "admin";
export type UserStatus = "pending" | "approved" | "rejected" | "suspended";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          height_cm: number | null;
          sex: string | null;
          birth_year: number | null;
          activity_level: ActivityLevel | null;
          goal: Goal | null;
          role: UserRole;
          status: UserStatus;
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      targets: {
        Row: {
          id: string;
          user_id: string;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          source: string;
          effective_from: string;
        };
        Insert: Partial<Database["public"]["Tables"]["targets"]["Row"]> & {
          user_id: string;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
        };
        Update: Partial<Database["public"]["Tables"]["targets"]["Row"]>;
        Relationships: [];
      };
      food_entries: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          quantity: number;
          unit: string | null;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          meal_type: MealType;
          source: LogSource;
          barcode: string | null;
          logged_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["food_entries"]["Row"]> & {
          user_id: string;
          name: string;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
        };
        Update: Partial<Database["public"]["Tables"]["food_entries"]["Row"]>;
        Relationships: [];
      };
      weight_logs: {
        Row: {
          id: string;
          user_id: string;
          weight_kg: number;
          logged_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["weight_logs"]["Row"]> & {
          user_id: string;
          weight_kg: number;
        };
        Update: Partial<Database["public"]["Tables"]["weight_logs"]["Row"]>;
        Relationships: [];
      };
      gemini_api_keys: {
        Row: {
          id: string;
          user_id: string;
          label: string | null;
          key_value: string;
          is_active: boolean;
          created_at: string;
          last_used_at: string | null;
          last_error_at: string | null;
          last_error: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["gemini_api_keys"]["Row"]> & {
          user_id: string;
          key_value: string;
        };
        Update: Partial<Database["public"]["Tables"]["gemini_api_keys"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
