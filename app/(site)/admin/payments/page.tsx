import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { AdminShell } from "@/components/admin-shell";
import { AdminPayments } from "@/components/admin-payments";

export const metadata: Metadata = { title: "Payments · Admin", robots: { index: false } };

export default async function AdminPaymentsPage() {
  await requireAdmin();
  const supabase = await supabaseServer();
  const { data: payments } = await supabase
    .from("payments")
    .select("id, type, amount, currency, status, provider, provider_payment_id, transaction_hash, created_at, profiles(username, email)")
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <AdminShell>
      <AdminPayments payments={(payments ?? []) as unknown as Parameters<typeof AdminPayments>[0]["payments"]} />
    </AdminShell>
  );
}
