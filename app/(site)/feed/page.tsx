import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { lockedPlaceholder } from "@/lib/placeholder";
import { FeedClient } from "@/components/feed-client";

export const metadata: Metadata = {
  title: "Feed",
  description: "The latest posts, previews and exclusive drops.",
};

export const revalidate = 30;

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ before?: string }> }) {
  const { before } = await searchParams;
  const supabase = await supabaseServer();

  const pageSize = 12;
  let q = supabase
    .from("posts")
    .select("id, title, caption, visibility, price, preview_asset_id, like_count, comment_count, published_at")
    .eq("status", "published")
    .not("published_at", "is", null)
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(pageSize + 1);
  if (before) q = q.lt("published_at", before);
  const { data: posts } = await q;

  const hasMore = (posts?.length ?? 0) > pageSize;
  const feed = (posts ?? []).slice(0, pageSize);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-8 font-display text-3xl text-white">The feed</h1>
      <FeedClient
        initialPosts={feed.map((p) => ({
          id: p.id,
          title: p.title,
          caption: p.caption,
          visibility: p.visibility,
          price: p.price,
          preview: null,
          placeholder: lockedPlaceholder(p.id),
          likes: p.like_count,
          comments: p.comment_count,
          when: p.published_at,
        }))}
        hasMore={hasMore}
      />
    </div>
  );
}
