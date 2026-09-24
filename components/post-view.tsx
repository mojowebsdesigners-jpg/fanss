"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Lock, MessageSquare, Bookmark, Flag, Check } from "lucide-react";
import { Button, Badge, useToast } from "./ui";
import { MediaGallery, LockedMedia, type MediaItem } from "./media";
import { money, timeAgo } from "@/lib/format";

export function PostView({
  postId,
  title,
  caption,
  visibility,
  price,
  tags,
  when,
  accessible,
  signedIn,
  isOwner,
  placeholder,
}: {
  postId: string;
  title: string | null;
  caption: string;
  visibility: string;
  price: number | null;
  tags: string[];
  when: string | null;
  accessible: boolean;
  signedIn: boolean;
  isOwner: boolean;
  placeholder: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [media, setMedia] = useState<MediaItem[] | null>(accessible ? [] : null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [unlocked, setUnlocked] = useState(accessible);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    // view tracking (fire and forget)
    fetch(`/api/posts/${postId}/view`, { method: "POST" }).catch(() => {});
    if (!accessible) return;
    (async () => {
      const [mRes, eRes] = await Promise.all([
        fetch(`/api/posts/${postId}/media`),
        fetch(`/api/posts/${postId}/engagement`),
      ]);
      const mJson = await mRes.json();
      const eJson = await eRes.json();
      if (mJson.success) setMedia(mJson.data.media);
      if (eJson.success) {
        setLiked(eJson.data.liked);
        setLikeCount(eJson.data.likeCount);
        setSaved(eJson.data.saved);
      }
    })();
  }, [postId, accessible]);

  async function toggleLike() {
    if (!signedIn) return router.push("/login?next=/post/" + postId);
    const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    const json = await res.json();
    if (json.success) {
      setLiked(json.data.liked);
      setLikeCount(json.data.likeCount);
    }
  }

  async function toggleSave() {
    if (!signedIn) return router.push("/login?next=/post/" + postId);
    const res = await fetch(`/api/posts/${postId}/save`, { method: "POST" });
    const json = await res.json();
    if (json.success) {
      setSaved(json.data.saved);
      toast(json.data.saved ? "Saved to your collection" : "Removed from saved", "success");
    }
  }

  async function unlock() {
    if (!signedIn) return router.push("/login?next=/post/" + postId);
    setPaying(true);
    try {
      const res = await fetch(`/api/payments/ppv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      const json = await res.json();
      if (!json.success) {
        toast(json.error?.message ?? "Could not start checkout", "error");
        return;
      }
      if (json.data.alreadyOwned) {
        toast("You already own this content", "success");
        router.refresh();
        return;
      }
      window.location.href = json.data.invoiceUrl;
    } finally {
      setPaying(false);
    }
  }

  return (
    <article className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-4 flex items-center gap-3 text-sm text-mist">
        <Link href="/creator" className="hover:text-white">@creator</Link>
        <span>·</span>
        <span>{timeAgo(when)}</span>
        {visibility === "PPV" && <Badge tone="gold">PPV</Badge>}
        {visibility === "SUBSCRIBERS" && <Badge tone="violet">Subscribers</Badge>}
      </div>

      <h1 className="font-display text-3xl text-white">{title ?? "Untitled"}</h1>
      <p className="mt-3 whitespace-pre-wrap text-white/85">{caption}</p>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((t) => (
            <Badge key={t} tone="gray">#{t}</Badge>
          ))}
        </div>
      )}

      <div className="mt-8">
        {unlocked ? (
          media === null ? (
            <div className="skeleton aspect-square w-full rounded-2xl" />
          ) : media.length > 0 ? (
            <MediaGallery items={media} />
          ) : null
        ) : visibility === "PPV" ? (
          <LockedMedia
            placeholder={placeholder}
            price={price}
            onUnlock={unlock}
          />
        ) : (
          <LockedMedia placeholder={placeholder} onUnlock={() => router.push("/subscribe")} />
        )}
      </div>

      <div className="mt-6 flex items-center gap-6 border-t border-line pt-5">
        <button
          onClick={toggleLike}
          className={cnFlex(liked ? "text-rose-400" : undefined)}
          aria-label="Like"
        >
          <Heart size={20} className={liked ? "fill-current animate-heart" : ""} /> {likeCount}
        </button>
        <a href="#comments" className="flex items-center gap-1.5 text-sm text-mist hover:text-white">
          <MessageSquare size={18} /> Comments
        </a>
        <button
          onClick={toggleSave}
          className={cnFlex(saved ? "text-champagne" : undefined, "ml-auto")}
          aria-label="Save"
        >
          <Bookmark size={19} className={saved ? "fill-current" : ""} /> {saved ? "Saved" : "Save"}
        </button>
        <ReportButton postId={postId} signedIn={signedIn} />
      </div>

      <CommentsSection postId={postId} signedIn={signedIn} />
    </article>
  );
}

function cnFlex(active?: string, extra?: string) {
  return `flex items-center gap-1.5 text-sm transition ${active ?? ""} ${extra ?? "text-mist hover:text-white"}`;
}

function ReportButton({ postId, signedIn }: { postId: string; signedIn: boolean }) {
  const [reported, setReported] = useState(false);
  const toast = useToast();

  async function report() {
    if (!signedIn) return;
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "post", targetId: postId, reason: "other" }),
    });
    if (res.ok) {
      setReported(true);
      toast("Report submitted. Thank you.", "success");
    }
  }

  return (
    <button onClick={report} disabled={reported} className="flex items-center gap-1 text-xs text-mist/60 hover:text-mist" aria-label="Report">
      {reported ? <Check size={13} /> : <Flag size={13} />} {reported ? "Reported" : "Report"}
    </button>
  );
}

function CommentsSection({ postId, signedIn }: { postId: string; signedIn: boolean }) {
  const toast = useToast();
  const [comments, setComments] = useState<{ id: string; body: string; username: string; when: string; mine: boolean }[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/posts/${postId}/comments`)
      .then((r) => r.json())
      .then((j) => j.success && setComments(j.data.comments))
      .finally(() => setLoading(false));
  }, [postId]);

  async function post() {
    if (!body.trim()) return;
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const json = await res.json();
    if (json.success) {
      setComments((c) => [...c, json.data.comment]);
      setBody("");
    } else {
      toast(json.error?.message ?? "Could not post comment", "error");
    }
  }

  return (
    <section id="comments" className="mt-10 border-t border-line pt-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-mist">Comments</h2>
      {signedIn && (
        <div className="mb-6 flex gap-2">
          <input
            className="input-dark"
            placeholder="Say something nice…"
            value={body}
            maxLength={1000}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && post()}
          />
          <Button onClick={post} size="sm">Post</Button>
        </div>
      )}
      {loading ? (
        <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-14 w-full" />)}</div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-mist">No comments yet.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-champagne/30 to-violet/30" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-mist">
                  <span className="font-medium text-white/90">{c.username}</span> · {timeAgo(c.when)}
                </p>
                <p className="mt-0.5 break-words text-sm text-white/85">{c.body}</p>
              </div>
              {c.mine && (
                <button
                  onClick={async () => {
                    await fetch(`/api/posts/${postId}/comments?commentId=${c.id}`, { method: "DELETE" });
                    setComments((list) => list.filter((x) => x.id !== c.id));
                  }}
                  className="text-xs text-mist/50 hover:text-rose-300"
                >
                  delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
