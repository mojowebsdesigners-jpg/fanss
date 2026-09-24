import type { Metadata } from "next";

export const metadata: Metadata = { title: "Account suspended", robots: { index: false } };

export default function SuspendedPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-rose-500/40 text-2xl">⛔</div>
      <h1 className="font-display text-3xl text-white">Account suspended</h1>
      <p className="mt-3 text-sm text-mist">
        This account has been suspended for violating our guidelines. If you believe this is a mistake,
        contact support from the email on your account.
      </p>
    </div>
  );
}
