import Link from "next/link";
import type { ReactNode } from "react";
import {
  LayoutDashboard, Users, FileText, CreditCard, Flag, ShieldCheck, Settings, ScrollText, Crown,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/content", label: "Content", icon: FileText },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="md:w-52 md:shrink-0">
          <div className="md:sticky md:top-20">
            <p className="mb-3 px-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-mist">
              <ShieldCheck size={13} className="text-champagne" /> Admin console
            </p>
            <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href}
                  className="flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-mist transition hover:bg-white/5 hover:text-white">
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
