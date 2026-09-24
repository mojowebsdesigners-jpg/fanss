"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, ShieldBan, ShieldCheck } from "lucide-react";
import { Badge, Avatar, EmptyState, useToast } from "./ui";
import { dateTime } from "@/lib/format";

type U = {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  role: string;
  status: string;
  created_at: string;
  last_login_at: string | null;
};

export function AdminUsers() {
  const [users, setUsers] = useState<U[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
    const json = await res.json();
    if (json.success) setUsers(json.data.users);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function act(userId: string, action: "suspend" | "restore") {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    const json = await res.json();
    if (json.success) {
      toast(action === "suspend" ? "User suspended" : "User restored", "success");
      void load();
    } else {
      toast(json.error?.message ?? "Action failed", "error");
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-white">Users</h1>
      <p className="mb-6 text-sm text-mist">Search, review and moderate accounts.</p>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
        <input className="input-dark pl-9" placeholder="Search username or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-16" />)}</div>
        ) : users.length === 0 ? (
          <EmptyState title="No users found" />
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="glass flex flex-wrap items-center gap-4 rounded-2xl p-4">
                <Avatar src={null} name={u.display_name ?? u.username} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {u.display_name ?? u.username}
                    <span className="ml-2 text-xs font-normal text-mist">@{u.username}</span>
                  </p>
                  <p className="truncate text-xs text-mist">{u.email ?? "—"} · joined {dateTime(u.created_at)}</p>
                </div>
                {u.role !== "USER" && <Badge tone="gold">{u.role.toLowerCase()}</Badge>}
                <Badge tone={u.status === "ACTIVE" ? "green" : u.status === "SUSPENDED" ? "red" : "gray"}>{u.status.toLowerCase()}</Badge>
                {u.role === "USER" && (
                  u.status === "ACTIVE" ? (
                    <button onClick={() => act(u.id, "suspend")} className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs text-rose-300 transition hover:bg-rose-500/10">
                      <ShieldBan size={13} /> Suspend
                    </button>
                  ) : (
                    <button onClick={() => act(u.id, "restore")} className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-500/10">
                      <ShieldCheck size={13} /> Restore
                    </button>
                  )
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
