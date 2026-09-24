import type { Metadata } from "next";
import { requireCreator } from "@/lib/auth";
import { CreatorShell } from "@/components/creator-shell";
import { PromotionsClient } from "@/components/promotions-client";

export const metadata: Metadata = { title: "Promotions", robots: { index: false } };

export default async function PromotionsPage() {
  await requireCreator();
  return (
    <CreatorShell>
      <PromotionsClient />
    </CreatorShell>
  );
}
