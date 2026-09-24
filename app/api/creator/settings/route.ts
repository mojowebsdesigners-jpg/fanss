import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, forbidden } from "@/lib/api";

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.profile.role !== "CREATOR" && user.profile.role !== "ADMIN")) return forbidden();

  // The caller must actually own the (singleton) creator profile — role alone
  // is not proof of ownership. Admins are trusted operators and may too.
  const { data: ownCreator } = await supabaseAdmin()
    .from("creator_profiles")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!ownCreator && user.profile.role !== "ADMIN") return forbidden("Not the creator of this platform.");

  const body = (await req.json().catch(() => ({}))) as {
    tagline?: string;
    about?: string;
    socials?: Record<string, string>;
    plan?: { id: string; name: string; price: number; benefits: string[] };
  };

  // creator profile fields
  const cpPatch: Record<string, unknown> = {};
  if (body.tagline !== undefined) cpPatch.tagline = body.tagline.slice(0, 120);
  if (body.about !== undefined) cpPatch.about = body.about.slice(0, 2000);
  if (body.socials !== undefined) {
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(body.socials).slice(0, 8)) {
      if (typeof v === "string" && v.startsWith("http")) clean[k.toLowerCase().slice(0, 20)] = v.slice(0, 300);
    }
    cpPatch.social_links = clean;
  }
  if (Object.keys(cpPatch).length > 0) {
    await supabaseAdmin().from("creator_profiles").update(cpPatch).eq("profile_id", user.id);
  }

  // plan update
  if (body.plan) {
    await supabaseAdmin()
      .from("subscription_plans")
      .update({
        name: body.plan.name.slice(0, 80),
        price: Math.max(0, body.plan.price),
        benefits: body.plan.benefits.slice(0, 10).map((b) => String(b).slice(0, 100)),
      })
      .eq("id", body.plan.id);
  }

  return ok({ saved: true });
}
