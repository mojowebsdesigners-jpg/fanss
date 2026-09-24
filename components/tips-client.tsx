"use client";

import { HeartHandshake } from "lucide-react";
import { Avatar, Card, EmptyState, Badge } from "./ui";
import { money, dateTime } from "@/lib/format";

type Tip = {
  id: string;
  amount: number | string;
  currency: string;
  message: string | null;
  created_at: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

export function TipsClient({ tips }: { tips: Tip[] }) {
  const total = tips.reduce((s, t) => s + Number(t.amount), 0);
  const avg = tips.length ? total / tips.length : 0;

  return (
    <div>
      <h1 className="font-display text-3xl text-white">Tips</h1>
      <p className="mb-6 text-sm text-mist">Support from your fans, with their messages.</p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-mist">Total tips</p>
          <p className="mt-1 font-display text-3xl gold-text">{money(total)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-mist">Number of tips</p>
          <p className="mt-1 font-display text-3xl text-white">{tips.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wider text-mist">Average tip</p>
          <p className="mt-1 font-display text-3xl text-white">{money(avg)}</p>
        </Card>
      </div>

      <div className="mt-6 space-y-2">
        {tips.length === 0 ? (
          <EmptyState icon={<HeartHandshake size={36} />} title="No tips yet" body="Tips land here the moment their payment confirms." />
        ) : (
          tips.map((t) => (
            <Card key={t.id} className="flex items-center gap-4 p-4">
              <Avatar src={t.profiles?.avatar_url ?? null} name={t.profiles?.display_name ?? t.profiles?.username} size={42} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">
                  {t.profiles?.display_name ?? t.profiles?.username ?? "Fan"}
                  <span className="ml-2 text-xs font-normal text-mist">@{t.profiles?.username}</span>
                </p>
                {t.message && <p className="mt-0.5 truncate text-xs italic text-mist">“{t.message}”</p>}
                <p className="mt-0.5 text-[10px] text-mist/70">{dateTime(t.created_at)}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl gold-text">{money(t.amount, t.currency)}</p>
                <Badge tone="green">completed</Badge>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
