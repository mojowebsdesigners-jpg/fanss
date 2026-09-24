import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, unauthorized, notFound } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { createPendingPayment } from "@/lib/payments/service";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized("Sign in to unlock this content.");

  const rl = rateLimit(`pay:${clientIp(req)}`, 12, 60_000);
  if (!rl.allowed) return fail("RATE_LIMITED", "Too many payment attempts. Wait a moment.", 429);

  const body = (await req.json().catch(() => ({}))) as { postId?: string };
  if (!body.postId) return fail("BAD_REQUEST", "Missing post.");

  const { data: post } = await supabaseAdmin()
    .from("posts")
    .select("id, creator_id, title, visibility, price, status")
    .eq("id", body.postId)
    .maybeSingle();
  if (!post || post.status !== "published" || post.visibility !== "PPV") return notFound("Post not available.");
  if (!post.price || post.price <= 0) return fail("INVALID_AMOUNT", "This post has no price set.");

  // duplicate-purchase guard before hitting the provider
  const { data: owned } = await supabaseAdmin()
    .from("post_purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", post.id)
    .eq("status", "completed")
    .maybeSingle();
  if (owned) return ok({ alreadyOwned: true });

  const result = await createPendingPayment({
    type: "PPV",
    userId: user.id,
    creatorId: post.creator_id,
    referenceId: post.id,
    amount: Number(post.price),
    description: post.title ? `Unlock: ${post.title}` : "Exclusive content unlock",
  });

  if ("error" in result) return fail("PAYMENT_ERROR", result.error, 502);
  return ok({ paymentId: result.payment.id, invoiceUrl: result.invoiceUrl });
}
