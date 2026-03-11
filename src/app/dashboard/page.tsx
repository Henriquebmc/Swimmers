import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, Gauge, Medal, Sparkles, Star, UserRound } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { dedupeRaceResults } from "@/lib/race-results";
import { dashboardHomeCopy } from "@/lib/dashboard-copy";
import { translations, type Locale } from "@/i18n/translations";
import PerformanceChartClient from "@/components/dashboard/PerformanceChartClient";
import UploadButton from "@/components/dashboard/UploadButton";

export const dynamic = "force-dynamic";

type ShortcutCardProps = {
  href: string;
  title: string;
  description: string;
  accent: string;
};

type StatCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
};

type RecordPinChip = {
  tag: string;
  count: number;
};

type RecordPinsCardProps = {
  label: string;
  total: number;
  chips: RecordPinChip[];
};

type MedalsCardProps = {
  label: string;
  total: number;
  gold: number;
  silver: number;
  bronze: number;
  labels: {
    gold: string;
    silver: string;
    bronze: string;
  };
};

const calculateFavorite = <T,>(entries: Map<T, number>) => {
  return [...entries.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
};

function ShortcutCard({ href, title, description, accent }: ShortcutCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,18,31,0.9),rgba(8,18,31,0.64))] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-[linear-gradient(180deg,rgba(11,24,41,0.94),rgba(8,18,31,0.7))]"
    >
      <span className={`inline-flex h-3 w-3 rounded-full ${accent}`} aria-hidden="true" />
      <h3 className="mt-4 text-xl font-[family-name:var(--font-display)] font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">
        {title}
        <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

function StatCard({ label, value, helper, icon }: StatCardProps) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,16,29,0.96),rgba(7,16,29,0.68))] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-400">{label}</p>
        <span className="text-[#8eefff]">{icon}</span>
      </div>
      <div className="mt-5 text-4xl font-[family-name:var(--font-display)] font-semibold text-white">{value}</div>
      <p className="mt-2 text-sm text-slate-400">{helper}</p>
    </div>
  );
}

function RecordPinsCard({ label, total, chips }: RecordPinsCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(8,26,38,0.98),rgba(10,48,68,0.72))] p-5 shadow-[0_22px_60px_rgba(0,0,0,0.28)]">
      <div className="absolute right-[-40px] top-[-54px] h-36 w-36 rounded-full bg-cyan-300/12 blur-2xl" />
      <div className="absolute bottom-[-56px] right-8 h-32 w-32 rounded-full bg-[#00F0FF]/10 blur-[70px]" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-cyan-100/78">{label}</p>
          <div className="mt-4">
            <p className="text-5xl font-[family-name:var(--font-display)] font-semibold text-white">{total}</p>
          </div>
        </div>
        <div className="rounded-[22px] border border-cyan-200/18 bg-[#03111b]/48 p-3 text-[#8ff7ff]">
          <Star size={22} className="fill-current" />
        </div>
      </div>
      <div className="relative mt-6 min-h-[72px]">
        <div className="flex flex-wrap gap-2.5">
          {chips.map((chip, index) => (
            <span
              key={`${chip.tag}-${index}`}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.28em] text-[#b6fbff]"
            >
              <Star size={12} className="fill-current" />
              {chip.tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
function MedalsCard({ label, total, gold, silver, bronze, labels }: MedalsCardProps) {
  const medalItems = [
    {
      key: labels.gold,
      value: gold,
      coin: "from-[#f8e08a] via-[#e0b84f] to-[#b88722]",
      ring: "border-[#f6d777]/55",
      text: "text-[#2f2004]",
    },
    {
      key: labels.silver,
      value: silver,
      coin: "from-[#f4f7fb] via-[#cfd7e2] to-[#9ba8b6]",
      ring: "border-[#d9e3ee]/55",
      text: "text-[#203040]",
    },
    {
      key: labels.bronze,
      value: bronze,
      coin: "from-[#e6b08c] via-[#c98557] to-[#8d5530]",
      ring: "border-[#dca17c]/50",
      text: "text-[#2c1509]",
    },
  ];

  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,16,29,0.96),rgba(7,16,29,0.68))] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.22)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm uppercase tracking-[0.22em] text-slate-400">{label}</p>
        <span className="text-[#8eefff]">
          <Medal size={18} />
        </span>
      </div>
      <div className="mt-5 flex items-end justify-between gap-4">
        <div className="text-4xl font-[family-name:var(--font-display)] font-semibold text-white">{total}</div>
        <div className="flex items-end gap-3">
          {medalItems.map((item, index) => (
            <div
              key={`${item.key}-coin`}
              className={`relative flex flex-col items-center ${index === 0 ? "translate-y-0" : index === 1 ? "translate-y-2" : "translate-y-3"}`}
            >
              <div className="relative flex h-9 w-8 items-start justify-center">
                <span className="absolute left-0 top-0 h-8 w-3 rounded-b-full bg-[linear-gradient(180deg,#5ed7ff,#1a6fbe)]" />
                <span className="absolute right-0 top-0 h-8 w-3 rounded-b-full bg-[linear-gradient(180deg,#ffe082,#d9801f)]" />
              </div>
              <div
                className={`relative flex h-14 w-14 items-center justify-center rounded-full border bg-gradient-to-br ${item.coin} ${item.ring} shadow-[inset_0_2px_8px_rgba(255,255,255,0.3),0_10px_20px_rgba(0,0,0,0.22)]`}
              >
                <div className="absolute inset-[5px] rounded-full border border-white/30" />
                <span className={`relative text-lg font-[family-name:var(--font-display)] font-bold ${item.text}`}>
                  {item.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-between gap-3">
        {medalItems.map((item) => (
          <div
            key={item.key}
            className="min-w-[78px] flex-1 rounded-[20px] border border-white/8 bg-white/[0.03] px-3 py-3 text-center"
          >
            <p className="text-xl font-[family-name:var(--font-display)] font-semibold text-white">{item.value}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-slate-400">{item.key}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
export default async function DashboardHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin?callbackUrl=/dashboard");

  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value ?? "pt-BR") as Locale;
  const t = translations[locale];
  const homeT = dashboardHomeCopy[locale];
  const profileT = t.profilePage;
  const dashboardT = t.dashboard;

  const athleteProfile = await db.athleteProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      user: true,
      results: { orderBy: { date: "asc" } },
      coach: { include: { user: true } },
    },
  });

  const results = dedupeRaceResults(athleteProfile?.results ?? []).filter((result) => result.eventType !== "OPEN_WATER");
  const greetingName = session.user.name?.split(" ")[0] ?? homeT.fallbackAthlete;
  const coachName = athleteProfile?.coach?.user?.name ?? null;
  const recordCounts = results.reduce((map, result) => {
    const tag = result.recordTag?.trim().toUpperCase();
    if (!tag) return map;
    map.set(tag, (map.get(tag) ?? 0) + 1);
    return map;
  }, new Map<string, number>());
  const recordChips = [...recordCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .flatMap(([tag, count]) => Array.from({ length: count }, () => ({ tag, count: 1 })));
  const totalRecords = recordChips.length;
  const goldMedals = results.filter((result) => result.position === 1).length;
  const silverMedals = results.filter((result) => result.position === 2).length;
  const bronzeMedals = results.filter((result) => result.position === 3).length;
  const totalMedals = goldMedals + silverMedals + bronzeMedals;
  const latestResult = results.length > 0 ? results[results.length - 1] : null;
  const recentResults = [...results].slice(-5).reverse();
  const shortDateFormatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const strokeCounts = new Map<string, number>();
  const distanceCounts = new Map<number, number>();
  for (const result of results) {
    if (result.stroke) {
      strokeCounts.set(result.stroke, (strokeCounts.get(result.stroke) ?? 0) + 1);
    }
    distanceCounts.set(result.distance, (distanceCounts.get(result.distance) ?? 0) + 1);
  }
  const favoriteStrokeKey = calculateFavorite(strokeCounts);
  const favoriteDistanceKey = calculateFavorite(distanceCounts);
  const favoriteStrokeLabel = favoriteStrokeKey
    ? t.strokes[favoriteStrokeKey as keyof typeof t.strokes] ?? String(favoriteStrokeKey)
    : "--";
  const favoriteDistanceLabel = favoriteDistanceKey ? `${favoriteDistanceKey}m` : "--";
  const lastMeetLabel = latestResult
    ? `${shortDateFormatter.format(latestResult.date)} · ${latestResult.competitionName}`
    : "--";

  const eventCounts: Record<string, number> = {};
  for (const result of results) {
    const key = `${result.distance}_${result.stroke}`;
    eventCounts[key] = (eventCounts[key] ?? 0) + 1;
  }

  const topEventKey = Object.entries(eventCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const [chartDistance, chartStroke] = topEventKey ? topEventKey.split("_") : [null, null];
  const topStrokeLabel = chartStroke ? t.strokes[chartStroke as keyof typeof t.strokes] : "";
  const chartData = topEventKey
    ? results
        .filter((result) => result.distance === Number(chartDistance) && result.stroke === chartStroke)
        .map((result) => {
          const eventDate = new Date(result.date);
          return {
            meet: `${eventDate.toLocaleDateString(locale)} · ${result.competitionName}`,
            axisLabel: Number.isNaN(eventDate.getTime()) ? "--" : String(eventDate.getFullYear()),
            value: result.timeMs / 1000,
            tooltip: result.timeString,
          };
        })
    : [];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pb-10 pt-24 sm:px-6 lg:px-10 lg:pt-12">
      <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[#07111f] shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
        <Image
          src="/dashboard-home-hero.svg"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="(max-width: 1024px) 100vw, 1200px"
        />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(4,10,20,0.96)_14%,rgba(4,10,20,0.72)_52%,rgba(4,10,20,0.9)_100%)]" />
        <div className="relative grid gap-10 p-6 sm:p-8 lg:grid-cols-[1.35fr_0.8fr] lg:p-10 xl:p-12">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-[#8eefff]/25 bg-[#8eefff]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.34em] text-[#a2f6ff]">
              {homeT.badge}
            </p>
            <h1 className="mt-6 text-4xl font-[family-name:var(--font-display)] font-semibold tracking-tight text-white sm:text-5xl xl:text-6xl">
              {homeT.title.replace("{name}", greetingName)}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              {homeT.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <UploadButton label={dashboardT.uploadPdf} />
              <Link
                href="/dashboard/performance"
                className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/28 hover:bg-white/[0.1]"
              >
                {homeT.secondaryCta}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,18,31,0.72),rgba(8,18,31,0.4))] p-5 backdrop-blur-md sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-[#8eefff]">{profileT.athlete.labels.favoriteStroke}</p>
              <p className="mt-2 text-2xl font-[family-name:var(--font-display)] font-semibold text-white">{favoriteStrokeLabel}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-[#8eefff]">{profileT.athlete.labels.favoriteDistance}</p>
              <p className="mt-2 text-2xl font-[family-name:var(--font-display)] font-semibold text-white">{favoriteDistanceLabel}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-[#8eefff]">{profileT.athlete.labels.lastMeet}</p>
              <p className="mt-2 text-base font-medium leading-7 text-white">{lastMeetLabel}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-[#8eefff]">{dashboardT.latestResult}</p>
              <p className="mt-2 text-2xl font-[family-name:var(--font-display)] font-semibold text-white">
                {latestResult ? latestResult.timeString : "--"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={dashboardT.totalRaces}
          value={String(results.length)}
          helper={latestResult ? latestResult.competitionName : homeT.emptyStateDescription}
          icon={<Sparkles size={18} />}
        />
        <RecordPinsCard
          label={homeT.recordPinsLabel}
          total={totalRecords}
          chips={recordChips}
        />
        <MedalsCard
          label={homeT.medalsLabel}
          total={totalMedals}
          gold={goldMedals}
          silver={silverMedals}
          bronze={bronzeMedals}
          labels={{
            gold: homeT.medalsGold,
            silver: homeT.medalsSilver,
            bronze: homeT.medalsBronze,
          }}
        />
        <StatCard
          label={dashboardT.currentCoach}
          value={coachName ?? homeT.noCoachShort}
          helper={coachName ? homeT.statsCoachLinked : dashboardT.noCoach}
          icon={<UserRound size={18} />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,16,29,0.96),rgba(7,16,29,0.7))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-7">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[#8eefff]">{homeT.quickLinksTitle}</p>
            <h2 className="mt-3 text-3xl font-[family-name:var(--font-display)] font-semibold text-white">
              {homeT.quickLinksSubtitle}
            </h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ShortcutCard
              href="/dashboard/performance"
              title={dashboardT.nav.performance}
              description={homeT.shortcuts.performance}
              accent="bg-cyan-200"
            />
            <ShortcutCard
              href="/dashboard/meets"
              title={dashboardT.nav.meets}
              description={homeT.shortcuts.meets}
              accent="bg-emerald-200"
            />
            <ShortcutCard
              href="/dashboard/update-info"
              title={dashboardT.nav.updateInfo}
              description={homeT.shortcuts.updateInfo}
              accent="bg-amber-200"
            />
            <ShortcutCard
              href="/dashboard/profile"
              title={dashboardT.nav.profileCoach}
              description={homeT.shortcuts.profileCoach}
              accent="bg-fuchsia-200"
            />
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,16,29,0.96),rgba(7,16,29,0.7))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[#8eefff]">{homeT.recentResultsTitle}</p>
              <h2 className="mt-3 text-3xl font-[family-name:var(--font-display)] font-semibold text-white">
                {homeT.recentResultsSubtitle}
              </h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.26em] text-slate-400">
              {recentResults.length}
            </span>
          </div>

          {recentResults.length > 0 ? (
            <div className="mt-6 space-y-3">
              {recentResults.map((result) => (
                <div
                  key={result.id}
                  className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 transition hover:border-white/16 hover:bg-white/[0.05]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {result.distance}m {t.strokes[result.stroke as keyof typeof t.strokes]}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">{result.competitionName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-[family-name:var(--font-display)] font-semibold text-white">{result.timeString}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                        {shortDateFormatter.format(result.date)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[28px] border border-dashed border-white/12 bg-white/[0.03] p-6 text-sm leading-7 text-slate-300">
              <p className="text-lg font-semibold text-white">{homeT.emptyStateTitle}</p>
              <p className="mt-2">{homeT.recentResultsEmpty}</p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(7,16,29,0.96),rgba(7,16,29,0.72))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:p-7">
        <div className="flex flex-col gap-4 border-b border-white/8 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[#8eefff]">{homeT.progressionTitle}</p>
            <h2 className="mt-3 text-3xl font-[family-name:var(--font-display)] font-semibold text-white">
              {chartDistance && topStrokeLabel ? `${chartDistance}m ${topStrokeLabel}` : homeT.progressionFallback}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">{homeT.progressionSubtitle}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.28em] text-slate-300">
            <Gauge size={16} />
            {chartData.length}
          </div>
        </div>

        {chartData.length > 0 ? (
          <PerformanceChartClient data={chartData} primaryColor="#7defff" />
        ) : (
          <div className="flex h-[300px] items-center justify-center text-center text-sm text-slate-400">
            {homeT.noChartData}
          </div>
        )}
      </section>
    </div>
  );
}












