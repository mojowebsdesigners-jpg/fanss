import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { canAccessPost, resolveMediaAccess } from "@/lib/access";
import { ok, notFound } from "@/lib/api";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: postId } = await ctx.params;
  const user = await getSessionUser();

  const accessible = await canAccessPost(user?.id ?? null, postId);
  const { data: post } = await supabaseAdmin()
    .from("posts")
    .select("visibility")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return notFound();

  if (!accessible) {
    // return the preview placeholder info so UI can show a teaser
    return ok({ media: [], locked: true });
  }

  const { data: media } = await supabaseAdmin()
    .from("post_media")
    .select("asset_id, position")
    .eq("post_id", postId)
    .order("position");

  const items = [];
  for (const m of media ?? []) {
    const access = await resolveMediaAccess(m.asset_id, user?.id ?? null);
    if (access.ok) {
      items.push(access.mime.startsWith("video/") ? { kind: "video", url: access.url } : { kind: "image", url: access.url });
    }
  }
  return ok({ media: items, locked: false });
}
