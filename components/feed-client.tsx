"use client";

import { useState } from "react";
import { PostCard } from "./post-card";
import type { FeedPost } from "./creator-tabs";

export function FeedClient({ initialPosts, hasMore }: { initialPosts: FeedPost[]; hasMore: boolean }) {
  const [posts, setPosts] = useState(initialPosts);
  const [more, setMore] = useState(hasMore);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(initialPosts.at(-1)?.when ?? null);

  async function loadMore() {
    if (loading || !more) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts?before=${encodeURIComponent(cursor ?? "")}`);
      const json = await res.json();
      if (json.success) {
        setPosts((p) => [...p, ...json.data.posts]);
        setCursor(json.data.posts.at(-1)?.when ?? cursor);
        setMore(json.data.hasMore);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      {more && (
        <div className="pt-4 text-center">
          <button onClick={loadMore} disabled={loading} className="btn-ghost rounded-xl px-6 py-2.5 text-sm text-white">
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
      {!more && posts.length > 0 && <p className="pt-6 text-center text-xs text-mist">You're all caught up ✦</p>}
    </div>
  );
}
