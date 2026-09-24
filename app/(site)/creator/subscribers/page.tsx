import type { Metadata } from "next";
import { requireCreator } from "@/lib/auth";
import { CreatorShell } from "@/components/creator-shell";
import { SubscribersClient } from "@/components/subscribers-client";

export const metadata: Metadata = { title: "Subscribers", robots: { index: false } };

export default async function SubscribersPage() {
  await requireCreator();
  return (
    <CreatorShell>
      <SubscribersClient />
    </CreatorShell>
  );
}
