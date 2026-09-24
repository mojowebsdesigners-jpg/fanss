import type { Metadata } from "next";
import { requireCreator } from "@/lib/auth";
import { VaultClient } from "@/components/vault-client";

export const metadata: Metadata = { title: "Media Vault", robots: { index: false } };

export default async function VaultPage() {
  await requireCreator();
  return <VaultClient />;
}
