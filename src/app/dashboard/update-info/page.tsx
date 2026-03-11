import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { translations, type Locale } from "@/i18n/translations";
import UpdateResultsClient from "@/components/dashboard/update/UpdateResultsClient";

export const dynamic = "force-dynamic";

const environmentLabelsByLocale = {
  en: { SEA: "Sea", RIVER: "River", LAKE: "Lake", LAGOON: "Lagoon", RESERVOIR: "Reservoir" },
  "pt-BR": { SEA: "Mar", RIVER: "Rio", LAKE: "Lago", LAGOON: "Lagoa", RESERVOIR: "Represa" },
  es: { SEA: "Mar", RIVER: "Rio", LAKE: "Lago", LAGOON: "Laguna", RESERVOIR: "Embalse" },
} as const;

const uiTextByLocale = {
  en: {
    eventType: "Type",
    eventTypePool: "Pool",
    eventTypeOpenWater: "Open water",
    environment: "Environment",
    venue: "Venue",
    notesLabel: "Notes",
    notesPlaceholder: "Optional context about the course or race.",
    relay: "Relay",
    category: "Category",
    recordBadge: "REC.",
    openWaterBadge: "Open water",
  },
  "pt-BR": {
    eventType: "Tipo",
    eventTypePool: "Piscina",
    eventTypeOpenWater: "Aguas abertas",
    environment: "Ambiente",
    venue: "Local",
    notesLabel: "Observacoes",
    notesPlaceholder: "Contexto opcional sobre o percurso ou a prova.",
    relay: "Revezamento",
    category: "Categoria",
    recordBadge: "REC.",
    openWaterBadge: "Aguas abertas",
  },
  es: {
    eventType: "Tipo",
    eventTypePool: "Piscina",
    eventTypeOpenWater: "Aguas abiertas",
    environment: "Ambiente",
    venue: "Lugar",
    notesLabel: "Notas",
    notesPlaceholder: "Contexto opcional sobre el recorrido o la prueba.",
    relay: "Relevo",
    category: "Categoria",
    recordBadge: "REC.",
    openWaterBadge: "Aguas abiertas",
  },
} as const;

export default async function UpdateInfoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/api/auth/signin?callbackUrl=/dashboard/update-info");

  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value ?? "pt-BR") as Locale;
  const t = translations[locale];
  const updateT = t.updatePage;

  const athleteProfile = await db.athleteProfile.findUnique({
    where: { userId: session.user.id },
    include: { results: { orderBy: { date: "desc" } } },
  });

  const serialized = (athleteProfile?.results ?? []).map((result) => ({
    id: result.id,
    competitionName: result.competitionName,
    date: result.date.toISOString(),
    distance: result.distance,
    eventType: result.eventType,
    stroke: result.stroke,
    course: result.course,
    timeString: result.timeString,
    position: result.position,
    recordTag: result.recordTag,
    category: result.category,
    isRelay: result.isRelay,
    openWaterEnvironment: result.openWaterEnvironment,
    venueName: result.venueName,
    notes: result.notes,
  }));

  const strokeOptions = Object.entries(t.strokes).map(([value, label]) => ({ value, label }));
  const courseOptions = Object.entries(t.courses).map(([value, label]) => ({ value, label }));
  const environmentOptions = Object.entries(environmentLabelsByLocale[locale]).map(([value, label]) => ({ value, label }));
  const eventTypeOptions = [
    { value: "POOL", label: uiTextByLocale[locale].eventTypePool },
    { value: "OPEN_WATER", label: uiTextByLocale[locale].eventTypeOpenWater },
  ];

  return (
    <div className="p-8 lg:p-12 w-full max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col gap-4">
        <p className="text-sm uppercase tracking-[0.2em] text-[#00F0FF] font-semibold">{t.dashboard.nav.updateInfo}</p>
        <h1 className="text-4xl font-[family-name:var(--font-display)] font-bold">{updateT.title}</h1>
        <p className="text-gray-400 max-w-3xl">{updateT.subtitle}</p>
      </header>

      <UpdateResultsClient
        initialResults={serialized}
        translations={updateT}
        strokeOptions={strokeOptions}
        courseOptions={courseOptions}
        environmentOptions={environmentOptions}
        eventTypeOptions={eventTypeOptions}
        uiText={uiTextByLocale[locale]}
      />
    </div>
  );
}
