import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { translations, type Locale } from "@/i18n/translations";
import { dedupeRaceResults } from "@/lib/race-results";
import UploadButton from "@/components/dashboard/UploadButton";
import MeetsClient from "@/components/dashboard/meets/MeetsClient";

export const dynamic = "force-dynamic";

function getDerivedCategory({
  storedCategory,
  isRelay,
  resultDate,
  birthDate,
}: {
  storedCategory?: string | null;
  isRelay: boolean;
  resultDate: Date;
  birthDate?: Date | null;
}) {
  const normalizedStored = storedCategory?.trim();
  if (normalizedStored) return normalizedStored;
  if (isRelay || !birthDate || Number.isNaN(resultDate.getTime())) return null;

  let age = resultDate.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    resultDate.getMonth() > birthDate.getMonth() ||
    (resultDate.getMonth() === birthDate.getMonth() && resultDate.getDate() >= birthDate.getDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  if (age < 25) return null;
  const bracket = 25 + Math.floor((age - 25) / 5) * 5;
  return `${bracket}+`;
}

const environmentLabelsByLocale = {
  en: {
    SEA: "Sea",
    RIVER: "River",
    LAKE: "Lake",
    LAGOON: "Lagoon",
    RESERVOIR: "Reservoir",
  },
  "pt-BR": {
    SEA: "Mar",
    RIVER: "Rio",
    LAKE: "Lago",
    LAGOON: "Lagoa",
    RESERVOIR: "Represa",
  },
  es: {
    SEA: "Mar",
    RIVER: "Rio",
    LAKE: "Lago",
    LAGOON: "Laguna",
    RESERVOIR: "Embalse",
  },
} as const;

const eventTypeLabelsByLocale = {
  en: { ALL: "All events", POOL: "Pool", OPEN_WATER: "Open water" },
  "pt-BR": { ALL: "Todos os tipos", POOL: "Piscina", OPEN_WATER: "Aguas abertas" },
  es: { ALL: "Todos los tipos", POOL: "Piscina", OPEN_WATER: "Aguas abiertas" },
} as const;

export default async function MeetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin?callbackUrl=/dashboard/meets");

  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value ?? "pt-BR") as Locale;
  const t = translations[locale];
  const meetsT = t.meetsPage;

  const athleteProfile = await db.athleteProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      results: { orderBy: { date: "desc" } },
      user: { select: { gender: true, birthDate: true } },
    },
  });

  const results = dedupeRaceResults(athleteProfile?.results ?? []);
  const serialized = results.map((result) => {
    const relayFlag = Boolean((result as { isRelay?: boolean | null }).isRelay);
    const resultDate = new Date(result.date);
    const category = getDerivedCategory({
      storedCategory: result.category,
      isRelay: relayFlag,
      resultDate,
      birthDate: athleteProfile?.user?.birthDate ?? null,
    });
    return {
      id: result.id,
      competitionName: result.competitionName,
      date: result.date.toISOString(),
      distance: result.distance,
      eventType: result.eventType,
      stroke: result.stroke,
      course: result.course,
      category,
      timeMs: result.timeMs,
      timeString: result.timeString,
      position: result.position,
      isPersonalBest: result.isPersonalBest,
      isRelay: relayFlag,
      openWaterEnvironment: result.openWaterEnvironment,
      venueName: result.venueName,
      notes: result.notes,
    };
  });

  return (
    <div className="p-8 lg:p-12 w-full max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-[#00F0FF] font-semibold">
            {t.dashboard.nav.meets}
          </p>
          <h1 className="text-4xl font-[family-name:var(--font-display)] font-bold mt-2">
            {meetsT.title}
          </h1>
          <p className="text-gray-400 mt-2 max-w-3xl">{meetsT.subtitle}</p>
        </div>
      </header>

      {serialized.length === 0 ? (
        <div className="glass-card p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h3 className="text-2xl font-[family-name:var(--font-display)] font-semibold">
              {meetsT.emptyState.title}
            </h3>
            <p className="text-gray-400 mt-2 max-w-xl">{meetsT.emptyState.description}</p>
          </div>
          <UploadButton label={meetsT.emptyState.cta} />
        </div>
      ) : (
        <MeetsClient
          locale={locale}
          results={serialized}
          translations={meetsT}
          strokeLabels={t.strokes}
          courseLabels={t.courses}
          environmentLabels={environmentLabelsByLocale[locale]}
          eventTypeLabels={eventTypeLabelsByLocale[locale]}
          athleteGender={athleteProfile?.user?.gender ?? null}
        />
      )}
    </div>
  );
}
