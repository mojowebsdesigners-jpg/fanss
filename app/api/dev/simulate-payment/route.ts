import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, forbidden, notFound } from "@/lib/api";
import { paymentProvider, completePayment } from "@/lib/payments/service";

/**
 * DEV/TEST ONLY. Enabled ONLY when running outside production AND the active
 * provider is the mock provider (i.e. no real NOWPayments keys configured).
 * It runs the exact same verified-fulfillment pipeline as a real webhook —
 * this is how you test the full payment lifecycle locally.
 */
export async function POST(req: NextRequest) {
  // Hard production kill-switch: even if the deployment is missing payment
  // keys (which would silently activate the mock provider), fulfilling a
  // payment without money moving must be impossible in production.
  if (process.env.NODE_ENV === "production" || paymentProvider().name !== "mock") {
    return forbidden("Simulation is only available in local development with the mock payment provider.");
  }

  const user = await getSessionUser();
  if (!user) return fail("UNAUTHORIZED", "Sign in first.", 401);

  const body = (await req.json().catch(() => ({}))) as { paymentId?: string; outcome?: string };
  if (!body.paymentId) return fail("BAD_REQUEST", "Missing paymentId.");

  const { data: payment } = await supabaseAdmin()
    .from("payments")
    .select("*")
    .eq("id", body.paymentId)
    .eq("user_id", user.id) // can only simulate your own payments
    .maybeSingle();
  if (!payment) return notFound("Payment not found.");

  const outcome = body.outcome ?? "completed";
  if (outcome === "completed") {
    const changed = await completePayment(payment.id, {
      actuallyPaid: payment.amount,
      paidCurrency: "USDT",
      transactionHash: `0x${crypto.randomUUID().replace(/-/g, "")}`,
      network: "mock",
    });
    return ok({ status: "completed", changed });
  }

  await supabaseAdmin().from("payments").update({ status: outcome }).eq("id", payment.id);
  return ok({ status: outcome });
}
