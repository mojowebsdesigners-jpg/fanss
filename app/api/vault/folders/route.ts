import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, forbidden } from "@/lib/api";

export async function GET() {
  const user = await getSessionUser();
  if (!user || (user.profile.role !== "CREATOR" && user.profile.role !== "ADMIN")) return forbidden();
  const { data } = await supabaseAdmin()
    .from("vault_folders")
    .select("id, name, created_at")
    .eq("creator_id", user.id)
    .order("name");
  return ok({ folders: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.profile.role !== "CREATOR" && user.profile.role !== "ADMIN")) return forbidden();
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim().slice(0, 60);
  if (!name) return fail("BAD_REQUEST", "Enter a folder name.");

  const { data, error } = await supabaseAdmin()
    .from("vault_folders")
    .insert({ creator_id: user.id, name })
    .select("id, name")
    .single();
  if (error) {
    if (error.message.includes("duplicate")) return fail("EXISTS", "A folder with that name exists.");
    return fail("DB_ERROR", "Could not create folder.", 500);
  }
  return ok({ folder: data });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.profile.role !== "CREATOR" && user.profile.role !== "ADMIN")) return forbidden();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("BAD_REQUEST", "Missing id.");
  await supabaseAdmin().from("vault_folders").delete().eq("id", id).eq("creator_id", user.id);
  return ok({ deleted: true });
}
