import type { Metadata } from "next";
import { requireCreator } from "@/lib/auth";
import { CreatorShell } from "@/components/creator-shell";
import { CreatorOverview } from "@/components/creator-overview";

export const metadata: Metadata = { title: "Creator Studio", robots: { index: false } };

export default async function CreatorDashboardPage() {
  await requireCreator();
  return (
    <CreatorShell>
      <CreatorOverview />
    </CreatorShell>
  );
}
