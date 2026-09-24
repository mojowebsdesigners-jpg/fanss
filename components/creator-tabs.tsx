"use client";

import { useMemo, useState } from "react";
import { Tabs } from "./ui";
import { PostCard } from "./post-card";

export type FeedPost = {
  id: string;
  title: string | null;
  caption: string;
  visibility: string;
  price: number | null;
  preview: string | null;
  placeholder: string;
  likes: number;
  comments: number;
  when: string | null;
};

export function CreatorTabs({
  initialTab,
  posts,
  about,
}: {
  initialTab: string;
  posts: FeedPost[];
  about: string;
}) {
  const [tab, setTab] = useState(initialTab);

  const filtered = useMemo(() => {
    switch (tab) {
      case "photos":
        return posts.filter((p) => !p.caption.toLowerCase().includes("video")); // refine when media types are tracked per post
      case "videos":
        return posts.filter((p) => p.caption.toLowerCase().includes("video"));
      case "exclusive":
        return posts.filter((p) => p.visibility === "PPV" || p.visibility === "SUBSCRIBERS");
      default:
        return posts;
    }
  }, [tab, posts]);

  return (
    <section>
      <Tabs
        tabs={[
          { id: "posts", label: "Posts", count: posts.length },
          { id: "photos", label: "Photos" },
          { id: "videos", label: "Videos" },
          { id: "exclusive", label: "Exclusive", count: posts.filter((p) => p.visibility === "PPV" || p.visibility === "SUBSCRIBERS").length },
          { id: "about", label: "About" },
        ]}
        active={tab}
        onChange={setTab}
      />
      <div className="mt-6">
        {tab === "about" ? (
          <div className="glass rounded-2xl p-6 text-sm leading-relaxed text-mist">
            <p className="whitespace-pre-wrap">{about || "No bio yet."}</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-mist">Nothing here yet — check back soon.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
