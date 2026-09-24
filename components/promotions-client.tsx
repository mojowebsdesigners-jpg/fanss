"use client";

import { useCallback, useEffect, useState } from "react";
import { Gift, Plus } from "lucide-react";
import { Button, Card, Input, Badge, Modal, EmptyState, useToast } from "./ui";
import { dateTime } from "@/lib/format";

type Promo = {
  id: string;
  name: string;
  code: string;
  discount_pct: number;
  banner_text: string | null;
  ends_at: string | null;
  max_redemptions: number | null;
  redemption_count: number;
  active: boolean;
};

export function PromotionsClient() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback(async () => {
    const res = await fetch("/api/creator/promotions");
    const json = await res.json();
    if (json.success) setPromos(json.data.promotions);
    setLoading(false);
  }, []);

  useEffect(() => void load(), [load]);

  async function toggle(p: Promo) {
    await fetch("/api/creator/promotions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, active: !p.active }),
    });
    void load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-white">Promotions</h1>
          <p className="text-sm text-mist">Discount codes and limited-time offers.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus size={15} /> New promotion</Button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-20" />)}</div>
      ) : promos.length === 0 ? (
        <EmptyState icon={<Gift size={36} />} title="No promotions" body="Create a discount code to convert hesitant fans." action={<Button onClick={() => setOpen(true)}>Create promotion</Button>} />
      ) : (
        <div className="space-y-3">
          {promos.map((p) => (
            <Card key={p.id} className="flex flex-wrap items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-3">
                <Gift size={20} className="text-champagne" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{p.name}</p>
                <p className="text-xs text-mist">
                  Code <span className="font-mono text-champagne">{p.code}</span> · {p.redemption_count}
                  {p.max_redemptions ? `/${p.max_redemptions}` : ""} redeemed
                  {p.ends_at ? ` · ends ${dateTime(p.ends_at)}` : ""}
                </p>
              </div>
              <Badge tone="gold">{p.discount_pct}% off</Badge>
              <Badge tone={p.active ? "green" : "gray"}>{p.active ? "active" : "paused"}</Badge>
              <Button variant="ghost" size="sm" className="text-white" onClick={() => toggle(p)}>
                {p.active ? "Pause" : "Resume"}
              </Button>
            </Card>
          ))}
        </div>
      )}

      <PromoWizard open={open} onClose={() => { setOpen(false); void load(); }} />
    </div>
  );
}

function PromoWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pct, setPct] = useState("20");
  const [banner, setBanner] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function create() {
    setSaving(true);
    try {
      const res = await fetch("/api/creator/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          code: code || undefined,
          discountPct: parseFloat(pct),
          bannerText: banner || undefined,
          endsAt: endsAt || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast(`Promotion ${json.data.promotion.code} created`, "success");
        onClose();
      } else {
        toast(json.error?.message ?? "Failed", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New promotion">
      <div className="space-y-4">
        <Input placeholder="Name (e.g. Flash weekend)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Code (auto-generated if empty)" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={20} />
        <Input placeholder="Discount %" inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value.replace(/[^0-9.]/g, ""))} />
        <Input placeholder="Banner text (shown on the homepage)" value={banner} onChange={(e) => setBanner(e.target.value)} maxLength={200} />
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-mist">Ends at (optional)</span>
          <input type="datetime-local" className="input-dark" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </label>
        <Button onClick={create} loading={saving} className="w-full">Create promotion</Button>
      </div>
    </Modal>
  );
}
