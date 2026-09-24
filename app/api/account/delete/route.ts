import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/api";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const body = (await req.json().catch(() => ({}))) as { confirm?: string };
  if (body.confirm !== "DELETE") return fail("BAD_REQUEST", "Confirmation required.");

  // Soft-delete the profile (status DELETED) and anonymize. Payments and
  // audit records remain (financial retention). Auth user removal is left to
  // the admin console to preserve the ledger integrity.
  await supabaseAdmin()
    .from("profiles")
    .update({
      status: "DELETED",
      bio: null,
      avatar_url: null,
      display_name: "Deleted user",
      email: null,
      privacy_preferences: { publicProfile: false },
    })
    .eq("id", user.id);

  // cancel any active subscription
  await supabaseAdmin()
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("status", "active");

  // sign out everywhere — server-first (global revoke of all refresh tokens),
  // THEN clear local browser session. (Server-side signOut must not depend on
  // browser code paths that can throw in a route handler.)
  await supabaseAdmin().auth.signOut({ scope: "global" }).catch(() => {});
  try {
    const { supabaseServer } = await import("@/lib/supabase");
    await (await supabaseServer()).auth.signOut();
  } catch {
    // cookie cleanup is best-effort; tokens are already revoked server-side
  }

  return ok({ deleted: true });
}
