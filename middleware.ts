import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PRIVATE_PREFIXES = [
  "/dashboard",
  "/messages",
  "/purchases",
  "/payment-history",
  "/notifications",
  "/settings",
  "/saved",
  "/creator/dashboard",
  "/creator/vault",
  "/creator/messages",
  "/creator/subscribers",
  "/creator/analytics",
  "/creator/payments",
  "/creator/tips",
  "/creator/bundles",
  "/creator/promotions",
  "/creator/settings",
  "/admin",
];

const PUBLIC_FILE = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$/;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_FILE.test(pathname)) return NextResponse.next();

  let res = NextResponse.next({ request: req });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return res;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const needsAuth = PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (needsAuth && !user) {
    const redirect = req.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", pathname);
    return NextResponse.redirect(redirect);
  }

  // /creator shows the public profile; /creator/<username> aliases to it too
  if (pathname === "/creator" || /^\/creator\/[a-z0-9_]+$/i.test(pathname)) {
    const settings = await supabase.from("platform_settings").select("maintenance_mode").eq("id", 1).maybeSingle();
    if (settings.data?.maintenance_mode) {
      const role = await getRole(supabase, user?.id);
      if (role !== "ADMIN") {
        const redirect = req.nextUrl.clone();
        redirect.pathname = "/maintenance";
        return NextResponse.redirect(redirect);
      }
    }
  }

  return res;
}

async function getRole(supabase: ReturnType<typeof createServerClient>, userId?: string): Promise<string | null> {
  if (!userId) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role ?? null;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
