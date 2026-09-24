import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { PaymentHistoryClient } from "@/components/payment-history-client";

export const metadata: Metadata = { title: "Payment history", robots: { index: false } };

export default async function PaymentHistoryPage() {
  const user = await requireUser();
  const supabase = await supabaseServer();

  const { data: payments } = await supabase
    .from("payments")
    .select("id, type, amount, currency, status, provider, transaction_hash, created_at, completed_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return <PaymentHistoryClient payments={payments ?? []} />;
}
