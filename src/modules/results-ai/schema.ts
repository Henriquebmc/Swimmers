import { z } from "zod";

const optionalRecordTag = z.string().trim().max(16).optional();

export const RaceResultDraftSchema = z.object({
  athleteName: z.string(),
  athleteBirthDate: z.string().trim().min(1).optional(),
  competitionName: z.string(),
  date: z.string(),
  distance: z.number().int().positive(),
  stroke: z.enum(["FREESTYLE", "BACKSTROKE", "BREASTSTROKE", "BUTTERFLY", "MEDLEY"]),
  course: z.enum(["SHORT_COURSE", "LONG_COURSE"]),
  category: z.string().trim().min(1).optional(),
  timeString: z.string(),
  timeMs: z.number().int().positive(),
  position: z.number().int().positive().optional(),
  isRelay: z.boolean().optional(),
  recordTag: optionalRecordTag,
});

export const ExtractedResultsSchema = z.object({
  results: z.array(RaceResultDraftSchema),
});

export const RaceResultFormSchema = z.object({
  athleteName: z.string().min(1, "Athlete name is required"),
  athleteBirthDate: z.string().trim().optional(),
  competitionName: z.string().min(1, "Competition name is required"),
  date: z.string().min(1, "Date is required"),
  distance: z.number().int().positive("Distance must be a positive integer"),
  stroke: z.enum(["FREESTYLE", "BACKSTROKE", "BREASTSTROKE", "BUTTERFLY", "MEDLEY"]),
  course: z.enum(["SHORT_COURSE", "LONG_COURSE"]),
  category: z.string().trim().optional(),
  timeString: z.string().min(1, "Time is required"),
  position: z.number().int().positive().optional(),
  isRelay: z.boolean().optional(),
  recordTag: optionalRecordTag,
});

export const ReviewFormSchema = z.object({
  results: z.array(RaceResultFormSchema),
});

export type RaceResultDraft = z.infer<typeof RaceResultDraftSchema>;
export type ExtractedResults = z.infer<typeof ExtractedResultsSchema>;
export type RaceResultForm = z.infer<typeof RaceResultFormSchema>;
export type ReviewForm = z.infer<typeof ReviewFormSchema>;
