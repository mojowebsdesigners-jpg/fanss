import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ink-2/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="font-display text-xl gold-text">LUMINA</div>
          <p className="mt-2 max-w-xs text-sm text-mist">
            An exclusive world built around one creator. Premium content, direct connection, total privacy.
          </p>
        </div>
        <div className="text-sm">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/70">Explore</h4>
          <ul className="space-y-2 text-mist">
            <li><Link href="/creator" className="hover:text-white">Creator profile</Link></li>
            <li><Link href="/feed" className="hover:text-white">Latest feed</Link></li>
            <li><Link href="/bundles" className="hover:text-white">Bundles</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/70">Support</h4>
          <ul className="space-y-2 text-mist">
            <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
            <li><Link href="/guidelines" className="hover:text-white">Community guidelines</Link></li>
            <li><Link href="/messages" className="hover:text-white">Message the creator</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/70">Legal</h4>
          <ul className="space-y-2 text-mist">
            <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
            <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link href="/dmca" className="hover:text-white">DMCA &amp; content policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line px-4 py-5 text-center text-xs text-mist/70">
        © {new Date().getFullYear()} Lumina. All rights reserved. Payments are processed in cryptocurrency; access is granted after on-chain confirmation.
      </div>
    </footer>
  );
}
