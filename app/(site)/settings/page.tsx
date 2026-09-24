import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { SettingsClient } from "@/components/settings-client";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <SettingsClient
      profile={{
        username: user.profile.username,
        displayName: user.profile.display_name,
        bio: user.profile.bio,
        avatarUrl: user.profile.avatar_url,
        email: user.email,
        notifEmail: user.profile.notif_preferences?.email ?? true,
        notifInApp: user.profile.notif_preferences?.inApp ?? true,
      }}
    />
  );
}
