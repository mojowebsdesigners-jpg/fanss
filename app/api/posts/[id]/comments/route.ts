import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: postId } = await ctx.params;
  const user = await getSessionUser();

  const { data } = await supabaseAdmin()
    .from("comments")
    .select("id, body, user_id, created_at, profiles(username)")
    .eq("post_id", postId)
    .eq("hidden", false)
    .order("created_at")
    .limit(100);

  return ok({
    comments: (data ?? []).map((c) => ({
      id: c.id,
      body: c.body,
      username: (c.profiles as unknown as { username: string } | null)?.username ?? "user",
      when: c.created_at,
      mine: user?.id === c.user_id,
    })),
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: postId } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const rl = rateLimit(`comment:${user.id}`, 10, 60_000);
  if (!rl.allowed) return fail("RATE_LIMITED", "Slow down a little.", 429);

  const body = (await req.json().catch(() => ({}))) as { body?: string };
  const text = (body.body ?? "").trim();
  if (!text) return fail("EMPTY", "Write something first.");

  const { data, error } = await supabaseAdmin()
    .from("comments")
    .insert({ post_id: postId, user_id: user.id, body: text.slice(0, 1000) })
    .select("id, body, created_at")
    .single();
  if (error) return fail("DB_ERROR", "Could not post your comment.", 500);

  return ok({
    comment: { id: data.id, body: data.body, username: user.profile.username, when: data.created_at, mine: true },
  });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: postId } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const commentId = req.nextUrl.searchParams.get("commentId");
  if (!commentId) return fail("BAD_REQUEST", "Missing commentId");

  await supabaseAdmin()
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("user_id", user.id);

  return ok({ deleted: true });
}
