"use client";

import Link from "next/link";
import { Heart, Lock, MessageSquare } from "lucide-react";
import { money, timeAgo, cn } from "@/lib/format";
import type { FeedPost } from "./creator-tabs";

export function PostCard({ post }: { post: FeedPost }) {
  const locked = post.visibility === "PPV" || post.visibility === "SUBSCRIBERS";

  return (
    <Link href={`/post/${post.id}`} className="card-hover glass group block overflow-hidden rounded-2xl">
      <div
        className="relative aspect-[4/5] w-full"
        style={{ backgroundImage: `url("${post.placeholder}")`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        {post.preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.preview} alt={post.title ?? ""} loading="lazy" className="h-full w-full object-cover" />
        )}
        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/35 text-center">
            <Lock size={20} className="text-champagne" />
            <p className="text-xs font-medium text-white">
              {post.visibility === "PPV" ? `Unlock for ${money(post.price ?? 0)}` : "Subscribers only"}
            </p>
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="truncate text-sm font-medium text-white">{post.title ?? (post.caption.slice(0, 40) || "Untitled")}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-mist">{post.caption.slice(0, 40) || "Untitled"}</p>
        <div className="mt-2.5 flex items-center gap-4 text-xs text-mist">
          <span className="flex items-center gap-1"><Heart size={13} /> {post.likes}</span>
          <span className="flex items-center gap-1"><MessageSquare size={13} /> {post.comments}</span>
          <span className="ml-auto">{timeAgo(post.when)}</span>
        </div>
      </div>
    </Link>
  );
}
