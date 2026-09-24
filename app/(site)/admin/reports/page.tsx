import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { AdminShell } from "@/components/admin-shell";
import { AdminReports } from "@/components/admin-reports";

export const metadata: Metadata = { title: "Reports · Admin", robots: { index: false } };

export default async function AdminReportsPage() {
  await requireAdmin();
  const supabase = await supabaseServer();
  const { data: reports } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, details, status, created_at, resolution_note, reporter:profiles!reports_reporter_id_fkey(username)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <AdminShell>
      <AdminReports reports={(reports ?? []) as unknown as Parameters<typeof AdminReports>[0]["reports"]} />
    </AdminShell>
  );
}
