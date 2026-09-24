// One-off: re-run 0001_core.sql and report the exact error offset.
import { readFileSync } from "node:fs";
import pg from "pg";

const conn = process.argv[2];
const client = new pg.Client({
  connectionString: conn,
  ssl: conn.includes("localhost") ? false : { rejectUnauthorized: false },
});
await client.connect();
const sql = readFileSync("supabase/migrations/0001_core.sql", "utf8");
try {
  await client.query(sql);
  console.log("OK?!");
} catch (e) {
  console.log("message :", e.message);
  console.log("code    :", e.code);
  console.log("position:", e.position);
  const pos = Number(e.position);
  if (pos > 0) {
    const start = Math.max(0, pos - 120);
    console.log("--- context around position ---");
    console.log(JSON.stringify(sql.slice(start, pos)) + "  <<[ERROR HERE]>>  " + JSON.stringify(sql.slice(pos, pos + 120)));
  }
}
await client.end();
