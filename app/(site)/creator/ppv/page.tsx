import type { Metadata } from "next";
import { requireCreator } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { CreatorShell } from "@/components/creator-shell";
import { PpvClient } from "@/components/ppv-client";

export const metadata: Metadata = { title: "PPV", robots: { index: false } };

export default async function PpvPage() {
  await requireCreator();
  const supabase = await supabaseServer();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, price, status, published_at, like_count, view_count")
    .eq("creator_id", (await supabase.auth.getUser()).data.user?.id ?? "")
    .eq("visibility", "PPV")
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(100);

  const { data: analytics } = await supabase
    .from("content_analytics")
    .select("post_id, preview_views, unlock_clicks, purchases, revenue")
    .in("post_id", (posts ?? []).map((p) => p.id));

  const aMap = new Map((analytics ?? []).map((a) => [a.post_id, a]));

  const rows = (posts ?? []).map((p) => {
    const a = aMap.get(p.id);
    const views = a?.preview_views ?? 0;
    const clicks = a?.unlock_clicks ?? 0;
    const purchases = a?.purchases ?? 0;
    return {
      id: p.id,
      title: p.title ?? "Untitled",
      price: Number(p.price ?? 0),
      publishedAt: p.published_at,
      previewViews: views,
      unlockClicks: clicks,
      purchases,
      revenue: Number(a?.revenue ?? 0),
      conversion: views > 0 ? Math.round((purchases / views) * 1000) / 10 : 0,
    };
  });

  return (
    <CreatorShell>
      <PpvClient rows={rows} />
    </CreatorShell>
  );
}
