import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "FAQ" };

const QA = [
  ["How do payments work?", "Everything is paid in cryptocurrency via our payment provider. After the network confirms your transaction, access is activated automatically — usually within minutes."],
  ["Is a subscription recurring?", "No auto-charges. When your period ends we'll remind you, and you can renew in one click. Access simply pauses if you don't."],
  ["What happens to my purchases if I cancel?", "Nothing. PPV posts, bundles and paid messages you bought are yours forever, in your Library."],
  ["Can I get a refund?", "Crypto payments are irreversible, so refunds are handled case-by-case. If something went wrong with a purchase, message support."],
  ["How do I unlock a PPV post?", "Tap Unlock, pay via the secure checkout, and the post opens the moment payment confirms. You'll also find it in your Library forever."],
  ["Can I talk to the creator?", "Yes — open Messages and say hi. The creator can reply with text, free media, or premium content."],
  ["Is my data safe?", "Your email is never public. Premium media is served through short-lived private links only after the server verifies your access."],
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <h1 className="font-display text-4xl text-white">Frequently asked</h1>
      <p className="mt-2 text-sm text-mist">Short answers to the questions we hear most.</p>
      <div className="mt-8 space-y-3">
        {QA.map(([q, a]) => (
          <details key={q} className="glass group rounded-2xl px-5 py-4">
            <summary className="cursor-pointer list-none text-sm font-medium text-white">
              <span className="mr-2 inline-block text-champagne transition group-open:rotate-45">+</span>{q}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-mist">{a}</p>
          </details>
        ))}
      </div>
      <div className="mt-10 text-center">
        <Link href="/signup" className="btn-gold rounded-xl px-8 py-3 text-sm">Join free</Link>
      </div>
    </div>
  );
}
