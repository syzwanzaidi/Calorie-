import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

// Next.js conventionally uses .env.local for real secrets (and .gitignore's
// it) — plain "dotenv/config" only loads .env, so it silently sees nothing.
dotenv.config({ path: ".env.local" });

if (!process.env.DIRECT_URL) {
  throw new Error("DIRECT_URL is not set (needed for drizzle-kit migrations)");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL,
  },
  strict: true,
  verbose: true,
});
