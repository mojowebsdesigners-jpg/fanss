import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, forbidden } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

const ALLOWED_MIME = [
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime",
];
const MAX_SIZE = 200 * 1024 * 1024;

/**
 * Upload endpoint: the client POSTs the raw file here; the server validates
 * it and writes it into the PRIVATE vault bucket under the creator's own
 * folder. This keeps all storage credentials server-side and lets us enforce
 * MIME/size rules (spec §121).
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.profile.role !== "CREATOR" && user.profile.role !== "ADMIN")) {
    return forbidden("Vault access is creator-only.");
  }

  const rl = rateLimit(`upload:${user.id}`, 40, 60_000);
  if (!rl.allowed) return fail("RATE_LIMITED", "Too many uploads — pause a moment.", 429);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("BAD_REQUEST", "No file provided.");

  if (!ALLOWED_MIME.includes(file.type)) {
    return fail("BAD_FILE", `File type ${file.type || "unknown"} isn't allowed.`);
  }
  if (file.size > MAX_SIZE) return fail("TOO_LARGE", "Max file size is 200 MB.");

  const folderId = (form.get("folderId") as string) || null;
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase().slice(0, 8) : "bin";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabaseAdmin().storage
    .from("vault")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) {
    console.error("vault upload failed", upErr);
    return fail("UPLOAD_FAILED", "The upload failed. Please try again.", 500);
  }

  const { data: asset, error: dbErr } = await supabaseAdmin()
    .from("media_assets")
    .insert({
      creator_id: user.id,
      storage_path: path,
      filename: file.name.slice(0, 200),
      mime_type: file.type,
      size: file.size,
      folder_id: folderId,
    })
    .select("id, filename, mime_type, size")
    .single();
  if (dbErr) {
    await supabaseAdmin().storage.from("vault").remove([path]);
    return fail("DB_ERROR", "Could not register the upload.", 500);
  }

  return ok({ asset });
}
