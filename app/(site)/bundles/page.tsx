import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase";
import { BundleGrid } from "@/components/bundle-grid";

export const metadata: Metadata = {
  title: "Bundles",
  description: "Premium content bundles — photo sets, video collections and more.",
};

export const revalidate = 60;

export default async function BundlesPage() {
  const supabase = await supabaseServer();
  const { data: bundles } = await supabase
    .from("content_bundles")
    .select("id, name, description, price, cover_asset_id, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-3xl text-white">Premium bundles</h1>
      <p className="mt-1 text-sm text-mist">
        Curated collections at one price — yours forever after purchase.
      </p>
      <BundleGrid bundles={(bundles ?? []).map((b) => ({ id: b.id, name: b.name, description: b.description, price: Number(b.price) }))} />
    </div>
  );
}
