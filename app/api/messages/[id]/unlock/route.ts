import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { createPendingPayment } from "@/lib/payments/service";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: messageId } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const rl = rateLimit(`pay:${clientIp(req)}`, 12, 60_000);
  if (!rl.allowed) return fail("RATE_LIMITED", "Too many attempts. Wait a moment.", 429);

  const admin = supabaseAdmin();
  const { data: msg } = await admin
    .from("messages")
    .select("sender_id, conversation_id")
    .eq("id", messageId)
    .maybeSingle();
  if (!msg) return fail("NOT_FOUND", "Message not found.", 404);

  const { data: conv } = await admin
    .from("conversations")
    .select("fan_id, creator_id")
    .eq("id", msg.conversation_id)
    .maybeSingle();
  if (!conv || (conv.fan_id !== user.id && conv.creator_id !== user.id)) {
    return fail("FORBIDDEN", "Not your conversation.", 403);
  }
  if (msg.sender_id === user.id) return fail("BAD_REQUEST", "You sent this message.");

  const { data: paidMedia } = await admin
    .from("message_media")
    .select("price, asset_id")
    .eq("message_id", messageId)
    .eq("purchase_required", true)
    .maybeSingle();
  if (!paidMedia?.price) return fail("NOT_FOUND", "Nothing to unlock.", 404);

  const result = await createPendingPayment({
    type: "PAID_MESSAGE",
    userId: user.id,
    creatorId: conv.creator_id,
    referenceId: messageId,
    amount: Number(paidMedia.price),
    description: "Exclusive message content",
    metadata: { asset_id: paidMedia.asset_id },
  });

  if ("error" in result) return fail("PAYMENT_ERROR", result.error, 502);
  return ok({ paymentId: result.payment.id, invoiceUrl: result.invoiceUrl });
}
