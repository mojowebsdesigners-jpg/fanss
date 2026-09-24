import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = { title: "DMCA & Content Policy" };

export default function DmcaPage() {
  return (
    <LegalLayout title="DMCA & Content Policy" updated="September 2026">
      <h3>Copyright</h3>
      <p>
        All content on this platform is original work of the featured creator. If you believe content
        infringes your copyright, submit a takedown notice through the report function or the operator's
        contact address, including: identification of the work, the URL at issue, your contact information,
        and a good-faith statement under penalty of perjury.
      </p>
      <h3>Content standards</h3>
      <ul>
        <li>Only consensual content produced by adults (18+). Age and identity records are retained per applicable law.</li>
        <li>Strictly prohibited: content involving minors, non-consensual intimate imagery, exploitation, trafficking, impersonation, and any illegal material.</li>
        <li>Violations result in immediate removal and, where required, reports to relevant authorities.</li>
      </ul>
      <h3>Community guidelines</h3>
      <p>
        Be respectful in comments and messages. Harassment, hate speech, spam and doxxing lead to account
        suspension. You can report any post, comment or message directly from the product.
      </p>
    </LegalLayout>
  );
}
