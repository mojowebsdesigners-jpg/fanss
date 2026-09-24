import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, forbidden } from "@/lib/api";

async function audit(adminId: string, action: string, targetType: string, targetId: string, details: Record<string, unknown> = {}) {
  await supabaseAdmin().from("admin_actions").insert({ admin_id: adminId, action, target_type: targetType, target_id: targetId, details });
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (user?.profile.role !== "ADMIN") return forbidden();

  const search = req.nextUrl.searchParams.get("search")?.toLowerCase() ?? "";
  let q = supabaseAdmin()
    .from("profiles")
    .select("id, username, display_name, email, role, status, created_at, last_login_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (search) q = q.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
  const { data: users } = await q;

  return ok({ users: users ?? [] });
}

export async function POST(req: NextRequest) {
  const admin = await getSessionUser();
  if (admin?.profile.role !== "ADMIN") return forbidden();

  const body = (await req.json().catch(() => ({}))) as { userId?: string; action?: string };
  if (!body.userId || !body.action) return fail("BAD_REQUEST", "Missing parameters.");

  if (body.userId === admin.id) return fail("BAD_REQUEST", "You can't moderate yourself.");

  switch (body.action) {
    case "suspend":
      await supabaseAdmin().from("profiles").update({ status: "SUSPENDED" }).eq("id", body.userId);
      await audit(admin.id, "USER_SUSPENDED", "user", body.userId);
      break;
    case "restore":
      await supabaseAdmin().from("profiles").update({ status: "ACTIVE" }).eq("id", body.userId);
      await audit(admin.id, "USER_RESTORED", "user", body.userId);
      break;
    default:
      return fail("BAD_REQUEST", "Unknown action.");
  }

  return ok({ done: true });
}
