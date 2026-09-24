"use client";

import { useEffect, useState } from "react";
import { Card } from "./ui";
import { money } from "@/lib/format";

type Stats = {
  users: number;
  activeSubscribers: number;
  publishedPosts: number;
  openReports: number;
  transactions: { completed: number; failed: number; pending: number };
  revenue: { subscription: number; ppv: number; tips: number; messages: number; bundles: number; total: number };
};

export function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats").then((r) => r.json()).then((j) => j.success && setStats(j.data));
  }, []);

  if (!stats) {
    return <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-28" />)}</div>;
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-white">Platform overview</h1>
      <p className="mb-6 text-sm text-mist">Everything happening across Lumina.</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5"><p className="text-xs uppercase tracking-wider text-mist">Registered users</p><p className="mt-1 font-display text-3xl text-white">{stats.users.toLocaleString()}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-wider text-mist">Active subscribers</p><p className="mt-1 font-display text-3xl text-white">{stats.activeSubscribers}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-wider text-mist">Published posts</p><p className="mt-1 font-display text-3xl text-white">{stats.publishedPosts}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-wider text-mist">Open reports</p><p className="mt-1 font-display text-3xl text-white">{stats.openReports}</p></Card>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-mist">Revenue by stream</h2>
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="p-4"><p className="text-xs text-mist">Subscriptions</p><p className="mt-1 font-display text-xl text-white">{money(stats.revenue.subscription)}</p></Card>
        <Card className="p-4"><p className="text-xs text-mist">PPV</p><p className="mt-1 font-display text-xl text-white">{money(stats.revenue.ppv)}</p></Card>
        <Card className="p-4"><p className="text-xs text-mist">Tips</p><p className="mt-1 font-display text-xl text-white">{money(stats.revenue.tips)}</p></Card>
        <Card className="p-4"><p className="text-xs text-mist">Messages</p><p className="mt-1 font-display text-xl text-white">{money(stats.revenue.messages)}</p></Card>
        <Card className="p-4"><p className="text-xs text-mist">Bundles</p><p className="mt-1 font-display text-xl text-white">{money(stats.revenue.bundles)}</p></Card>
      </div>
      <Card className="mt-4 flex items-center justify-between p-5">
        <p className="text-sm text-mist">Total verified revenue</p>
        <p className="font-display text-2xl gold-text">{money(stats.revenue.total)}</p>
      </Card>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-mist">Transactions</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-mist">Completed</p><p className="mt-1 font-display text-xl text-emerald-300">{stats.transactions.completed}</p></Card>
        <Card className="p-4"><p className="text-xs text-mist">Pending</p><p className="mt-1 font-display text-xl text-white">{stats.transactions.pending}</p></Card>
        <Card className="p-4"><p className="text-xs text-mist">Failed</p><p className="mt-1 font-display text-xl text-rose-300">{stats.transactions.failed}</p></Card>
      </div>
    </div>
  );
}
