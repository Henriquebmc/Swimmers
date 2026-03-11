export type RaceResultFingerprintInput = {
  competitionName: string;
  date: Date | string;
  distance: number;
  timeMs: number;
  eventType?: string | null;
  stroke?: string | null;
  course?: string | null;
  openWaterEnvironment?: string | null;
  venueName?: string | null;
};

type DedupeCandidate = RaceResultFingerprintInput & {
  position?: number | null;
  category?: string | null;
  isRelay?: boolean | null;
};

const normalizeDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
};

const normalizeOptional = (value?: string | null) => value?.trim().toLowerCase() ?? "";

export const buildRaceResultFingerprint = ({
  competitionName,
  date,
  distance,
  timeMs,
  eventType,
  stroke,
  course,
  openWaterEnvironment,
  venueName,
}: RaceResultFingerprintInput) => [
  competitionName.trim().toLowerCase(),
  normalizeDate(date),
  distance,
  normalizeOptional(eventType) || "pool",
  normalizeOptional(stroke),
  normalizeOptional(course),
  normalizeOptional(openWaterEnvironment),
  normalizeOptional(venueName),
  timeMs,
].join("|");

const scoreCandidate = (candidate: DedupeCandidate) => {
  let score = 0;
  if (candidate.isRelay) score += 2;
  if (candidate.category && candidate.category.trim().length > 0) score += 2;
  if (candidate.position !== null && candidate.position !== undefined) score += 1;
  return score;
};

export const dedupeRaceResults = <T extends DedupeCandidate>(results: T[]) => {
  const byFingerprint = new Map<string, T>();

  for (const result of results) {
    const fingerprint = buildRaceResultFingerprint(result);
    const existing = byFingerprint.get(fingerprint);

    if (!existing || scoreCandidate(result) > scoreCandidate(existing)) {
      byFingerprint.set(fingerprint, result);
    }
  }

  return Array.from(byFingerprint.values());
};
