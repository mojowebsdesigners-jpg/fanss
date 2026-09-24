import { supabaseAdmin } from "./supabase";
import { sendEmail } from "./email";

export type NotificationType =
  | "NEW_POST"
  | "NEW_MESSAGE"
  | "MESSAGE_READ"
  | "SUBSCRIPTION_ACTIVE"
  | "SUBSCRIPTION_EXPIRING"
  | "SUBSCRIPTION_EXPIRED"
  | "PPV_PURCHASE"
  | "TIP_RECEIVED"
  | "PAYMENT_CONFIRMED"
  | "PROMOTION"
  | "CREATOR_UPDATE"
  | "BUNDLE_PURCHASE"
  | "REPORT_RESOLVED"
  | "SYSTEM";

export async function notify(opts: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  email?: boolean;
}): Promise<void> {
  const { userId, type, title, body, link } = opts;
  const admin = supabaseAdmin();

  const { data: profile } = await admin
    .from("profiles")
    .select("notif_preferences, email, status")
    .eq("id", userId)
    .maybeSingle();
  if (!profile || profile.status !== "ACTIVE") return;

  const prefs = profile.notif_preferences as { email: boolean; inApp: boolean };
  if (prefs?.inApp !== false) {
    await admin.from("notifications").insert({ user_id: userId, type, title, body, link });
  }
  if (opts.email && prefs?.email !== false && profile.email) {
    await sendEmail(profile.email, title, body ?? "", link);
  }
}

/** Notify every active registered user (single-creator platform broadcast). */
export async function notifyAllFans(opts: {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  excludeUserId?: string;
}): Promise<number> {
  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("profiles")
    .select("id, notif_preferences")
    .neq("id", opts.excludeUserId ?? "")
    .eq("status", "ACTIVE");
  if (error || !data) return 0;

  const rows = data
    .filter((p) => (p.notif_preferences as { inApp: boolean } | null)?.inApp !== false)
    .map((p) => ({ user_id: p.id, type: opts.type, title: opts.title, body: opts.body, link: opts.link }));
  if (rows.length === 0) return 0;

  const { error: insErr } = await admin.from("notifications").insert(rows);
  if (insErr) console.error("notifyAllFans insert failed", insErr);
  return rows.length;
}

/** Server-side recipient selection for creator broadcasts. */
export async function getBroadcastRecipients(
  target: "all" | "active_subscribers" | "expired_subscribers" | "selected",
  selectedUserIds?: string[]
): Promise<string[]> {
  const admin = supabaseAdmin();
  if (target === "selected") return selectedUserIds ?? [];

  if (target === "all") {
    const { data } = await admin.from("profiles").select("id").eq("status", "ACTIVE");
    return (data ?? []).map((r) => r.id);
  }

  const { data } = await admin
    .from("subscriptions")
    .select("user_id, status, expires_at")
    .order("created_at", { ascending: false });
  if (!data) return [];

  const seen = new Map<string, "active" | "expired">();
  for (const s of data) {
    if (seen.has(s.user_id)) continue;
    const isActive = s.status === "active" && (!s.expires_at || new Date(s.expires_at) > new Date());
    seen.set(s.user_id, isActive ? "active" : "expired");
  }
  const want = target === "active_subscribers" ? "active" : "expired";
  return [...seen.entries()].filter(([, v]) => v === want).map(([k]) => k);
}
