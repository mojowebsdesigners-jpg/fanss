import crypto from "crypto";
import type { CreatePaymentInput, CreatePaymentResult, PaymentProvider, PaymentRow } from "./provider";

const API_BASES = {
  production: "https://api.nowpayments.io/v1",
  sandbox: "https://api-sandbox.nowpayments.io/v1",
} as const;

/**
 * NOWPayments provider.
 * - Hosted invoices: POST /v1/invoice with x-api-key header.
 * - IPN callbacks are signed with HMAC-SHA512 over the JSON body with
 *   alphabetically sorted keys, using the IPN secret; the signature is
 *   delivered in the `x-nowpayments-sig` header.
 * Docs: https://documenter.getpostman.com/view/7907941/2s93JusNJt
 */
export class NowPaymentsProvider implements PaymentProvider {
  readonly name = "nowpayments";
  private apiKey: string;
  private ipnSecret: string;
  private base: string;

  constructor(opts: { apiKey: string; ipnSecret: string; mode: "production" | "sandbox" }) {
    this.apiKey = opts.apiKey;
    this.ipnSecret = opts.ipnSecret;
    this.base = API_BASES[opts.mode];
  }

  private async call<T>(
    method: "GET" | "POST",
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg =
        json && typeof json === "object" && "message" in json
          ? String((json as { message: unknown }).message)
          : `NOWPayments request failed (${res.status})`;
      throw new Error(msg);
    }
    return json as T;
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const app = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invoice = await this.call<{
      id: string;
      invoice_url: string;
    }>("POST", "/invoice", {
      price_amount: input.amount,
      price_currency: (input.currency ?? "usd").toLowerCase(),
      order_id: input.referenceId,
      order_description: input.description,
      ipn_callback_url: `${app}/api/payments/webhook`,
      success_url: `${app}/payment/${input.referenceId}?type=${input.type.toLowerCase()}`,
      cancel_url: `${app}/payment/${input.referenceId}?type=${input.type.toLowerCase()}`,
    });

    return {
      paymentId: "", // set by the service layer (our payments row id)
      status: "pending",
      invoiceUrl: invoice.invoice_url,
      providerPaymentId: String(invoice.id),
    };
  }

  async fetchPaymentStatus(providerPaymentId: string): Promise<{
    status: PaymentRow["status"];
    actuallyPaid?: number;
    paidCurrency?: string;
    transactionHash?: string;
  } | null> {
    try {
      const inv = await this.call<{
        payment_id?: number | string;
        payment_status?: string;
        actually_paid?: number;
        actually_paid_currency?: string;
        outcome_amount?: number;
        payin_hash?: string;
        payout_hash?: string;
      }>("GET", `/invoice/${providerPaymentId}`);

      // NOWPayments invoice statuses: waiting, confirming, confirmed, sending,
      // finished, failed, expired, refunded
      const statusMap: Record<string, PaymentRow["status"]> = {
        waiting: "pending",
        confirming: "confirming",
        confirmed: "confirming",
        sending: "confirming",
        finished: "completed",
        failed: "failed",
        expired: "expired",
        refunded: "refunded",
      };

      return {
        status: statusMap[inv.payment_status ?? "waiting"] ?? "pending",
        actuallyPaid: inv.actually_paid ?? inv.outcome_amount,
        paidCurrency: inv.actually_paid_currency,
        transactionHash: inv.payin_hash,
      };
    } catch {
      return null;
    }
  }

  /**
   * Verify the x-nowpayments-sig header: HMAC-SHA512 of the raw request body
   * with alphabetically sorted JSON keys, keyed by the IPN secret.
   */
  async verifyWebhook(req: Request): Promise<{ valid: boolean; payload: Record<string, unknown> | null }> {
    const raw = await req.text();
    const sig = req.headers.get("x-nowpayments-sig") ?? "";

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw);
    } catch {
      return { valid: false, payload: null };
    }

    if (!this.ipnSecret) return { valid: false, payload };
    if (sig.length !== 128) return { valid: false, payload };

    const sorted = Object.keys(payload)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = payload[key];
        return acc;
      }, {});

    const expected = crypto
      .createHmac("sha512", this.ipnSecret)
      .update(JSON.stringify(sorted))
      .digest("hex");

    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(sig, "utf8");
    const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
    return { valid, payload };
  }
}
