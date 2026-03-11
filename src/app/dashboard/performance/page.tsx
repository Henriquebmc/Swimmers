import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { dedupeRaceResults } from "@/lib/race-results";
import { cookies } from "next/headers";
import { translations, type Locale } from "@/i18n/translations";
import PerformanceChartClient from "@/components/dashboard/PerformanceChartClient";
import UploadButton from "@/components/dashboard/UploadButton";
import { CheckCircle2, TrendingUp, TrendingDown, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin?callbackUrl=/dashboard/performance");

  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value ?? "pt-BR") as Locale;
  const t = translations[locale];
  const td = t.dashboard;

  const athleteProfile = await db.athleteProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      results: { orderBy: { date: "asc" } },
      coach: { include: { user: true } },
    },
  });

  const results = dedupeRaceResults(athleteProfile?.results ?? []).filter((result) => result.eventType !== "OPEN_WATER");
  const latestResult = results.length > 0 ? results[results.length - 1] : null;

  const eventCounts: Record<string, number> = {};
  for (const r of results) {
    const key = `${r.distance}_${r.stroke}`;
    eventCounts[key] = (eventCounts[key] ?? 0) + 1;
  }
  const topEventKey = Object.entries(eventCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const [chartDistance, chartStroke] = topEventKey ? topEventKey.split("_") : [null, null];

  const chartResults = topEventKey
    ? results.filter((r) => r.distance === Number(chartDistance) && r.stroke === chartStroke)
    : [];

  const chartData = chartResults.map((r) => {
    const eventDate = new Date(r.date);
    return {
      meet: `${eventDate.toLocaleDateString(locale)} · ${r.competitionName}`,
      axisLabel: Number.isNaN(eventDate.getTime()) ? "--" : String(eventDate.getFullYear()),
      value: r.timeMs / 1000,
      tooltip: r.timeString,
    };
  });

  const coachName = athleteProfile?.coach?.user?.name ?? null;

  let pbDelta: string | null = null;
  if (latestResult) {
    const sameEvent = results.filter(
      (r) => r.distance === latestResult.distance && r.stroke === latestResult.stroke
    );
    if (sameEvent.length >= 2) {
      const prevBest = Math.min(...sameEvent.slice(0, -1).map((r) => r.timeMs));
      const delta = (latestResult.timeMs - prevBest) / 1000;
      if (delta < 0) pbDelta = `${delta.toFixed(2)}s PB`;
    }
  }

  const strokeLabel = chartStroke ? t.strokes[chartStroke as keyof typeof t.strokes] : "";
  const chartTitle =
    topEventKey && chartDistance && strokeLabel
      ? td.progression.replace("{distance}", chartDistance).replace("{stroke}", strokeLabel)
      : td.performanceProgression;

  const latestEventLabel = latestResult
    ? td.latestEvent
        .replace("{distance}", String(latestResult.distance))
        .replace("{stroke}", t.strokes[latestResult.stroke as keyof typeof t.strokes])
    : td.latestResult;

  const greetingName = session.user.name?.split(" ")[0] ?? "Swimmer";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-10 pt-24 sm:px-6 lg:px-10 lg:pt-12">
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#8eefff]">
            {td.nav.performance}
          </p>
          <h1 className="mt-3 text-4xl font-bold font-[family-name:var(--font-display)]">
            {td.greeting.replace("{name}", greetingName)}
          </h1>
          <p className="mt-2 text-slate-300">{td.subtitle}</p>
        </div>
        <UploadButton label={td.uploadPdf} />
      </header>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="mb-4 flex items-center gap-3 font-medium text-gray-400">
            <Clock size={18} className="text-[#00F0FF]" />
            <span>{latestEventLabel}</span>
          </div>
          <div className="flex items-end gap-3">
            <h2 className="text-4xl font-[family-name:var(--font-display)] font-bold text-white">
              {latestResult ? latestResult.timeString : "—"}
            </h2>
            {pbDelta && (
              <span className="mb-2 flex items-center text-sm font-semibold text-[#00FF85]">
                <TrendingUp size={16} className="mr-1" />
                {pbDelta}
              </span>
            )}
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="mb-4 flex items-center gap-3 font-medium text-gray-400">
            <CheckCircle2 size={18} className="text-[#00F0FF]" />
            <span>{td.resultsSaved}</span>
          </div>
          <div className="flex items-end gap-3">
            <h2 className="text-4xl font-[family-name:var(--font-display)] font-bold text-white">
              {results.length}
            </h2>
            <span className="mb-2 text-sm font-semibold text-gray-500">{td.totalRaces}</span>
          </div>
        </div>

        <div className="glass-card border-l-4 border-l-[#00F0FF] p-6 flex flex-col justify-between">
          <div className="mb-2 flex items-center gap-3 text-gray-400">
            <span>{td.currentCoach}</span>
          </div>
          {coachName ? (
            <>
              <p className="text-2xl font-[family-name:var(--font-display)] font-light text-white">{coachName}</p>
              <p className="mt-1 text-sm font-medium text-[#00F0FF]">Regional Squad</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-gray-500">{td.noCoach}</p>
          )}
        </div>
      </section>

      <section className="glass-card p-6">
        <h3 className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.05)] pb-4 text-xl font-bold font-[family-name:var(--font-display)] text-white">
          <TrendingDown className="text-[#00FF85]" />
          {chartTitle}
        </h3>
        {chartData.length > 0 ? (
          <PerformanceChartClient data={chartData} />
        ) : (
          <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
            {td.noChartData}
          </div>
        )}
      </section>
    </div>
  );
}

