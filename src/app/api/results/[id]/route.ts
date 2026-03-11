import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const athleteProfile = await db.athleteProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!athleteProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const result = await db.raceResult.findUnique({ where: { id } });
    if (!result || result.athleteProfileId !== athleteProfile.id) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    await db.raceResult.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[results/delete] Error:", error);
    return NextResponse.json({ error: "Failed to delete result" }, { status: 500 });
  }
}
