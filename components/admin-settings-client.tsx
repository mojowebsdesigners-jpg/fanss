"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, useToast } from "./ui";

type Settings = {
  platform_name: string;
  messaging_enabled: boolean;
  messaging_policy: string;
  comments_enabled: boolean;
  tips_enabled: boolean;
  ppv_enabled: boolean;
  bundles_enabled: boolean;
  promotions_enabled: boolean;
  maintenance_mode: boolean;
  age_gate_required: boolean;
  min_tip_amount: number | string;
  reminder_days: number[];
};

export function AdminSettingsClient({ settings }: { settings: Settings }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState(settings);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...s,
          min_tip_amount: parseFloat(String(s.min_tip_amount)) || 5,
        }),
      });
      const json = await res.json();
      toast(json.success ? "Settings saved" : json.error?.message ?? "Save failed", json.success ? "success" : "error");
      if (json.success) router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl text-white">Platform settings</h1>
      <p className="mb-6 text-sm text-mist">Feature flags, policies and compliance controls.</p>

      <section className="glass rounded-3xl p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-mist">General</h2>
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-mist">Platform name</span>
          <Input value={s.platform_name} onChange={(e) => setS({ ...s, platform_name: e.target.value })} maxLength={40} />
        </label>
      </section>

      <section className="glass mt-4 rounded-3xl p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-mist">Feature flags</h2>
        <div className="space-y-1">
          <Toggle label="Messaging" checked={s.messaging_enabled} onChange={(v) => setS({ ...s, messaging_enabled: v })} />
          <Toggle label="Comments" checked={s.comments_enabled} onChange={(v) => setS({ ...s, comments_enabled: v })} />
          <Toggle label="Tips" checked={s.tips_enabled} onChange={(v) => setS({ ...s, tips_enabled: v })} />
          <Toggle label="PPV" checked={s.ppv_enabled} onChange={(v) => setS({ ...s, ppv_enabled: v })} />
          <Toggle label="Bundles" checked={s.bundles_enabled} onChange={(v) => setS({ ...s, bundles_enabled: v })} />
          <Toggle label="Promotions" checked={s.promotions_enabled} onChange={(v) => setS({ ...s, promotions_enabled: v })} />
          <Toggle label="Age gate" checked={s.age_gate_required} onChange={(v) => setS({ ...s, age_gate_required: v })} />
          <Toggle label="Maintenance mode" checked={s.maintenance_mode} onChange={(v) => setS({ ...s, maintenance_mode: v })} />
        </div>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-mist">Messaging policy</span>
          <select className="input-dark" value={s.messaging_policy} onChange={(e) => setS({ ...s, messaging_policy: e.target.value })}>
            <option value="ALL_USERS">All registered users can message</option>
            <option value="SUBSCRIBERS_ONLY">Subscribers only</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </label>
      </section>

      <section className="glass mt-4 rounded-3xl p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-mist">Money</h2>
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-mist">Minimum tip (USD)</span>
          <Input inputMode="decimal" value={String(s.min_tip_amount)} onChange={(e) => setS({ ...s, min_tip_amount: e.target.value.replace(/[^0-9.]/g, "") })} />
        </label>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-mist">Expiry reminder days (comma separated)</span>
          <Input
            value={(s.reminder_days ?? []).join(", ")}
            onChange={(e) => setS({ ...s, reminder_days: e.target.value.split(",").map((x) => parseInt(x.trim())).filter((n) => Number.isFinite(n) && n > 0) })}
          />
        </label>
      </section>

      <Button onClick={save} loading={saving} size="lg" className="mt-6">Save settings</Button>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-2">
      <span className="text-sm text-white/85">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-champagne" : "bg-white/15"}`}
        aria-pressed={checked}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}
