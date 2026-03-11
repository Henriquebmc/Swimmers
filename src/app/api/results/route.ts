import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { parseTimeToMs } from "@/lib/time";
import { buildRaceResultFingerprint } from "@/lib/race-results";
import { ReviewFormSchema } from "@/modules/results-ai/schema";

const normalizeRecordTag = (value?: string | null) => {
  const normalized = value?.trim().toUpperCase();
  return normalized ? normalized : null;
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { results } = ReviewFormSchema.parse(body);

    const extractedBirthDate = results
      .map((result) => result.athleteBirthDate?.trim())
      .find((value): value is string => Boolean(value));

    const athleteProfile = await db.athleteProfile.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id },
      update: {},
    });

    if (extractedBirthDate) {
      const parsedBirthDate = new Date(extractedBirthDate);
      if (!Number.isNaN(parsedBirthDate.getTime())) {
        await db.user.update({
          where: { id: session.user.id },
          data: { birthDate: parsedBirthDate },
        });
      }
    }

    const existingResults = await db.raceResult.findMany({
      where: { athleteProfileId: athleteProfile.id },
      orderBy: { date: "asc" },
    });

    const existingByFingerprint = new Map(
      existingResults.map((result) => [
        buildRaceResultFingerprint({
          competitionName: result.competitionName,
          date: result.date,
          distance: result.distance,
          eventType: result.eventType,
          stroke: result.stroke,
          course: result.course,
          openWaterEnvironment: result.openWaterEnvironment,
          venueName: result.venueName,
          timeMs: result.timeMs,
        }),
        result,
      ])
    );

    const seenIncoming = new Set<string>();
    let savedCount = 0;

    for (const result of results) {
      const timeMs = parseTimeToMs(result.timeString);
      const fingerprint = buildRaceResultFingerprint({
        competitionName: result.competitionName,
        date: result.date,
        distance: Number(result.distance),
        eventType: "POOL",
        stroke: result.stroke,
        course: result.course,
        timeMs,
      });

      if (seenIncoming.has(fingerprint)) {
        continue;
      }
      seenIncoming.add(fingerprint);

      const existing = existingByFingerprint.get(fingerprint);
      const nextPosition = result.position ? Number(result.position) : null;
      const nextIsRelay = Boolean(result.isRelay);
      const nextCategory = result.category?.trim() || null;
      const nextRecordTag = normalizeRecordTag(result.recordTag);

      if (existing) {
        const shouldUpdate =
          existing.isRelay !== nextIsRelay ||
          existing.position !== nextPosition ||
          existing.timeString !== result.timeString ||
          existing.category !== nextCategory ||
          existing.recordTag !== nextRecordTag ||
          existing.eventType !== "POOL" ||
          existing.stroke !== result.stroke ||
          existing.course !== result.course;

        if (shouldUpdate) {
          const updated = await db.raceResult.update({
            where: { id: existing.id },
            data: {
              eventType: "POOL",
              stroke: result.stroke,
              course: result.course,
              timeString: result.timeString,
              position: nextPosition,
              isRelay: nextIsRelay,
              category: nextCategory,
              recordTag: nextRecordTag,
              openWaterEnvironment: null,
              venueName: null,
              notes: null,
            },
          });
          existingByFingerprint.set(fingerprint, updated);
        }

        savedCount += 1;
        continue;
      }

      const created = await db.raceResult.create({
        data: {
          athleteProfileId: athleteProfile.id,
          eventType: "POOL",
          competitionName: result.competitionName,
          date: new Date(result.date),
          distance: Number(result.distance),
          stroke: result.stroke,
          course: result.course,
          category: nextCategory,
          openWaterEnvironment: null,
          venueName: null,
          notes: null,
          timeMs,
          timeString: result.timeString,
          position: nextPosition,
          isRelay: nextIsRelay,
          recordTag: nextRecordTag,
        },
      });

      existingByFingerprint.set(fingerprint, created);
      savedCount += 1;
    }

    return NextResponse.json({ saved: savedCount });
  } catch (error) {
    console.error("[results] Error:", error);
    return NextResponse.json({ error: "Failed to save results" }, { status: 500 });
  }
}
