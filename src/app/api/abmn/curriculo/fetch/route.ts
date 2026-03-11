import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ABMN_CURRICULO_SOURCE, fetchAbmnCurriculoPdf, normalizeRegistrationNumber } from "@/lib/abmn";
import { extractResultsFromPdfBytes } from "@/lib/pdf-results";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FetchCurriculoSchema = z.object({
  sessionId: z.string().min(1),
  matricula: z.string().min(1),
  captchaAnswer: z.string().trim().min(4).max(8),
  saveRegistrationNumber: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const payload = FetchCurriculoSchema.parse(body);
    const registrationNumber = normalizeRegistrationNumber(payload.matricula);

    if (registrationNumber.length !== 6) {
      return NextResponse.json(
        { error: "Informe uma matrícula ABMN com 6 dígitos.", code: "invalid_registration", refreshCaptcha: false },
        { status: 400 }
      );
    }

    const importSession = await db.externalImportSession.findUnique({
      where: { id: payload.sessionId },
      select: {
        id: true,
        userId: true,
        source: true,
        phpSessionId: true,
        token: true,
        captchaCode: true,
        expiresAt: true,
      },
    });

    if (!importSession || importSession.userId !== session.user.id || importSession.source !== ABMN_CURRICULO_SOURCE) {
      return NextResponse.json(
        { error: "Sessão da ABMN não encontrada.", code: "session_missing", refreshCaptcha: true },
        { status: 404 }
      );
    }

    if (importSession.expiresAt < new Date()) {
      await db.externalImportSession.delete({ where: { id: importSession.id } });
      return NextResponse.json(
        { error: "O captcha expirou. Carregue um novo captcha.", code: "session_expired", refreshCaptcha: true },
        { status: 410 }
      );
    }

    const abmnResult = await fetchAbmnCurriculoPdf({
      phpSessionId: importSession.phpSessionId,
      token: importSession.token,
      captchaCode: importSession.captchaCode,
      registrationNumber,
      captchaAnswer: payload.captchaAnswer,
    });

    await db.externalImportSession.delete({ where: { id: importSession.id } });

    if (!abmnResult.ok) {
      return NextResponse.json(abmnResult, { status: 400 });
    }

    if (payload.saveRegistrationNumber) {
      await db.athleteProfile.upsert({
        where: { userId: session.user.id },
        create: { userId: session.user.id, abmnRegistrationNumber: registrationNumber },
        update: { abmnRegistrationNumber: registrationNumber },
      });
    }

    const extracted = await extractResultsFromPdfBytes(abmnResult.pdfBuffer);
    return NextResponse.json(extracted);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos para importar o currículo ABMN.", code: "invalid_payload", refreshCaptcha: false },
        { status: 400 }
      );
    }

    console.error("[abmn/curriculo/fetch] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ABMN curriculum", code: "fetch_failed", refreshCaptcha: true },
      { status: 500 }
    );
  }
}
