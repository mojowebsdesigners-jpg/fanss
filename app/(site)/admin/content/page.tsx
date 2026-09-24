import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { AdminShell } from "@/components/admin-shell";
import { AdminContent } from "@/components/admin-content";

export const metadata: Metadata = { title: "Content · Admin", robots: { index: false } };

export default async function AdminContentPage() {
  await requireAdmin();
  const supabase = await supabaseServer();
  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, caption, visibility, status, price, like_count, comment_count, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <AdminShell>
      <AdminContent posts={posts ?? []} />
    </AdminShell>
  );
}
