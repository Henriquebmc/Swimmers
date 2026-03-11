import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const SettingsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().optional(),
  birthDate: z.string().trim().optional(),
  gender: z.string().trim().optional(),
  abmnRegistrationNumber: z.string().trim().max(6).optional(),
  image: z.string().trim().max(2_000_000).nullable().optional(),
});

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const payload = SettingsSchema.parse(body);

    const birthDate = payload.birthDate ? new Date(payload.birthDate) : null;
    if (birthDate && Number.isNaN(birthDate.getTime())) {
      return NextResponse.json({ error: "Invalid birth date" }, { status: 400 });
    }

    const gender = payload.gender ? payload.gender.toLowerCase() : null;
    const abmnRegistrationNumber = payload.abmnRegistrationNumber?.replace(/\D/g, "").slice(0, 6) || null;

    await db.user.update({
      where: { id: session.user.id },
      data: {
        name: payload.name,
        birthDate,
        gender,
        image: payload.image ?? null,
      },
    });

    await db.athleteProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        abmnRegistrationNumber,
      },
      update: {
        abmnRegistrationNumber,
      },
    });

    return NextResponse.json({
      profile: {
        name: payload.name,
        email: session.user.email ?? "",
        birthDate: payload.birthDate || "",
        gender: gender ?? "",
        abmnRegistrationNumber: abmnRegistrationNumber ?? "",
        image: payload.image ?? null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    console.error("[settings] Error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await db.user.delete({ where: { id: session.user.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[settings/delete] Error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
