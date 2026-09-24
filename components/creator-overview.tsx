"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, DollarSign, FileText, TrendingUp, Megaphone, Lock, MessageSquarePlus } from "lucide-react";
import { Button, Card, Input, Textarea, Modal, useToast } from "./ui";
import { money } from "@/lib/format";

type Stats = {
  activeSubscribers: number;
  totalFans: number;
  newSubscribers30: number;
  publishedPosts: number;
  revenue30: { subscription: number; ppv: number; tips: number; messages: number; bundles: number; total: number };
  revenueAll: { subscription: number; ppv: number; tips: number; messages: number; bundles: number; total: number };
};

export function CreatorOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  useEffect(() => {
    fetch("/api/creator/stats").then((r) => r.json()).then((j) => j.success && setStats(j.data));
  }, []);

  const r30 = stats?.revenue30;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-white">Overview</h1>
          <p className="text-sm text-mist">Your audience and earnings at a glance.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="text-white" onClick={() => setBroadcastOpen(true)}>
            <Megaphone size={15} /> Broadcast
          </Button>
          <Link href="/creator/content" className="btn-gold rounded-xl px-5 py-2.5 text-sm">＋ New post</Link>
        </div>
      </div>

      {!stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-28" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={<Users size={18} />} label="Active subscribers" value={stats.activeSubscribers.toLocaleString()} sub={`+${stats.newSubscribers30} this month`} />
            <StatCard icon={<DollarSign size={18} />} label="Earnings (30 days)" value={money(r30?.total ?? 0)} sub={`${money(stats.revenueAll.total)} all time`} />
            <StatCard icon={<FileText size={18} />} label="Published posts" value={String(stats.publishedPosts)} sub={`${stats.totalFans} registered fans`} />
            <StatCard icon={<TrendingUp size={18} />} label="Sub price / mo" value="from $14.99" sub="manage in settings" />
          </div>

          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-mist">Revenue — last 30 days</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <RevCard label="Subscriptions" value={r30?.subscription ?? 0} />
            <RevCard label="PPV" value={r30?.ppv ?? 0} />
            <RevCard label="Tips" value={r30?.tips ?? 0} />
            <RevCard label="Paid messages" value={r30?.messages ?? 0} />
            <RevCard label="Bundles" value={r30?.bundles ?? 0} />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Link href="/creator/vault" className="card-hover glass flex items-center gap-3 rounded-2xl p-4">
              <Lock size={18} className="text-champagne" />
              <div>
                <p className="text-sm font-medium text-white">Upload to vault</p>
                <p className="text-xs text-mist">Photos & videos, ready to publish</p>
              </div>
            </Link>
            <Link href="/creator/messages" className="card-hover glass flex items-center gap-3 rounded-2xl p-4">
              <MessageSquarePlus size={18} className="text-champagne" />
              <div>
                <p className="text-sm font-medium text-white">Message fans</p>
                <p className="text-xs text-mist">Free or paid messages</p>
              </div>
            </Link>
            <Link href="/creator/analytics" className="card-hover glass flex items-center gap-3 rounded-2xl p-4">
              <TrendingUp size={18} className="text-champagne" />
              <div>
                <p className="text-sm font-medium text-white">Analytics</p>
                <p className="text-xs text-mist">Content, PPV & engagement</p>
              </div>
            </Link>
          </div>
        </>
      )}

      <BroadcastModal open={broadcastOpen} onClose={() => setBroadcastOpen(false)} />
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-mist">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 font-display text-3xl text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-mist">{sub}</p>}
    </Card>
  );
}

function RevCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-mist">{label}</p>
      <p className="mt-1 font-display text-xl text-white">{money(value)}</p>
    </Card>
  );
}

function BroadcastModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [target, setTarget] = useState<"all" | "active_subscribers" | "expired_subscribers">("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const toast = useToast();

  async function send() {
    setSending(true);
    try {
      const res = await fetch("/api/creator/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, title, message }),
      });
      const json = await res.json();
      if (json.success) {
        toast(`Broadcast sent to ${json.data.sent} fans`, "success");
        onClose();
        setTitle("");
        setMessage("");
      } else {
        toast(json.error?.message ?? "Broadcast failed", "error");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Broadcast to your fans">
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-mist">Audience</span>
          <select className="input-dark" value={target} onChange={(e) => setTarget(e.target.value as typeof target)}>
            <option value="all">Everyone</option>
            <option value="active_subscribers">Active subscribers</option>
            <option value="expired_subscribers">Expired subscribers</option>
          </select>
        </label>
        <Input placeholder="Title (e.g. New drop tonight ✨)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
        <Textarea placeholder="Your message…" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} />
        <Button onClick={send} loading={sending} className="w-full">Send broadcast</Button>
      </div>
    </Modal>
  );
}
