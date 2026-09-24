import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="September 2026">
      <p>
        We collect the minimum data required to run the platform: your email, username, content you view or
        purchase, and payment references (never wallet private keys or seed phrases).
      </p>
      <h3>What we store</h3>
      <ul>
        <li>Account data: email, username, display name, avatar, preferences.</li>
        <li>Purchase records: type, amount, currency, transaction hash, status — required for financial accounting.</li>
        <li>Messages: stored privately between you and the creator; visible to no other users.</li>
        <li>Technical logs: IP-based rate limiting counters and security events.</li>
      </ul>
      <h3>What we never do</h3>
      <ul>
        <li>Sell or share your personal data with advertisers.</li>
        <li>Store cryptocurrency private keys or seed phrases.</li>
        <li>Expose your email or payment details to other users.</li>
      </ul>
      <h3>Premium media</h3>
      <p>
        Paid media lives in private storage and is served only through short-lived signed URLs after
        server-side authorization. We do not rely on client-side checks to protect content.
      </p>
      <h3>Your rights</h3>
      <p>
        You can edit or delete your account from Settings at any time. Financial records are retained where
        legally required. Contact the operator for data export requests.
      </p>
    </LegalLayout>
  );
}
