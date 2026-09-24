"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { Button, Badge } from "./ui";
import { money, dateTime } from "@/lib/format";

type Payment = {
  id: string;
  type: string;
  amount: number | string;
  currency: string;
  status: string;
  invoice_url: string | null;
  provider: string;
  provider_payment_id: string | null;
  transaction_hash: string | null;
  network: string | null;
  created_at: string;
  completed_at: string | null;
};

const LABELS: Record<string, string> = {
  SUBSCRIPTION: "Subscription",
  PPV: "Unlock content",
  TIP: "Tip",
  BUNDLE: "Bundle",
  PAID_MESSAGE: "Message unlock",
};

const TONE: Record<string, "gold" | "green" | "red" | "gray"> = {
  pending: "gray",
  confirming: "gold",
  completed: "green",
  failed: "red",
  expired: "red",
  cancelled: "red",
  refunded: "gray",
};

export function PaymentStatusClient({ payment: initial }: { payment: Payment }) {
  const [payment, setPayment] = useState(initial);

  useEffect(() => {
    if (["completed", "failed", "expired", "cancelled", "refunded"].includes(payment.status)) return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/payments/status?id=${payment.id}`);
      const json = await res.json();
      if (json.success) setPayment((p) => ({ ...p, ...json.data.payment, status: json.data.status }));
    }, 5000);
    return () => clearInterval(t);
  }, [payment.id, payment.status]);

  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <div className="glass rounded-3xl p-8 text-center">
        <StatusIcon status={payment.status} />
        <h1 className="mt-4 font-display text-2xl text-white">
          {payment.status === "completed"
            ? "Payment successful"
            : payment.status === "confirming"
              ? "Confirming on-chain…"
              : payment.status === "pending"
                ? "Awaiting payment"
                : "Payment " + payment.status}
        </h1>
        <p className="mt-1 text-sm text-mist">{LABELS[payment.type] ?? payment.type}</p>

        <p className="mt-6 font-display text-4xl gold-text">{money(payment.amount, payment.currency)}</p>
        <Badge tone={TONE[payment.status] ?? "gray"} className="mt-3">{payment.status}</Badge>

        <dl className="mt-8 space-y-2.5 border-t border-line pt-6 text-left text-sm">
          <Row k="Date" v={dateTime(payment.created_at)} />
          {payment.completed_at && <Row k="Completed" v={dateTime(payment.completed_at)} />}
          <Row k="Provider" v={payment.provider} />
          {payment.transaction_hash && <Row k="Transaction" v={short(payment.transaction_hash)} mono />}
          {payment.network && <Row k="Network" v={payment.network} />}
        </dl>

        {payment.status === "pending" && payment.invoice_url && (
          <Button className="mt-8 w-full" size="lg" onClick={() => window.open(payment.invoice_url!, "_blank")}>
            Complete payment
          </Button>
        )}
        <a href="/purchases" className="mt-4 block text-sm text-champagne hover:underline">
          Go to my library →
        </a>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 size={52} className="mx-auto text-emerald-400" />;
  if (status === "confirming") return <Loader2 size={52} className="mx-auto animate-spin text-champagne" />;
  if (status === "pending") return <Clock size={52} className="mx-auto text-mist" />;
  return <XCircle size={52} className="mx-auto text-rose-400" />;
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-mist">{k}</dt>
      <dd className={mono ? "font-mono text-xs text-white/85" : "text-white/85"}>{v}</dd>
    </div>
  );
}

function short(s: string) {
  return s.length > 18 ? `${s.slice(0, 9)}…${s.slice(-6)}` : s;
}
