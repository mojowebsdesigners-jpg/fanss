import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { NotificationsClient } from "@/components/notifications-client";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

export default async function NotificationsPage() {
  const user = await requireUser();
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <NotificationsClient
      notifications={(data ?? []).map((n) => ({ ...n, when: n.created_at }))}
    />
  );
}
