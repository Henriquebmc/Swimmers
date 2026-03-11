"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Home, Medal, PenSquare, Settings, User } from "lucide-react";
import type { DashboardShellNav } from "@/lib/dashboard-copy";

type DashboardNavProps = {
  nav: DashboardShellNav;
  onNavigate?: () => void;
};

type NavKey = keyof DashboardNavProps["nav"];
type IconComponent = typeof Activity;

const primaryItems: { key: NavKey; href: string; icon: IconComponent; exact?: boolean }[] = [
  { key: "home", href: "/dashboard", icon: Home, exact: true },
  { key: "performance", href: "/dashboard/performance", icon: Activity, exact: true },
  { key: "meets", href: "/dashboard/meets", icon: Medal },
  { key: "updateInfo", href: "/dashboard/update-info", icon: PenSquare },
  { key: "profileCoach", href: "/dashboard/profile", icon: User },
];

const secondaryItem: { key: NavKey; href: string; icon: IconComponent } = {
  key: "settings",
  href: "/dashboard/settings",
  icon: Settings,
};

export default function DashboardNav({ nav, onNavigate }: DashboardNavProps) {
  const pathname = usePathname();

  const renderLink = (key: NavKey, href: string, Icon: IconComponent, active: boolean) => (
    <Link
      key={key}
      href={href}
      onClick={onNavigate}
      className={`group flex items-center gap-4 rounded-2xl border px-4 py-3.5 transition-all duration-300 ${
        active
          ? "border-[#7defff]/40 bg-[linear-gradient(135deg,rgba(125,239,255,0.18),rgba(1,9,19,0.92))] text-white shadow-[0_18px_40px_rgba(0,12,20,0.35)]"
          : "border-white/8 bg-white/[0.035] text-slate-200 hover:border-white/16 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors ${
          active
            ? "border-[#7defff]/45 bg-[#7defff]/14 text-[#8ff3ff]"
            : "border-white/10 bg-[#09101d]/80 text-slate-300 group-hover:border-white/20 group-hover:text-white"
        }`}
      >
        <Icon size={18} />
      </span>
      <span className="font-medium tracking-[0.01em]">{nav[key]}</span>
    </Link>
  );

  return (
    <div className="relative flex w-full flex-1 flex-col gap-3">
      <div className="flex flex-col gap-3">
        {primaryItems.map(({ key, href, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return renderLink(key, href, Icon, isActive);
        })}
      </div>
      <div className="mt-auto w-full pt-5">
        {renderLink(
          secondaryItem.key,
          secondaryItem.href,
          secondaryItem.icon,
          pathname.startsWith(secondaryItem.href)
        )}
      </div>
    </div>
  );
}

