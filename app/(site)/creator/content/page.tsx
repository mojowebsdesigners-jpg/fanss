import type { Metadata } from "next";
import { requireCreator } from "@/lib/auth";
import { CreatorShell } from "@/components/creator-shell";
import { CreatorContent } from "@/components/creator-content";

export const metadata: Metadata = { title: "Content", robots: { index: false } };

export default async function ContentPage() {
  await requireCreator();
  return (
    <CreatorShell>
      <CreatorContent />
    </CreatorShell>
  );
}
