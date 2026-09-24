import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok } from "@/lib/api";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: postId } = await ctx.params;
  const user = await getSessionUser();

  await supabaseAdmin().from("post_views").insert({ post_id: postId, user_id: user?.id ?? null });
  return ok({ tracked: true });
}
