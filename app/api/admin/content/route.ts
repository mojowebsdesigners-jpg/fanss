import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, forbidden } from "@/lib/api";

export async function POST(req: NextRequest) {
  const admin = await getSessionUser();
  if (admin?.profile.role !== "ADMIN") return forbidden();

  const body = (await req.json().catch(() => ({}))) as { postId?: string; action?: string };
  if (!body.postId || !body.action) return fail("BAD_REQUEST", "Missing parameters.");

  if (body.action === "remove") {
    await supabaseAdmin()
      .from("posts")
      .update({ status: "deleted", deleted_at: new Date().toISOString() })
      .eq("id", body.postId);
    await supabaseAdmin().from("admin_actions").insert({
      admin_id: admin.id, action: "POST_DELETED", target_type: "post", target_id: body.postId,
    });
    return ok({ done: true });
  }

  if (body.action === "restore") {
    await supabaseAdmin().from("posts").update({ status: "published", deleted_at: null }).eq("id", body.postId);
    await supabaseAdmin().from("admin_actions").insert({
      admin_id: admin.id, action: "POST_RESTORED", target_type: "post", target_id: body.postId,
    });
    return ok({ done: true });
  }

  return fail("BAD_REQUEST", "Unknown action.");
}
