import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { lockedPlaceholder } from "@/lib/placeholder";
import { LibraryClient } from "@/components/library-client";

export const metadata: Metadata = { title: "My Library", robots: { index: false } };

export default async function PurchasesPage() {
  const user = await requireUser();
  const supabase = await supabaseServer();

  const [{ data: ppv }, { data: bundles }, { data: paidMsgs }, { data: sub }] = await Promise.all([
    supabase
      .from("post_purchases")
      .select("id, created_at, amount, post:posts(id, title, caption, visibility, price, like_count, comment_count, published_at)")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("bundle_purchases")
      .select("id, created_at, amount, bundle:content_bundles(id, name, description, price)")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .limit(100),
    supabase
      .from("message_purchases")
      .select("id, purchased_at, amount, message:messages(body, created_at)")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .limit(100),
    supabase
      .from("subscriptions")
      .select("id, status, expires_at, plan:subscription_plans(name)")
      .eq("user_id", user.id)
      .in("status", ["active", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const ppvPosts = (ppv ?? [])
    .filter((r) => r.post)
    .map((r) => {
      const p = r.post as unknown as { id: string; title: string | null; caption: string; visibility: string; price: number | null; like_count: number; comment_count: number; published_at: string | null };
      return {
        kind: "ppv" as const,
        id: r.id,
        postId: p.id,
        title: p.title ?? "Exclusive content",
        caption: p.caption,
        when: r.created_at,
        price: Number(r.amount),
        placeholder: lockedPlaceholder(p.id),
      };
    });

  const bundleRows = (bundles ?? [])
    .filter((r) => r.bundle)
    .map((r) => {
      const b = r.bundle as unknown as { id: string; name: string; description: string | null; price: number | null };
      return {
        kind: "bundle" as const,
        id: r.id,
        bundleId: b.id,
        title: b.name,
        description: b.description,
        when: r.created_at,
        price: Number(r.amount),
      };
    });

  const msgRows = (paidMsgs ?? [])
    .filter((r) => r.message)
    .map((r) => {
      const m = r.message as unknown as { body: string; created_at: string };
      return {
        kind: "message" as const,
        id: r.id,
        messageId: r.id,
        title: "Exclusive message",
        body: m.body.slice(0, 120),
        when: r.purchased_at,
        price: Number(r.amount),
      };
    });

  const subView = sub
    ? {
        status: sub.status as string,
        expiresAt: sub.expires_at as string | null,
        planName: (sub.plan as unknown as { name: string } | null)?.name ?? "Membership",
      }
    : null;

  return <LibraryClient ppv={ppvPosts} bundles={bundleRows} messages={msgRows} subscription={subView} />;
}
