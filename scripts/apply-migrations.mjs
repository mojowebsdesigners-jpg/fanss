#!/usr/bin/env node
/**
 * Applies supabase/migrations/*.sql to the Supabase Postgres database via the
 * session-pooler connection string. Idempotent for re-runs (migrations use
 * IF NOT EXISTS / ON CONFLICT).
 *
 * Usage: node scripts/apply-migrations.mjs "<postgres-connection-string>"
 * Get the string from Supabase → Project Settings → Database → Connection
 * string → "Session pooler" (recommended) or use the direct connection.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// load .env for SUPABASE_DB_URL convenience
try {
  const env = readFileSync(join(root, ".env"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* optional */ }

const conn = process.argv[2] || process.env.SUPABASE_DB_URL;
if (!conn) {
  console.error("Usage: node scripts/apply-migrations.mjs \"<connection-string>\"");
  console.error("Or set SUPABASE_DB_URL in .env");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: conn,
  ssl: conn.includes("localhost") ? false : { rejectUnauthorized: false },
});

const dir = join(root, "supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

await client.connect();
console.log(`Connected. Applying ${files.length} migration(s)…\n`);

for (const file of files) {
  const sql = readFileSync(join(dir, file), "utf8");
  process.stdout.write(`→ ${file} … `);
  try {
    await client.query(sql);
    console.log("OK");
  } catch (e) {
    console.log("FAILED");
    console.error(`\nError in ${file}:\n${e.message}\n`);
    await client.end();
    process.exit(1);
  }
}

// quick verification
const checks = [
  ["platform_settings", "select id from platform_settings where id = 1"],
  ["subscription_plans", "select count(*) as n from subscription_plans"],
  ["creator_profiles", "select count(*) as n from creator_profiles"],
  ["posts", "select count(*) as n from posts"],
  ["seed users", "select count(*) as n from auth.users where email in ('creator@lumina.local','admin@lumina.local')"],
  ["buckets", "select count(*) as n from storage.buckets where id in ('avatars','branding','vault')"],
];
console.log("\nVerification:");
for (const [name, q] of checks) {
  try {
    const { rows } = await client.query(q);
    const v = rows[0]?.id ?? rows[0]?.n;
    console.log(`  ✔ ${name}: ${v}`);
  } catch (e) {
    console.log(`  ✖ ${name}: ${e.message}`);
  }
}

await client.end();
console.log("\nDone. Log in as creator@lumina.local / Creator#2026! (change it!)");
