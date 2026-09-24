import { supabaseAdmin } from "../supabase";
import { notify } from "../notify";
import type { CreatePaymentInput, PaymentProvider, PaymentRow } from "./provider";
import { NowPaymentsProvider } from "./nowpayments";
import { MockProvider } from "./mock";

let providerInstance: PaymentProvider | undefined;

/** Resolves the active provider from env; falls back to Mock in dev. */
export function paymentProvider(): PaymentProvider {
  if (providerInstance) return providerInstance;
  const mode = process.env.PAYMENT_PROVIDER;
  const apiKey = process.env.PAYMENT_PROVIDER_API_KEY;
  const ipnSecret = process.env.PAYMENT_PROVIDER_WEBHOOK_SECRET;

  if (apiKey && ipnSecret && (mode === "production" || mode === "sandbox" || !mode)) {
    providerInstance = new NowPaymentsProvider({
      apiKey,
      ipnSecret,
      mode: mode === "production" ? "production" : "sandbox",
    });
  } else if (apiKey && ipnSecret) {
    providerInstance = new NowPaymentsProvider({ apiKey, ipnSecret, mode: "sandbox" });
  } else {
    providerInstance = new MockProvider();
  }
  return providerInstance;
}

export function providerConfigured(): boolean {
  return paymentProvider().name !== "mock";
}

/**
 * Creates the local pending payment row, then asks the provider for an
 * invoice. The payment stays `pending` until the provider's verified
 * webhook (or an authenticated status poll) confirms it.
 */
export async function createPendingPayment(
  input: CreatePaymentInput
): Promise<{ payment: PaymentRow; invoiceUrl: string } | { error: string }> {
  if (input.amount <= 0) return { error: "Amount must be greater than zero." };

  const admin = supabaseAdmin();
  const provider = paymentProvider();

  const { data: payment, error: insertErr } = await admin
    .from("payments")
    .insert({
      user_id: input.userId,
      creator_id: input.creatorId,
      type: input.type,
      reference_id: input.referenceId,
      provider: provider.name,
      amount: input.amount,
      currency: input.currency ?? "USD",
      status: "pending",
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (insertErr || !payment) {
    console.error("payment insert failed", insertErr);
    return { error: "Could not start the payment. Please try again." };
  }

  try {
    const result = await provider.createPayment({
      ...input,
      currency: input.currency ?? "USD",
    });
    const { data: updated, error: updErr } = await admin
      .from("payments")
      .update({
        provider_payment_id: result.providerPaymentId,
        invoice_url: result.invoiceUrl,
      })
      .eq("id", payment.id)
      .select("*")
      .single();
    if (updErr || !updated) throw new Error("update failed");
    return { payment: updated as PaymentRow, invoiceUrl: result.invoiceUrl };
  } catch (e) {
    await admin
      .from("payments")
      .update({ status: "failed" })
      .eq("id", payment.id);
    console.error("provider createPayment failed", e);
    return { error: "The payment provider is unavailable right now. Please try again shortly." };
  }
}

type FulfillKind = PaymentRow["type"];

/**
 * THE critical rule (spec §74/§150/§174): every fulfillment runs inside a
 * guarded idempotency check, so repeated webhooks / retries / polls produce
 * exactly one activation, one purchase record, one tip record, one notification.
 */
async function fulfill(kind: FulfillKind, payment: PaymentRow): Promise<void> {
  const admin = supabaseAdmin();
  const userId = payment.user_id;
  const creatorId = payment.creator_id;
  const refId = payment.reference_id;

  if (kind === "SUBSCRIPTION") {
    // One active subscription per user (unique index protects races too).
    const { data: existing } = await admin
      .from("subscriptions")
      .select("id, status, plan_id, started_at, expires_at")
      .eq("user_id", userId)
      .in("status", ["active", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: plan } = await admin
      .from("subscription_plans")
      .select("id, billing_interval")
      .eq("id", refId ?? "")
      .maybeSingle();

    const interval = (plan?.billing_interval ?? "month") as "month" | "year";
    const months = interval === "year" ? 12 : 1;

    // extend from current expiry if still active, else from now
    const base =
      existing?.status === "active" && existing.expires_at && new Date(existing.expires_at) > new Date()
        ? new Date(existing.expires_at)
        : new Date();
    const expires = new Date(base);
    expires.setMonth(expires.getMonth() + months);

    if (existing) {
      await admin
        .from("subscriptions")
        .update({
          status: "active",
          plan_id: plan?.id ?? existing.plan_id,
          started_at: existing.started_at ?? new Date().toISOString(),
          expires_at: expires.toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await admin.from("subscriptions").insert({
        user_id: userId,
        plan_id: plan?.id,
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: expires.toISOString(),
      });
    }

    // promotion redemption (first payment with a promotion in metadata)
    const promoId = (payment.metadata as { promotion_id?: string }).promotion_id;
    if (promoId) {
      const { error: promoErr } = await admin
        .from("promotion_redemptions")
        .upsert(
          { promotion_id: promoId, user_id: userId },
          { onConflict: "promotion_id,user_id" }
        );
      if (promoErr) console.error("promotion redemption error", promoErr);
      await admin.rpc("bump_promotion_redemption", { p_promotion: promoId });
    }

    await notify({
      userId,
      type: "SUBSCRIPTION_ACTIVE",
      title: "Welcome to the inner circle ✨",
      body: "Your subscription is active. Exclusive content is now unlocked.",
      link: "/creator",
      email: true,
    });
  }

  if (kind === "PPV") {
    // Insert is idempotent via unique(user_id, post_id); ignore duplicates.
    const { error } = await admin.from("post_purchases").upsert(
      {
        user_id: userId,
        post_id: refId,
        creator_id: creatorId,
        payment_id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: "completed",
      },
      { onConflict: "user_id,post_id", ignoreDuplicates: true }
    );
    if (error) console.error("ppv fulfillment error", error);

    // additive analytics update (creates the row if missing)
    const { error: anErr } = await admin
      .from("content_analytics")
      .upsert({ post_id: refId, purchases: 1, revenue: payment.amount });
    if (anErr) console.error("content_analytics upsert error", anErr);
    const { error: bumpErr } = await admin.rpc("bump_content_analytics", {
      p_post: refId,
      p_purchases: 1,
      p_revenue: payment.amount,
    });
    if (bumpErr) console.error("bump_content_analytics error", bumpErr);

    await notify({
      userId,
      type: "PPV_PURCHASE",
      title: "Content unlocked 🔓",
      body: "Your exclusive purchase is ready in your library.",
      link: `/post/${refId}`,
      email: true,
    });
    if (creatorId && creatorId !== userId) {
      await notify({
        userId: creatorId,
        type: "PPV_PURCHASE",
        title: "New PPV sale 💰",
        body: `Someone unlocked your content for $${payment.amount}.`,
        link: "/creator/payments",
      });
    }
  }

  if (kind === "TIP") {
    // Idempotent: tips.payment_id is unique and the tip row is created here
    // only when it doesn't already exist for this payment.
    const { data: tip } = await admin
      .from("tips")
      .select("id, message")
      .eq("payment_id", payment.id)
      .maybeSingle();
    if (!tip) {
      const meta = payment.metadata as { tip_message?: string };
      await admin.from("tips").insert({
        user_id: userId,
        creator_id: creatorId,
        payment_id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        message: meta.tip_message ?? null,
        status: "completed",
      });
    }
    await notify({
      userId,
      type: "PAYMENT_CONFIRMED",
      title: "Tip sent 💛",
      body: "Thank you for supporting the creator.",
      link: "/payment-history",
      email: true,
    });
    if (creatorId && creatorId !== userId) {
      const meta = payment.metadata as { tip_message?: string };
      await notify({
        userId: creatorId,
        type: "TIP_RECEIVED",
        title: `You received a $${payment.amount} tip! 💛`,
        body: meta.tip_message ? `Message: “${meta.tip_message}”` : undefined,
        link: "/creator/tips",
        email: true,
      });
    }
  }

  if (kind === "BUNDLE") {
    const { error } = await admin.from("bundle_purchases").upsert(
      {
        user_id: userId,
        bundle_id: refId,
        payment_id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: "completed",
      },
      { onConflict: "user_id,bundle_id", ignoreDuplicates: true }
    );
    if (error) console.error("bundle fulfillment error", error);
    await notify({
      userId,
      type: "PPV_PURCHASE",
      title: "Bundle unlocked 📦",
      body: "Everything in the bundle is now in your library.",
      link: "/purchases",
      email: true,
    });
  }

  if (kind === "PAID_MESSAGE") {
    const meta = payment.metadata as { asset_id?: string };
    const { error } = await admin.from("message_purchases").upsert(
      {
        user_id: userId,
        message_id: refId,
        asset_id: meta.asset_id ?? null,
        payment_id: payment.id,
        amount: payment.amount,
        status: "completed",
      },
      { onConflict: "user_id,message_id,asset_id", ignoreDuplicates: true }
    );
    if (error) console.error("paid message fulfillment error", error);
    await notify({
      userId,
      type: "PPV_PURCHASE",
      title: "Message content unlocked 🔓",
      body: "The media in your message is now visible.",
      link: "/messages",
      email: true,
    });
  }
}

/**
 * Marks a payment completed and triggers fulfillment exactly once.
 * Returns whether this call performed the transition (for logging/tests).
 */
export async function completePayment(
  paymentId: string,
  details?: { actuallyPaid?: number; paidCurrency?: string; transactionHash?: string; network?: string }
): Promise<boolean> {
  const admin = supabaseAdmin();

  const { data: payment } = await admin.from("payments").select("*").eq("id", paymentId).maybeSingle();
  if (!payment) return false;
  if (payment.status === "completed") return false; // idempotent

  const { data: updated, error } = await admin
    .from("payments")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      actual_amount_paid: details?.actuallyPaid ?? null,
      actually_paid_currency: details?.paidCurrency ?? null,
      transaction_hash: details?.transactionHash ?? null,
      network: details?.network ?? null,
    })
    .eq("id", paymentId)
    .neq("status", "completed") // guard: only first writer wins
    .select("*")
    .maybeSingle();

  if (error || !updated) return false; // someone else completed it
  await fulfill(updated.type as FulfillKind, updated as PaymentRow);
  return true;
}

export async function markPaymentStatus(
  paymentId: string,
  status: PaymentRow["status"],
  details?: { actuallyPaid?: number; paidCurrency?: string; transactionHash?: string }
): Promise<void> {
  if (status === "completed") {
    await completePayment(paymentId, details);
    return;
  }
  await supabaseAdmin()
    .from("payments")
    .update({
      status,
      actual_amount_paid: details?.actuallyPaid ?? null,
      actually_paid_currency: details?.paidCurrency ?? null,
      transaction_hash: details?.transactionHash ?? null,
    })
    .eq("id", paymentId)
    .neq("status", "completed");
}

/** Finds our local payment row from a provider payment id (webhook path). */
export async function findPaymentByProviderId(
  providerPaymentId: string
): Promise<PaymentRow | null> {
  const { data } = await supabaseAdmin()
    .from("payments")
    .select("*")
    .eq("provider_payment_id", providerPaymentId)
    .maybeSingle();
  return (data as PaymentRow | null) ?? null;
}
