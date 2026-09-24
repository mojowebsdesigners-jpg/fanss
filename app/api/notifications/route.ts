import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api";

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const body = (await req.json().catch(() => ({}))) as { id?: string };
  if (body.id) {
    await supabaseAdmin()
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("id", body.id)
      .eq("user_id", user.id);
  } else {
    await supabaseAdmin()
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("read", false);
  }
  return ok({ updated: true });
}
