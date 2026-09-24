import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = { title: "Community Guidelines" };

export default function GuidelinesPage() {
  return (
    <LegalLayout title="Community Guidelines" updated="September 2026">
      <p>
        Lumina is built around respect between one creator and their fans. These rules keep it that way.
      </p>
      <h3>Always</h3>
      <ul>
        <li>Be kind. The person behind the profile is real.</li>
        <li>Keep payment conversations in the platform so purchases stay verifiable.</li>
        <li>Report anything that looks wrong — spam, scams, stolen content.</li>
      </ul>
      <h3>Never</h3>
      <ul>
        <li>Harass, threaten or dox anyone.</li>
        <li>Redistribute paid content — it's theft from a working artist.</li>
        <li>Impersonate the creator or other members.</li>
        <li>Request or share illegal content.</li>
      </ul>
      <h3>Enforcement</h3>
      <p>
        Violations can lead to removal of content or termination of your account. Severe violations are
        reported to authorities. Moderation decisions are logged for accountability.
      </p>
    </LegalLayout>
  );
}
