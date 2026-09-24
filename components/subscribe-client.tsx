"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, useToast } from "./ui";
import { money } from "@/lib/format";
import { Check, ShieldCheck } from "lucide-react";

export function SubscribeClient({
  signedIn,
  plan,
  promo,
}: {
  signedIn: boolean;
  plan: { id: string; name: string; price: number; currency: string; description: string | null; benefits: string[] };
  promo: { code: string | null; discountPct: number; bannerText: string | null } | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; pct: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [paying, setPaying] = useState(false);

  const finalPrice = applied ? Math.max(0, Math.round(plan.price * (1 - applied.pct / 100)) * 100) / 100 : plan.price;

  async function applyCode() {
    if (!code.trim()) return;
    setChecking(true);
    try {
      const res = await fetch("/api/promotions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, planId: plan.id }),
      });
      const json = await res.json();
      if (json.success) {
        setApplied({ code: json.data.code, pct: json.data.discountPct });
        toast(`Code applied — ${json.data.discountPct}% off`, "success");
      } else {
        toast(json.error?.message ?? "Invalid code", "error");
      }
    } finally {
      setChecking(false);
    }
  }

  async function checkout() {
    if (!signedIn) return router.push("/login?next=/subscribe");
    setPaying(true);
    try {
      const res = await fetch("/api/payments/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, promoCode: applied?.code }),
      });
      const json = await res.json();
      if (!json.success) {
        toast(json.error?.message ?? "Could not start checkout", "error");
        return;
      }
      window.location.href = json.data.invoiceUrl;
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <div className="glass rounded-3xl p-8">
        <p className="text-xs uppercase tracking-widest text-mist">Exclusive membership</p>
        <h1 className="mt-2 font-display text-3xl text-white">{plan.name}</h1>
        <p className="mt-4 font-display text-4xl">
          <span className="gold-text">{money(finalPrice)}</span>
          <span className="text-base text-mist"> / month</span>
        </p>
        {applied && (
          <p className="mt-1 text-sm text-emerald-300">
            <Check size={13} className="mr-1 inline" />
            {applied.code} applied — you save {money(plan.price - finalPrice)}
          </p>
        )}
        {plan.description && <p className="mt-3 text-sm text-mist">{plan.description}</p>}

        <ul className="mt-6 space-y-2.5 border-t border-line pt-6 text-sm text-mist">
          {plan.benefits.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <Check size={16} className="mt-0.5 shrink-0 text-champagne" /> {b}
            </li>
          ))}
        </ul>

        {!applied && (
          <div className="mt-6 flex gap-2">
            <Input placeholder={`Promo code${promo?.code ? ` (try ${promo.code})` : ""}`} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            <Button variant="ghost" onClick={applyCode} loading={checking} className="text-white">Apply</Button>
          </div>
        )}

        <Button onClick={checkout} loading={paying} size="lg" className="mt-6 w-full">
          Subscribe with crypto — {money(finalPrice)}
        </Button>

        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-mist/80">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-champagne" />
          You'll be redirected to our secure crypto checkout. Your subscription activates automatically
          once the blockchain transaction confirms — usually within minutes.
        </p>
      </div>
    </div>
  );
}
