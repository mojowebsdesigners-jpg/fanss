import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, forbidden } from "@/lib/api";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.profile.role !== "CREATOR" && user.profile.role !== "ADMIN")) return forbidden();

  const filter = req.nextUrl.searchParams.get("filter") ?? "all";
  const search = req.nextUrl.searchParams.get("search");

  const { data: subsData } = await supabaseAdmin()
    .from("subscriptions")
    .select("id, user_id, status, started_at, expires_at, created_at, plan:subscription_plans(name)")
    .order("created_at", { ascending: false })
    .limit(500);

  const subs = (subsData ?? []) as unknown as Array<{
    id: string; user_id: string; status: string; started_at: string | null; expires_at: string | null; created_at: string; plan: { name: string } | null;
  }>;

  // newest subscription per user
  const byUser = new Map<string, (typeof subs)[number]>();
  for (const s of subs ?? []) if (!byUser.has(s.user_id)) byUser.set(s.user_id, s);

  let rows = [...byUser.values()];
  const now = new Date();
  rows = rows.filter((s) => {
    const isActive = s.status === "active" && (!s.expires_at || new Date(s.expires_at) > now);
    if (filter === "active") return isActive;
    if (filter === "expired") return !isActive && s.status !== "pending";
    if (filter === "expiring") {
      return isActive && s.expires_at && (new Date(s.expires_at).getTime() - now.getTime()) / 86400000 <= 7;
    }
    return true;
  });

  // enrich with profile info
  const userIds = rows.map((r) => r.user_id);
  const { data: profiles } = userIds.length
    ? await supabaseAdmin().from("profiles").select("id, username, display_name, avatar_url, email, created_at").in("id", userIds)
    : { data: [] };
  const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  let out = rows.map((s) => {
    const p = pMap.get(s.user_id);
    const isActive = s.status === "active" && (!s.expires_at || new Date(s.expires_at) > now);
    const daysLeft = s.expires_at ? Math.ceil((new Date(s.expires_at).getTime() - now.getTime()) / 86400000) : null;
    return {
      subscriptionId: s.id,
      username: p?.username ?? "unknown",
      displayName: p?.display_name ?? null,
      avatar: p?.avatar_url ?? null,
      email: p?.email ?? null,
      joinedAt: p?.created_at ?? null,
      status: isActive ? "active" : s.status === "pending" ? "pending" : "expired",
      planName: (s.plan as { name: string } | null)?.name ?? null,
      startedAt: s.started_at,
      expiresAt: s.expires_at,
      daysLeft,
    };
  });

  if (search) {
    const s = search.toLowerCase();
    out = out.filter((r) => r.username.includes(s) || (r.email ?? "").toLowerCase().includes(s) || (r.displayName ?? "").toLowerCase().includes(s));
  }

  return ok({ subscribers: out });
}
