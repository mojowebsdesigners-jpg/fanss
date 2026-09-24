import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { AdminUsers } from "@/components/admin-users";

export const metadata: Metadata = { title: "Users · Admin", robots: { index: false } };

export default async function AdminUsersPage() {
  await requireAdmin();
  return (
    <AdminShell>
      <AdminUsers />
    </AdminShell>
  );
}
