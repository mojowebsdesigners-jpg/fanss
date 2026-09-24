import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import { PaymentStatusClient } from "@/components/payment-status";

export const metadata = { title: "Payment", robots: { index: false } };

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await supabaseServer();

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!payment) notFound();

  return <PaymentStatusClient payment={payment} />;
}
