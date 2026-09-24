import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, unauthorized } from "@/lib/api";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const status = req.nextUrl.searchParams.get("status");
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50"), 100);

  let q = supabaseAdmin()
    .from("payments")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status) q = q.eq("status", status);

  const { data } = await q;
  return ok({ payments: data ?? [] });
}
