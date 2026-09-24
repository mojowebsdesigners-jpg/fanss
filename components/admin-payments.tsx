"use client";

import { useState } from "react";
import { Tabs, Badge, EmptyState } from "./ui";
import { money, dateTime } from "@/lib/format";

type Row = {
  id: string;
  type: string;
  amount: number | string;
  currency: string;
  status: string;
  provider: string;
  provider_payment_id: string | null;
  transaction_hash: string | null;
  created_at: string;
  profiles: { username: string; email: string | null } | null;
};

const TONE: Record<string, "green" | "gold" | "red" | "gray"> = {
  completed: "green", pending: "gray", confirming: "gold", failed: "red", expired: "red", refunded: "gray",
};

export function AdminPayments({ payments }: { payments: Row[] }) {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  let filtered = tab === "all" ? payments : payments.filter((p) => p.type === tab);
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.id.toLowerCase().includes(s) ||
        (p.profiles?.username ?? "").includes(s) ||
        (p.provider_payment_id ?? "").toLowerCase().includes(s) ||
        (p.transaction_hash ?? "").toLowerCase().includes(s)
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-white">Transactions</h1>
      <p className="mb-6 text-sm text-mist">Every payment across the platform, with provider references.</p>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          tabs={[
            { id: "all", label: "All" },
            { id: "SUBSCRIPTION", label: "Subs" },
            { id: "PPV", label: "PPV" },
            { id: "TIP", label: "Tips" },
            { id: "BUNDLE", label: "Bundles" },
            { id: "PAID_MESSAGE", label: "Messages" },
          ]}
          active={tab}
          onChange={setTab}
        />
        <input className="input-dark max-w-xs" placeholder="Search id / user / tx hash…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="mt-6">
        {filtered.length === 0 ? (
          <EmptyState title="No transactions" />
        ) : (
          <div className="glass overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-wider text-mist">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-line/50 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-mist">{dateTime(p.created_at)}</td>
                      <td className="px-4 py-3 text-white">{p.profiles?.username ?? "—"}</td>
                      <td className="px-4 py-3 text-white/80">{p.type.toLowerCase()}</td>
                      <td className="px-4 py-3 font-medium text-white">{money(p.amount, p.currency)}</td>
                      <td className="px-4 py-3 text-mist">{p.provider}</td>
                      <td className="px-4 py-3"><Badge tone={TONE[p.status] ?? "gray"}>{p.status}</Badge></td>
                      <td className="px-4 py-3 font-mono text-[10px] text-mist">
                        {(p.transaction_hash ?? p.provider_payment_id ?? "—").slice(0, 12)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
