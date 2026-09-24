import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, forbidden } from "@/lib/api";

async function audit(adminId: string, action: string, targetType: string, targetId: string, details: Record<string, unknown> = {}) {
  await supabaseAdmin().from("admin_actions").insert({ admin_id: adminId, action, target_type: targetType, target_id: targetId, details });
}

export async function POST(req: NextRequest) {
  const admin = await getSessionUser();
  if (admin?.profile.role !== "ADMIN") return forbidden();

  const body = (await req.json().catch(() => ({}))) as { reportId?: string; action?: string };
  if (!body.reportId || !body.action) return fail("BAD_REQUEST", "Missing parameters.");

  const { data: report } = await supabaseAdmin()
    .from("reports")
    .select("id, target_type, target_id, status")
    .eq("id", body.reportId)
    .maybeSingle();
  if (!report) return fail("NOT_FOUND", "Report not found.", 404);

  if (body.action === "resolve" || body.action === "dismiss") {
    await supabaseAdmin()
      .from("reports")
      .update({ status: body.action === "resolve" ? "resolved" : "dismissed", resolved_by: admin.id })
      .eq("id", report.id);
    await audit(admin.id, body.action === "resolve" ? "REPORT_RESOLVED" : "REPORT_DISMISSED", report.target_type, report.target_id);
    return ok({ done: true });
  }

  if (body.action === "remove_content") {
    if (report.target_type === "post") {
      await supabaseAdmin()
        .from("posts")
        .update({ status: "deleted", deleted_at: new Date().toISOString() })
        .eq("id", report.target_id);
    } else if (report.target_type === "comment") {
      await supabaseAdmin().from("comments").update({ hidden: true, deleted_at: new Date().toISOString() }).eq("id", report.target_id);
    } else if (report.target_type === "message") {
      await supabaseAdmin().from("messages").update({ deleted_at: new Date().toISOString() }).eq("id", report.target_id);
    }
    await supabaseAdmin()
      .from("reports")
      .update({ status: "resolved", resolved_by: admin.id, resolution_note: "content removed" })
      .eq("id", report.id);
    await audit(admin.id, "CONTENT_MODERATED", report.target_type, report.target_id, { reportId: report.id });
    return ok({ done: true });
  }

  return fail("BAD_REQUEST", "Unknown action.");
}
