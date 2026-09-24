import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, unauthorized, forbidden } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

const ALLOWED_MIME = [
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime",
];
const MAX_SIZE = 200 * 1024 * 1024;

function requireCreatorRole(user: { profile: { role: string } } | null) {
  return !!user && (user.profile.role === "CREATOR" || user.profile.role === "ADMIN");
}

/** GET /api/vault?folder=&type=&search=&tag=&limit=&offset= */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!requireCreatorRole(user)) return forbidden("Vault access is creator-only.");

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(sp.get("limit") ?? "60"), 100);
  const offset = parseInt(sp.get("offset") ?? "0");

  let q = supabaseAdmin()
    .from("media_assets")
    .select("id, filename, mime_type, size, duration, width, height, folder_id, tags, created_at", { count: "exact" })
    .eq("creator_id", user!.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const type = sp.get("type");
  if (type === "image") q = q.like("mime_type", "image/%");
  if (type === "video") q = q.like("mime_type", "video/%");
  const search = sp.get("search");
  if (search) q = q.ilike("filename", `%${search}%`);
  const tag = sp.get("tag");
  if (tag) q = q.contains("tags", [tag]);
  const folder = sp.get("folder");
  if (folder) q = q.eq("folder_id", folder);

  const { data: assets, count } = await q;

  // Same-origin proxy paths only — the creator's own browser re-authorizes
  // every fetch; no storage URL ever reaches the client.
  const withUrls = (assets ?? []).map((a) => ({
    ...a,
    url: `/api/media/${a.id}/file`,
    video: a.mime_type.startsWith("video/"),
  }));

  return ok({ assets: withUrls, total: count ?? 0 });
}

/** POST /api/vault — register an uploaded file (already stored via client upload) */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!requireCreatorRole(user)) return forbidden("Vault access is creator-only.");

  const rl = rateLimit(`upload:${user!.id}`, 60, 60_000);
  if (!rl.allowed) return fail("RATE_LIMITED", "Too many uploads — pause a moment.", 429);

  const body = (await req.json().catch(() => ({}))) as {
    path?: string;
    filename?: string;
    mime?: string;
    size?: number;
    width?: number;
    height?: number;
    duration?: number;
    folderId?: string | null;
    tags?: string[];
  };

  if (!body.path || !body.filename || !body.mime || typeof body.size !== "number") {
    return fail("BAD_REQUEST", "Missing upload details.");
  }
  if (!ALLOWED_MIME.includes(body.mime)) return fail("BAD_FILE", "That file type isn't allowed.");
  if (body.size > MAX_SIZE) return fail("TOO_LARGE", "Max file size is 200 MB.");

  // path must live in the user's own vault folder
  if (!body.path.startsWith(`${user!.id}/`)) return forbidden("Invalid storage path.");

  const { data, error } = await supabaseAdmin()
    .from("media_assets")
    .insert({
      creator_id: user!.id,
      storage_path: body.path,
      filename: body.filename.slice(0, 200),
      mime_type: body.mime,
      size: body.size,
      width: body.width ?? null,
      height: body.height ?? null,
      duration: body.duration ?? null,
      folder_id: body.folderId ?? null,
      tags: (body.tags ?? []).map((t) => t.toLowerCase().slice(0, 30)).slice(0, 10),
    })
    .select("id")
    .single();
  if (error) return fail("DB_ERROR", "Could not register the upload.", 500);
  return ok({ id: data.id });
}

/** PATCH — rename / move / tag */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!requireCreatorRole(user)) return forbidden();

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    filename?: string;
    folderId?: string | null;
    tags?: string[];
  };
  if (!body.id) return fail("BAD_REQUEST", "Missing id.");

  const patch: Record<string, unknown> = {};
  if (body.filename !== undefined) patch.filename = body.filename.slice(0, 200);
  if (body.folderId !== undefined) patch.folder_id = body.folderId;
  if (body.tags !== undefined) patch.tags = body.tags.map((t) => t.toLowerCase().slice(0, 30)).slice(0, 10);

  const { error } = await supabaseAdmin()
    .from("media_assets")
    .update(patch)
    .eq("id", body.id)
    .eq("creator_id", user!.id);
  if (error) return fail("DB_ERROR", "Update failed.", 500);
  return ok({ updated: true });
}

/** DELETE ?ids=a,b,c — soft delete + remove storage objects */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!requireCreatorRole(user)) return forbidden();

  const ids = (req.nextUrl.searchParams.get("ids") ?? "").split(",").filter(Boolean);
  if (ids.length === 0) return fail("BAD_REQUEST", "No assets selected.");

  const { data: assets } = await supabaseAdmin()
    .from("media_assets")
    .select("id, storage_path, thumb_path, preview_path")
    .eq("creator_id", user!.id)
    .in("id", ids);

  for (const a of assets ?? []) {
    const paths = [a.storage_path, a.thumb_path, a.preview_path].filter(Boolean) as string[];
    await supabaseAdmin().storage.from("vault").remove(paths);
  }

  const { error } = await supabaseAdmin()
    .from("media_assets")
    .update({ deleted_at: new Date().toISOString() })
    .eq("creator_id", user!.id)
    .in("id", ids);
  if (error) return fail("DB_ERROR", "Delete failed.", 500);
  return ok({ deleted: ids.length });
}
