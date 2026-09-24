import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { canMessageCreator } from "@/lib/access";
import { ok, fail, unauthorized, notFound } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { notify } from "@/lib/notify";

/** GET /api/messages → conversation list for the current user */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const admin = supabaseAdmin();
  const isCreatorSide = user.profile.role === "CREATOR" || user.profile.role === "ADMIN";

  const { data: convs, error: convsError } = await admin
    .from("conversations")
    .select(
      "id, fan_id, creator_id, last_message_at, fan_unread, creator_unread, " +
      "fan:profiles!conversations_fan_id_fkey(username, display_name, avatar_url)"
    )
    .or(`fan_id.eq.${user.id},creator_id.eq.${user.id}`)
    .eq(isCreatorSide ? "creator_archived" : "fan_archived", false)
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (convsError) {
    console.error("conversations query failed", convsError.message);
    return ok({ conversations: [] });
  }

  return ok({
    conversations: ((convs ?? []) as unknown as Array<{
      id: string;
      last_message_at: string;
      fan_unread: number;
      creator_unread: number;
      fan: { username: string; display_name: string | null; avatar_url: string | null } | null;
    }>).map((c) => ({
      id: c.id,
      other: c.fan ?? { username: "user", display_name: null, avatar_url: null },
      lastMessageAt: c.last_message_at,
      unread: isCreatorSide ? c.creator_unread : c.fan_unread,
    })),
  });
}

/** POST /api/messages { body, toUsername? , media?: [{assetId, price?}] } → send message */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const rl = rateLimit(`dm:${user.id}`, 20, 60_000);
  if (!rl.allowed) return fail("RATE_LIMITED", "You're sending messages too quickly.", 429);

  const body = (await req.json().catch(() => ({}))) as {
    conversationId?: string;
    toUsername?: string;
    body?: string;
    media?: { assetId: string; price?: number }[];
  };

  const admin = supabaseAdmin();
  const isCreatorSide = user.profile.role === "CREATOR" || user.profile.role === "ADMIN";

  // resolve conversation
  let conversationId = body.conversationId;
  if (!conversationId && body.toUsername && isCreatorSide) {
    const { data: fan } = await admin.from("profiles").select("id").eq("username", body.toUsername).maybeSingle();
    const { data: conv } = await admin
      .from("conversations")
      .select("id")
      .eq("fan_id", fan?.id ?? "")
      .limit(1)
      .maybeSingle();
    conversationId = conv?.id;
  }

  if (!conversationId) {
    // fan starts a conversation with the creator
    const policy = await canMessageCreator(user.id);
    if (!policy.allowed) return fail("MESSAGING_DISABLED", policy.reason ?? "Messaging unavailable.", 403);

    const { data: creator } = await admin.from("creator_profiles").select("profile_id").limit(1).maybeSingle();
    if (!creator) return notFound("Creator unavailable.");
    if (creator.profile_id === user.id) return fail("BAD_REQUEST", "You are the creator :)");

    const { data: conv, error } = await admin
      .from("conversations")
      .upsert({ fan_id: user.id, creator_id: creator.profile_id }, { onConflict: "fan_id,creator_id" })
      .select("id")
      .single();
    if (error) return fail("DB_ERROR", "Could not open the conversation.", 500);
    conversationId = conv.id;
  }

  // verify membership
  const { data: conv } = await admin
    .from("conversations")
    .select("id, fan_id, creator_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv || (conv.fan_id !== user.id && conv.creator_id !== user.id)) {
    return fail("FORBIDDEN", "Not your conversation.", 403);
  }

  const text = (body.body ?? "").trim();
  const media = (body.media ?? []).slice(0, 10);
  if (!text && media.length === 0) return fail("EMPTY", "Write a message first.");

  // creator posting paid media validation
  for (const m of media) {
    if (!isCreatorSide && m.price !== undefined && m.price !== null) {
      return fail("FORBIDDEN", "Fans can't send paid media.", 403);
    }
    if (m.price !== undefined && m.price !== null && m.price <= 0) {
      return fail("BAD_REQUEST", "Price must be positive.");
    }
  }

  const { data: msg, error } = await admin
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body: text.slice(0, 5000) })
    .select("id, body, created_at")
    .single();
  if (error || !msg) return fail("DB_ERROR", "Could not send the message.", 500);

  for (const [i, m] of media.entries()) {
    const { data: asset } = await admin
      .from("media_assets")
      .select("creator_id, id")
      .eq("id", m.assetId)
      .maybeSingle();
    if (!asset || asset.creator_id !== conv.creator_id) continue; // only creator's vault assets
    await admin.from("message_media").insert({
      message_id: msg.id,
      asset_id: m.assetId,
      price: isCreatorSide && m.price && m.price > 0 ? m.price : null,
      purchase_required: isCreatorSide && !!m.price && m.price > 0,
      position: i,
    });
  }

  // update unread counters + last_message_at
  const { data: fresh } = await admin
    .from("conversations")
    .select("fan_unread, creator_unread")
    .eq("id", conversationId)
    .maybeSingle();
  if (fresh) {
    await admin
      .from("conversations")
      .update(
        isCreatorSide
          ? { fan_unread: fresh.fan_unread + 1, creator_unread: 0, last_message_at: new Date().toISOString() }
          : { creator_unread: fresh.creator_unread + 1, fan_unread: 0, last_message_at: new Date().toISOString() }
      )
      .eq("id", conversationId);
  }

  // notify recipient
  const recipientId = isCreatorSide ? conv.fan_id : conv.creator_id;
  if (recipientId !== user.id) {
    await notify({
      userId: recipientId,
      type: "NEW_MESSAGE",
      title: isCreatorSide ? "New message from the creator" : "New message",
      body: text.slice(0, 80) || "You received new content",
      link: "/messages",
    });
  }

  return ok({
    message: {
      id: msg.id,
      body: msg.body,
      when: msg.created_at,
      mine: true,
      media: [],
    },
  });
}
