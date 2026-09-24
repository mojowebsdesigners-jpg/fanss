import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, unauthorized, notFound } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { createPendingPayment } from "@/lib/payments/service";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized("Sign in to unlock this message.");

  const rl = rateLimit(`pay:${clientIp(req)}`, 12, 60_000);
  if (!rl.allowed) return fail("RATE_LIMITED", "Too many payment attempts. Wait a moment.", 429);

  const body = (await req.json().catch(() => ({}))) as { messageId?: string };
  if (!body.messageId) return fail("BAD_REQUEST", "Missing message.");

  const { data: media } = await supabaseAdmin()
    .from("message_media")
    .select("message_id, price, purchase_required, messages!inner(sender_id, conversation_id)")
    .eq("message_id", body.messageId)
    .eq("purchase_required", true)
    .maybeSingle();
  if (!media || !media.price) return notFound("Nothing to unlock here.");

  const msg = media.messages as unknown as { sender_id: string; conversation_id: string };
  const { data: conv } = await supabaseAdmin()
    .from("conversations")
    .select("fan_id, creator_id")
    .eq("id", msg.conversation_id)
    .maybeSingle();
  if (!conv || (conv.fan_id !== user.id && conv.creator_id !== user.id)) {
    return fail("FORBIDDEN", "This message isn't yours to unlock.", 403);
  }
  if (msg.sender_id === user.id) return fail("BAD_REQUEST", "You sent this message.");

  const { data: owned } = await supabaseAdmin()
    .from("message_purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("message_id", body.messageId)
    .eq("status", "completed")
    .maybeSingle();
  if (owned) return ok({ alreadyOwned: true });

  const result = await createPendingPayment({
    type: "PAID_MESSAGE",
    userId: user.id,
    creatorId: conv.creator_id,
    referenceId: body.messageId,
    amount: Number(media.price),
    description: "Exclusive message content",
  });

  if ("error" in result) return fail("PAYMENT_ERROR", result.error, 502);
  return ok({ paymentId: result.payment.id, invoiceUrl: result.invoiceUrl });
}
