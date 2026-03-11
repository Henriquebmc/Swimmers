import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ABMN_CURRICULO_SOURCE, ABMN_SESSION_TTL_MS, createAbmnSessionSeed } from "@/lib/abmn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    await db.externalImportSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { userId: session.user.id, source: ABMN_CURRICULO_SOURCE },
        ],
      },
    });

    const athleteProfile = await db.athleteProfile.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id },
      update: {},
      select: { id: true, abmnRegistrationNumber: true },
    });

    const seed = await createAbmnSessionSeed();
    const expiresAt = new Date(Date.now() + ABMN_SESSION_TTL_MS);

    const created = await db.externalImportSession.create({
      data: {
        userId: session.user.id,
        source: ABMN_CURRICULO_SOURCE,
        phpSessionId: seed.phpSessionId,
        token: seed.token,
        captchaCode: seed.captchaCode,
        captchaImageUrl: seed.captchaImageUrl,
        expiresAt,
      },
      select: { id: true },
    });

    return NextResponse.json({
      sessionId: created.id,
      captchaImageUrl: `/api/abmn/curriculo/captcha?sessionId=${created.id}`,
      registrationNumber: athleteProfile.abmnRegistrationNumber ?? "",
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[abmn/curriculo/session] Error:", error);
    return NextResponse.json({ error: "Failed to load ABMN captcha" }, { status: 500 });
  }
}
