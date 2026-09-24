"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { Tabs, Badge, EmptyState } from "./ui";
import { timeAgo, cn } from "@/lib/format";

type Notif = { id: string; type: string; title: string; body: string | null; link: string | null; read: boolean; when: string };

const ICONS: Record<string, string> = {
  NEW_POST: "✨",
  NEW_MESSAGE: "💬",
  SUBSCRIPTION_ACTIVE: "👑",
  SUBSCRIPTION_EXPIRING: "⏳",
  SUBSCRIPTION_EXPIRED: "🕰",
  PPV_PURCHASE: "🔓",
  TIP_RECEIVED: "💛",
  PAYMENT_CONFIRMED: "✅",
  PROMOTION: "🎁",
  BUNDLE_PURCHASE: "📦",
  CREATOR_UPDATE: "📣",
  SYSTEM: "◈",
};

export function NotificationsClient({ notifications }: { notifications: Notif[] }) {
  const [items, setItems] = useState(notifications);
  const [tab, setTab] = useState("all");

  const filtered = tab === "unread" ? items.filter((n) => !n.read) : items;
  const unreadCount = items.filter((n) => !n.read).length;

  async function markAll() {
    await fetch("/api/notifications", { method: "PATCH" });
    setItems((list) => list.map((n) => ({ ...n, read: true })));
  }

  async function markOne(id: string) {
    setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl text-white">Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={markAll} className="flex items-center gap-1.5 text-xs text-champagne hover:underline">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      <Tabs
        tabs={[
          { id: "all", label: "All", count: items.length },
          { id: "unread", label: "Unread", count: unreadCount },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-6 space-y-2">
        {filtered.length === 0 ? (
          <EmptyState icon={<Bell size={36} />} title="No notifications" body="Activity from the creator and your account shows up here." />
        ) : (
          filtered.map((n) => {
            const inner = (
              <div
                className={cn(
                  "glass flex items-start gap-3 rounded-2xl p-4 transition",
                  !n.read && "border-champagne/30 bg-champagne/[0.04]"
                )}
              >
                <span className="text-xl">{ICONS[n.type] ?? "◈"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs leading-relaxed text-mist">{n.body}</p>}
                  <p className="mt-1 text-[10px] text-mist/70">{timeAgo(n.when)}</p>
                </div>
                {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-champagne" />}
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} onClick={() => markOne(n.id)}>{inner}</Link>
            ) : (
              <button key={n.id} onClick={() => markOne(n.id)} className="w-full text-left">{inner}</button>
            );
          })
        )}
      </div>
    </div>
  );
}
