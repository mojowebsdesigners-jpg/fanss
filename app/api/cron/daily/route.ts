import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ok, fail } from "@/lib/api";
import { notify } from "@/lib/notify";

export const dynamic = "force-dynamic";

/**
 * Daily maintenance (Vercel Cron → /api/cron/daily at 03:00 UTC):
 * 1. Expire subscriptions whose expires_at has passed
 * 2. Send expiry reminders (7/3/1 days, configurable)
 * 3. Publish scheduled posts whose time has come
 * 4. Aggregate creator analytics for yesterday
 */
export async function POST(req: NextRequest) {
  return handle(req);
}
export async function GET(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET`
  if (secret && auth !== `Bearer ${secret}`) {
    return fail("UNAUTHORIZED", "Bad cron secret.", 401);
  }

  const admin = supabaseAdmin();
  const results = { expired: 0, reminders: 0, published: 0, analytics: false };

  // 1 ── expire subscriptions
  const nowIso = new Date().toISOString();
  const { data: toExpire } = await admin
    .from("subscriptions")
    .select("id, user_id")
    .eq("status", "active")
    .not("expires_at", "is", null)
    .lt("expires_at", nowIso);

  for (const sub of toExpire ?? []) {
    const { error } = await admin
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("id", sub.id)
      .eq("status", "active");
    if (!error) {
      results.expired++;
      await notify({
        userId: sub.user_id,
        type: "SUBSCRIPTION_EXPIRED",
        title: "Your subscription has ended",
        body: "Renew anytime to regain access to the exclusive feed. Everything you purchased stays yours.",
        link: "/subscribe",
        email: true,
      });
    }
  }

  // 2 ── expiry reminders
  const { data: settings } = await admin.from("platform_settings").select("reminder_days").eq("id", 1).maybeSingle();
  const days = (settings?.reminder_days as number[]) ?? [7, 3, 1];

  const { data: expiring } = await admin
    .from("subscriptions")
    .select("id, user_id, expires_at")
    .eq("status", "active")
    .not("expires_at", "is", null);

  for (const sub of expiring ?? []) {
    const dLeft = Math.ceil((new Date(sub.expires_at!).getTime() - Date.now()) / 86400000);
    if (!days.includes(dLeft)) continue;

    const { data: already } = await admin
      .from("notifications")
      .select("id")
      .eq("user_id", sub.user_id)
      .eq("type", "SUBSCRIPTION_EXPIRING")
      .gte("created_at", new Date(Date.now() - 26 * 3600_000).toISOString())
      .limit(1);
    if (already?.length) continue;

    await notify({
      userId: sub.user_id,
      type: "SUBSCRIPTION_EXPIRING",
      title: `Your subscription expires in ${dLeft} day${dLeft > 1 ? "s" : ""}`,
      body: "Renew now to keep your access uninterrupted.",
      link: "/subscribe",
      email: true,
    });
    results.reminders++;
  }

  // 3 ── publish scheduled posts
  const { data: scheduled } = await admin
    .from("posts")
    .select("id, creator_id")
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso);

  for (const post of scheduled ?? []) {
    const { error } = await admin
      .from("posts")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", post.id)
      .eq("status", "scheduled");
    if (!error) {
      results.published++;
      const { data: fans } = await admin
        .from("profiles")
        .select("id")
        .eq("status", "ACTIVE")
        .neq("id", post.creator_id);
      if (fans?.length) {
        await admin.from("notifications").insert(
          fans.map((f) => ({
            user_id: f.id,
            type: "NEW_POST" as const,
            title: "New post from the creator ✨",
            body: "Something new just landed in the feed.",
            link: `/post/${post.id}`,
          }))
        );
      }
    }
  }

  // 4 ── aggregate yesterday's analytics
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const { data: creator } = await admin.from("creator_profiles").select("profile_id").limit(1).maybeSingle();
  if (creator) {
    const dayStart = `${yesterday}T00:00:00Z`;
    const dayEnd = `${yesterday}T23:59:59Z`;

    const [{ count: activeSubs }, { count: newSubs }] = await Promise.all([
      admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      admin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("type", "SUBSCRIPTION")
        .eq("status", "completed")
        .gte("completed_at", dayStart)
        .lte("completed_at", dayEnd),
    ]);

    const revFor = async (type: string) => {
      const { data } = await admin
        .from("payments")
        .select("amount")
        .eq("type", type)
        .eq("status", "completed")
        .gte("completed_at", dayStart)
        .lte("completed_at", dayEnd);
      return (data ?? []).reduce((s, p) => s + Number(p.amount), 0);
    };

    const [subRev, ppvRev, tipRev, msgRev, bundleRev] = await Promise.all([
      revFor("SUBSCRIPTION"),
      revFor("PPV"),
      revFor("TIP"),
      revFor("PAID_MESSAGE"),
      revFor("BUNDLE"),
    ]);

    const { count: newUsers } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);

    await admin.from("creator_analytics").upsert({
      creator_id: creator.profile_id,
      day: yesterday,
      subscribers_active: activeSubs ?? 0,
      new_subscribers: newSubs ?? 0,
      subscription_revenue: subRev,
      ppv_revenue: ppvRev,
      tip_revenue: tipRev,
      message_revenue: msgRev,
      bundle_revenue: bundleRev,
      new_users: newUsers ?? 0,
    });
    results.analytics = true;
  }

  return ok(results);
}
