import { appUrl } from "./env";

/**
 * Email abstraction. Uses Resend when RESEND_API_KEY is present;
 * otherwise silently no-ops (logged) so local dev works without keys.
 */
export async function sendEmail(
  to: string,
  subject: string,
  bodyText: string,
  link?: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Lumina <onboarding@resend.dev>";
  if (!apiKey) {
    console.log(`[email:disabled] to=${to} subject="${subject}"`);
    return false;
  }

  const html = `
    <div style="font-family:Inter,Helvetica,Arial,sans-serif;background:#07060b;color:#f2eef9;padding:40px">
      <div style="max-width:520px;margin:0 auto;background:#0d0b14;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:32px">
        <div style="font-size:12px;letter-spacing:.2em;color:#e8c87f;text-transform:uppercase;margin-bottom:16px">Lumina</div>
        <h1 style="font-size:20px;margin:0 0 12px;color:#fff">${escapeHtml(subject)}</h1>
        <p style="font-size:14px;line-height:1.6;color:#a79fb8;margin:0 0 24px">${escapeHtml(bodyText)}</p>
        ${link ? `<a href="${escapeHtml(link)}" style="display:inline-block;background:linear-gradient(135deg,#f3ddb0,#e8c87f);color:#241a06;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none">Open Lumina</a>` : ""}
        <p style="font-size:11px;color:#6f6885;margin-top:32px">${escapeHtml(appUrl())}</p>
      </div>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) {
      console.error("Resend error", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("Resend fetch failed", e);
    return false;
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
