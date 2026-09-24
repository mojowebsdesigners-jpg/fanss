import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { unauthorized, ok } from "@/lib/api";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: postId } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { data: existing } = await supabaseAdmin()
    .from("saved_posts")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin().from("saved_posts").delete().eq("id", existing.id);
    return ok({ saved: false });
  }
  await supabaseAdmin().from("saved_posts").insert({ user_id: user.id, post_id: postId });
  return ok({ saved: true });
}
