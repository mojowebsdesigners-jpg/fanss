import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, forbidden } from "@/lib/api";

export async function PATCH(req: NextRequest) {
  const admin = await getSessionUser();
  if (admin?.profile.role !== "ADMIN") return forbidden();

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const allowed: Record<string, unknown> = {};

  const stringFields = ["platform_name", "messaging_policy"];
  for (const f of stringFields) {
    if (typeof body[f] === "string") allowed[f] = (body[f] as string).slice(0, 60);
  }
  const boolFields = [
    "messaging_enabled", "comments_enabled", "tips_enabled", "ppv_enabled",
    "bundles_enabled", "promotions_enabled", "maintenance_mode", "age_gate_required",
  ];
  for (const f of boolFields) {
    if (typeof body[f] === "boolean") allowed[f] = body[f];
  }
  if (typeof body.min_tip_amount === "number") allowed.min_tip_amount = body.min_tip_amount;
  if (Array.isArray(body.reminder_days)) {
    allowed.reminder_days = (body.reminder_days as unknown[]).filter((n) => typeof n === "number").slice(0, 5);
  }

  await supabaseAdmin().from("platform_settings").update(allowed).eq("id", 1);

  await supabaseAdmin().from("admin_actions").insert({
    admin_id: admin.id,
    action: "SETTINGS_CHANGED",
    target_type: "platform_settings",
    target_id: "1",
    details: allowed,
  });

  return ok({ saved: true });
}
