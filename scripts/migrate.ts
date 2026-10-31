import nextEnv from "@next/env";
import postgres from "postgres";
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
await sql`CREATE TABLE IF NOT EXISTS comrdy_state (key text PRIMARY KEY, payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`;
await sql.end();
console.log("COMRDY additive migrations complete");
