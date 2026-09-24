import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, unauthorized, notFound } from "@/lib/api";
import { paymentProvider, findPaymentByProviderId, completePayment, markPaymentStatus } from "@/lib/payments/service";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const paymentId = req.nextUrl.searchParams.get("id");
  if (!paymentId) return fail("BAD_REQUEST", "Missing payment id.");

  const { data: payment } = await supabaseAdmin()
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .eq("user_id", user.id) // ownership check
    .maybeSingle();
  if (!payment) return notFound("Payment not found.");

  // Already final? return as-is.
  if (["completed", "failed", "expired", "cancelled", "refunded"].includes(payment.status)) {
    return ok({ status: payment.status, payment });
  }

  const provider = paymentProvider();
  if (!payment.provider_payment_id || provider.name === "mock") {
    return ok({ status: payment.status, payment });
  }

  // Authoritative server-side check with the provider
  const remote = await provider.fetchPaymentStatus(payment.provider_payment_id);
  if (remote) {
    if (remote.status === "completed") {
      await completePayment(payment.id, remote);
    } else if (remote.status !== payment.status) {
      await markPaymentStatus(payment.id, remote.status, remote);
    }
  }

  const { data: fresh } = await supabaseAdmin().from("payments").select("*").eq("id", paymentId).maybeSingle();
  return ok({ status: fresh?.status ?? payment.status, payment: fresh });
}
