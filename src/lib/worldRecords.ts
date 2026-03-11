type CourseKey = "LONG_COURSE" | "SHORT_COURSE";
type StrokeKey = "FREESTYLE" | "BACKSTROKE" | "BREASTSTROKE" | "BUTTERFLY" | "MEDLEY";
type GenderBucket = "male" | "female";

type RecordEntry = Record<GenderBucket, number>;
type StrokeRecords = Record<number, RecordEntry>;

type CourseRecords = Record<CourseKey, Record<StrokeKey, StrokeRecords>>;

const toMs = (minutes: number, seconds: number) => Math.round((minutes * 60 + seconds) * 1000);

const FREESTYLE_LONG: StrokeRecords = {
  50: { male: toMs(0, 20.91), female: toMs(0, 23.61) },
  100: { male: toMs(0, 46.8), female: toMs(0, 51.71) },
  200: { male: toMs(1, 42.0), female: toMs(1, 52.85) },
  400: { male: toMs(3, 40.07), female: toMs(3, 55.38) },
  800: { male: toMs(7, 32.12), female: toMs(8, 4.79) },
  1500: { male: toMs(14, 31.02), female: toMs(15, 20.48) },
};

const FREESTYLE_SHORT: StrokeRecords = {
  50: { male: toMs(0, 20.16), female: toMs(0, 22.93) },
  100: { male: toMs(0, 44.84), female: toMs(0, 49.59) },
  200: { male: toMs(1, 39.37), female: toMs(1, 50.31) },
  400: { male: toMs(3, 32.25), female: toMs(3, 51.30) },
  800: { male: toMs(7, 23.75), female: toMs(7, 57.42) },
  1500: { male: toMs(14, 6.88), female: toMs(15, 24.57) },
};

const BACKSTROKE_LONG: StrokeRecords = {
  50: { male: toMs(0, 23.71), female: toMs(0, 26.86) },
  100: { male: toMs(0, 51.6), female: toMs(0, 57.33) },
  200: { male: toMs(1, 51.92), female: toMs(2, 3.14) },
};

const BACKSTROKE_SHORT: StrokeRecords = {
  50: { male: toMs(0, 22.22), female: toMs(0, 25.27) },
  100: { male: toMs(0, 48.33), female: toMs(0, 54.89) },
  200: { male: toMs(1, 48.81), female: toMs(1, 59.23) },
};

const BREASTSTROKE_LONG: StrokeRecords = {
  50: { male: toMs(0, 25.95), female: toMs(0, 28.56) },
  100: { male: toMs(0, 56.88), female: toMs(1, 4.13) },
  200: { male: toMs(2, 5.48), female: toMs(2, 18.95) },
};

const BREASTSTROKE_SHORT: StrokeRecords = {
  50: { male: toMs(0, 24.95), female: toMs(0, 28.37) },
  100: { male: toMs(0, 55.61), female: toMs(1, 2.36) },
  200: { male: toMs(2, 0.16), female: toMs(2, 14.57) },
};

const BUTTERFLY_LONG: StrokeRecords = {
  50: { male: toMs(0, 22.27), female: toMs(0, 24.43) },
  100: { male: toMs(0, 49.45), female: toMs(0, 55.48) },
  200: { male: toMs(1, 50.34), female: toMs(2, 1.81) },
};

const BUTTERFLY_SHORT: StrokeRecords = {
  50: { male: toMs(0, 21.75), female: toMs(0, 24.38) },
  100: { male: toMs(0, 47.78), female: toMs(0, 54.61) },
  200: { male: toMs(1, 48.24), female: toMs(1, 59.23) },
};

const MEDLEY_LONG: StrokeRecords = {
  200: { male: toMs(1, 54.0), female: toMs(2, 6.12) },
  400: { male: toMs(4, 3.84), female: toMs(4, 24.31) },
};

const MEDLEY_SHORT: StrokeRecords = {
  100: { male: toMs(0, 49.28), female: toMs(0, 56.51) },
  200: { male: toMs(1, 49.63), female: toMs(2, 1.86) },
  400: { male: toMs(3, 54.08), female: toMs(4, 18.94) },
};

export const WORLD_RECORDS: CourseRecords = {
  LONG_COURSE: {
    FREESTYLE: FREESTYLE_LONG,
    BACKSTROKE: BACKSTROKE_LONG,
    BREASTSTROKE: BREASTSTROKE_LONG,
    BUTTERFLY: BUTTERFLY_LONG,
    MEDLEY: MEDLEY_LONG,
  },
  SHORT_COURSE: {
    FREESTYLE: FREESTYLE_SHORT,
    BACKSTROKE: BACKSTROKE_SHORT,
    BREASTSTROKE: BREASTSTROKE_SHORT,
    BUTTERFLY: BUTTERFLY_SHORT,
    MEDLEY: MEDLEY_SHORT,
  },
};

const normalizeGenderBucket = (gender?: string | null): GenderBucket => {
  if (!gender) return "female";
  const normalized = gender.trim().toLowerCase();
  if (normalized.startsWith("m")) return "male";
  if (normalized.startsWith("f")) return "female";
  return "female";
};

export const getWorldRecordMs = (
  distance: number,
  stroke: string,
  course: string,
  gender?: string | null
): number | null => {
  const courseMap = WORLD_RECORDS[course as CourseKey];
  if (!courseMap) return null;
  const strokeMap = courseMap[stroke as StrokeKey];
  if (!strokeMap) return null;
  const entry = strokeMap[distance];
  if (!entry) return null;
  const genderKey = normalizeGenderBucket(gender);
  return entry[genderKey] ?? null;
};
