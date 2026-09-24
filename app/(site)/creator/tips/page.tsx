import type { Metadata } from "next";
import { requireCreator } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { CreatorShell } from "@/components/creator-shell";
import { TipsClient } from "@/components/tips-client";

export const metadata: Metadata = { title: "Tips", robots: { index: false } };

export default async function TipsPage() {
  const user = await requireCreator();
  const supabase = await supabaseServer();

  const { data: tips } = await supabase
    .from("tips")
    .select("id, amount, currency, message, status, created_at, profiles(username, display_name, avatar_url)")
    .eq("creator_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <CreatorShell>
      <TipsClient tips={(tips ?? []) as unknown as Parameters<typeof TipsClient>[0]["tips"]} />
    </CreatorShell>
  );
}
