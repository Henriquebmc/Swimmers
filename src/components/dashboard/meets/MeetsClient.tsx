"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Waves } from "lucide-react";
import { getWorldRecordMs } from "@/lib/worldRecords";
import PerformanceChartClient, { type ChartPoint } from "@/components/dashboard/PerformanceChartClient";
import { type Locale, type Translations } from "@/i18n/translations";

const StrokeDistributionChart = dynamic(
  () => import("./StrokeDistributionChart").then((m) => m.StrokeDistributionChart),
  { ssr: false }
);

const StrokeRadarChart = dynamic(
  () => import("./StrokeRadarChart").then((m) => m.StrokeRadarChart),
  { ssr: false }
);

type MeetsStrings = Translations["meetsPage"];
type EventType = "POOL" | "OPEN_WATER";
type OpenWaterEnvironment = "SEA" | "RIVER" | "LAKE" | "LAGOON" | "RESERVOIR";
type RaceType = "ALL" | "INDIVIDUAL" | "RELAY";
type ChartMetric = "time" | "technical" | "both";
type RadarMetric = "technical" | "time" | "both";

type ResultEntry = {
  id: string;
  competitionName: string;
  date: string;
  distance: number;
  eventType: EventType;
  stroke: string | null;
  course: string | null;
  category?: string | null;
  timeMs: number;
  timeString: string;
  position: number | null;
  isPersonalBest: boolean;
  isRelay: boolean;
  openWaterEnvironment: OpenWaterEnvironment | null;
  venueName: string | null;
  notes: string | null;
};

type StrokeRadarDatum = {
  stroke: string;
  label: string;
  timeValue?: number;
  technicalValue?: number;
  timeScore?: number;
  technicalScore?: number;
};

const ALL = "ALL";
const ALL_ENVIRONMENT = "ALL_ENVIRONMENT";
const ALL_EVENT_TYPE = "ALL_EVENT_TYPE";

const initialFilters = {
  competition: ALL,
  distance: ALL,
  stroke: ALL,
  course: ALL,
  category: ALL,
  position: ALL,
  from: "",
  to: "",
  raceType: "ALL" as RaceType,
  eventType: ALL_EVENT_TYPE,
  environment: ALL_ENVIRONMENT,
};

type FiltersState = typeof initialFilters;
type FilterKey = keyof FiltersState;

const uniqueStrings = (values: string[]) => Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
const uniqueNumbers = (values: number[]) => Array.from(new Set(values)).sort((a, b) => a - b);
const eventKey = (result: Pick<ResultEntry, "distance" | "stroke" | "course">) => `${result.distance}-${result.stroke}-${result.course}`;
const formatMeetDate = (value: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
const formatTableDate = (value: string) => {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};
const formatCourseShort = (course: string | null) => {
  if (course === "LONG_COURSE") return "50m";
  if (course === "SHORT_COURSE") return "25m";
  return "--";
};

export default function MeetsClient({
  locale,
  results,
  translations,
  strokeLabels,
  courseLabels,
  environmentLabels,
  eventTypeLabels,
  athleteGender,
}: {
  locale: Locale;
  results: ResultEntry[];
  translations: MeetsStrings;
  strokeLabels: Record<string, string>;
  courseLabels: Record<string, string>;
  environmentLabels: Record<OpenWaterEnvironment, string>;
  eventTypeLabels: Record<"ALL" | EventType, string>;
  athleteGender?: string | null;
}) {
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [rawSelectedEvent, setRawSelectedEvent] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<ChartMetric>("time");
  const [radarMetric, setRadarMetric] = useState<RadarMetric>("technical");

  const uiText = useMemo(() => {
    if (locale === "en") {
      return {
        eventType: "Type",
        environment: "Environment",
        details: "Details",
        poolOnlyEmpty: "Pool analytics are shown only for pool races.",
        openWaterTag: "Open water",
      };
    }
    if (locale === "es") {
      return {
        eventType: "Tipo",
        environment: "Ambiente",
        details: "Detalles",
        poolOnlyEmpty: "Los graficos actuales solo consideran pruebas de piscina.",
        openWaterTag: "Aguas abiertas",
      };
    }
    return {
      eventType: "Tipo",
      environment: "Ambiente",
      details: "Detalhes",
      poolOnlyEmpty: "Os graficos atuais consideram apenas provas de piscina.",
      openWaterTag: "Aguas abertas",
    };
  }, [locale]);

  const matchesFilter = (result: ResultEntry, criteria: FiltersState) => {
    if (criteria.eventType !== ALL_EVENT_TYPE && result.eventType !== criteria.eventType) return false;
    if (criteria.environment !== ALL_ENVIRONMENT && result.openWaterEnvironment !== criteria.environment) return false;
    if (criteria.competition !== ALL && result.competitionName !== criteria.competition) return false;
    if (criteria.distance !== ALL && result.distance !== Number(criteria.distance)) return false;
    if (criteria.stroke !== ALL && result.stroke !== criteria.stroke) return false;
    if (criteria.course !== ALL && result.course !== criteria.course) return false;
    if (criteria.category !== ALL && (result.category ?? "") !== criteria.category) return false;
    if (criteria.position !== ALL && result.position !== Number(criteria.position)) return false;
    if (criteria.raceType === "INDIVIDUAL" && result.isRelay) return false;
    if (criteria.raceType === "RELAY" && !result.isRelay) return false;
    const fromTime = criteria.from ? new Date(criteria.from).getTime() : null;
    const toTime = criteria.to ? new Date(criteria.to).getTime() : null;
    const raceTime = new Date(result.date).getTime();
    if (fromTime && raceTime < fromTime) return false;
    if (toTime && raceTime > toTime) return false;
    return true;
  };

  const filteredResults = useMemo(() => results.filter((result) => matchesFilter(result, filters)), [results, filters]);
  const filteredPoolResults = useMemo(() => filteredResults.filter((result) => result.eventType === "POOL" && result.stroke && result.course), [filteredResults]);

  const competitionOptions = useMemo(() => uniqueStrings(filteredResults.map((result) => result.competitionName)), [filteredResults]);
  const strokeOptions = useMemo(() => uniqueStrings(filteredPoolResults.map((result) => result.stroke!).filter(Boolean)), [filteredPoolResults]);
  const distanceOptions = useMemo(() => uniqueNumbers(filteredResults.map((result) => result.distance)), [filteredResults]);
  const courseOptions = useMemo(() => uniqueStrings(filteredPoolResults.map((result) => result.course!).filter(Boolean)), [filteredPoolResults]);
  const categoryOptions = useMemo(() => uniqueStrings(filteredResults.map((result) => result.category).filter((value): value is string => Boolean(value && value.trim()))), [filteredResults]);
  const positionOptions = useMemo(() => uniqueNumbers(filteredResults.map((result) => result.position).filter((value): value is number => value !== null && value !== undefined)), [filteredResults]);
  const environmentOptions = useMemo(() => uniqueStrings(filteredResults.map((result) => result.openWaterEnvironment).filter((value): value is OpenWaterEnvironment => Boolean(value))), [filteredResults]);

  const handleFilterChange = (field: FilterKey, value: string) => {
    setRawSelectedEvent(null);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    setRawSelectedEvent(null);
  };

  const bestTimesByEvent = useMemo(() => {
    const map = new Map<string, number>();
    filteredPoolResults.forEach((result) => {
      const key = eventKey(result as Required<Pick<ResultEntry, "distance" | "stroke" | "course">>);
      const currentBest = map.get(key);
      if (currentBest === undefined || result.timeMs < currentBest) map.set(key, result.timeMs);
    });
    return map;
  }, [filteredPoolResults]);

  const personalBestIds = useMemo(() => {
    const pb = new Set<string>();
    filteredPoolResults.forEach((result) => {
      const key = eventKey(result as Required<Pick<ResultEntry, "distance" | "stroke" | "course">>);
      if (bestTimesByEvent.get(key) === result.timeMs) pb.add(result.id);
    });
    return pb;
  }, [filteredPoolResults, bestTimesByEvent]);

  const technicalIndexByResultId = useMemo(() => {
    const map = new Map<string, number>();
    filteredPoolResults.forEach((result) => {
      if (!result.stroke || !result.course) return;
      const baseline = getWorldRecordMs(result.distance, result.stroke, result.course, athleteGender);
      if (!baseline) return;
      map.set(result.id, Number(((result.timeMs / baseline) * 100).toFixed(2)));
    });
    return map;
  }, [filteredPoolResults, athleteGender]);

  const technicalPersonalBestIds = useMemo(() => {
    const bestByEvent = new Map<string, number>();
    filteredPoolResults.forEach((result) => {
      const score = technicalIndexByResultId.get(result.id);
      if (score === undefined || !result.stroke || !result.course) return;
      const key = eventKey(result as Required<Pick<ResultEntry, "distance" | "stroke" | "course">>);
      const currentBest = bestByEvent.get(key);
      if (currentBest === undefined || score < currentBest) bestByEvent.set(key, score);
    });

    const pb = new Set<string>();
    filteredPoolResults.forEach((result) => {
      const score = technicalIndexByResultId.get(result.id);
      if (score === undefined || !result.stroke || !result.course) return;
      const key = eventKey(result as Required<Pick<ResultEntry, "distance" | "stroke" | "course">>);
      if (bestByEvent.get(key) === score) pb.add(result.id);
    });
    return pb;
  }, [filteredPoolResults, technicalIndexByResultId]);

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [locale]);
  const formatTechnicalValue = useCallback((value: number) => numberFormatter.format(value), [numberFormatter]);
  const formatTimeValue = useCallback((value: number) => `${numberFormatter.format(value)}s`, [numberFormatter]);

  const stats = useMemo(() => {
    const meets = new Set(filteredResults.map((result) => result.competitionName));
    return {
      totalRaces: filteredResults.length,
      totalMeets: meets.size,
      pbCount: filteredPoolResults.filter((result) => personalBestIds.has(result.id)).length,
    };
  }, [filteredResults, filteredPoolResults, personalBestIds]);

  const eventOptions = useMemo(() => {
    const map = new Map<string, string>();
    filteredPoolResults.forEach((result) => {
      if (!result.stroke || !result.course) return;
      const key = eventKey(result as Required<Pick<ResultEntry, "distance" | "stroke" | "course">>);
      if (!map.has(key)) map.set(key, `${result.distance}m ${strokeLabels[result.stroke] ?? result.stroke}`);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [filteredPoolResults, strokeLabels]);

  const selectedEvent = useMemo(() => {
    if (eventOptions.length === 0) return "";
    if (rawSelectedEvent && eventOptions.some((option) => option.value === rawSelectedEvent)) return rawSelectedEvent;
    return eventOptions[0].value;
  }, [eventOptions, rawSelectedEvent]);

  const progressionData: ChartPoint[] = useMemo(() => {
    if (!selectedEvent) return [];
    return filteredPoolResults
      .filter((result) => result.stroke && result.course && eventKey(result as Required<Pick<ResultEntry, "distance" | "stroke" | "course">>) === selectedEvent)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((result) => {
        const eventDate = new Date(result.date);
        const meetLabel = `${formatMeetDate(result.date, locale)} · ${result.competitionName}`;
        const axisLabel = Number.isNaN(eventDate.getTime()) ? "--" : String(eventDate.getFullYear());
        const technicalScore = technicalIndexByResultId.get(result.id);
        if (chartMetric === "technical") {
          if (technicalScore === undefined) return null;
          return { meet: meetLabel, axisLabel, value: technicalScore, tooltip: formatTechnicalValue(technicalScore) };
        }
        const point: ChartPoint = { meet: meetLabel, axisLabel, value: result.timeMs / 1000, tooltip: result.timeString };
        if (chartMetric === "both" && technicalScore !== undefined) {
          point.secondaryValue = technicalScore;
          point.secondaryTooltip = formatTechnicalValue(technicalScore);
        }
        return point;
      })
      .filter((entry): entry is ChartPoint => entry !== null);
  }, [selectedEvent, filteredPoolResults, locale, technicalIndexByResultId, chartMetric, formatTechnicalValue]);

  const strokeDistribution = useMemo(() => {
    const grouped = new Map<string, { count: number; best: number }>();
    filteredPoolResults.forEach((result) => {
      if (!result.stroke) return;
      const entry = grouped.get(result.stroke) ?? { count: 0, best: result.timeMs };
      entry.count += 1;
      entry.best = Math.min(entry.best, result.timeMs);
      grouped.set(result.stroke, entry);
    });
    return Array.from(grouped.entries()).map(([stroke, info]) => ({ stroke, label: strokeLabels[stroke] ?? stroke, count: info.count, best: info.best }));
  }, [filteredPoolResults, strokeLabels]);

  const courseSummary = useMemo(() => {
    const total = filteredPoolResults.length || 1;
    const courseOrder = ["LONG_COURSE", "SHORT_COURSE"] as const;
    return courseOrder.map((course) => {
      const count = filteredPoolResults.filter((result) => result.course === course).length;
      const percent = filteredPoolResults.length === 0 ? 0 : Math.round((count / total) * 100);
      return { course, label: formatCourseShort(course), count, percent };
    });
  }, [filteredPoolResults]);

  const strokeRadarData = useMemo(() => {
    const strokeOrder = ["FREESTYLE", "BACKSTROKE", "BREASTSTROKE", "BUTTERFLY", "MEDLEY"] as const;
    const rawData: StrokeRadarDatum[] = [];
    for (const stroke of strokeOrder) {
      const strokeResults = filteredPoolResults.filter((result) => result.stroke === stroke);
      if (strokeResults.length === 0) continue;
      const timeValue = Number((strokeResults.reduce((sum, result) => sum + result.timeMs / 1000, 0) / strokeResults.length).toFixed(2));
      const technicalValues = strokeResults.map((result) => technicalIndexByResultId.get(result.id)).filter((value): value is number => value !== undefined);
      const technicalValue = technicalValues.length > 0 ? Number((technicalValues.reduce((sum, value) => sum + value, 0) / technicalValues.length).toFixed(2)) : undefined;
      rawData.push({ stroke, label: strokeLabels[stroke] ?? stroke, timeValue, technicalValue });
    }
    const bestTime = rawData.length > 0 ? Math.min(...rawData.map((entry) => entry.timeValue ?? Number.POSITIVE_INFINITY)) : null;
    const bestTechnicalCandidates = rawData.map((entry) => entry.technicalValue).filter((value): value is number => value !== undefined);
    const bestTechnical = bestTechnicalCandidates.length > 0 ? Math.min(...bestTechnicalCandidates) : null;

    return rawData
      .map((entry) => ({
        ...entry,
        timeScore: bestTime && entry.timeValue ? Number(((bestTime / entry.timeValue) * 100).toFixed(2)) : undefined,
        technicalScore: bestTechnical && entry.technicalValue ? Number(((bestTechnical / entry.technicalValue) * 100).toFixed(2)) : undefined,
      }))
      .filter((entry) => {
        if (radarMetric === "time") return entry.timeScore !== undefined;
        if (radarMetric === "technical") return entry.technicalScore !== undefined;
        return entry.timeScore !== undefined || entry.technicalScore !== undefined;
      });
  }, [filteredPoolResults, strokeLabels, technicalIndexByResultId, radarMetric]);

  const raceTypeOptions: { value: RaceType; label: string }[] = [
    { value: "ALL", label: translations.filters.raceTypeAll },
    { value: "INDIVIDUAL", label: translations.filters.raceTypeIndividual },
    { value: "RELAY", label: translations.filters.raceTypeRelay },
  ];
  const chartMetricOptions: { value: ChartMetric; label: string }[] = [
    { value: "time", label: translations.charts.metricTime },
    { value: "technical", label: translations.charts.metricTechnical },
    { value: "both", label: translations.charts.metricBoth },
  ];
  const radarMetricOptions: { value: RadarMetric; label: string }[] = [
    { value: "technical", label: translations.charts.metricTechnical },
    { value: "time", label: translations.charts.metricTime },
    { value: "both", label: translations.charts.metricBoth },
  ];

  const allLabel = locale === "en" ? "All" : "Todas";
  const allMasculineLabel = locale === "en" ? "All" : "Todos";
  const primaryIsTime = chartMetric !== "technical";
  const chartPrimaryColor = primaryIsTime ? "#00F0FF" : "#FF6B9A";
  const overlayConfig = chartMetric === "both"
    ? { label: translations.charts.metricTechnical, reverseYAxis: true, yAxisFormatter: formatTechnicalValue, color: "#FF6B9A" }
    : undefined;

  return (
    <div className="space-y-8">
      <section className="glass-card p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="text-xs uppercase tracking-[0.3em] text-gray-500">{translations.filters.raceType}</span>
        </div>
        <div className="flex bg-[#050b19] border border-[#00F0FF]/20 rounded-full p-1 w-full md:w-auto overflow-x-auto">
          {raceTypeOptions.map((option) => (
            <button key={option.value} type="button" onClick={() => handleFilterChange("raceType", option.value)} className={filters.raceType === option.value ? "px-4 py-1.5 rounded-full text-xs font-semibold bg-[#00F0FF] text-[#020817]" : "px-4 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white"}>{option.label}</button>
          ))}
        </div>
      </section>

      <section className="glass-card p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={translations.stats.totalRaces} value={stats.totalRaces} />
          <StatCard label={translations.stats.totalMeets} value={stats.totalMeets} />
          <StatCard label={translations.stats.pbCount} value={stats.pbCount} accent />
          <CourseSummaryCard label={translations.filters.course} data={courseSummary} emptyLabel={uiText.poolOnlyEmpty} />
        </div>
      </section>

      <section className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h3 className="text-xl font-[family-name:var(--font-display)] font-semibold">{translations.filters.heading}</h3>
          <button type="button" onClick={clearFilters} className="text-xs uppercase tracking-[0.3em] text-[#00F0FF] hover:text-white transition-colors">{translations.filters.clear}</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SelectInput label={translations.filters.competition} value={filters.competition} onChange={(value) => handleFilterChange("competition", value)} options={[{ value: ALL, label: allLabel }, ...competitionOptions.map((value) => ({ value, label: value }))]} />
          <SelectInput label={uiText.eventType} value={filters.eventType} onChange={(value) => handleFilterChange("eventType", value)} options={[{ value: ALL_EVENT_TYPE, label: eventTypeLabels.ALL }, { value: "POOL", label: eventTypeLabels.POOL }, { value: "OPEN_WATER", label: eventTypeLabels.OPEN_WATER }]} />
          <SelectInput label={translations.filters.distance} value={filters.distance} onChange={(value) => handleFilterChange("distance", value)} options={[{ value: ALL, label: allLabel }, ...distanceOptions.map((value) => ({ value: String(value), label: `${value}m` }))]} />
          <SelectInput label={uiText.environment} value={filters.environment} onChange={(value) => handleFilterChange("environment", value)} options={[{ value: ALL_ENVIRONMENT, label: allLabel }, ...environmentOptions.map((value) => ({ value, label: environmentLabels[value as OpenWaterEnvironment] ?? value }))]} />
          <SelectInput label={translations.filters.stroke} value={filters.stroke} onChange={(value) => handleFilterChange("stroke", value)} options={[{ value: ALL, label: allMasculineLabel }, ...strokeOptions.map((value) => ({ value, label: strokeLabels[value] ?? value }))]} />
          <SelectInput label={translations.filters.course} value={filters.course} onChange={(value) => handleFilterChange("course", value)} options={[{ value: ALL, label: allLabel }, ...courseOptions.map((value) => ({ value, label: courseLabels[value] ?? value }))]} />
          <SelectInput label={translations.filters.category} value={filters.category} onChange={(value) => handleFilterChange("category", value)} options={[{ value: ALL, label: allLabel }, ...categoryOptions.map((value) => ({ value, label: value }))]} />
          <SelectInput label={translations.filters.position} value={filters.position} onChange={(value) => handleFilterChange("position", value)} options={[{ value: ALL, label: allLabel }, ...positionOptions.map((value) => ({ value: String(value), label: `${value}º` }))]} />
          <DateInput label={translations.filters.from} value={filters.from} onChange={(value) => handleFilterChange("from", value)} />
          <DateInput label={translations.filters.to} value={filters.to} onChange={(value) => handleFilterChange("to", value)} />
        </div>
      </section>

      <section className="glass-card p-6 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-xl font-[family-name:var(--font-display)] font-semibold">{translations.charts.progressionTitle}</h3>
              <p className="text-sm text-gray-400">{translations.charts.progressionSubtitle}</p>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <span className="text-xs uppercase tracking-[0.3em] text-gray-500">{translations.charts.metricToggle}</span>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-[#050b19] border border-[#00F0FF]/20 rounded-full p-1">
                  {chartMetricOptions.map((option) => (
                    <button key={option.value} type="button" onClick={() => setChartMetric(option.value)} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${chartMetric === option.value ? "bg-[#00F0FF] text-[#020817]" : "text-slate-300 hover:text-white"}`}>{option.label}</button>
                  ))}
                </div>
                <select value={selectedEvent} onChange={(event) => setRawSelectedEvent(event.target.value)} className="select-field bg-[#050b19] border border-[#00F0FF]/30 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#00F0FF] focus:ring-2 focus:ring-[#00F0FF]/40 transition-colors">
                  {eventOptions.length === 0 ? <option value="">{translations.charts.eventPlaceholder}</option> : null}
                  {eventOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </div>
          </div>
          {progressionData.length > 0 ? (
            <PerformanceChartClient data={progressionData} primaryLabel={chartMetric === "technical" ? translations.charts.metricTechnical : translations.charts.metricTime} primaryColor={chartPrimaryColor} reverseYAxis={true} yAxisFormatter={primaryIsTime ? (value: number) => `${value.toFixed(1)}s` : formatTechnicalValue} overlay={overlayConfig} />
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500 text-sm">{uiText.poolOnlyEmpty}</div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-[family-name:var(--font-display)] font-semibold mb-2">{translations.charts.strokeTitle}</h4>
            <p className="text-sm text-gray-400 mb-4">{translations.charts.strokeSubtitle}</p>
            {strokeDistribution.length > 0 ? (
              <StrokeDistributionChart data={strokeDistribution.map((item) => ({ stroke: item.stroke, label: item.label, count: item.count, best: `${(item.best / 1000).toFixed(2)}s` }))} onSelectStroke={(strokeKey) => handleFilterChange("stroke", filters.stroke === strokeKey ? ALL : strokeKey)} activeStroke={filters.stroke !== ALL ? filters.stroke : null} />
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-500 text-sm">{uiText.poolOnlyEmpty}</div>
            )}
          </div>
          <div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h4 className="text-lg font-[family-name:var(--font-display)] font-semibold mb-2">{translations.charts.radarTitle}</h4>
                <p className="text-sm text-gray-400">{translations.charts.radarSubtitle}</p>
              </div>
              <div className="flex bg-[#050b19] border border-[#00F0FF]/20 rounded-full p-1">
                {radarMetricOptions.map((option) => (
                  <button key={option.value} type="button" onClick={() => setRadarMetric(option.value)} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${radarMetric === option.value ? "bg-[#00F0FF] text-[#020817]" : "text-slate-300 hover:text-white"}`}>{option.label}</button>
                ))}
              </div>
            </div>
            {strokeRadarData.length > 0 ? (
              <StrokeRadarChart data={strokeRadarData} mode={radarMetric} timeFormatter={formatTimeValue} technicalFormatter={formatTechnicalValue} />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500 text-sm">{uiText.poolOnlyEmpty}</div>
            )}
          </div>
        </div>
      </section>

      <section className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-[family-name:var(--font-display)] font-semibold">{translations.table.title}</h3>
          <span className="text-sm text-gray-400">{filteredResults.length} {translations.stats.totalRaces.toLowerCase()}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-white/5">
                <th className="py-3 pr-4">{translations.table.headers.date}</th>
                <th className="py-3 pr-4">{translations.table.headers.competition}</th>
                <th className="py-3 pr-4">{uiText.eventType}</th>
                <th className="py-3 pr-4">{uiText.details}</th>
                <th className="py-3 pr-4">{translations.table.headers.time}</th>
                <th className="py-3 pr-4 text-right">{translations.table.headers.technicalIndex}</th>
                <th className="py-3 pr-4 text-right">{translations.table.headers.position}</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.length === 0 ? (
                <tr><td colSpan={7} className="py-6 text-center text-gray-500">{translations.table.empty}</td></tr>
              ) : (
                filteredResults.map((result) => {
                  const isOpenWater = result.eventType === "OPEN_WATER";
                  const technicalScore = technicalIndexByResultId.get(result.id);
                  const environmentLabel = result.openWaterEnvironment ? environmentLabels[result.openWaterEnvironment] : "--";
                  const details = isOpenWater ? `${result.distance}m · ${environmentLabel}` : `${result.distance}m ${strokeLabels[result.stroke ?? ""] ?? result.stroke ?? "--"}`;

                  return (
                    <tr key={result.id} className="border-b border-white/5 last:border-0">
                      <td className="py-3 pr-4 whitespace-nowrap">{formatTableDate(result.date)}</td>
                      <td className="py-3 pr-4">{result.competitionName}</td>
                      <td className="py-3 pr-4">
                        {isOpenWater ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100"><Waves size={12} />{uiText.openWaterTag}</span>
                        ) : (
                          <span className="text-slate-300">{eventTypeLabels.POOL}</span>
                        )}
                      </td>
                      <td className="py-3 pr-4"><div className="flex flex-col"><span>{details}</span><span className="text-xs text-gray-500">{isOpenWater ? (result.venueName || "--") : formatCourseShort(result.course)}</span></div></td>
                      <td className="py-3 pr-4"><div className="flex items-center gap-2"><span>{result.timeString}</span>{!isOpenWater && personalBestIds.has(result.id) ? <span className="text-xs px-2 py-0.5 rounded-full bg-[#00F0FF]/10 text-[#00F0FF]">{translations.table.pbTag}</span> : null}</div></td>
                      <td className="py-3 pr-4 text-right">{!isOpenWater && technicalScore !== undefined ? <div className="flex items-center justify-end gap-2"><span>{formatTechnicalValue(technicalScore)}</span>{technicalPersonalBestIds.has(result.id) ? <span className="text-xs px-2 py-0.5 rounded-full bg-[#00F0FF]/10 text-[#00F0FF]">{translations.table.pbTag}</span> : null}</div> : "--"}</td>
                      <td className="py-3 pr-4 text-right">{result.position ?? "--"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

type SelectOption = { value: string; label: string };
type SelectInputProps = { label: string; value: string; onChange: (value: string) => void; options: SelectOption[]; };

function SelectInput({ label, value, onChange, options }: SelectInputProps) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="text-gray-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="select-field bg-[#050b19] border border-[#00F0FF]/30 rounded-lg px-3 py-2 text-[#E4FBFF] focus:outline-none focus:border-[#00F0FF] focus:ring-2 focus:ring-[#00F0FF]/40 transition-colors">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

type DateInputProps = { label: string; value: string; onChange: (value: string) => void; };

function DateInput({ label, value, onChange }: DateInputProps) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="text-gray-400">{label}</span>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="date-field bg-[#050b19] border border-[#00F0FF]/30 rounded-lg px-3 py-2 text-[#E4FBFF] focus:outline-none focus:border-[#00F0FF] focus:ring-2 focus:ring-[#00F0FF]/40 transition-colors" />
    </label>
  );
}

type StatCardProps = { label: string; value: number; accent?: boolean; };

function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <div className={`p-4 rounded-xl border ${accent ? "border-[#00F0FF] bg-[#00F0FF]/10" : "border-white/5 bg-white/5"}`}>
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-3xl font-[family-name:var(--font-display)] font-semibold mt-2">{value}</p>
    </div>
  );
}

type CourseSummaryCardProps = { label: string; data: { course: string; label: string; count: number; percent: number }[]; emptyLabel: string; };

function CourseSummaryCard({ label, data, emptyLabel }: CourseSummaryCardProps) {
  const hasEntries = data.some((entry) => entry.count > 0);
  return (
    <div className="p-4 rounded-xl border border-white/5 bg-white/5">
      <p className="text-sm text-gray-400">{label}</p>
      {hasEntries ? (
        <div className="mt-4 space-y-2">
          {data.map((entry) => (
            <div key={entry.course} className="flex items-center justify-between text-sm text-gray-300">
              <span>{entry.label}</span>
              <span className="font-semibold text-white">{entry.count} · {entry.percent}%</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 mt-4">{emptyLabel}</p>
      )}
    </div>
  );
}
