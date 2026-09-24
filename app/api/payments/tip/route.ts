import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { createPendingPayment } from "@/lib/payments/service";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized("Sign in to send a tip.");

  const rl = rateLimit(`pay:${clientIp(req)}`, 12, 60_000);
  if (!rl.allowed) return fail("RATE_LIMITED", "Too many payment attempts. Wait a moment.", 429);

  const body = (await req.json().catch(() => ({}))) as { amount?: number; message?: string };
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 1 || amount > 10000) {
    return fail("INVALID_AMOUNT", "Tip amount must be between $1 and $10,000.");
  }

  const { data: settings } = await supabaseAdmin().from("platform_settings").select("tips_enabled, min_tip_amount").eq("id", 1).maybeSingle();
  if (settings && !settings.tips_enabled) return fail("DISABLED", "Tipping is currently disabled.");
  if (settings && amount < Number(settings.min_tip_amount)) {
    return fail("INVALID_AMOUNT", `Minimum tip is $${Number(settings.min_tip_amount).toFixed(2)}.`);
  }

  const { data: creator } = await supabaseAdmin().from("creator_profiles").select("profile_id").limit(1).maybeSingle();
  if (!creator) return fail("NOT_FOUND", "Creator unavailable.");

  const result = await createPendingPayment({
    type: "TIP",
    userId: user.id,
    creatorId: creator.profile_id,
    referenceId: crypto.randomUUID(), // tip gets its own id on fulfillment
    amount,
    description: `Tip to the creator`,
    metadata: body.message ? { tip_message: body.message.slice(0, 500) } : {},
  });

  if ("error" in result) return fail("PAYMENT_ERROR", result.error, 502);
  return ok({ paymentId: result.payment.id, invoiceUrl: result.invoiceUrl });
}
