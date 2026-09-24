import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { AdminOverview } from "@/components/admin-overview";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPage() {
  await requireAdmin();
  return (
    <AdminShell>
      <AdminOverview />
    </AdminShell>
  );
}
