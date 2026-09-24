import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, forbidden } from "@/lib/api";

export async function GET() {
  const user = await getSessionUser();
  if (!user || (user.profile.role !== "CREATOR" && user.profile.role !== "ADMIN")) return forbidden();

  const { data: bundles } = await supabaseAdmin()
    .from("content_bundles")
    .select("id, name, description, price, status, created_at, bundle_items(id)")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  const { data: purchases } = await supabaseAdmin()
    .from("bundle_purchases")
    .select("bundle_id, amount")
    .eq("status", "completed");

  return ok({
    bundles: (bundles ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      price: Number(b.price),
      status: b.status,
      itemCount: b.bundle_items?.length ?? 0,
      sales: (purchases ?? []).filter((p) => p.bundle_id === b.id).length,
      revenue: (purchases ?? []).filter((p) => p.bundle_id === b.id).reduce((s, p) => s + Number(p.amount), 0),
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.profile.role !== "CREATOR" && user.profile.role !== "ADMIN")) return forbidden();

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    price?: number;
    assetIds?: string[];
    postIds?: string[];
  };
  if (!body.name?.trim() || !body.price || body.price <= 0) {
    return fail("BAD_REQUEST", "Name and a positive price are required.");
  }

  const { data: bundle, error } = await supabaseAdmin()
    .from("content_bundles")
    .insert({
      creator_id: user.id,
      name: body.name.trim().slice(0, 120),
      description: body.description?.slice(0, 1000) ?? null,
      price: body.price,
    })
    .select("id")
    .single();
  if (error || !bundle) return fail("DB_ERROR", "Could not create the bundle.", 500);

  for (const assetId of (body.assetIds ?? []).slice(0, 50)) {
    const { data: asset } = await supabaseAdmin().from("media_assets").select("creator_id").eq("id", assetId).maybeSingle();
    if (asset?.creator_id === user.id) {
      await supabaseAdmin().from("bundle_items").insert({ bundle_id: bundle.id, item_type: "media_asset", asset_id: assetId });
    }
  }
  for (const postId of (body.postIds ?? []).slice(0, 50)) {
    const { data: post } = await supabaseAdmin().from("posts").select("creator_id").eq("id", postId).maybeSingle();
    if (post?.creator_id === user.id) {
      await supabaseAdmin().from("bundle_items").insert({ bundle_id: bundle.id, item_type: "post", post_id: postId });
    }
  }

  return ok({ bundleId: bundle.id });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.profile.role !== "CREATOR" && user.profile.role !== "ADMIN")) return forbidden();
  const body = (await req.json().catch(() => ({}))) as { id?: string; status?: string; price?: number };
  if (!body.id) return fail("BAD_REQUEST", "Missing id.");

  const patch: Record<string, unknown> = {};
  if (body.status) patch.status = body.status;
  if (body.price) patch.price = body.price;

  await supabaseAdmin().from("content_bundles").update(patch).eq("id", body.id).eq("creator_id", user.id);
  return ok({ updated: true });
}
