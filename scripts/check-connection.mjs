#!/usr/bin/env node
/* Quick REST connectivity check with the service role key. */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

for (const [name, path] of [
  ["REST (service role)", "/rest/v1/platform_settings?select=id"],
  ["Auth admin", "/auth/v1/admin/users?page=1&per_page=1"],
]) {
  try {
    const res = await fetch(url + path, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    console.log(`${res.ok ? "✔" : "✖"} ${name}: HTTP ${res.status}`);
  } catch (e) {
    console.log(`✖ ${name}: ${e.message}`);
  }
}
