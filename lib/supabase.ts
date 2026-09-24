import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export { supabaseBrowser } from "./supabase-browser";
import { supabaseBrowser } from "./supabase-browser";
void supabaseBrowser;

/** Cookie-bound client for Server Components, Server Actions and Route Handlers. */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component render — middleware handles refresh
          }
        },
      },
    }
  );
}

/**
 * Service-role client. SERVER ONLY — bypasses RLS.
 * Business logic that must be atomic/verified (payment fulfillment,
 * moderation, notifications) uses this; everything user-facing uses
 * the cookie-bound client so RLS always applies.
 */
let _admin: SupabaseClient | null = null;
export function supabaseAdmin(): SupabaseClient {
  if (!_admin) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is not set. Server-side business logic cannot run."
      );
    }
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return _admin;
}
