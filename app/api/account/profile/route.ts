import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/api";

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const body = (await req.json().catch(() => ({}))) as {
    displayName?: string;
    bio?: string;
    notifPreferences?: { email: boolean; inApp: boolean };
  };

  const patch: Record<string, unknown> = {};
  if (body.displayName !== undefined) patch.display_name = body.displayName.slice(0, 60);
  if (body.bio !== undefined) patch.bio = body.bio.slice(0, 300);
  if (body.notifPreferences) {
    patch.notif_preferences = {
      email: !!body.notifPreferences.email,
      inApp: !!body.notifPreferences.inApp,
    };
  }
  if (Object.keys(patch).length === 0) return fail("BAD_REQUEST", "Nothing to update.");

  const { error } = await supabaseAdmin().from("profiles").update(patch).eq("id", user.id);
  if (error) return fail("DB_ERROR", "Could not save your profile.", 500);
  return ok({ saved: true });
}
