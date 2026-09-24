import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, unauthorized, forbidden } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { notifyAllFans } from "@/lib/notify";

function isCreator(u: { profile: { role: string } } | null) {
  return !!u && (u.profile.role === "CREATOR" || u.profile.role === "ADMIN");
}

/** GET — creator's own posts with engagement + purchase analytics */
export async function GET() {
  const user = await getSessionUser();
  if (!isCreator(user)) return forbidden();

  const { data: posts } = await supabaseAdmin()
    .from("posts")
    .select("id, title, caption, visibility, price, status, scheduled_at, published_at, like_count, comment_count, view_count, featured, pinned, tags")
    .eq("creator_id", user!.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const ids = (posts ?? []).map((p) => p.id);
  const { data: analytics } = ids.length
    ? await supabaseAdmin().from("content_analytics").select("post_id, preview_views, unlock_clicks, purchases, revenue").in("post_id", ids)
    : { data: [] };
  const aMap = new Map((analytics ?? []).map((a) => [a.post_id, a]));

  return ok({
    posts: (posts ?? []).map((p) => ({
      ...p,
      previewViews: aMap.get(p.id)?.preview_views ?? 0,
      unlockClicks: aMap.get(p.id)?.unlock_clicks ?? 0,
      purchases: aMap.get(p.id)?.purchases ?? 0,
      revenue: Number(aMap.get(p.id)?.revenue ?? 0),
    })),
  });
}

/** POST — create post. body: {title, caption, visibility, price, assetIds, tags, featured, pinned, publish: 'now'|'schedule'|'draft', scheduledAt} */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!isCreator(user)) return forbidden();

  const rl = rateLimit(`create-post:${user!.id}`, 20, 3600_000);
  if (!rl.allowed) return fail("RATE_LIMITED", "Too many posts in a short window.", 429);

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    caption?: string;
    visibility?: "PUBLIC" | "REGISTERED" | "SUBSCRIBERS" | "PPV";
    price?: number;
    assetIds?: string[];
    previewAssetId?: string;
    tags?: string[];
    featured?: boolean;
    pinned?: boolean;
    publish?: "now" | "schedule" | "draft";
    scheduledAt?: string;
  };

  const visibility = body.visibility ?? "PUBLIC";
  const price = visibility === "PPV" ? Number(body.price) : null;
  if (visibility === "PPV" && (!price || price <= 0)) {
    return fail("BAD_REQUEST", "PPV posts need a price above zero.");
  }

  const publish = body.publish ?? "now";
  const status = publish === "draft" ? "draft" : publish === "schedule" ? "scheduled" : "published";
  if (publish === "schedule" && !body.scheduledAt) {
    return fail("BAD_REQUEST", "Pick a date and time to schedule.");
  }

  const { data: post, error } = await supabaseAdmin()
    .from("posts")
    .insert({
      creator_id: user!.id,
      title: body.title?.slice(0, 120) ?? null,
      caption: (body.caption ?? "").slice(0, 5000),
      visibility,
      price,
      preview_asset_id: body.previewAssetId ?? null,
      tags: (body.tags ?? []).map((t) => t.toLowerCase().slice(0, 30)).slice(0, 8),
      featured: !!body.featured,
      pinned: !!body.pinned,
      status,
      scheduled_at: publish === "schedule" ? body.scheduledAt! : null,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error || !post) return fail("DB_ERROR", "Could not create the post.", 500);

  // attach vault media
  const assetIds = (body.assetIds ?? []).slice(0, 30);
  for (const [i, assetId] of assetIds.entries()) {
    const { data: asset } = await supabaseAdmin()
      .from("media_assets")
      .select("creator_id")
      .eq("id", assetId)
      .maybeSingle();
    if (asset?.creator_id !== user!.id) continue;
    await supabaseAdmin().from("post_media").insert({ post_id: post.id, asset_id: assetId, position: i });
  }

  // notify fans for public publishes
  if (status === "published") {
    await notifyAllFans({
      type: "NEW_POST",
      title: "New post from the creator ✨",
      body: body.title || "Something new just landed in the feed.",
      link: `/post/${post.id}`,
      excludeUserId: user!.id,
    });
  }

  return ok({ postId: post.id });
}

/** PATCH — update / pin / feature / archive */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!isCreator(user)) return forbidden();

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    title?: string;
    caption?: string;
    price?: number;
    featured?: boolean;
    pinned?: boolean;
    status?: "draft" | "published" | "archived";
  };
  if (!body.id) return fail("BAD_REQUEST", "Missing id.");

  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = body.title.slice(0, 120);
  if (body.caption !== undefined) patch.caption = body.caption.slice(0, 5000);
  if (body.price !== undefined) patch.price = body.price;
  if (body.featured !== undefined) patch.featured = body.featured;
  if (body.pinned !== undefined) patch.pinned = body.pinned;
  if (body.status !== undefined) {
    patch.status = body.status;
    if (body.status === "published") patch.published_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin()
    .from("posts")
    .update(patch)
    .eq("id", body.id)
    .eq("creator_id", user!.id);
  if (error) return fail("DB_ERROR", "Update failed.", 500);
  return ok({ updated: true });
}

/** DELETE — soft delete; buyer records remain intact */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!isCreator(user)) return forbidden();

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("BAD_REQUEST", "Missing id.");

  const { error } = await supabaseAdmin()
    .from("posts")
    .update({ status: "deleted", deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("creator_id", user!.id);
  if (error) return fail("DB_ERROR", "Delete failed.", 500);
  return ok({ deleted: true });
}
