import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, forbidden } from "@/lib/api";

export async function GET() {
  const user = await getSessionUser();
  if (user?.profile.role !== "ADMIN") return forbidden();

  const admin = supabaseAdmin();
  const [
    { count: users },
    { count: activeSubs },
    { count: posts },
    { count: openReports },
    { count: paymentsTotal },
    { count: paymentsFailed },
    { count: paymentsPending },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("posts").select("id", { count: "exact", head: true }).eq("status", "published"),
    admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin.from("payments").select("id", { count: "exact", head: true }).eq("status", "completed"),
    admin.from("payments").select("id", { count: "exact", head: true }).eq("status", "failed"),
    admin.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const revFor = async (type: string) => {
    const { data } = await admin.from("payments").select("amount").eq("type", type).eq("status", "completed");
    return (data ?? []).reduce((s, p) => s + Number(p.amount), 0);
  };
  const [sub, ppv, tip, msg, bundle] = await Promise.all([
    revFor("SUBSCRIPTION"), revFor("PPV"), revFor("TIP"), revFor("PAID_MESSAGE"), revFor("BUNDLE"),
  ]);

  return ok({
    users: users ?? 0,
    activeSubscribers: activeSubs ?? 0,
    publishedPosts: posts ?? 0,
    openReports: openReports ?? 0,
    transactions: { completed: paymentsTotal ?? 0, failed: paymentsFailed ?? 0, pending: paymentsPending ?? 0 },
    revenue: { subscription: sub, ppv, tips: tip, messages: msg, bundles: bundle, total: sub + ppv + tip + msg + bundle },
  });
}
