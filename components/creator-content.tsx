"use client";

import { useCallback, useEffect, useState } from "react";
import { Pin, Star, Archive, Trash2, Plus, Eye, DollarSign, Calendar, Loader2 } from "lucide-react";
import { Button, Card, Input, Textarea, Badge, Modal, Tabs, EmptyState, useToast } from "./ui";
import { cn, money, timeAgo } from "@/lib/format";

type Post = {
  id: string;
  title: string | null;
  caption: string;
  visibility: "PUBLIC" | "REGISTERED" | "SUBSCRIBERS" | "PPV";
  price: number | null;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  like_count: number;
  comment_count: number;
  view_count: number;
  featured: boolean;
  pinned: boolean;
  purchases: number;
  revenue: number;
  previewViews: number;
};

export function CreatorContent() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    const res = await fetch("/api/creator/posts");
    const json = await res.json();
    if (json.success) setPosts(json.data.posts);
    setLoading(false);
  }, []);

  useEffect(() => void load(), [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch("/api/creator/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this post? Buyers keep their access, purchase records are preserved.")) return;
    await fetch(`/api/creator/posts?id=${id}`, { method: "DELETE" });
    toast("Post deleted", "success");
    void load();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-white">Content</h1>
          <p className="text-sm text-mist">Compose, publish, pin and track everything you post.</p>
        </div>
        <Button onClick={() => setComposerOpen(true)}>
          <Plus size={15} /> Create post
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20" />)}</div>
      ) : posts.length === 0 ? (
        <EmptyState title="No posts yet" body="Create your first post — free for everyone, subscribers-only, or PPV." action={<Button onClick={() => setComposerOpen(true)}>Create post</Button>} />
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex flex-wrap items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-white">{p.title || p.caption.slice(0, 40) || "Untitled"}</p>
                    <Badge tone={p.visibility === "PPV" ? "gold" : p.visibility === "SUBSCRIBERS" ? "violet" : "gray"}>
                      {p.visibility === "PPV" ? `PPV ${money(p.price ?? 0)}` : p.visibility}
                    </Badge>
                    <Badge tone={p.status === "published" ? "green" : p.status === "scheduled" ? "gold" : "gray"}>{p.status}</Badge>
                    {p.pinned && <Badge tone="gold"><Pin size={10} /> pinned</Badge>}
                    {p.featured && <Badge tone="gold"><Star size={10} /> featured</Badge>}
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-mist">{p.caption}</p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-mist">
                    <span>👁 {p.view_count + p.previewViews}</span>
                    <span>♥ {p.like_count}</span>
                    <span>💬 {p.comment_count}</span>
                    {p.visibility === "PPV" && <span className="text-champagne">🔓 {p.purchases} · {money(p.revenue)}</span>}
                    <span>{p.status === "scheduled" ? `scheduled ${timeAgo(p.scheduled_at)}` : timeAgo(p.published_at ?? p.scheduled_at)}</span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <IconBtn label="Pin" active={p.pinned} onClick={() => patch(p.id, { pinned: !p.pinned })}><Pin size={14} /></IconBtn>
                  <IconBtn label="Feature" active={p.featured} onClick={() => patch(p.id, { featured: !p.featured })}><Star size={14} /></IconBtn>
                  {p.status === "published" ? (
                    <IconBtn label="Archive" onClick={() => patch(p.id, { status: "archived" })}><Archive size={14} /></IconBtn>
                  ) : (
                    <IconBtn label="Publish" onClick={() => patch(p.id, { status: "published" })}><Eye size={14} /></IconBtn>
                  )}
                  <IconBtn label="Delete" onClick={() => remove(p.id)}><Trash2 size={14} className="text-rose-300" /></IconBtn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Composer open={composerOpen} onClose={() => { setComposerOpen(false); void load(); }} />
    </div>
  );
}

function IconBtn({ children, label, active, onClick }: { children: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn("rounded-lg border border-line p-2 transition", active ? "bg-champagne/15 text-champagne" : "text-mist hover:bg-white/5 hover:text-white")}
    >
      {children}
    </button>
  );
}

function Composer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "REGISTERED" | "SUBSCRIBERS" | "PPV">("PUBLIC");
  const [price, setPrice] = useState("");
  const [tags, setTags] = useState("");
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const [publish, setPublish] = useState<"now" | "schedule" | "draft">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [vaultAssets, setVaultAssets] = useState<{ id: string; filename: string; url: string | null; video: boolean }[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    setLoadingVault(true);
    fetch("/api/vault?limit=36")
      .then((r) => r.json())
      .then((j) => j.success && setVaultAssets(j.data.assets))
      .finally(() => setLoadingVault(false));
  }, [open]);

  async function submit() {
    if (visibility === "PPV" && (!parseFloat(price) || parseFloat(price) <= 0)) {
      toast("Set a price for PPV content", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/creator/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          caption,
          visibility,
          price: visibility === "PPV" ? parseFloat(price) : undefined,
          assetIds,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          publish,
          scheduledAt: publish === "schedule" ? new Date(scheduledAt).toISOString() : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast(publish === "draft" ? "Draft saved" : publish === "schedule" ? "Post scheduled" : "Published 🎉", "success");
        onClose();
      } else {
        toast(json.error?.message ?? "Could not save", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create post" wide>
      <div className="space-y-4">
        <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        <Textarea placeholder="Caption… tell them what they're getting." value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={5000} className="min-h-28" />

        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-mist">Visibility</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { id: "PUBLIC", label: "Public", desc: "Everyone" },
              { id: "REGISTERED", label: "Members", desc: "Signed-in fans" },
              { id: "SUBSCRIBERS", label: "Subscribers", desc: "Active subs" },
              { id: "PPV", label: "PPV", desc: "One-time unlock" },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setVisibility(v.id as typeof visibility)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition",
                  visibility === v.id ? "border-champagne bg-champagne/10" : "border-line hover:border-line-strong"
                )}
              >
                <p className="text-sm font-medium text-white">{v.label}</p>
                <p className="text-[10px] text-mist">{v.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {visibility === "PPV" && (
          <label className="flex items-center gap-2">
            <DollarSign size={16} className="text-champagne" />
            <Input placeholder="Unlock price (e.g. 9.99)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} />
          </label>
        )}

        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-mist">Media from vault ({assetIds.length} selected)</p>
          {loadingVault ? (
            <div className="flex h-24 items-center justify-center"><Loader2 className="animate-spin text-mist" size={20} /></div>
          ) : (
            <div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto rounded-xl border border-line p-2 sm:grid-cols-6">
              {vaultAssets.map((a) => (
                <button
                  key={a.id}
                  onClick={() =>
                    setAssetIds((ids) => (ids.includes(a.id) ? ids.filter((x) => x !== a.id) : [...ids, a.id]))
                  }
                  className={cn("relative aspect-square overflow-hidden rounded-lg border-2 transition", assetIds.includes(a.id) ? "border-champagne" : "border-transparent")}
                >
                  {a.video ? <video src={a.url ?? ""} className="h-full w-full object-cover" muted /> : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url ?? ""} alt={a.filename} className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
              {vaultAssets.length === 0 && <p className="col-span-6 py-6 text-center text-xs text-mist">Vault is empty — upload media first.</p>}
            </div>
          )}
        </div>

        <Input placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} />

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          {[
            { id: "now", label: "Publish now", icon: Eye },
            { id: "schedule", label: "Schedule", icon: Calendar },
            { id: "draft", label: "Save draft", icon: Plus },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setPublish(opt.id as typeof publish)}
              className={cn("flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm transition", publish === opt.id ? "bg-champagne/15 text-champagne" : "text-mist hover:text-white")}
            >
              <opt.icon size={14} /> {opt.label}
            </button>
          ))}
          {publish === "schedule" && (
            <input type="datetime-local" className="input-dark w-auto" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          )}
        </div>

        <Button onClick={submit} loading={saving} size="lg" className="w-full">
          {publish === "draft" ? "Save draft" : publish === "schedule" ? "Schedule post" : "Publish"}
        </Button>
      </div>
    </Modal>
  );
}
