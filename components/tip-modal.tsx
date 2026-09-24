"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, Button, Input, useToast } from "./ui";
import { cn } from "@/lib/format";

const PRESETS = [5, 10, 20, 50, 100];

export function TipModal({ trigger, defaultAmount }: { trigger: React.ReactNode; defaultAmount?: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | null>(defaultAmount ?? 10);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const finalAmount = custom ? parseFloat(custom) : amount;

  async function sendTip() {
    if (!finalAmount || finalAmount < 1) {
      toast("Enter a valid amount", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: finalAmount, message: message || undefined }),
      });
      const json = await res.json();
      if (!json.success) {
        if (res.status === 401) {
          router.push("/login?next=/creator");
          return;
        }
        toast(json.error?.message ?? "Could not start the tip", "error");
        return;
      }
      window.location.href = json.data.invoiceUrl;
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Modal open={open} onClose={() => setOpen(false)} title="Send a tip">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-mist">Choose amount</p>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((a) => (
                <button
                  key={a}
                  onClick={() => { setAmount(a); setCustom(""); }}
                  className={cn(
                    "rounded-xl border py-3 text-center font-medium transition",
                    !custom && amount === a
                      ? "border-champagne bg-champagne/10 text-champagne"
                      : "border-line text-white/80 hover:border-line-strong"
                  )}
                >
                  ${a}
                </button>
              ))}
              <input
                className={cn("input-dark text-center", custom && "border-champagne")}
                placeholder="Custom"
                inputMode="decimal"
                value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </div>
          </div>
          <textarea
            className="input-dark min-h-20 resize-none"
            placeholder="Add an optional message…"
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="rounded-xl bg-white/[0.03] px-4 py-3 text-xs text-mist">
            You'll complete payment securely in crypto. The tip is recorded the moment the transaction
            confirms — never before.
          </div>
          <Button onClick={sendTip} loading={loading} className="w-full" size="lg" disabled={!finalAmount || finalAmount < 1}>
            Send tip {finalAmount ? `$${finalAmount.toFixed(2)}` : ""}
          </Button>
        </div>
      </Modal>
    </>
  );
}
