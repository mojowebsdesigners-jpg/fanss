import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { SubscribeClient } from "@/components/subscribe-client";

export const metadata: Metadata = { title: "Subscribe", robots: { index: false } };

export default async function SubscribePage() {
  const supabase = await supabaseServer();
  const user = await getSessionUser();

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id, name, price, currency, description, benefits")
    .eq("active", true)
    .order("sort_order")
    .limit(1)
    .maybeSingle();

  const { data: promo } = await supabase
    .from("promotions")
    .select("code, discount_pct, banner_text")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="font-display text-3xl text-white">Subscriptions unavailable</h1>
        <p className="mt-3 text-mist">The creator hasn't published a plan yet. Check back soon.</p>
      </div>
    );
  }

  return (
    <SubscribeClient
      signedIn={!!user}
      plan={{
        id: plan.id,
        name: plan.name,
        price: Number(plan.price),
        currency: plan.currency,
        description: plan.description,
        benefits: (plan.benefits as string[]) ?? [],
      }}
      promo={promo ? { code: promo.code, discountPct: Number(promo.discount_pct), bannerText: promo.banner_text } : null}
    />
  );
}
