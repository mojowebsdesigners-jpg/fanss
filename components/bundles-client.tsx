"use client";

import { useCallback, useEffect, useState } from "react";
import { Package, Plus } from "lucide-react";
import { Button, Card, Input, Textarea, Badge, Modal, EmptyState, useToast } from "./ui";
import { cn, money } from "@/lib/format";

type Bundle = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  status: string;
  itemCount: number;
  sales: number;
  revenue: number;
};

export function BundlesClient() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback(async () => {
    const res = await fetch("/api/creator/bundles");
    const json = await res.json();
    if (json.success) setBundles(json.data.bundles);
    setLoading(false);
  }, []);

  useEffect(() => void load(), [load]);

  async function toggleStatus(b: Bundle) {
    await fetch("/api/creator/bundles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: b.id, status: b.status === "active" ? "inactive" : "active" }),
    });
    void load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-white">Bundles</h1>
          <p className="text-sm text-mist">Group media or posts into one premium purchase.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus size={15} /> New bundle</Button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20" />)}</div>
      ) : bundles.length === 0 ? (
        <EmptyState icon={<Package size={36} />} title="No bundles yet" body="Bundle 10 photos into one premium drop and price it as a set." action={<Button onClick={() => setOpen(true)}>Create bundle</Button>} />
      ) : (
        <div className="space-y-3">
          {bundles.map((b) => (
            <Card key={b.id} className="flex flex-wrap items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-3">
                <Package size={20} className="text-champagne" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white">{b.name}</p>
                <p className="text-xs text-mist">{b.itemCount} items · {b.sales} sales · {money(b.revenue)} earned</p>
              </div>
              <Badge tone="gold">{money(b.price)}</Badge>
              <Badge tone={b.status === "active" ? "green" : "gray"}>{b.status}</Badge>
              <Button variant="ghost" size="sm" className="text-white" onClick={() => toggleStatus(b)}>
                {b.status === "active" ? "Unlist" : "Activate"}
              </Button>
            </Card>
          ))}
        </div>
      )}

      <BundleWizard open={open} onClose={() => { setOpen(false); void load(); }} />
    </div>
  );
}

function BundleWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const [assets, setAssets] = useState<{ id: string; url: string | null; video: boolean }[]>([]);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    fetch("/api/vault?limit=48").then((r) => r.json()).then((j) => j.success && setAssets(j.data.assets));
  }, [open]);

  async function create() {
    if (!name.trim() || !parseFloat(price)) {
      toast("Name and price are required", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/creator/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, price: parseFloat(price), assetIds }),
      });
      const json = await res.json();
      if (json.success) {
        toast("Bundle created 🎉", "success");
        onClose();
      } else {
        toast(json.error?.message ?? "Failed", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create bundle" wide>
      <div className="space-y-4">
        <Input placeholder="Bundle name (e.g. Midnight Set — 24 photos)" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        <Textarea placeholder="What's inside?" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
        <Input placeholder="Price (e.g. 19.99)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} />

        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-mist">Contents ({assetIds.length} selected)</p>
          <div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto rounded-xl border border-line p-2 sm:grid-cols-6">
            {assets.map((a) => (
              <button
                key={a.id}
                onClick={() => setAssetIds((ids) => (ids.includes(a.id) ? ids.filter((x) => x !== a.id) : [...ids, a.id]))}
                className={cn("relative aspect-square overflow-hidden rounded-lg border-2", assetIds.includes(a.id) ? "border-champagne" : "border-transparent")}
              >
                {a.video ? <video src={a.url ?? ""} className="h-full w-full object-cover" muted /> : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.url ?? ""} alt="" className="h-full w-full object-cover" />
                )}
              </button>
            ))}
            {assets.length === 0 && <p className="col-span-6 py-6 text-center text-xs text-mist">Upload media to the vault first.</p>}
          </div>
        </div>

        <Button onClick={create} loading={saving} size="lg" className="w-full">Create bundle</Button>
      </div>
    </Modal>
  );
}
