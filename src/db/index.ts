import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __calorieplus_pg_client: postgres.Sql | undefined;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Reuse the connection across hot reloads in dev to avoid exhausting the
// Supabase pooler's connection limit.
const client =
  global.__calorieplus_pg_client ??
  postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== "production") {
  global.__calorieplus_pg_client = client;
}

export const db = drizzle(client, { schema });
