import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { RaceResult } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { parseTimeToMs } from "@/lib/time";


const STROKES = ["FREESTYLE", "BACKSTROKE", "BREASTSTROKE", "BUTTERFLY", "MEDLEY"] as const;
const COURSES = ["SHORT_COURSE", "LONG_COURSE"] as const;
const OPEN_WATER_ENVIRONMENTS = ["SEA", "RIVER", "LAKE", "LAGOON", "RESERVOIR"] as const;

const normalizeRecordTag = (value?: string | null) => {
  const normalized = value?.trim().toUpperCase();
  return normalized ? normalized : null;
};

const BaseResultSchema = z.object({
  id: z.string().optional(),
  competitionName: z.string().min(1),
  date: z.string().min(1),
  distance: z.number().int().positive(),
  category: z.string().trim().optional(),
  timeString: z.string().min(1),
  position: z.number().int().positive().nullable().optional(),
  notes: z.string().trim().max(400).nullable().optional(),
});

const PoolManageResultSchema = BaseResultSchema.extend({
  eventType: z.literal("POOL"),
  stroke: z.enum(STROKES),
  course: z.enum(COURSES),
  isRelay: z.boolean().optional(),
  recordTag: z.string().trim().max(16).nullable().optional(),
  openWaterEnvironment: z.null().optional(),
  venueName: z.string().trim().max(160).nullable().optional(),
});

const OpenWaterManageResultSchema = BaseResultSchema.extend({
  eventType: z.literal("OPEN_WATER"),
  stroke: z.null().optional(),
  course: z.null().optional(),
  isRelay: z.literal(false).optional(),
  recordTag: z.null().optional(),
  openWaterEnvironment: z.enum(OPEN_WATER_ENVIRONMENTS),
  venueName: z.string().trim().min(1).max(160),
});

const ManageResultSchema = z.discriminatedUnion("eventType", [PoolManageResultSchema, OpenWaterManageResultSchema]);

const ManagePayloadSchema = z.object({
  results: z.array(ManageResultSchema).min(1),
});

const serializeResult = (result: RaceResult) => ({
  id: result.id,
  competitionName: result.competitionName,
  date: result.date.toISOString(),
  distance: result.distance,
  eventType: result.eventType,
  stroke: result.stroke,
  course: result.course,
  category: result.category,
  timeString: result.timeString,
  position: result.position,
  isRelay: result.isRelay,
  recordTag: result.recordTag,
  openWaterEnvironment: result.openWaterEnvironment,
  venueName: result.venueName,
  notes: result.notes,
});

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const payload = ManagePayloadSchema.parse(body);

    const athleteProfile = await db.athleteProfile.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id },
      update: {},
    });

    const saved: RaceResult[] = [];

    for (const input of payload.results) {
      const baseData = {
        competitionName: input.competitionName,
        date: new Date(input.date),
        distance: input.distance,
        category: input.category?.trim() || null,
        timeMs: parseTimeToMs(input.timeString),
        timeString: input.timeString,
        position: input.position ?? null,
        notes: input.notes?.trim() || null,
      };

      const data = input.eventType === "POOL"
        ? {
            ...baseData,
            eventType: input.eventType,
            stroke: input.stroke,
            course: input.course,
            isRelay: Boolean(input.isRelay),
            recordTag: normalizeRecordTag(input.recordTag),
            openWaterEnvironment: null,
            venueName: input.venueName?.trim() || null,
          }
        : {
            ...baseData,
            eventType: input.eventType,
            stroke: null,
            course: null,
            isRelay: false,
            recordTag: null,
            openWaterEnvironment: input.openWaterEnvironment,
            venueName: input.venueName.trim(),
          };

      if (input.id) {
        const existing = await db.raceResult.findUnique({ where: { id: input.id } });
        if (!existing || existing.athleteProfileId !== athleteProfile.id) {
          return NextResponse.json({ error: "Result not found" }, { status: 404 });
        }
        const updated = await db.raceResult.update({ where: { id: input.id }, data });
        saved.push(updated);
      } else {
        const created = await db.raceResult.create({ data: { ...data, athleteProfileId: athleteProfile.id } });
        saved.push(created);
      }
    }

    return NextResponse.json({ results: saved.map(serializeResult) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }
    console.error("[results/manage] Error:", error);
    return NextResponse.json({ error: "Failed to save results" }, { status: 500 });
  }
}

