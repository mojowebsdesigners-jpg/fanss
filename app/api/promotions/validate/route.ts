import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail } from "@/lib/api";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { code?: string; planId?: string };
  const code = body.code?.trim().toUpperCase();
  if (!code) return fail("BAD_REQUEST", "Enter a code.");

  const { data: promo } = await supabaseAdmin()
    .from("promotions")
    .select("id, code, discount_pct, starts_at, ends_at, active, max_redemptions, redemption_count, target_plan_id")
    .eq("code", code)
    .maybeSingle();

  const now = new Date();
  const valid =
    promo &&
    promo.active &&
    new Date(promo.starts_at) <= now &&
    (!promo.ends_at || new Date(promo.ends_at) > now) &&
    (promo.max_redemptions === null || promo.redemption_count < promo.max_redemptions) &&
    (!promo.target_plan_id || promo.target_plan_id === body.planId);

  if (!valid) return fail("INVALID_PROMO", "That promo code isn't valid.");
  return ok({ code: promo!.code, discountPct: Number(promo!.discount_pct) });
}
