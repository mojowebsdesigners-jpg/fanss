import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, forbidden } from "@/lib/api";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.profile.role !== "CREATOR" && user.profile.role !== "ADMIN")) return forbidden();

  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "30");

  const { data: creator } = await supabaseAdmin().from("creator_profiles").select("profile_id").limit(1).maybeSingle();

  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const { data: series } = await supabaseAdmin()
    .from("creator_analytics")
    .select("day, subscribers_active, new_subscribers, subscription_revenue, ppv_revenue, tip_revenue, message_revenue, bundle_revenue, new_users")
    .eq("creator_id", creator?.profile_id ?? user.id)
    .gte("day", since)
    .order("day");

  return ok({ series: series ?? [] });
}
