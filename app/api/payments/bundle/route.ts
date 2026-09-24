import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, unauthorized, notFound } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { createPendingPayment } from "@/lib/payments/service";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized("Sign in to buy this bundle.");

  const rl = rateLimit(`pay:${clientIp(req)}`, 12, 60_000);
  if (!rl.allowed) return fail("RATE_LIMITED", "Too many payment attempts. Wait a moment.", 429);

  const body = (await req.json().catch(() => ({}))) as { bundleId?: string };
  if (!body.bundleId) return fail("BAD_REQUEST", "Missing bundle.");

  const { data: bundle } = await supabaseAdmin()
    .from("content_bundles")
    .select("id, creator_id, name, price, status")
    .eq("id", body.bundleId)
    .maybeSingle();
  if (!bundle || bundle.status !== "active") return notFound("Bundle not available.");

  const { data: owned } = await supabaseAdmin()
    .from("bundle_purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("bundle_id", bundle.id)
    .eq("status", "completed")
    .maybeSingle();
  if (owned) return ok({ alreadyOwned: true });

  const result = await createPendingPayment({
    type: "BUNDLE",
    userId: user.id,
    creatorId: bundle.creator_id,
    referenceId: bundle.id,
    amount: Number(bundle.price),
    description: bundle.name,
  });

  if ("error" in result) return fail("PAYMENT_ERROR", result.error, 502);
  return ok({ paymentId: result.payment.id, invoiceUrl: result.invoiceUrl });
}
