"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Package, MessageSquareLock, Crown } from "lucide-react";
import { Tabs, Badge, EmptyState } from "./ui";
import { money, dateTime } from "@/lib/format";

export function LibraryClient({
  ppv,
  bundles,
  messages,
  subscription,
}: {
  ppv: { kind: "ppv"; id: string; postId: string; title: string; caption: string; when: string; price: number; placeholder: string }[];
  bundles: { kind: "bundle"; id: string; bundleId: string; title: string; description: string | null; when: string; price: number }[];
  messages: { kind: "message"; id: string; messageId: string; title: string; body: string; when: string; price: number }[];
  subscription: { status: string; expiresAt: string | null; planName: string } | null;
}) {
  const [tab, setTab] = useState("all");

  const filtered =
    tab === "ppv" ? ppv : tab === "bundles" ? bundles : tab === "messages" ? messages : [...ppv, ...bundles, ...messages];
  const sorted = [...filtered].sort((a, b) => (a.when < b.when ? 1 : -1));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl text-white">My library</h1>
      <p className="mt-1 text-sm text-mist">
        Everything you've unlocked stays here forever — even if a subscription ends.
      </p>

      {subscription && (
        <div className="glass mt-6 flex flex-wrap items-center gap-4 rounded-2xl p-5">
          <Crown size={22} className="text-champagne" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {subscription.planName} — {subscription.status === "active" ? "Active" : "Pending payment"}
            </p>
            {subscription.expiresAt && subscription.status === "active" && (
              <p className="text-xs text-mist">Renews/expires {dateTime(subscription.expiresAt)}</p>
            )}
          </div>
          <Link href="/subscribe" className="btn-gold rounded-xl px-4 py-2 text-sm">Manage</Link>
        </div>
      )}

      <div className="mt-6">
        <Tabs
          tabs={[
            { id: "all", label: "All", count: ppv.length + bundles.length + messages.length },
            { id: "ppv", label: "PPV", count: ppv.length },
            { id: "bundles", label: "Bundles", count: bundles.length },
            { id: "messages", label: "Messages", count: messages.length },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      <div className="mt-6 space-y-3">
        {sorted.length === 0 ? (
          <EmptyState
            icon={<Lock size={36} />}
            title="Your library is empty"
            body="Content you purchase — PPV posts, bundles and paid messages — appears here permanently."
            action={<Link href="/creator" className="btn-gold rounded-xl px-6 py-2.5 text-sm">Explore exclusive content</Link>}
          />
        ) : (
          sorted.map((item) => (
            <div key={`${item.kind}-${item.id}`} className="glass flex items-center gap-4 rounded-2xl p-4">
              {"placeholder" in item ? (
                <div className="h-16 w-16 shrink-0 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url("${(item as { placeholder: string }).placeholder}")` }} />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-ink-3">
                  {item.kind === "bundle" ? <Package size={22} className="text-champagne" /> : <MessageSquareLock size={22} className="text-champagne" />}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{item.title}</p>
                <p className="truncate text-xs text-mist">
                  {"caption" in item ? (item as { caption: string }).caption : "description" in item ? (item as { description: string | null }).description : (item as { body: string }).body}
                </p>
                <p className="mt-0.5 text-[11px] text-mist/70">Purchased {dateTime(item.when)}</p>
              </div>
              <div className="text-right">
                <Badge tone="gold">{money(item.price)}</Badge>
                <div className="mt-1.5">
                  {item.kind === "ppv" ? (
                    <Link href={`/post/${(item as { postId: string }).postId}`} className="text-xs text-champagne hover:underline">View</Link>
                  ) : item.kind === "bundle" ? (
                    <Link href="/bundles" className="text-xs text-champagne hover:underline">Contents</Link>
                  ) : (
                    <Link href="/messages" className="text-xs text-champagne hover:underline">Open</Link>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
