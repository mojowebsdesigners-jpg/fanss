import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { paymentProvider, findPaymentByProviderId, completePayment, markPaymentStatus } from "@/lib/payments/service";
import type { PaymentRow } from "@/lib/payments/provider";

export const dynamic = "force-dynamic";

/**
 * Payment provider webhook (spec §73).
 * - Verifies the provider signature (HMAC-SHA512 for NOWPayments IPN)
 * - Records every delivery (valid or not) in webhook_deliveries
 * - Is idempotent: repeated calls produce one completion + one fulfillment
 * - Never trusts payment success from the browser
 */
export async function POST(req: NextRequest) {
  const provider = paymentProvider();
  const admin = supabaseAdmin();

  const raw = await req.text();
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    /* not json */
  }

  const { valid, payload } = await provider.verifyWebhook(req);
  const eventId =
    payload && typeof payload.payment_id === "string" || typeof payload?.payment_id === "number"
      ? String(payload.payment_id)
      : null;

  // log delivery first (audit trail)
  const { data: delivery } = await admin
    .from("webhook_deliveries")
    .insert({
      provider: provider.name,
      event_id: eventId,
      signature_valid: valid,
      payload: payload ?? { raw: raw.slice(0, 5000) },
    })
    .select("id")
    .single();

  if (!valid || !payload) {
    await admin
      .from("webhook_deliveries")
      .update({ result: "INVALID_SIGNATURE" })
      .eq("id", delivery!.id);
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  try {
    await processEvent(payload, delivery!.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("webhook processing error", e);
    // return 500 so the provider retries
    await admin
      .from("webhook_deliveries")
      .update({ result: "ERROR" })
      .eq("id", delivery!.id);
    return NextResponse.json({ error: "processing error" }, { status: 500 });
  }
}

async function processEvent(payload: Record<string, unknown>, deliveryId: number) {
  const admin = supabaseAdmin();
  const provider = paymentProvider();

  const providerPaymentId = String(payload.payment_id ?? "");
  const status = String(payload.payment_status ?? "").toLowerCase();

  if (!providerPaymentId) {
    await admin.from("webhook_deliveries").update({ result: "NO_PAYMENT_ID", processed: true }).eq("id", deliveryId);
    return;
  }

  const payment = await findPaymentByProviderId(providerPaymentId);
  if (!payment) {
    await admin.from("webhook_deliveries").update({ result: "UNKNOWN_PAYMENT", processed: true }).eq("id", deliveryId);
    return;
  }

  const details = {
    actuallyPaid: typeof payload.actually_paid === "number" ? payload.actually_paid : undefined,
    paidCurrency: typeof payload.actually_paid_currency === "string" ? payload.actually_paid_currency : undefined,
    transactionHash: typeof payload.payin_hash === "string" ? payload.payin_hash : undefined,
  };

  // record event
  await admin.from("payment_events").insert({
    payment_id: payment.id,
    event_type: status || "unknown",
    payload,
  });

  let result = status || "ok";

  switch (status) {
    case "finished":
    case "confirmed": {
      //
      // ENTITY VERIFICATION — never grant value on webhook text alone, even
      // when the signature is valid. A valid HMAC proves the message came
      // from whoever holds the IPN secret (which does not authenticate the
      // payment's *state*, and does not survive that secret leaking). Ask the
      // provider API directly before fulfilling:
      //
      const remote = await provider.fetchPaymentStatus(providerPaymentId);
      if (remote && remote.status !== "completed") {
        // Provider disagrees with the webhook — refuse to fulfill.
        // (Out-of-order/late "failed" webhooks land here harmlessly: the
        // completion guard in completePayment ignores them once paid.)
        result = `MISMATCH:${status}->${remote.status}`;
        await admin
          .from("webhook_deliveries")
          .update({ processed: true, result })
          .eq("id", deliveryId);
        return;
      }
      await completePayment(payment.id, details);
      if (!remote) {
        // API unreachable at verification time — completed, but flagged for
        // reconciliation review rather than silently trusted.
        result = "COMPLETED_UNVERIFIED";
      }
      break;
    }
    case "failed":
    case "expired":
    case "refunded":
      await markPaymentStatus(payment.id, status as PaymentRow["status"], details);
      break;
    case "confirming":
    case "sending":
      await markPaymentStatus(payment.id, "confirming", details);
      break;
    default:
      // waiting etc — leave pending
      break;
  }

  await admin.from("webhook_deliveries").update({ processed: true, result }).eq("id", deliveryId);
}
