"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Card, Tabs } from "./ui";
import { money } from "@/lib/format";

type Row = {
  day: string;
  subscribers_active: number;
  new_subscribers: number;
  subscription_revenue: number;
  ppv_revenue: number;
  tip_revenue: number;
  message_revenue: number;
  bundle_revenue: number;
  new_users: number;
};

export function AnalyticsClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [range, setRange] = useState("30");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/creator/analytics?days=${range}`)
      .then((r) => r.json())
      .then((j) => j.success && setRows(j.data.series))
      .finally(() => setLoading(false));
  }, [range]);

  const chartData = rows.map((r) => ({
    day: r.day.slice(5),
    subs: Number(r.subscription_revenue),
    ppv: Number(r.ppv_revenue),
    tips: Number(r.tip_revenue),
    messages: Number(r.message_revenue),
    bundles: Number(r.bundle_revenue),
  }));

  const totals = rows.reduce(
    (acc, r) => ({
      subs: acc.subs + Number(r.subscription_revenue),
      ppv: acc.ppv + Number(r.ppv_revenue),
      tips: acc.tips + Number(r.tip_revenue),
      messages: acc.messages + Number(r.message_revenue),
      bundles: acc.bundles + Number(r.bundle_revenue),
      newSubs: acc.newSubs + r.new_subscribers,
      newUsers: acc.newUsers + r.new_users,
    }),
    { subs: 0, ppv: 0, tips: 0, messages: 0, bundles: 0, newSubs: 0, newUsers: 0 }
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-white">Analytics</h1>
          <p className="text-sm text-mist">Daily aggregates of audience and revenue.</p>
        </div>
        <Tabs
          tabs={[
            { id: "7", label: "7d" },
            { id: "30", label: "30d" },
            { id: "90", label: "90d" },
            { id: "365", label: "12 mo" },
          ]}
          active={range}
          onChange={setRange}
        />
      </div>

      {loading ? (
        <div className="skeleton h-72 w-full" />
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-mist">
          Analytics appear after the first daily aggregation runs (Vercel Cron, nightly at 03:00 UTC).
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Mini label="Subs revenue" value={money(totals.subs)} />
            <Mini label="PPV" value={money(totals.ppv)} />
            <Mini label="Tips" value={money(totals.tips)} />
            <Mini label="Messages" value={money(totals.messages)} />
            <Mini label="New subscribers" value={String(totals.newSubs)} />
            <Mini label="New fans" value={String(totals.newUsers)} />
          </div>

          <Card className="mt-6 p-5">
            <p className="mb-4 text-sm font-medium text-white">Daily revenue</p>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  {[
                    ["gSubs", "#e8c87f"],
                    ["gPpv", "#8b7cf6"],
                    ["gTips", "#e77ba4"],
                    ["gMsg", "#67e8f9"],
                    ["gBundle", "#6ee7b7"],
                  ].map(([id, color]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="day" stroke="#6f6885" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6f6885" fontSize={11} tickLine={false} axisLine={false} width={44} />
                <Tooltip
                  contentStyle={{ background: "#14101f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v) => money(Number(v))}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="subs" name="Subscriptions" stroke="#e8c87f" fill="url(#gSubs)" strokeWidth={2} />
                <Area type="monotone" dataKey="ppv" name="PPV" stroke="#8b7cf6" fill="url(#gPpv)" strokeWidth={2} />
                <Area type="monotone" dataKey="tips" name="Tips" stroke="#e77ba4" fill="url(#gTips)" strokeWidth={2} />
                <Area type="monotone" dataKey="messages" name="Messages" stroke="#67e8f9" fill="url(#gMsg)" strokeWidth={2} />
                <Area type="monotone" dataKey="bundles" name="Bundles" stroke="#6ee7b7" fill="url(#gBundle)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-[10px] uppercase tracking-wider text-mist">{label}</p>
      <p className="mt-1 font-display text-lg text-white">{value}</p>
    </Card>
  );
}
