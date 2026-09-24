import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase";

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: "USER" | "CREATOR" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  notif_preferences: { email: boolean; inApp: boolean };
  privacy_preferences: { publicProfile: boolean };
  last_login_at: string | null;
  created_at: string;
};

export type SessionUser = { id: string; email: string; profile: Profile };

/** Returns the authenticated user + profile, or null. Server-side only. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;
  return {
    id: user.id,
    email: user.email,
    profile: profile as Profile,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.profile.status === "SUSPENDED") redirect("/suspended");
  return user;
}

export async function requireCreator(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.profile.role !== "CREATOR" && user.profile.role !== "ADMIN") {
    redirect("/");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.profile.role !== "ADMIN") redirect("/");
  return user;
}

/** Route-handler guards — return null and let the caller send 401/403. */
export async function getApiUser(): Promise<SessionUser | null> {
  return getSessionUser();
}

export function isAdminRole(user: SessionUser | null): boolean {
  return user?.profile.role === "ADMIN";
}
