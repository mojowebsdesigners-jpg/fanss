export type PaymentType = "SUBSCRIPTION" | "PPV" | "TIP" | "BUNDLE" | "PAID_MESSAGE";

export type PaymentRow = {
  id: string;
  user_id: string;
  creator_id: string | null;
  type: PaymentType;
  reference_id: string | null;
  provider: string;
  provider_payment_id: string | null;
  pay_address: string | null;
  pay_amount: number | null;
  pay_currency: string | null;
  invoice_url: string | null;
  amount: number;
  currency: string;
  status: "pending" | "confirming" | "completed" | "failed" | "expired" | "cancelled" | "refunded";
  metadata: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
};

export type CreatePaymentInput = {
  type: PaymentType;
  userId: string;
  creatorId: string;
  referenceId: string;
  amount: number;
  currency?: string;
  description: string;
  metadata?: Record<string, unknown>;
};

export type CreatePaymentResult = {
  paymentId: string;
  status: "pending";
  invoiceUrl: string;
  providerPaymentId: string | null;
};

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  fetchPaymentStatus(providerPaymentId: string): Promise<{
    status: PaymentRow["status"];
    actuallyPaid?: number;
    paidCurrency?: string;
    transactionHash?: string;
  } | null>;
  verifyWebhook(req: Request): Promise<{
    valid: boolean;
    payload: Record<string, unknown> | null;
  }>;
}
