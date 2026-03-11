import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { dashboardChromeCopy, dashboardHomeCopy } from "@/lib/dashboard-copy";
import { translations, type Locale } from "@/i18n/translations";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value ?? "pt-BR") as Locale;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/dashboard");
  }

  const dashboardT = translations[locale].dashboard;
  const chromeCopy = dashboardChromeCopy[locale];
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, image: true },
  });
  const athleteName = user?.name ?? session.user.name ?? dashboardHomeCopy[locale].fallbackAthlete;

  return (
    <DashboardShell
      nav={{
        home: chromeCopy.home,
        ...dashboardT.nav,
      }}
      athleteName={athleteName}
      athleteImage={user?.image ?? null}
      menuLabels={{
        open: chromeCopy.menuOpen,
        close: chromeCopy.menuClose,
      }}
    >
      {children}
    </DashboardShell>
  );
}
