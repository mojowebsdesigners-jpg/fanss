"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Lock, Paperclip, Send, DollarSign, X, Loader2 } from "lucide-react";
import { Avatar, Button, useToast } from "./ui";
import { useMediaProtection, Watermark } from "./media";
import { cn, money, timeAgo } from "@/lib/format";

type Conversation = {
  id: string;
  other: { username: string; display_name: string | null; avatar_url: string | null };
  lastMessageAt: string;
  unread: number;
};

type Msg = {
  id: string;
  body: string;
  mine: boolean;
  when: string;
  read?: boolean;
  locked: boolean;
  price: number | null;
  media: { id: string; mime: string; url: string | null; video: boolean }[];
};

export function MessagesClient({
  currentUserId,
  isCreator,
  initialConversation,
  viewerName,
}: {
  currentUserId: string;
  isCreator: boolean;
  initialConversation: string | null;
  viewerName: string;
}) {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(initialConversation);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attached, setAttached] = useState<{ assetId: string; price?: number }[]>([]);
  const [showVault, setShowVault] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  useMediaProtection(); // no right-click save / drag-out / copy inside DMs

  const loadConvs = useCallback(async () => {
    const res = await fetch("/api/messages");
    const json = await res.json();
    if (json.success) {
      setConvs(json.data.conversations);
      if (!active && json.data.conversations.length > 0 && !initialConversation) {
        setActive(json.data.conversations[0].id);
      }
    }
    setLoading(false);
  }, [active, initialConversation]);

  const loadMessages = useCallback(async (convId: string) => {
    const res = await fetch(`/api/messages/${convId}`);
    const json = await res.json();
    if (json.success) setMessages(json.data.messages);
  }, []);

  useEffect(() => {
    void loadConvs();
    const t = setInterval(() => void loadConvs(), 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!active) return;
    void loadMessages(active);
    const t = setInterval(() => void loadMessages(active), 8000);
    return () => clearInterval(t);
  }, [active, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    if (!active || (!text.trim() && attached.length === 0)) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: active, body: text, media: attached }),
      });
      const json = await res.json();
      if (json.success) {
        setMessages((m) => [...m, json.data.message]);
        setText("");
        setAttached([]);
        void loadConvs();
      } else {
        toast(json.error?.message ?? "Could not send", "error");
      }
    } finally {
      setSending(false);
    }
  }

  async function unlock(messageId: string) {
    const res = await fetch(`/api/messages/${messageId}/unlock`, { method: "POST" });
    const json = await res.json();
    if (!json.success) {
      toast(json.error?.message ?? "Could not start unlock", "error");
      return;
    }
    window.location.href = json.data.invoiceUrl;
  }

  const activeConv = convs.find((c) => c.id === active);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid h-[calc(100vh-13rem)] overflow-hidden rounded-3xl border border-line md:grid-cols-[300px_1fr]">
        {/* conversation list */}
        <aside className={cn("flex flex-col border-r border-line bg-ink-2/60", active && "hidden md:flex")}>
          <div className="border-b border-line px-5 py-4">
            <h1 className="font-display text-xl text-white">Messages</h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16" />)}</div>
            ) : convs.length === 0 ? (
              <p className="p-6 text-center text-sm text-mist">
                No conversations yet.<br />Say hello to the creator ✦
              </p>
            ) : (
              convs.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-line/50 px-4 py-3.5 text-left transition",
                    active === c.id ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                  )}
                >
                  <Avatar src={c.other.avatar_url} name={c.other.display_name ?? c.other.username} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-white">
                        {isCreator ? c.other.display_name ?? c.other.username : "Creator ✦"}
                      </span>
                      <span className="shrink-0 text-[10px] text-mist">{timeAgo(c.lastMessageAt)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-mist">
                      {c.unread > 0 ? <span className="text-champagne">{c.unread} new</span> : "Tap to open"}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* chat pane */}
        <section className={cn("flex flex-col", !active && "hidden md:flex")}>
          {active ? (
            <>
              <div className="flex items-center gap-3 border-b border-line bg-ink-2/60 px-4 py-3">
                <button onClick={() => setActive(null)} className="rounded-lg p-1.5 text-mist hover:bg-white/5 md:hidden" aria-label="Back">
                  <ArrowLeft size={18} />
                </button>
                <Avatar src={activeConv?.other.avatar_url ?? null} name={activeConv?.other.display_name ?? "C"} size={36} />
                <div>
                  <p className="text-sm font-medium text-white">
                    {activeConv ? (isCreator ? activeConv.other.display_name ?? activeConv.other.username : "Creator ✦") : "…"}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[78%] rounded-2xl px-4 py-2.5", m.mine ? "bg-champagne/15 border border-champagne/25" : "glass")}>
                      {m.locked ? (
                        <button onClick={() => unlock(m.id)} className="flex items-center gap-2 text-sm text-champagne">
                          <Lock size={15} /> Unlock for {money(m.price ?? 0)}
                        </button>
                      ) : (
                        <>
                          {m.media.length > 0 && (
                            <div className="mb-2 grid gap-1.5">
                              {m.media.map((mm) =>
                                mm.video ? (
                                  <video
                                    key={mm.id}
                                    src={mm.url ?? ""}
                                    controls
                                    controlsList="nodownload noplaybackrate"
                                    disablePictureInPicture
                                    onContextMenu={(e) => e.preventDefault()}
                                    className="max-h-64 rounded-xl"
                                  />
                                ) : (
                                  <span key={mm.id} className="relative inline-block">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={mm.url ?? ""}
                                      draggable={false}
                                      className="max-h-64 rounded-xl object-cover select-none"
                                      style={{ WebkitTouchCallout: "none", WebkitUserDrag: "none" } as React.CSSProperties}
                                      alt=""
                                    />
                                    <Watermark text={isCreator ? "Lumina" : viewerName} />
                                  </span>
                                )
                              )}
                            </div>
                          )}
                          {m.body && <p className="whitespace-pre-wrap break-words text-sm text-white/90">{m.body}</p>}
                        </>
                      )}
                      <p className="mt-1 text-right text-[10px] text-mist/70">
                        {timeAgo(m.when)}
                        {m.mine && m.read ? " · Read" : ""}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-line bg-ink-2/60 p-3">
                {attached.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {attached.map((a, i) => (
                      <span key={a.assetId} className="glass flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-white">
                        <Paperclip size={11} /> media {i + 1}
                        {a.price ? <span className="text-champagne"> · ${a.price}</span> : null}
                        <button onClick={() => setAttached((list) => list.filter((x) => x.assetId !== a.assetId))} aria-label="Remove">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  {isCreator && (
                    <button
                      onClick={() => setShowVault(true)}
                      className="btn-ghost rounded-xl p-2.5 text-mist"
                      aria-label="Attach from vault"
                    >
                      <Paperclip size={18} />
                    </button>
                  )}
                  <textarea
                    className="input-dark max-h-28 min-h-11 flex-1 resize-none py-2.5"
                    placeholder="Write a message…"
                    value={text}
                    rows={1}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                  />
                  <Button onClick={send} loading={sending} className="px-4" aria-label="Send">
                    <Send size={16} />
                  </Button>
                </div>
                {isCreator && showVault && (
                  <VaultPicker
                    onClose={() => setShowVault(false)}
                    onPick={(assetId, price) => {
                      setAttached((a) => [...a, { assetId, price }]);
                      setShowVault(false);
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-mist">Select a conversation</div>
          )}
        </section>
      </div>
    </div>
  );
}

function VaultPicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (assetId: string, price?: number) => void;
}) {
  const [assets, setAssets] = useState<{ id: string; filename: string; url: string | null; video: boolean }[]>([]);
  const [price, setPrice] = useState("");

  useEffect(() => {
    fetch("/api/vault?limit=24")
      .then((r) => r.json())
      .then((j) => j.success && setAssets(j.data.assets));
  }, []);

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div className="glass-strong w-full max-w-2xl rounded-t-3xl p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 font-display text-xl text-white">Attach from vault</h3>
        <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
          {assets.map((a) => (
            <button
              key={a.id}
              onClick={() => onPick(a.id, price ? parseFloat(price) : undefined)}
              className="group relative aspect-square overflow-hidden rounded-xl bg-ink-3"
            >
              {a.video ? (
                <video src={a.url ?? ""} className="h-full w-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url ?? ""} alt={a.filename} className="h-full w-full object-cover" />
              )}
              {price ? <span className="absolute bottom-1 right-1 rounded bg-champagne px-1 text-[10px] font-bold text-black">${price}</span> : null}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <DollarSign size={16} className="text-mist" />
          <input
            className="input-dark flex-1"
            placeholder="Price to unlock (leave empty = free)"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
          />
        </div>
      </div>
    </div>
  );
}
