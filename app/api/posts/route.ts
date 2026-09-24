import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { ok } from "@/lib/api";
import { lockedPlaceholder } from "@/lib/placeholder";

export async function GET(req: NextRequest) {
  const before = req.nextUrl.searchParams.get("before");
  const pageSize = 12;

  let q = supabaseAdmin()
    .from("posts")
    .select("id, title, caption, visibility, price, like_count, comment_count, published_at")
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(pageSize + 1);
  if (before) q = q.lt("published_at", before);

  const { data } = await q;
  const hasMore = (data?.length ?? 0) > pageSize;
  const feed = (data ?? []).slice(0, pageSize);

  return ok({
    posts: feed.map((p) => ({
      id: p.id,
      title: p.title,
      caption: p.caption,
      visibility: p.visibility,
      price: p.price,
      placeholder: lockedPlaceholder(p.id),
      likes: p.like_count,
      comments: p.comment_count,
      when: p.published_at,
    })),
    hasMore,
  });
}
