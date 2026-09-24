import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, forbidden } from "@/lib/api";

export async function GET() {
  const user = await getSessionUser();
  if (!user || (user.profile.role !== "CREATOR" && user.profile.role !== "ADMIN")) return forbidden();

  const { data: promos } = await supabaseAdmin()
    .from("promotions")
    .select("id, name, code, discount_pct, banner_text, ends_at, max_redemptions, redemption_count, active, created_at")
    .order("created_at", { ascending: false });

  return ok({ promotions: promos ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.profile.role !== "CREATOR" && user.profile.role !== "ADMIN")) return forbidden();

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    code?: string;
    discountPct?: number;
    bannerText?: string;
    endsAt?: string;
    maxRedemptions?: number;
  };
  if (!body.name?.trim() || !body.discountPct || body.discountPct <= 0 || body.discountPct > 100) {
    return fail("BAD_REQUEST", "Name and a discount between 1–100% are required.");
  }

  const { data: creator } = await supabaseAdmin().from("creator_profiles").select("profile_id").limit(1).maybeSingle();

  const code = body.code?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) || `LUM${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const { data, error } = await supabaseAdmin()
    .from("promotions")
    .insert({
      creator_id: creator?.profile_id ?? user.id,
      name: body.name.trim().slice(0, 100),
      code,
      discount_pct: body.discountPct,
      banner_text: body.bannerText?.slice(0, 200) ?? null,
      ends_at: body.endsAt ? new Date(body.endsAt).toISOString() : null,
      max_redemptions: body.maxRedemptions ?? null,
    })
    .select("id, code")
    .single();
  if (error) {
    if (error.message.includes("duplicate")) return fail("EXISTS", "That code is already in use.");
    return fail("DB_ERROR", "Could not create promotion.", 500);
  }
  return ok({ promotion: data });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.profile.role !== "CREATOR" && user.profile.role !== "ADMIN")) return forbidden();
  const body = (await req.json().catch(() => ({}))) as { id?: string; active?: boolean };
  if (!body.id) return fail("BAD_REQUEST", "Missing id.");

  // Ownership check: creators may only toggle their own promotions
  // (ADMIN may toggle any). Prevents cross-creator tampering via guessed ids.
  let q = supabaseAdmin().from("promotions").update({ active: !!body.active }).eq("id", body.id);
  if (user.profile.role !== "ADMIN") q = q.eq("creator_id", user.id);
  await q;
  return ok({ updated: true });
}
