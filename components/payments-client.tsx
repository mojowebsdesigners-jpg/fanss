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
  profiles: { username: string; display_name: string | null } | null;
};

const TYPE_LABELS: Record<string, string> = {
  SUBSCRIPTION: "Subscription",
  PPV: "PPV",
  TIP: "Tip",
  BUNDLE: "Bundle",
  PAID_MESSAGE: "Message",
};

const TONE: Record<string, "green" | "gold" | "red" | "gray"> = {
  completed: "green",
  pending: "gray",
  confirming: "gold",
  failed: "red",
  expired: "red",
  refunded: "gray",
};

export function PaymentsClient({ payments }: { payments: Row[] }) {
  const [tab, setTab] = useState("all");
  const filtered = tab === "all" ? payments : payments.filter((p) => p.type === tab);

  const gross = payments.filter((p) => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div>
      <h1 className="font-display text-3xl text-white">Payments</h1>
      <p className="mb-1 text-sm text-mist">Verified transaction ledger — gross {money(gross)}.</p>
      <p className="mb-6 text-xs text-mist/70">
        Processing fees depend on your provider plan and are visible in your provider dashboard.
      </p>

      <Tabs
        tabs={[
          { id: "all", label: "All" },
          { id: "SUBSCRIPTION", label: "Subscriptions" },
          { id: "PPV", label: "PPV" },
          { id: "TIP", label: "Tips" },
          { id: "BUNDLE", label: "Bundles" },
          { id: "PAID_MESSAGE", label: "Messages" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-6">
        {filtered.length === 0 ? (
          <EmptyState title="No transactions yet" body="Payments appear here after verification." />
        ) : (
          <div className="glass overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-wider text-mist">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Fan</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-line/50 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-mist">{dateTime(p.created_at)}</td>
                      <td className="px-4 py-3 text-white">{p.profiles?.username ?? "—"}</td>
                      <td className="px-4 py-3 text-white">{TYPE_LABELS[p.type] ?? p.type}</td>
                      <td className="px-4 py-3 font-medium text-white">{money(p.amount, p.currency)}</td>
                      <td className="px-4 py-3"><Badge tone={TONE[p.status] ?? "gray"}>{p.status}</Badge></td>
                      <td className="px-4 py-3 font-mono text-xs text-mist">
                        {p.transaction_hash ? `${p.transaction_hash.slice(0, 8)}…` : "—"}
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
