"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Image as ImageIcon, MessageCircle, ShoppingBag, UserRound } from "lucide-react";
import { cn } from "@/lib/format";

export function MobileNav({ role }: { role?: string }) {
  const pathname = usePathname();

  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/creator", label: "Creator", icon: ImageIcon },
    { href: "/messages", label: "Messages", icon: MessageCircle },
    { href: "/purchases", label: "Library", icon: ShoppingBag },
    { href: role === "CREATOR" || role === "ADMIN" ? "/creator/dashboard" : "/settings", label: role === "CREATOR" || role === "ADMIN" ? "Studio" : "Profile", icon: UserRound },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-ink-2/95 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px] transition",
                active ? "text-champagne" : "text-mist"
              )}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
