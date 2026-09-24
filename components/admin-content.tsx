"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tabs, Badge, EmptyState, useToast } from "./ui";
import { money, dateTime } from "@/lib/format";

type Post = {
  id: string;
  title: string | null;
  caption: string;
  visibility: string;
  status: string;
  price: number | null;
  like_count: number;
  comment_count: number;
  created_at: string;
};

export function AdminContent({ posts }: { posts: Post[] }) {
  const [tab, setTab] = useState("published");
  const router = useRouter();
  const toast = useToast();

  const filtered = tab === "all" ? posts : posts.filter((p) => p.status === tab);

  async function act(postId: string, action: "remove" | "restore") {
    const res = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, action }),
    });
    const json = await res.json();
    if (json.success) {
      toast(action === "remove" ? "Content removed" : "Content restored", "success");
      router.refresh();
    } else {
      toast(json.error?.message ?? "Action failed", "error");
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-white">Content</h1>
      <p className="mb-6 text-sm text-mist">Every post on the platform with moderation controls.</p>

      <Tabs
        tabs={[
          { id: "published", label: "Published" },
          { id: "draft", label: "Drafts" },
          { id: "scheduled", label: "Scheduled" },
          { id: "archived", label: "Archived" },
          { id: "all", label: "All" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-6 space-y-2">
        {filtered.length === 0 ? (
          <EmptyState title="Nothing here" />
        ) : (
          filtered.map((p) => (
            <div key={p.id} className="glass flex flex-wrap items-center gap-4 rounded-2xl p-4">
              <div className="min-w-0 flex-1">
                <Link href={`/post/${p.id}`} className="truncate text-sm font-medium text-white hover:text-champagne">
                  {p.title || p.caption.slice(0, 50) || "Untitled"}
                </Link>
                <p className="text-xs text-mist">
                  {p.visibility.toLowerCase()} · ♥ {p.like_count} · 💬 {p.comment_count} · {dateTime(p.created_at)}
                </p>
              </div>
              <Badge tone={p.visibility === "PPV" ? "gold" : "gray"}>
                {p.visibility === "PPV" ? `PPV ${money(p.price ?? 0)}` : p.visibility.toLowerCase()}
              </Badge>
              <Badge tone={p.status === "published" ? "green" : "gray"}>{p.status}</Badge>
              {p.status === "published" ? (
                <button onClick={() => act(p.id, "remove")} className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-300 transition hover:bg-rose-500/10">
                  Take down
                </button>
              ) : (
                <button onClick={() => act(p.id, "restore")} className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-500/10">
                  Restore
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
