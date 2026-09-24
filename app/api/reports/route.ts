import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const rl = rateLimit(`report:${user.id}`, 5, 60_000);
  if (!rl.allowed) return fail("RATE_LIMITED", "Too many reports. Try later.", 429);

  const body = (await req.json().catch(() => ({}))) as {
    targetType?: string;
    targetId?: string;
    reason?: string;
    details?: string;
  };
  const validTargets = ["post", "comment", "message", "user", "bundle"];
  const validReasons = ["spam", "harassment", "impersonation", "copyright", "illegal", "other"];
  if (!body.targetId || !validTargets.includes(body.targetType ?? "") || !validReasons.includes(body.reason ?? "")) {
    return fail("BAD_REQUEST", "Invalid report.");
  }

  const { error } = await supabaseAdmin().from("reports").insert({
    reporter_id: user.id,
    target_type: body.targetType!,
    target_id: body.targetId!,
    reason: body.reason!,
    details: body.details?.slice(0, 1000),
  });
  if (error) return fail("DB_ERROR", "Could not submit report.", 500);
  return ok({ submitted: true });
}
