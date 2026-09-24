import type { Metadata } from "next";
import { requireCreator } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { CreatorShell } from "@/components/creator-shell";
import { CreatorSettingsClient } from "@/components/creator-settings-client";

export const metadata: Metadata = { title: "Creator settings", robots: { index: false } };

export default async function CreatorSettingsPage() {
  const user = await requireCreator();
  const supabase = await supabaseServer();

  const [{ data: creator }, { data: plan }] = await Promise.all([
    supabase.from("creator_profiles").select("tagline, about, cover_url, social_links, verification_status").limit(1).maybeSingle(),
    supabase.from("subscription_plans").select("id, name, price, benefits, description").eq("active", true).order("sort_order").limit(1).maybeSingle(),
  ]);

  return (
    <CreatorShell>
      <CreatorSettingsClient
        creator={{
          username: user.profile.username,
          displayName: user.profile.display_name,
          bio: user.profile.bio,
          avatarUrl: user.profile.avatar_url,
          tagline: creator?.tagline ?? null,
          about: creator?.about ?? null,
          coverUrl: creator?.cover_url ?? null,
          socials: (creator?.social_links as Record<string, string>) ?? {},
          verification: creator?.verification_status ?? "PENDING",
        }}
        plan={plan ? { id: plan.id, name: plan.name, price: Number(plan.price), description: plan.description, benefits: (plan.benefits as string[]) ?? [] } : null}
      />
    </CreatorShell>
  );
}
