"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Tabs, Badge, Avatar, EmptyState } from "./ui";
import { dateTime } from "@/lib/format";

type Sub = {
  subscriptionId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  email: string | null;
  joinedAt: string | null;
  status: "active" | "pending" | "expired";
  planName: string | null;
  expiresAt: string | null;
  daysLeft: number | null;
};

export function SubscribersClient() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ filter });
    if (search) params.set("search", search);
    const res = await fetch(`/api/creator/subscribers?${params}`);
    const json = await res.json();
    if (json.success) setSubs(json.data.subscribers);
    setLoading(false);
  }, [filter, search]);

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  return (
    <div>
      <h1 className="font-display text-3xl text-white">Subscribers</h1>
      <p className="mb-6 text-sm text-mist">Everyone in your circle, and where their access stands.</p>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          tabs={[
            { id: "all", label: "All" },
            { id: "active", label: "Active" },
            { id: "expiring", label: "Expiring soon" },
            { id: "expired", label: "Expired" },
          ]}
          active={filter}
          onChange={setFilter}
        />
        <div className="relative min-w-48 flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
          <input className="input-dark pl-9" placeholder="Search username or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16" />)}</div>
        ) : subs.length === 0 ? (
          <EmptyState title="No subscribers found" body="New subscribers appear here as they join." />
        ) : (
          <div className="space-y-2">
            {subs.map((s) => (
              <div key={s.subscriptionId} className="glass flex items-center gap-4 rounded-2xl p-4">
                <Avatar src={s.avatar} name={s.displayName ?? s.username} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{s.displayName ?? s.username} <span className="text-mist">@{s.username}</span></p>
                  <p className="text-xs text-mist">
                    {s.planName ?? "Membership"} · joined {dateTime(s.joinedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge tone={s.status === "active" ? "green" : s.status === "pending" ? "gold" : "gray"}>{s.status}</Badge>
                  {s.status === "active" && s.daysLeft !== null && (
                    <p className="mt-1 text-[10px] text-mist">{s.daysLeft}d left</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
