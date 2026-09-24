"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import { Button, EmptyState, useToast } from "./ui";
import { money } from "@/lib/format";

export function BundleGrid({
  bundles,
}: {
  bundles: { id: string; name: string; description: string | null; price: number }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [buying, setBuying] = useState<string | null>(null);

  async function buy(bundleId: string) {
    setBuying(bundleId);
    try {
      const res = await fetch("/api/payments/bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleId }),
      });
      const json = await res.json();
      if (!json.success) {
        if (res.status === 401) return router.push("/login?next=/bundles");
        toast(json.error?.message ?? "Could not start checkout", "error");
        return;
      }
      if (json.data.alreadyOwned) {
        toast("You already own this bundle", "success");
        return;
      }
      window.location.href = json.data.invoiceUrl;
    } finally {
      setBuying(null);
    }
  }

  if (bundles.length === 0) {
    return (
      <div className="mt-10">
        <EmptyState icon={<Package size={36} />} title="No bundles yet" body="The creator hasn't published any bundles. Check back soon." />
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {bundles.map((b) => (
        <div key={b.id} className="card-hover glass flex flex-col overflow-hidden rounded-2xl">
          <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-violet/20 via-ink-3 to-ink">
            <Package size={40} className="text-champagne/60" />
          </div>
          <div className="flex flex-1 flex-col p-5">
            <p className="font-medium text-white">{b.name}</p>
            <p className="mt-1 line-clamp-2 flex-1 text-sm text-mist">{b.description ?? ""}</p>
            <div className="mt-4 flex items-center justify-between">
              <p className="font-display text-2xl gold-text">{money(b.price)}</p>
              <Button size="sm" loading={buying === b.id} onClick={() => buy(b.id)}>Buy bundle</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
