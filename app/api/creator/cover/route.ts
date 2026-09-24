import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, forbidden } from "@/lib/api";
import crypto from "crypto";

const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.profile.role !== "CREATOR" && user.profile.role !== "ADMIN")) return forbidden();

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("BAD_REQUEST", "No file.");
  if (!ALLOWED.includes(file.type)) return fail("BAD_FILE", "Use PNG, JPG or WebP.");
  if (file.size > 15 * 1024 * 1024) return fail("TOO_LARGE", "Max 15 MB.");

  const ext = file.name.split(".").pop()?.toLowerCase().slice(0, 5) ?? "jpg";
  const path = `covers/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabaseAdmin().storage
    .from("branding")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return fail("UPLOAD_FAILED", "Upload failed.", 500);

  const { data: pub } = supabaseAdmin().storage.from("branding").getPublicUrl(path);
  await supabaseAdmin().from("creator_profiles").update({ cover_url: pub.publicUrl }).eq("profile_id", user.id);

  return ok({ url: pub.publicUrl });
}
