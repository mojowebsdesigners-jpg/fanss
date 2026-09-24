import type { Metadata } from "next";
import { requireCreator } from "@/lib/auth";
import { CreatorShell } from "@/components/creator-shell";
import { BundlesClient } from "@/components/bundles-client";

export const metadata: Metadata = { title: "Bundles", robots: { index: false } };

export default async function BundlesPage() {
  await requireCreator();
  return (
    <CreatorShell>
      <BundlesClient />
    </CreatorShell>
  );
}
