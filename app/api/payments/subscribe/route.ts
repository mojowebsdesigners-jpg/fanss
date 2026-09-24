import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { createPendingPayment } from "@/lib/payments/service";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized("Create a free account to subscribe.");

  const rl = rateLimit(`pay:${clientIp(req)}`, 12, 60_000);
  if (!rl.allowed) return fail("RATE_LIMITED", "Too many payment attempts. Wait a moment.", 429);

  const body = (await req.json().catch(() => ({}))) as { planId?: string; promoCode?: string };
  if (!body.planId) return fail("BAD_REQUEST", "Missing plan.");

  const { data: plan } = await supabaseAdmin()
    .from("subscription_plans")
    .select("id, name, price, active")
    .eq("id", body.planId)
    .maybeSingle();
  if (!plan || !plan.active) return fail("NOT_FOUND", "That plan is not available.");

  const { data: creator } = await supabaseAdmin()
    .from("creator_profiles")
    .select("profile_id")
    .limit(1)
    .maybeSingle();
  if (!creator) return fail("NOT_FOUND", "Creator unavailable.");

  let amount = Number(plan.price);
  let promotionId: string | null = null;

  if (body.promoCode) {
    const code = body.promoCode.trim().toUpperCase();
    const { data: promo } = await supabaseAdmin()
      .from("promotions")
      .select("id, discount_pct, starts_at, ends_at, active, max_redemptions, redemption_count, target_plan_id")
      .eq("code", code)
      .maybeSingle();
    const now = new Date();
    const valid =
      promo &&
      promo.active &&
      new Date(promo.starts_at) <= now &&
      (!promo.ends_at || new Date(promo.ends_at) > now) &&
      (promo.max_redemptions === null || promo.redemption_count < promo.max_redemptions) &&
      (!promo.target_plan_id || promo.target_plan_id === plan.id);
    if (!valid) return fail("INVALID_PROMO", "That promo code isn't valid.");
    amount = Math.max(0, Math.round(amount * (1 - promo!.discount_pct / 100)) * 100) / 100;
    promotionId = promo!.id;
  }

  if (amount <= 0) {
    return fail("INVALID_AMOUNT", "This promotion results in a free plan — contact support.");
  }

  const result = await createPendingPayment({
    type: "SUBSCRIPTION",
    userId: user.id,
    creatorId: creator.profile_id,
    referenceId: plan.id,
    amount,
    description: `${plan.name} subscription`,
    metadata: promotionId ? { promotion_id: promotionId } : {},
  });

  if ("error" in result) return fail("PAYMENT_ERROR", result.error, 502);
  return ok({
    paymentId: result.payment.id,
    invoiceUrl: result.invoiceUrl,
    amount,
  });
}
