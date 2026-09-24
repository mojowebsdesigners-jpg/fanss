"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, Badge, EmptyState, useToast } from "./ui";
import { dateTime } from "@/lib/format";

type Report = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  resolution_note: string | null;
  reporter: { username: string } | null;
};

export function AdminReports({ reports }: { reports: Report[] }) {
  const [tab, setTab] = useState("open");
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = tab === "all" ? reports : reports.filter((r) => r.status === tab);

  async function act(report: Report, action: "resolve" | "dismiss" | "remove_content") {
    setBusy(report.id);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: report.id, action }),
      });
      const json = await res.json();
      if (json.success) {
        toast(action === "resolve" ? "Report resolved" : action === "dismiss" ? "Report dismissed" : "Content removed", "success");
        router.refresh();
      } else {
        toast(json.error?.message ?? "Action failed", "error");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-white">Reports</h1>
      <p className="mb-6 text-sm text-mist">Review, moderate and resolve user reports.</p>

      <Tabs
        tabs={[
          { id: "open", label: "Open", count: reports.filter((r) => r.status === "open").length },
          { id: "resolved", label: "Resolved" },
          { id: "dismissed", label: "Dismissed" },
          { id: "all", label: "All" },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="mt-6 space-y-3">
        {filtered.length === 0 ? (
          <EmptyState title="Nothing here" body="No reports in this state." />
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="glass rounded-2xl p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone={r.status === "open" ? "gold" : r.status === "resolved" ? "green" : "gray"}>{r.status}</Badge>
                <Badge tone="gray">{r.target_type}</Badge>
                <Badge tone="red">{r.reason}</Badge>
                <span className="ml-auto text-xs text-mist">{dateTime(r.created_at)} · by @{r.reporter?.username ?? "unknown"}</span>
              </div>
              {r.details && <p className="mt-3 text-sm text-white/85">{r.details}</p>}
              <p className="mt-1 font-mono text-[10px] text-mist/60">target: {r.target_type}/{r.target_id.slice(0, 8)}…</p>
              {r.status === "open" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    disabled={busy === r.id}
                    onClick={() => act(r, "remove_content")}
                    className="rounded-lg border border-rose-500/40 px-3.5 py-1.5 text-xs text-rose-300 transition hover:bg-rose-500/10"
                  >
                    Remove content & resolve
                  </button>
                  <button
                    disabled={busy === r.id}
                    onClick={() => act(r, "resolve")}
                    className="rounded-lg border border-emerald-500/40 px-3.5 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-500/10"
                  >
                    Resolve (keep content)
                  </button>
                  <button
                    disabled={busy === r.id}
                    onClick={() => act(r, "dismiss")}
                    className="rounded-lg border border-line px-3.5 py-1.5 text-xs text-mist transition hover:bg-white/5"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
