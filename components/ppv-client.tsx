"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Card, EmptyState } from "./ui";
import { money, dateTime } from "@/lib/format";

type Row = {
  id: string;
  title: string;
  price: number;
  publishedAt: string | null;
  previewViews: number;
  unlockClicks: number;
  purchases: number;
  revenue: number;
  conversion: number;
};

export function PpvClient({ rows }: { rows: Row[] }) {
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalPurchases = rows.reduce((s, r) => s + r.purchases, 0);

  return (
    <div>
      <h1 className="font-display text-3xl text-white">PPV performance</h1>
      <p className="mb-6 text-sm text-mist">
        {money(totalRevenue)} from {totalPurchases} unlocks across {rows.length} PPV posts.
      </p>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Lock size={36} />}
          title="No PPV content yet"
          body="Create a post with visibility “PPV”, set a price, and track conversions here."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/post/${r.id}`} className="font-medium text-white hover:text-champagne">{r.title}</Link>
                  <p className="text-xs text-mist">Listed {money(r.price)} · {dateTime(r.publishedAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl gold-text">{money(r.revenue)}</p>
                  <p className="text-[10px] text-mist">{r.purchases} purchases</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-center sm:grid-cols-4">
                <Metric label="Preview views" value={String(r.previewViews)} />
                <Metric label="Unlock clicks" value={String(r.unlockClicks)} />
                <Metric label="Conversion" value={`${r.conversion}%`} />
                <Metric label="Purchases" value={String(r.purchases)} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-semibold text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-mist">{label}</p>
    </div>
  );
}
