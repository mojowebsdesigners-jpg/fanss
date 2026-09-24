import type { Metadata } from "next";
import { requireCreator } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { CreatorShell } from "@/components/creator-shell";
import { PaymentsClient } from "@/components/payments-client";

export const metadata: Metadata = { title: "Payments", robots: { index: false } };

export default async function CreatorPaymentsPage() {
  const user = await requireCreator();
  const supabase = await supabaseServer();

  const { data: payments } = await supabase
    .from("payments")
    .select("id, type, amount, currency, status, provider, provider_payment_id, transaction_hash, created_at, completed_at, profiles(username, display_name)")
    .or(`creator_id.eq.${user.id},user_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <CreatorShell>
      <PaymentsClient payments={(payments ?? []) as unknown as Parameters<typeof PaymentsClient>[0]["payments"]} />
    </CreatorShell>
  );
}
