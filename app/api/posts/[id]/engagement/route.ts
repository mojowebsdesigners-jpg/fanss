import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok } from "@/lib/api";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: postId } = await ctx.params;
  const user = await getSessionUser();

  const [{ count: likeCount }, { data: post }] = await Promise.all([
    supabaseAdmin().from("likes").select("id", { count: "exact", head: true }).eq("post_id", postId),
    supabaseAdmin().from("posts").select("like_count").eq("id", postId).maybeSingle(),
  ]);

  let liked = false;
  let saved = false;
  if (user) {
    const [{ data: like }, { data: save }] = await Promise.all([
      supabaseAdmin().from("likes").select("id").eq("user_id", user.id).eq("post_id", postId).maybeSingle(),
      supabaseAdmin().from("saved_posts").select("id").eq("user_id", user.id).eq("post_id", postId).maybeSingle(),
    ]);
    liked = !!like;
    saved = !!save;
  }

  return ok({ liked, saved, likeCount: post?.like_count ?? 0 });
}
