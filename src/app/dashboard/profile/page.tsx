import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getWorldRecordMs } from "@/lib/worldRecords";
import { dedupeRaceResults } from "@/lib/race-results";
import { translations, type Locale } from "@/i18n/translations";
import AvatarBadge from "@/components/dashboard/AvatarBadge";

export const dynamic = "force-dynamic";

type TechnicalResult = {
  id: string;
  competitionName: string;
  date: Date;
  distance: number;
  stroke: string;
  course: string;
  timeString: string;
  technicalIndex: number;
};

type HighlightEvent = {
  id: string;
  label: string;
  competition: string;
  score: number;
  time: string;
};

type TimelineRow = {
  id: string;
  date: string;
  competition: string;
  event: string;
  technical?: number;
  position: number | null;
  time: string;
  course: string;
};

const formatCourseShort = (course: string | null) => {
  if (course === "LONG_COURSE") return "50m";
  if (course === "SHORT_COURSE") return "25m";
  return course ?? "--";
};

const calculateAge = (birthDate: Date | null) => {
  if (!birthDate) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
};

const resolveCategoryLabel = (
  age: number | null,
  labels: { youth: string; junior: string; senior: string; masters: string; unknown: string }
) => {
  if (age === null) return labels.unknown;
  if (age < 13) return labels.youth;
  if (age < 17) return labels.junior;
  if (age < 25) return labels.senior;
  return labels.masters;
};

const resolveGenderLabel = (value: string | null | undefined, labels: { male: string; female: string; other: string }) => {
  if (!value) return labels.other;
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("m")) return labels.male;
  if (normalized.startsWith("f")) return labels.female;
  return labels.other;
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin?callbackUrl=/dashboard/profile");

  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value ?? "pt-BR") as Locale;
  const t = translations[locale];
  const tp = t.profilePage;
  const sessionGender = (session.user as { gender?: string } | undefined)?.gender ?? null;

  const athleteProfile = await db.athleteProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      user: true,
      coach: { include: { user: true, athletes: { include: { user: true } } } },
      results: { orderBy: { date: "desc" } },
    },
  });

  const header = (
    <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-[#00F0FF] font-semibold">
          {t.dashboard.nav.profileCoach}
        </p>
        <h1 className="text-4xl font-[family-name:var(--font-display)] font-bold mt-2">{tp.title}</h1>
        <p className="text-gray-400 mt-2 max-w-3xl">{tp.subtitle}</p>
      </div>
      <Link href="/dashboard/settings" className="btn-primary text-sm whitespace-nowrap">
        {tp.ctaSettings}
      </Link>
    </header>
  );

  if (!athleteProfile) {
    return (
      <div className="p-8 lg:p-12 w-full max-w-7xl mx-auto space-y-8">
        {header}
        <section className="glass-card p-8 space-y-4 text-center">
          <h2 className="text-2xl font-[family-name:var(--font-display)] font-semibold">{tp.emptyState.title}</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">{tp.emptyState.description}</p>
          <div className="flex justify-center">
            <Link href="/dashboard/settings" className="btn-primary text-sm">
              {tp.ctaSettings}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const user = athleteProfile.user;
  const coach = athleteProfile.coach;
  const results = dedupeRaceResults(athleteProfile.results).filter((result) => result.eventType !== "OPEN_WATER");
  const numberFormatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateFormatter = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "long", year: "numeric" });
  const shortDateFormatter = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric" });

  const competitions = new Set(results.map((result) => result.competitionName));
  const pbCount = results.filter((result) => result.isPersonalBest).length;

  const strokeCounts = new Map<string, number>();
  const distanceCounts = new Map<number, number>();
  results.forEach((result) => {
    if (result.stroke) {
      strokeCounts.set(result.stroke, (strokeCounts.get(result.stroke) ?? 0) + 1);
    }
    distanceCounts.set(result.distance, (distanceCounts.get(result.distance) ?? 0) + 1);
  });
  const favoriteStrokeKey = [...strokeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const favoriteDistanceKey = [...distanceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const technicalEntries: TechnicalResult[] = results.flatMap((result) => {
    if (!result.stroke || !result.course) return [];
    const baseline = getWorldRecordMs(result.distance, result.stroke, result.course, user?.gender ?? sessionGender);
    if (!baseline) return [];

    return [{
      id: result.id,
      competitionName: result.competitionName,
      date: result.date,
      distance: result.distance,
      stroke: result.stroke,
      course: result.course,
      timeString: result.timeString,
      technicalIndex: Number(((result.timeMs / baseline) * 100).toFixed(2)),
    } satisfies TechnicalResult];
  });
  const technicalIndexById = new Map(technicalEntries.map((entry) => [entry.id, entry.technicalIndex]));
  const averageTechnical = technicalEntries.length
    ? Number((technicalEntries.reduce((sum, entry) => sum + entry.technicalIndex, 0) / technicalEntries.length).toFixed(2))
    : null;

  const highlights: HighlightEvent[] = (() => {
    const map = new Map<string, HighlightEvent>();
    technicalEntries.forEach((entry) => {
      const key = `${entry.distance}-${entry.stroke}-${entry.course}`;
      const label = `${entry.distance}m ${t.strokes[entry.stroke as keyof typeof t.strokes] ?? entry.stroke}`;
      const competition = `${shortDateFormatter.format(entry.date)} · ${entry.competitionName}`;
      const existing = map.get(key);
      if (!existing || entry.technicalIndex < existing.score) {
        map.set(key, { id: key, label, competition, score: entry.technicalIndex, time: entry.timeString });
      }
    });
    return [...map.values()].sort((a, b) => a.score - b.score).slice(0, 3);
  })();

  const timelineRows: TimelineRow[] = results.slice(0, 5).map((result) => ({
    id: result.id,
    date: shortDateFormatter.format(result.date),
    competition: result.competitionName,
    event: `${result.distance}m ${result.stroke ? t.strokes[result.stroke as keyof typeof t.strokes] ?? result.stroke : "--"}`,
    technical: technicalIndexById.get(result.id),
    position: result.position,
    time: result.timeString,
    course: formatCourseShort(result.course),
  }));

  const birthDate = user?.birthDate ?? null;
  const age = calculateAge(birthDate);
  const categoryLabel = resolveCategoryLabel(age, tp.athlete.categoryLabels);
  const genderLabel = resolveGenderLabel(user?.gender ?? sessionGender, tp.athlete.genderLabels);
  const birthLabel = birthDate ? dateFormatter.format(birthDate) : tp.athlete.missingBirthDate;
  const favoriteStrokeLabel = favoriteStrokeKey ? t.strokes[favoriteStrokeKey as keyof typeof t.strokes] ?? favoriteStrokeKey : "--";
  const favoriteDistanceLabel = favoriteDistanceKey ? `${favoriteDistanceKey}m` : "--";
  const lastMeetLabel = results.length > 0 ? `${shortDateFormatter.format(results[0].date)} · ${results[0].competitionName}` : "--";

  const coachName = coach?.user?.name ?? null;
  const coachClub = coach?.clubName ?? "--";
  const coachAthleteCount = coach?.athletes?.length ?? 0;
  const teammateNames = (coach?.athletes ?? [])
    .filter((athlete) => athlete.userId !== athleteProfile.userId && athlete.user?.name)
    .map((athlete) => athlete.user?.name as string)
    .slice(0, 3);
  const coachSinceDate = coach?.user?.createdAt ?? null;
  const coachSinceLabel = coachSinceDate ? tp.coach.since.replace("{date}", dateFormatter.format(coachSinceDate)) : null;

  const stats = {
    races: results.length,
    meets: competitions.size,
    pb: pbCount,
    avgTechnical: averageTechnical ? `${numberFormatter.format(averageTechnical)} pts` : "--",
  };

  return (
    <div className="p-8 lg:p-12 w-full max-w-7xl mx-auto space-y-8">
      {header}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 space-y-6 lg:col-span-2">
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.3em] text-gray-500">{tp.athlete.badge}</span>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="flex items-center gap-4">
                <AvatarBadge
                  name={user?.name ?? session.user.name ?? tp.title}
                  image={user?.image}
                  sizeClassName="h-20 w-20"
                  textClassName="text-2xl"
                />
                <div>
                  <h2 className="text-2xl font-[family-name:var(--font-display)] font-semibold">{user?.name ?? session.user.name}</h2>
                  <p className="text-gray-400 text-sm">{tp.athlete.infoTitle}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm uppercase tracking-[0.3em] text-gray-500">{tp.athlete.labels.category}</p>
                <p className="text-xl font-semibold">{categoryLabel}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoItem label={tp.athlete.labels.age} value={age !== null ? `${age}` : "--"} />
            <InfoItem label={tp.athlete.labels.birth} value={birthLabel} />
            <InfoItem label={tp.athlete.labels.gender} value={genderLabel} />
            <InfoItem label={tp.athlete.labels.lastMeet} value={lastMeetLabel} />
            <InfoItem label={tp.athlete.labels.favoriteStroke} value={favoriteStrokeLabel} />
            <InfoItem label={tp.athlete.labels.favoriteDistance} value={favoriteDistanceLabel} />
          </div>

          <div className="border-t border-white/5 pt-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-4">{tp.athlete.statsTitle}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatItem label={tp.athlete.stats.races} value={stats.races} />
              <StatItem label={tp.athlete.stats.meets} value={stats.meets} />
              <StatItem label={tp.athlete.stats.pb} value={stats.pb} />
              <StatItem label={tp.athlete.stats.avgTechnical} value={stats.avgTechnical} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <span className="text-xs uppercase tracking-[0.3em] text-gray-500">{tp.coach.badge}</span>
          {coachName ? (
            <>
              <div>
                <h3 className="text-2xl font-[family-name:var(--font-display)] font-semibold">{coachName}</h3>
                <p className="text-gray-400 text-sm">{tp.coach.hasCoachTitle}</p>
              </div>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center justify-between">
                  <span>{tp.coach.clubLabel}</span>
                  <span className="font-medium text-white">{coachClub}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{tp.coach.athletesCount.replace("{count}", String(coachAthleteCount))}</span>
                </div>
                {coachSinceLabel ? <p>{coachSinceLabel}</p> : null}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-2">{tp.coach.teammateList}</p>
                {teammateNames.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {teammateNames.map((name) => (
                      <span key={name} className="px-3 py-1 rounded-full bg-white/5 text-sm">
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">{tp.coach.emptyTeammates}</p>
                )}
              </div>
              <Link href="/dashboard/settings" className="btn-primary inline-flex text-sm mt-2">
                {tp.coach.linkCoach}
              </Link>
            </>
          ) : (
            <div className="space-y-4">
              <h3 className="text-2xl font-[family-name:var(--font-display)] font-semibold">{tp.coach.noCoachTitle}</h3>
              <p className="text-gray-400 text-sm">{tp.coach.noCoachDescription}</p>
              <Link href="/dashboard/settings" className="btn-primary inline-flex text-sm">
                {tp.coach.linkCoach}
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{tp.highlights.subtitle}</p>
            <h3 className="text-xl font-[family-name:var(--font-display)] font-semibold">{tp.highlights.title}</h3>
          </div>
          {highlights.length === 0 ? (
            <p className="text-gray-500 text-sm">{tp.highlights.empty}</p>
          ) : (
            <ul className="space-y-4">
              {highlights.map((event) => (
                <li key={event.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">{event.label}</p>
                    <p className="text-gray-400 text-sm">{event.competition}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-[family-name:var(--font-display)] font-semibold">
                      {numberFormatter.format(event.score)}
                    </p>
                    <p className="text-sm text-gray-400">{event.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-card p-6 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{tp.timeline.subtitle}</p>
            <h3 className="text-xl font-[family-name:var(--font-display)] font-semibold">{tp.timeline.title}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-left">
                  <th className="py-2 pr-4">{tp.timeline.headers.date}</th>
                  <th className="py-2 pr-4">{tp.timeline.headers.competition}</th>
                  <th className="py-2 pr-4">{tp.timeline.headers.event}</th>
                  <th className="py-2 pr-4 text-right">{tp.timeline.headers.technical}</th>
                  <th className="py-2 pr-4 text-right">{tp.timeline.headers.position}</th>
                </tr>
              </thead>
              <tbody>
                {timelineRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">
                      {tp.timeline.empty}
                    </td>
                  </tr>
                ) : (
                  timelineRows.map((row) => (
                    <tr key={row.id} className="border-t border-white/5">
                      <td className="py-3 pr-4 whitespace-nowrap">{row.date}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{row.competition}</span>
                          <span className="text-xs text-gray-500">{row.course}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-col">
                          <span>{row.event}</span>
                          <span className="text-xs text-gray-500">{row.time}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {row.technical !== undefined ? `${numberFormatter.format(row.technical)} pts` : "--"}
                      </td>
                      <td className="py-3 pr-4 text-right">{row.position ?? "--"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

type InfoItemProps = {
  label: string;
  value: string;
};

function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{label}</p>
      <p className="text-base font-semibold text-white mt-1">{value}</p>
    </div>
  );
}

type StatItemProps = {
  label: string;
  value: string | number;
};

function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-2xl font-[family-name:var(--font-display)] font-semibold mt-1">{value}</p>
    </div>
  );
}













