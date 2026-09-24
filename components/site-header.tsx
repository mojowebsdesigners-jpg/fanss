"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, LogOut, Menu, Settings, UserRound, X } from "lucide-react";
import { Avatar } from "./ui";

type HeaderUser = {
  username: string;
  displayName: string | null;
  avatar: string | null;
  role: string;
} | null;

export function SiteHeader({ user }: { user: HeaderUser }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    const { supabaseBrowser } = await import("@/lib/supabase-browser");
    await supabaseBrowser().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-display text-2xl tracking-wide">
          <span className="gold-text">LUMINA</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-mist md:flex">
          <Link href="/creator" className="transition hover:text-white">Creator</Link>
          <Link href="/feed" className="transition hover:text-white">Feed</Link>
          {user?.role === "CREATOR" || user?.role === "ADMIN" ? (
            <Link href="/creator/dashboard" className="transition hover:text-white">Studio</Link>
          ) : null}
          {user?.role === "ADMIN" ? (
            <Link href="/admin" className="transition hover:text-white">Admin</Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/notifications" className="rounded-full p-2 text-mist transition hover:bg-white/5 hover:text-white" aria-label="Notifications">
                <Bell size={19} />
              </Link>
              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 rounded-full p-1 transition hover:bg-white/5" aria-label="Account menu">
                  <Avatar src={user.avatar} name={user.displayName ?? user.username} size={32} />
                </button>
                {menuOpen && (
                  <div className="glass-strong absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl py-1.5 shadow-2xl animate-scale-in">
                    <div className="border-b border-line px-4 py-2.5">
                      <p className="truncate text-sm font-medium">{user.displayName ?? user.username}</p>
                      <p className="truncate text-xs text-mist">@{user.username}</p>
                    </div>
                    <MenuLink href="/settings" icon={<UserRound size={15} />} label="My profile" />
                    <MenuLink href="/purchases" icon={<Settings size={15} />} label="Purchases" />
                    <MenuLink href="/payment-history" icon={<Settings size={15} />} label="Payment history" />
                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-rose-300 transition hover:bg-white/5"
                    >
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-xl px-4 py-2 text-sm text-mist transition hover:text-white sm:block">
                Sign in
              </Link>
              <Link href="/signup" className="btn-gold rounded-xl px-4 py-2 text-sm">Join free</Link>
            </>
          )}
          <button className="ml-1 rounded-lg p-2 text-mist md:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-line bg-ink/95 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1 text-sm">
            <MobileLink href="/creator" label="Creator" onNavigate={() => setMobileOpen(false)} />
            <MobileLink href="/feed" label="Feed" onNavigate={() => setMobileOpen(false)} />
            {user ? (
              <>
                <MobileLink href="/messages" label="Messages" onNavigate={() => setMobileOpen(false)} />
                <MobileLink href="/purchases" label="Purchases" onNavigate={() => setMobileOpen(false)} />
                <MobileLink href="/settings" label="Settings" onNavigate={() => setMobileOpen(false)} />
                {user.role === "CREATOR" || user.role === "ADMIN" ? (
                  <MobileLink href="/creator/dashboard" label="Creator Studio" onNavigate={() => setMobileOpen(false)} />
                ) : null}
                {user.role === "ADMIN" ? <MobileLink href="/admin" label="Admin" onNavigate={() => setMobileOpen(false)} /> : null}
              </>
            ) : (
              <MobileLink href="/login" label="Sign in" onNavigate={() => setMobileOpen(false)} />
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function MenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/85 transition hover:bg-white/5">
      {icon} {label}
    </Link>
  );
}

function MobileLink({ href, label, onNavigate }: { href: string; label: string; onNavigate: () => void }) {
  return (
    <Link href={href} onClick={onNavigate} className="rounded-lg px-3 py-2.5 text-white/85 transition hover:bg-white/5">
      {label}
    </Link>
  );
}
