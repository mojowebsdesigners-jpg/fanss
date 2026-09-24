import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { unauthorized, ok } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: postId } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const rl = rateLimit(`like:${user.id}`, 30, 60_000);
  if (!rl.allowed) return ok({ liked: false, likeCount: 0, rateLimited: true });

  const { data: existing } = await supabaseAdmin()
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin().from("likes").delete().eq("id", existing.id);
  } else {
    const { error } = await supabaseAdmin()
      .from("likes")
      .insert({ user_id: user.id, post_id: postId });
    if (error) {
      // unique violation = race, treat as already liked
      console.error("like insert", error.message);
    }
  }

  const { data: post } = await supabaseAdmin()
    .from("posts")
    .select("like_count")
    .eq("id", postId)
    .maybeSingle();

  return ok({ liked: !existing, likeCount: post?.like_count ?? 0 });
}
