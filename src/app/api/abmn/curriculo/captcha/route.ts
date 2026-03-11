import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return new NextResponse("Missing sessionId", { status: 400 });
  }

  try {
    const importSession = await db.externalImportSession.findUnique({
      where: { id: sessionId },
      select: {
        userId: true,
        expiresAt: true,
        phpSessionId: true,
        captchaImageUrl: true,
      },
    });

    if (!importSession || importSession.userId !== session.user.id || importSession.expiresAt < new Date()) {
      return new NextResponse("Session expired", { status: 410 });
    }

    const response = await fetch(importSession.captchaImageUrl, {
      cache: "no-store",
      headers: {
        Cookie: `PHPSESSID=${importSession.phpSessionId}; pll_language=pt`,
        Accept: "image/png,image/*;q=0.8,*/*;q=0.5",
      },
    });

    if (!response.ok) {
      return new NextResponse("Failed to load captcha image", { status: 502 });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "image/png",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("[abmn/curriculo/captcha] Error:", error);
    return new NextResponse("Failed to proxy captcha image", { status: 500 });
  }
}
