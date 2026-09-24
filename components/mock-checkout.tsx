"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, useToast } from "./ui";

/**
 * Sandbox checkout shown when using the mock provider. Simulating success
 * calls the dev-only endpoint, which runs the real fulfillment pipeline.
 */
export function MockCheckout() {
  const params = useSearchParams();
  const toast = useToast();
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
    // find our most recent pending payment
    fetch("/api/payments/mine?status=pending")
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data.payments?.length) setPaymentId(j.data.payments[0].id);
      });
  }, []);

  async function simulate(outcome: "completed" | "failed" | "expired") {
    if (!paymentId) {
      toast("No pending payment found — start one first.", "error");
      return;
    }
    const res = await fetch("/api/dev/simulate-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, outcome }),
    });
    const json = await res.json();
    if (json.success && outcome === "completed") {
      window.location.href = `/payment/${paymentId}?type=ppv`;
    } else if (json.success) {
      toast(`Payment marked ${outcome}.`, "info");
    } else {
      toast(json.error?.message ?? "Simulation failed", "error");
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="glass rounded-3xl p-8 text-center">
        <p className="text-xs uppercase tracking-widest text-amber-300">Sandbox checkout</p>
        <h1 className="mt-2 font-display text-2xl text-white">
          {params.get("desc") || "Mock payment"}
        </h1>
        <p className="mt-2 font-display text-4xl gold-text">${params.get("amount") ?? "—"}</p>
        <p className="mt-4 text-sm text-mist">
          With real NOWPayments keys this page is a hosted crypto invoice. In sandbox mode you can
          simulate the provider outcome — success runs the genuine verification pipeline.
        </p>
        <div className="mt-8 grid gap-2">
          <Button size="lg" onClick={() => simulate("completed")}>Simulate successful payment</Button>
          <Button variant="ghost" className="text-white" onClick={() => simulate("failed")}>Simulate failed payment</Button>
          <Button variant="ghost" className="text-white" onClick={() => simulate("expired")}>Abandon</Button>
        </div>
      </div>
    </div>
  );
}
