import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { resolveMediaAccess } from "@/lib/access";
import { supabaseAdmin } from "@/lib/supabase";
import { fail, notFound } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * MEDIA STREAMING PROXY — "what stays in the app stays in the app".
 *
 * The browser NEVER receives a storage URL. Every media request comes here,
 * is re-authorized on EVERY request (session + ownership/purchase via
 * resolveMediaAccess), then the bytes are streamed through with:
 *   • Content-Disposition: inline; filename="<random>"  → real filename hidden
 *   • Cache-Control: no-store                            → no disk/shared cache
 *   • X-Content-Type-Options: nosniff
 *
 * A URL copied out of DevTools is worthless: without the viewer's session
 * cookies it returns 401/402/403. Screenshots of the network tab, forwarded
 * links, and "open image in new tab" all dead-end. (No web app can stop a
 * determined user from screenshotting — that's the honest limit — but
 * saving, sharing, and hot-linking are closed off.)
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getSessionUser();

  const rl = rateLimit(`mediafile:${user?.id ?? req.headers.get("x-forwarded-for") ?? "anon"}`, 240, 60_000);
  if (!rl.allowed) return fail("RATE_LIMITED", "Too many requests.", 429);

  const result = await resolveMediaAccess(id, user?.id ?? null);
  if (!result.ok) {
    if (result.code === "NOT_FOUND") return notFound();
    if (result.code === "PAYMENT_REQUIRED") {
      return fail("PAYMENT_REQUIRED", "This content requires a purchase or subscription.", 402);
    }
    return fail("FORBIDDEN", "You don't have access to this content.", 403);
  }

  // Range support matters for video seeking; images are fetched whole.
  const range = req.headers.get("range");
  if (range) {
    // storagePath is server-generated (`<uuid>/<uuid>.ext`) — pass it through
    // without path-encoding so the segment slashes stay intact.
    const upstream = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/${result.storagePath}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          Range: range,
        },
        cache: "no-store",
      }
    );
    if (!upstream.ok && upstream.status !== 206) {
      return fail("INTERNAL", "Could not load media.", 502);
    }
    const headers = new Headers();
    for (const h of ["content-type", "content-length", "content-range"]) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    applyMediaHeaders(headers, result.mime);
    return new NextResponse(upstream.body, { status: upstream.status, headers });
  }

  const { data, error } = await supabaseAdmin().storage.from("vault").download(result.storagePath);
  if (error || !data) {
    console.error("media proxy download failed", error?.message);
    return fail("INTERNAL", "Could not load media.", 502);
  }

  const headers = new Headers();
  headers.set("Content-Type", result.mime);
  headers.set("Content-Length", String(data.size));
  applyMediaHeaders(headers, result.mime);
  return new NextResponse(data, { status: 200, headers });
}

function applyMediaHeaders(headers: Headers, mime: string) {
  headers.set(
    "Content-Disposition",
    `inline; filename="${crypto.randomBytes(8).toString("hex")}"` +
      (mime.startsWith("image/") ? "; filename*=UTF-8''media" : "")
  );
  headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Accept-Ranges", "bytes");
}
