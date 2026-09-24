"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs, Badge, EmptyState } from "./ui";
import { money, dateTime } from "@/lib/format";

type Row = {
  id: string;
  type: string;
  amount: number | string;
  currency: string;
  status: string;
  provider: string;
  transaction_hash: string | null;
  created_at: string;
};

const TYPES: Record<string, string> = {
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
  cancelled: "red",
  refunded: "gray",
};

export function PaymentHistoryClient({ payments }: { payments: Row[] }) {
  const [tab, setTab] = useState("all");

  const filtered = tab === "all" ? payments : payments.filter((p) => p.type === tab);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl text-white">Payment history</h1>
      <p className="mt-1 text-sm text-mist">Every transaction, receipt and on-chain reference.</p>

      <div className="mt-6">
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
      </div>

      <div className="mt-6">
        {filtered.length === 0 ? (
          <EmptyState icon={<span className="text-3xl">💳</span>} title="No payments yet" body="Your transaction history will appear here." />
        ) : (
          <div className="glass overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-wider text-mist">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Crypto</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-line/50 transition hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-mist">{dateTime(p.created_at)}</td>
                      <td className="px-4 py-3 text-white">{TYPES[p.type] ?? p.type}</td>
                      <td className="px-4 py-3 font-medium text-white">{money(p.amount, p.currency)}</td>
                      <td className="px-4 py-3 text-mist">{p.provider}</td>
                      <td className="px-4 py-3"><Badge tone={TONE[p.status] ?? "gray"}>{p.status}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/payment/${p.id}`} className="text-xs text-champagne hover:underline">Receipt</Link>
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
