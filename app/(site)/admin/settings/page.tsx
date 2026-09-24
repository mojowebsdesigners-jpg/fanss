import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { AdminShell } from "@/components/admin-shell";
import { AdminSettingsClient } from "@/components/admin-settings-client";

export const metadata: Metadata = { title: "Settings · Admin", robots: { index: false } };

export default async function AdminSettingsPage() {
  await requireAdmin();
  const supabase = await supabaseServer();
  const { data: settings } = await supabase.from("platform_settings").select("*").eq("id", 1).maybeSingle();
  return (
    <AdminShell>
      <AdminSettingsClient settings={settings!} />
    </AdminShell>
  );
}
