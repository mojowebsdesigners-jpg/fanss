"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui";

const KEY = "lumina_age_ok";

export function AgeGate({ required }: { required: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (required && !sessionStorage.getItem(KEY)) setShow(true);
  }, [required]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-ink/95 p-6 backdrop-blur-md">
      <div className="glass-strong max-w-md rounded-3xl p-8 text-center animate-scale-in">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-champagne/40 font-display text-xl text-champagne">
          18+
        </div>
        <h2 className="font-display text-2xl text-white">Adults only</h2>
        <p className="mt-3 text-sm leading-relaxed text-mist">
          This site contains mature content intended for adults. By entering you confirm that you are at
          least 18 years old (or the age of majority where you live) and you accept our{" "}
          <a href="/terms" className="text-champagne underline underline-offset-2">Terms</a> and{" "}
          <a href="/privacy" className="text-champagne underline underline-offset-2">Privacy Policy</a>.
        </p>
        <div className="mt-6 grid gap-2">
          <Button onClick={() => { sessionStorage.setItem(KEY, "1"); location.reload(); }}>I am 18 or older — Enter</Button>
          <a href="https://www.google.com" className="rounded-xl border border-line px-4 py-2.5 text-sm text-mist transition hover:bg-white/5">
            Leave
          </a>
        </div>
      </div>
    </div>
  );
}
