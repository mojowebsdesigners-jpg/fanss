import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { resolveMediaAccess } from "@/lib/access";
import { ok, fail, notFound } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Returns playback URLs for authorized media. The URL handed out is a
 * same-origin PROXY path, never a storage URL: anything copied from
 * DevTools is useless in another browser, and every byte range served by
 * /api/media/[id]/file is re-authorized (session + ownership/purchase).
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getSessionUser();

  const rl = rateLimit(`media:${user?.id ?? req.headers.get("x-forwarded-for") ?? "anon"}`, 120, 60_000);
  if (!rl.allowed) return fail("RATE_LIMITED", "Too many requests.", 429);

  const result = await resolveMediaAccess(id, user?.id ?? null);
  if (!result.ok) {
    if (result.code === "NOT_FOUND") return notFound();
    if (result.code === "PAYMENT_REQUIRED") return fail("PAYMENT_REQUIRED", "This content requires a purchase or subscription.", 402);
    return fail("FORBIDDEN", "You don't have access to this content.", 403);
  }

  return ok({
    url: `/api/media/${id}/file`,
    mime: result.mime,
    filename: result.filename,
    expiresIn: null,
  });
}
