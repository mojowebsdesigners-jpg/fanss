import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";
import { ok, fail, forbidden } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { getBroadcastRecipients } from "@/lib/notify";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || (user.profile.role !== "CREATOR" && user.profile.role !== "ADMIN")) return forbidden();

  const rl = rateLimit(`broadcast:${user.id}`, 3, 3600_000); // 3/hour anti-spam
  if (!rl.allowed) return fail("RATE_LIMITED", "You can send up to 3 broadcasts per hour.", 429);

  const body = (await req.json().catch(() => ({}))) as {
    target?: "all" | "active_subscribers" | "expired_subscribers";
    title?: string;
    message?: string;
  };
  const title = body.title?.trim().slice(0, 100);
  const message = body.message?.trim().slice(0, 500);
  if (!title || !message) return fail("BAD_REQUEST", "Title and message are required.");

  const recipients = await getBroadcastRecipients(body.target ?? "all");
  const admin = supabaseAdmin();
  const rows = recipients
    .filter((id) => id !== user.id)
    .map((id) => ({
      user_id: id,
      type: "CREATOR_UPDATE" as const,
      title,
      body: message,
      link: "/creator",
    }));
  if (rows.length > 0) {
    const { error } = await admin.from("notifications").insert(rows);
    if (error) return fail("DB_ERROR", "Broadcast failed.", 500);
  }

  return ok({ sent: rows.length });
}
