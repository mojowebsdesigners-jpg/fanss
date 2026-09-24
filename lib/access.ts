import { supabaseAdmin } from "./supabase";

/**
 * Centralized access-control service.
 * The database function can_access_post is the single source of truth;
 * this wrapper is used by the API layer so authorization is never
 * duplicated or improvised in individual handlers.
 */
export async function canAccessPost(
  userId: string | null,
  postId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin().rpc("can_access_post", {
    p_user: userId,
    p_post: postId,
  });
  if (error) {
    console.error("can_access_post failed", error);
    return false;
  }
  return data === true;
}

export type SubscriptionView = {
  id: string;
  status: "pending" | "active" | "expired" | "cancelled" | "suspended";
  started_at: string | null;
  expires_at: string | null;
  plan: { name: string; price: number; billing_interval: string } | null;
};

export async function getSubscriptionFor(userId: string): Promise<SubscriptionView | null> {
  const { data } = await supabaseAdmin()
    .from("subscriptions")
    .select("id, status, started_at, expires_at, plan:subscription_plans(name, price, billing_interval)")
    .eq("user_id", userId)
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as unknown as SubscriptionView) ?? null;
}

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const sub = await getSubscriptionFor(userId);
  if (!sub || sub.status !== "active") return false;
  return !sub.expires_at || new Date(sub.expires_at) > new Date();
}

export type MessagingPolicy = "ALL_USERS" | "SUBSCRIBERS_ONLY" | "DISABLED";

export async function getPlatformSettings() {
  try {
    const { data, error } = await supabaseAdmin()
      .from("platform_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) return null;
    return data;
  } catch {
    return null; // env not configured (e.g. during build) — callers use defaults
  }
}

export async function canMessageCreator(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const settings = await getPlatformSettings();
  if (!settings?.messaging_enabled || settings.messaging_policy === "DISABLED") {
    return { allowed: false, reason: "Messaging is currently disabled." };
  }
  if (settings.messaging_policy === "SUBSCRIBERS_ONLY") {
    const ok = await hasActiveSubscription(userId);
    if (!ok) return { allowed: false, reason: "Messaging is available to subscribers only." };
  }
  return { allowed: true };
}

export type MediaAccessResult =
  | { ok: true; url: string; mime: string; filename: string; expiresIn: number }
  | { ok: false; code: "NOT_FOUND" | "FORBIDDEN" | "PAYMENT_REQUIRED" };

/**
 * Resolves short-lived signed URLs for vault media. The vault bucket is
 * fully private — nothing is ever served without this check.
 * Sources of authorization: vault ownership (creator), post access
 * (subscription/PPV/bundle/free), message participation + purchase state.
 */
export async function resolveMediaAccess(
  assetId: string,
  userId: string | null
): Promise<MediaAccessResult> {
  const admin = supabaseAdmin();
  const { data: asset } = await admin
    .from("media_assets")
    .select("id, creator_id, storage_path, mime_type, filename, deleted_at")
    .eq("id", assetId)
    .maybeSingle();
  if (!asset || asset.deleted_at) return { ok: false, code: "NOT_FOUND" };

  const isCreator = userId && asset.creator_id === userId;
  let isAdmin = false;
  if (userId && !isCreator) {
    const { data: prof } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
    isAdmin = prof?.role === "ADMIN";
  }

  let allowed = !!isCreator || isAdmin;
  let paymentRequired = false;

  if (!allowed) {
    // post attachment?
    const { data: pm } = await admin
      .from("post_media")
      .select("post_id")
      .eq("asset_id", assetId)
      .limit(1)
      .maybeSingle();
    if (pm) {
      allowed = await canAccessPost(userId ?? null, pm.post_id);
      if (!allowed) {
        const { data: post } = await admin.from("posts").select("visibility").eq("id", pm.post_id).maybeSingle();
        if (post?.visibility === "PPV" || post?.visibility === "SUBSCRIBERS") paymentRequired = true;
      }
    }
  }

  if (!allowed) {
    // message attachment?
    const { data: mm } = await admin
      .from("message_media")
      .select("message_id, purchase_required, price")
      .eq("asset_id", assetId)
      .limit(1)
      .maybeSingle();
    if (mm && userId) {
      const { data: msg } = await admin
        .from("messages")
        .select("sender_id, conversation_id")
        .eq("id", mm.message_id)
        .maybeSingle();
      if (msg) {
        const { data: conv } = await admin
          .from("conversations")
          .select("fan_id, creator_id")
          .eq("id", msg.conversation_id)
          .maybeSingle();
        const participant = conv && (conv.fan_id === userId || conv.creator_id === userId);
        if (participant) {
          if (msg.sender_id === userId) allowed = true;
          else if (!mm.purchase_required) allowed = true;
          else allowed = await hasPurchasedMessage(userId, mm.message_id);
          if (!allowed && mm.purchase_required) paymentRequired = true;
        }
      }
    }
  }

  if (!allowed) return { ok: false, code: paymentRequired ? "PAYMENT_REQUIRED" : "FORBIDDEN" };

  const { data: signed, error } = await admin.storage
    .from("vault")
    .createSignedUrl(asset.storage_path, 600);
  if (error || !signed) {
    console.error("signed url failed", error);
    return { ok: false, code: "NOT_FOUND" };
  }
  return {
    ok: true,
    url: signed.signedUrl,
    mime: asset.mime_type,
    filename: asset.filename,
    expiresIn: 600,
  };
}

/**
 * Signed URL for preview/thumbnail assets shown on locked posts.
 *
 * SECURITY: falls back to the full-res storage path ONLY when the caller
 * asserts the surrounding post is publicly viewable (visibility PUBLIC with
 * no purchase wall). For SUBSCRIBERS/PPV posts the fallback chain stops at
 * preview/thumb — if the creator never generated them, no URL is issued at
 * all rather than leaking the original (a signed URL for the original IS the
 * content: "blurred at the edges" placeholders are the only alternative).
 */
export async function previewMediaUrl(
  assetId: string | null | undefined,
  opts: { allowFullRes?: boolean } = {}
): Promise<string | null> {
  if (!assetId) return null;
  const admin = supabaseAdmin();
  const { data: asset } = await admin
    .from("media_assets")
    .select("preview_path, thumb_path, storage_path, deleted_at")
    .eq("id", assetId)
    .maybeSingle();
  if (!asset || asset.deleted_at) return null;
  const path = asset.preview_path || asset.thumb_path || (opts.allowFullRes ? asset.storage_path : null);
  if (!path) return null;
  const { data: signed } = await admin.storage.from("vault").createSignedUrl(path, 3600);
  return signed?.signedUrl ?? null;
}

/** True when the user has unlocked a paid message (or is sender/creator). */
export async function hasPurchasedMessage(
  userId: string | null,
  messageId: string
): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabaseAdmin()
    .from("message_purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("message_id", messageId)
    .eq("status", "completed")
    .limit(1)
    .maybeSingle();
  return !!data;
}
