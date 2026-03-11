import type { ExtractedResults } from "@/modules/results-ai/schema";
import { extractRaceResultsFromPdfBuffer } from "@/modules/results-ai/gemini-parser";

export async function extractResultsFromPdfBytes(pdfBytes: ArrayBuffer | Buffer): Promise<ExtractedResults> {
  const buffer = Buffer.isBuffer(pdfBytes) ? pdfBytes : Buffer.from(pdfBytes);
  return extractRaceResultsFromPdfBuffer(buffer);
}
