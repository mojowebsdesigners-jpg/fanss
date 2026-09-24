import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { AdminShell } from "@/components/admin-shell";
import { dateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Audit log · Admin", robots: { index: false } };

export default async function AdminAuditPage() {
  await requireAdmin();
  const supabase = await supabaseServer();
  const { data: actions } = await supabase
    .from("admin_actions")
    .select("id, action, target_type, target_id, details, created_at, profiles(username)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <AdminShell>
      <div>
        <h1 className="font-display text-3xl text-white">Audit log</h1>
        <p className="mb-6 text-sm text-mist">Every administrative action, permanently recorded.</p>
        <div className="glass overflow-hidden rounded-2xl">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-mist">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
              </tr>
            </thead>
            <tbody>
              {(actions ?? []).map((a) => (
                <tr key={a.id} className="border-b border-line/50">
                  <td className="px-4 py-3 text-mist">{dateTime(a.created_at)}</td>
                  <td className="px-4 py-3 text-white">@{(a.profiles as unknown as { username: string } | null)?.username ?? "—"}</td>
                  <td className="px-4 py-3"><span className="rounded bg-champagne/10 px-2 py-0.5 font-mono text-xs text-champagne">{a.action}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-mist">{a.target_type}/{String(a.target_id).slice(0, 8)}…</td>
                </tr>
              ))}
              {(actions ?? []).length === 0 && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-mist">No admin actions recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
