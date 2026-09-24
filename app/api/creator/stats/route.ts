import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, forbidden } from "@/lib/api";

export async function GET() {
  const user = await getSessionUser();
  if (!user || (user.profile.role !== "CREATOR" && user.profile.role !== "ADMIN")) return forbidden();

  const admin = supabaseAdmin();
  const since = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

  const [
    { count: activeSubs },
    { count: totalFans },
    { count: newSubs30 },
    { count: postsCount },
  ] = await Promise.all([
    admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("status", "ACTIVE").neq("id", user.id),
    admin.from("payments").select("id", { count: "exact", head: true }).eq("type", "SUBSCRIPTION").eq("status", "completed").gte("completed_at", since(30)),
    admin.from("posts").select("id", { count: "exact", head: true }).eq("creator_id", user.id).eq("status", "published"),
  ]);

  const revFor = async (type: string, days?: number) => {
    let q = admin.from("payments").select("amount").eq("type", type).eq("status", "completed");
    if (days) q = q.gte("completed_at", since(days));
    const { data } = await q;
    return (data ?? []).reduce((s, p) => s + Number(p.amount), 0);
  };

  const [sub30, ppv30, tip30, msg30, bundle30, subAll, ppvAll, tipAll, msgAll, bundleAll] = await Promise.all([
    revFor("SUBSCRIPTION", 30), revFor("PPV", 30), revFor("TIP", 30), revFor("PAID_MESSAGE", 30), revFor("BUNDLE", 30),
    revFor("SUBSCRIPTION"), revFor("PPV"), revFor("TIP"), revFor("PAID_MESSAGE"), revFor("BUNDLE"),
  ]);

  const sum = (...n: number[]) => n.reduce((a, b) => a + b, 0);

  return ok({
    activeSubscribers: activeSubs ?? 0,
    totalFans: totalFans ?? 0,
    newSubscribers30: newSubs30 ?? 0,
    publishedPosts: postsCount ?? 0,
    revenue30: {
      subscription: sub30, ppv: ppv30, tips: tip30, messages: msg30, bundles: bundle30,
      total: sum(sub30, ppv30, tip30, msg30, bundle30),
    },
    revenueAll: {
      subscription: subAll, ppv: ppvAll, tips: tipAll, messages: msgAll, bundles: bundleAll,
      total: sum(subAll, ppvAll, tipAll, msgAll, bundleAll),
    },
  });
}
