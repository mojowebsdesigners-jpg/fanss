import type { ReactNode } from "react";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getPlatformSettings } from "@/lib/access";
import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";
import { AgeGate } from "@/components/age-gate";
import { SiteFooter } from "@/components/site-footer";

// Every page under (site) reads the session/settings — render per request.
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [user, settings] = await Promise.all([getSessionUser(), getPlatformSettings()]);

  if (settings?.maintenance_mode && user?.profile.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="font-display text-4xl gold-text">Lumina</div>
        <h1 className="font-display text-3xl text-white">Be right back.</h1>
        <p className="max-w-sm text-mist">
          We're polishing something behind the curtain. Please check back in a little while.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AgeGate required={settings?.age_gate_required ?? true} />
      <SiteHeader
        user={
          user
            ? { username: user.profile.username, displayName: user.profile.display_name, avatar: user.profile.avatar_url, role: user.profile.role }
            : null
        }
      />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <SiteFooter />
      <MobileNav role={user?.profile.role} />
    </div>
  );
}
