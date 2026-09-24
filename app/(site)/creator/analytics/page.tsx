import type { Metadata } from "next";
import { requireCreator } from "@/lib/auth";
import { CreatorShell } from "@/components/creator-shell";
import { AnalyticsClient } from "@/components/analytics-client";

export const metadata: Metadata = { title: "Analytics", robots: { index: false } };

export default async function AnalyticsPage() {
  await requireCreator();
  return (
    <CreatorShell>
      <AnalyticsClient />
    </CreatorShell>
  );
}
