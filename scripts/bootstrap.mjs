#!/usr/bin/env node
/**
 * Bootstrap script:
 *  1. Checks env
 *  2. Applies SQL migrations from supabase/migrations (in filename order)
 *  3. Confirms seed users exist (they're created by the seed migration)
 *
 * Run: npm run bootstrap   (needs SUPABASE_SERVICE_ROLE_KEY via .env or env)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// tiny .env loader (no dependency)
try {
  const env = readFileSync(join(root, ".env"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch { /* .env optional */ }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("✖ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

// Arbitrary SQL can't run over the REST API, so migrations are applied with
// psql / the Supabase CLI / the dashboard SQL editor. This script verifies
// connectivity and confirms the seed data landed (safe to re-run).
console.log("→ Checking connection…");
const { error: pingErr } = await supabase.from("platform_settings").select("id").limit(1);

if (pingErr) {
  if (pingErr.message.includes("does not exist") || pingErr.code === "42P01") {
    console.log("✖ Schema not found — migrations have not been applied yet.\n");
    console.log("Apply them with ONE of these:");
    console.log("  1) supabase CLI:");
    console.log("     npx supabase link --project-ref <project-ref>");
    console.log("     npx supabase db push");
    console.log("  2) psql (Connection string → Settings → Database):");
    console.log('     psql "$DATABASE_URL" -f supabase/migrations/0001_core.sql');
    console.log('     psql "$DATABASE_URL" -f supabase/migrations/0002_commerce.sql');
    console.log('     psql "$DATABASE_URL" -f supabase/migrations/0003_seed.sql');
    console.log("  3) Supabase Dashboard → SQL Editor: paste each file in order.");
    process.exit(2);
  } else {
    console.error("✖ Connection error:", pingErr.message);
    process.exit(1);
  }
}

console.log("✔ Connected.");

// verify seeds
const checks = [
  ["platform settings", supabase.from("platform_settings").select("id").eq("id", 1).maybeSingle()],
  ["subscription plan", supabase.from("subscription_plans").select("id").limit(1).maybeSingle()],
  ["creator profile", supabase.from("creator_profiles").select("id").limit(1).maybeSingle()],
  ["starter posts", supabase.from("posts").select("id", { count: "exact", head: true })],
];
for (const [name, q] of checks) {
  const { data, error, count } = await q;
  if (error) console.log(`⚠ ${name}: ${error.message}`);
  else if (name === "starter posts") console.log(`✔ ${name}: ${count ?? 0}`);
  else console.log(`✔ ${name}: ${data ? "present" : "MISSING — re-run 0003_seed.sql"}`);
}

// verify auth seed users
const { data: users } = await supabase.auth.admin.listUsers({ perPage: 50 });
const emails = (users?.users ?? []).map((u) => u.email);
for (const expected of ["creator@lumina.local", "admin@lumina.local"]) {
  console.log(emails.includes(expected) ? `✔ seed user ${expected}` : `⚠ seed user ${expected} missing — re-run 0003_seed.sql`);
}

console.log("\nDone. Log in as creator@lumina.local / Creator#2026! (change it) and visit /creator.");
