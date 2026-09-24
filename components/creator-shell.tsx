import Link from "next/link";
import type { ReactNode } from "react";
import {
  LayoutDashboard, FileText, FolderOpen, MessageCircle, Users, Lock,
  HeartHandshake, CreditCard, BarChart3, Gift, Package, Settings,
} from "lucide-react";

const NAV = [
  { href: "/creator/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/creator/content", label: "Content", icon: FileText },
  { href: "/creator/vault", label: "Vault", icon: FolderOpen },
  { href: "/creator/messages", label: "Messages", icon: MessageCircle },
  { href: "/creator/subscribers", label: "Subscribers", icon: Users },
  { href: "/creator/ppv", label: "PPV", icon: Lock },
  { href: "/creator/tips", label: "Tips", icon: HeartHandshake },
  { href: "/creator/payments", label: "Payments", icon: CreditCard },
  { href: "/creator/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/creator/bundles", label: "Bundles", icon: Package },
  { href: "/creator/promotions", label: "Promotions", icon: Gift },
  { href: "/creator/settings", label: "Settings", icon: Settings },
];

export function CreatorShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="md:w-52 md:shrink-0">
          <div className="md:sticky md:top-20">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-mist">Creator Studio</p>
            <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-mist transition hover:bg-white/5 hover:text-white"
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
