"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { DashboardShellNav } from "@/lib/dashboard-copy";
import AvatarBadge from "./AvatarBadge";
import DashboardNav from "./DashboardNav";

type DashboardShellProps = {
  nav: DashboardShellNav;
  athleteName: string;
  athleteImage?: string | null;
  menuLabels: {
    open: string;
    close: string;
  };
  children: ReactNode;
};

export default function DashboardShell({ nav, athleteName, athleteImage, menuLabels, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [openPathname, setOpenPathname] = useState<string | null>(null);
  const isMobileOpen = openPathname !== null && openPathname === pathname;

  const sidebar = (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#08111f]/90 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_44%),linear-gradient(180deg,rgba(4,10,20,0.64),rgba(4,10,20,0.92))]" />
      <div
        className="absolute inset-0 bg-cover bg-center opacity-35"
        style={{ backgroundImage: "url('/dashboard-sidebar-art.svg')" }}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,transparent,rgba(2,8,18,0.92))]" />

      <div className="relative flex h-full flex-col p-5 lg:p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-3 text-xl font-bold tracking-[0.22em] text-[#9ff7ff]"
        >
          <AvatarBadge name={athleteName} image={athleteImage} sizeClassName="h-10 w-10" textClassName="text-sm" className="rounded-2xl" />
          <span>SWIMMERS</span>
        </Link>

        <div className="mt-6 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,18,31,0.88),rgba(8,18,31,0.56))] p-4 backdrop-blur-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#8eefff]">
            {nav.home}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <AvatarBadge name={athleteName} image={athleteImage} sizeClassName="h-14 w-14" textClassName="text-lg" className="rounded-[22px]" />
            <p className="text-2xl font-[family-name:var(--font-display)] font-semibold text-white">
              {athleteName}
            </p>
          </div>
        </div>

        <div className="mt-6 flex-1">
          <DashboardNav nav={nav} onNavigate={() => setOpenPathname(null)} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top,rgba(0,240,255,0.12),transparent_26%),linear-gradient(180deg,#07101c_0%,#040813_100%)] text-white">
      <button
        type="button"
        onClick={() => setOpenPathname(pathname)}
        className="fixed left-4 top-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#07111f]/90 text-white shadow-[0_12px_40px_rgba(0,0,0,0.3)] backdrop-blur-md lg:hidden"
        aria-label={menuLabels.open}
      >
        <Menu size={20} />
      </button>

      <aside className="hidden w-[22rem] shrink-0 p-4 lg:block lg:p-5">{sidebar}</aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#020817]/75 backdrop-blur-sm"
            aria-label={menuLabels.close}
            onClick={() => setOpenPathname(null)}
          />
          <div className="relative z-10 flex w-[min(22rem,88vw)] flex-col p-4">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setOpenPathname(null)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#07111f]/90 text-white"
                aria-label={menuLabels.close}
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1">{sidebar}</div>
          </div>
        </div>
      )}

      <main
        data-topbar-scroll-container="true"
        className="relative min-h-screen flex-1 overflow-y-auto overflow-x-hidden"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,196,0,0.08),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(0,240,255,0.08),transparent_28%)]" />
        <div className="relative min-h-screen">{children}</div>
      </main>
    </div>
  );
}
