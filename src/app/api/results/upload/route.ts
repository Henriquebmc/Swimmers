import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { extractResultsFromPdfBytes } from "@/lib/pdf-results";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size must be less than 20MB" }, { status: 400 });
    }

    const extracted = await extractResultsFromPdfBytes(await file.arrayBuffer());
    return NextResponse.json(extracted);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[results/upload] Error:", message);
    return NextResponse.json({ error: "Failed to process PDF", detail: message }, { status: 500 });
  }
}
