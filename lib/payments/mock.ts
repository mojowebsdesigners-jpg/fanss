import crypto from "crypto";
import type { CreatePaymentInput, CreatePaymentResult, PaymentProvider, PaymentRow } from "./provider";

/**
 * Mock provider — used when NOWPayments keys are absent (local dev & demos).
 * It never fakes success: a payment becomes "completed" only after an
 * explicitly authorized dev action (see /api/dev/simulate-payment), which
 * runs through the exact same fulfillment pipeline as a real webhook.
 */
export class MockProvider implements PaymentProvider {
  readonly name = "mock";

  async createPayment(_input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const id = `mock_${crypto.randomBytes(8).toString("hex")}`;
    return {
      paymentId: "",
      status: "pending",
      invoiceUrl: `/pay/mock?payment=${id}`,
      providerPaymentId: id,
    };
  }

  async fetchPaymentStatus(_providerPaymentId: string): Promise<{
    status: PaymentRow["status"];
    actuallyPaid?: number;
    paidCurrency?: string;
    transactionHash?: string;
  } | null> {
    return null; // mock payments only advance via explicit simulation
  }

  async verifyWebhook(): Promise<{ valid: boolean; payload: Record<string, unknown> | null }> {
    return { valid: false, payload: null };
  }
}
