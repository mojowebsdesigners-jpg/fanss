import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="September 2026">
      <p>
        These Terms govern your use of Lumina, a subscription and content platform operated around a single
        independent creator. By creating an account or purchasing access you agree to these Terms.
      </p>
      <h3>1. Eligibility</h3>
      <p>
        You must be at least 18 years old (or the age of majority in your jurisdiction) to use this platform.
        Accounts are personal and may not be shared or transferred.
      </p>
      <h3>2. Content &amp; licenses</h3>
      <p>
        All media published on Lumina is owned by the creator. Purchases and subscriptions grant you a
        personal, non-transferable license to view content. Downloading, redistributing, reselling or
        publicly posting any paid media is strictly prohibited and may result in legal action.
      </p>
      <h3>3. Payments</h3>
      <p>
        Payments are processed in cryptocurrency through a third-party payment provider. Subscriptions and
        unlocks are activated only after the blockchain transaction is confirmed by our provider. Because
        crypto transactions are irreversible, refunds are handled case-by-case at the operator's discretion.
      </p>
      <h3>4. Subscriptions</h3>
      <p>
        Subscriptions grant access to subscriber-only content for the paid period. They do not auto-renew
        unless you re-purchase. Anything you bought individually (PPV posts, bundles, paid messages) remains
        accessible even after a subscription ends.
      </p>
      <h3>5. Acceptable use</h3>
      <p>
        Harassment, impersonation, piracy, sharing of paid content, and any illegal activity are grounds for
        immediate termination without refund. See our Community Guidelines for details.
      </p>
      <h3>6. Liability</h3>
      <p>
        The service is provided "as is" without warranties of any kind. To the maximum extent permitted by
        law, the operator's liability is limited to the amount you paid in the preceding 30 days.
      </p>
      <h3>7. Changes</h3>
      <p>We may update these Terms; continued use after changes constitutes acceptance.</p>
    </LegalLayout>
  );
}
