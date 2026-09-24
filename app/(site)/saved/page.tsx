import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { lockedPlaceholder } from "@/lib/placeholder";
import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { Bookmark } from "lucide-react";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Saved", robots: { index: false } };

export default async function SavedPage() {
  const user = await requireUser();
  const supabase = await supabaseServer();

  const { data: saved } = await supabase
    .from("saved_posts")
    .select("id, created_at, post:posts(id, title, caption, visibility, price, published_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const posts = (saved ?? [])
    .filter((s) => s.post)
    .map((s) => {
      const p = s.post as unknown as { id: string; title: string | null; caption: string; visibility: string; price: number | null; published_at: string | null };
      return { savedId: s.id, ...p };
    });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl text-white">Saved content</h1>
      <p className="mt-1 mb-8 text-sm text-mist">Posts you bookmarked for later.</p>

      {posts.length === 0 ? (
        <EmptyState
          icon={<Bookmark size={36} />}
          title="Nothing saved yet"
          body="Tap the bookmark on any post to keep it here."
          action={<Link href="/feed" className="btn-gold rounded-xl px-6 py-2.5 text-sm">Browse the feed</Link>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.savedId} href={`/post/${p.id}`} className="card-hover glass block overflow-hidden rounded-2xl">
              <div className="aspect-[4/3] w-full bg-cover bg-center" style={{ backgroundImage: `url("${lockedPlaceholder(p.id)}")` }} />
              <div className="p-4">
                <p className="truncate text-sm font-medium text-white">{p.title ?? p.caption.slice(0, 40)}</p>
                <p className="mt-0.5 text-xs text-mist">Saved {timeAgo(p.published_at)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
