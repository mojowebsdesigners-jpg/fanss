import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { hasPurchasedMessage } from "@/lib/access";
import { ok, fail, unauthorized, notFound } from "@/lib/api";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: conversationId } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const admin = supabaseAdmin();
  const { data: conv } = await admin
    .from("conversations")
    .select("id, fan_id, creator_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv || (conv.fan_id !== user.id && conv.creator_id !== user.id)) {
    return notFound("Conversation not found.");
  }

  const { data: messages } = await admin
    .from("messages")
    .select("id, sender_id, body, status, created_at")
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at")
    .limit(200);

  const isCreatorSide = user.id === conv.creator_id;

  // collect media for all messages
  const msgIds = (messages ?? []).map((m) => m.id);
  const { data: allMedia } = msgIds.length
    ? await admin
        .from("message_media")
        .select("id, message_id, asset_id, price, purchase_required, position")
        .in("message_id", msgIds)
        .order("position")
    : { data: [] };

  // purchases by this user
  const { data: purchases } = msgIds.length
    ? await admin
        .from("message_purchases")
        .select("message_id")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .in("message_id", msgIds)
    : { data: [] };
  const purchasedSet = new Set((purchases ?? []).map((p) => p.message_id));

  const mediaByMsg = new Map<string, typeof allMedia>();
  for (const m of allMedia ?? []) {
    const list = mediaByMsg.get(m.message_id) ?? [];
    list.push(m);
    mediaByMsg.set(m.message_id, list);
  }

  const out = [];
  for (const m of messages ?? []) {
    const mediaList = mediaByMsg.get(m.id) ?? [];
    const needsPurchase = mediaList.some((mm) => mm.purchase_required);
    const unlocked = !needsPurchase || m.sender_id === user.id || purchasedSet.has(m.id);

    const media = [];
    if (unlocked) {
      for (const mm of mediaList) {
        const { data: asset } = await admin
          .from("media_assets")
          .select("mime_type, thumb_path, preview_path, storage_path")
          .eq("id", mm.asset_id)
          .maybeSingle();
        if (!asset) continue;
        const path = asset.thumb_path || asset.preview_path || asset.storage_path;
        const { data: signed } = await admin.storage.from("vault").createSignedUrl(path, 600);
        media.push({
          id: mm.id,
          mime: asset.mime_type,
          url: signed?.signedUrl ?? null,
          video: asset.mime_type.startsWith("video/"),
        });
      }
    }

    out.push({
      id: m.id,
      body: m.body,
      mine: m.sender_id === user.id,
      when: m.created_at,
      read: m.status === "read",
      locked: needsPurchase && !unlocked,
      price: needsPurchase ? Number(mediaList.find((mm) => mm.purchase_required)?.price ?? 0) : null,
      media,
    });
  }

  // mark read (only when the recipient opens)
  const recipientField = isCreatorSide ? "creator_unread" : "fan_unread";
  await admin.from("conversations").update(recipientField === "creator_unread" ? { creator_unread: 0 } : { fan_unread: 0 }).eq("id", conversationId);
  if (!isCreatorSide) {
    await admin
      .from("messages")
      .update({ status: "read" })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id);
  } else {
    await admin
      .from("messages")
      .update({ status: "read" })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id);
  }

  return ok({
    conversation: { id: conv.id, fanId: conv.fan_id, creatorId: conv.creator_id },
    messages: out,
  });
}
