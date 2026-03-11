import { GoogleGenAI } from "@google/genai";
import { getDocumentProxy, extractText } from "unpdf";
import { ExtractedResultsSchema, type ExtractedResults } from "./schema";

function parseTimeToMs(timeString: string): number {
  if (timeString.includes(":")) {
    const [minPart, secPart] = timeString.split(":");
    return Math.round((parseInt(minPart, 10) * 60 + parseFloat(secPart)) * 1000);
  }
  return Math.round(parseFloat(timeString) * 1000);
}

function sanitizeJsonCandidate(rawText: string): string {
  const withoutFence = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");
  const sliced = firstBrace >= 0 && lastBrace > firstBrace
    ? withoutFence.slice(firstBrace, lastBrace + 1)
    : withoutFence;

  return sliced
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
}

function normalizeRecordTag(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : undefined;
}

function parseExtractedResultsJson(rawText: string): ExtractedResults {
  const parsed = JSON.parse(sanitizeJsonCandidate(rawText));

  if (parsed.results && Array.isArray(parsed.results)) {
    parsed.results = parsed.results.map((result: Record<string, unknown>) => ({
      ...result,
      athleteBirthDate:
        typeof result.athleteBirthDate === "string" && result.athleteBirthDate.trim().length > 0
          ? result.athleteBirthDate.trim()
          : undefined,
      category:
        typeof result.category === "string" && result.category.trim().length > 0
          ? result.category.trim()
          : undefined,
      timeMs:
        typeof result.timeMs === "number"
          ? result.timeMs
          : parseTimeToMs(String(result.timeString ?? "")),
      isRelay: Boolean(result.isRelay),
      recordTag: normalizeRecordTag(result.recordTag),
    }));
  }

  return ExtractedResultsSchema.parse(parsed);
}

async function repairExtractedResultsJson(ai: GoogleGenAI, rawText: string): Promise<ExtractedResults> {
  const repairPrompt = `Fix the following malformed JSON so it becomes valid JSON.

Return ONLY a valid JSON object with this exact structure:
{
  "results": [
    {
      "athleteName": "full name of the athlete",
      "athleteBirthDate": "YYYY-MM-DD or YYYY",
      "competitionName": "name of the competition or meet",
      "date": "YYYY-MM-DD",
      "distance": 100,
      "stroke": "FREESTYLE",
      "course": "SHORT_COURSE",
      "category": "45+",
      "timeString": "1:02.45",
      "timeMs": 62450,
      "position": 3,
      "isRelay": false,
      "recordTag": "RDF"
    }
  ]
}

Rules:
- Preserve all result entries from the malformed JSON.
- Use valid JSON only.
- Do not add markdown fences.
- Ensure distance and timeMs are numbers.
- Ensure isRelay is boolean.
- athleteBirthDate is optional and should be YYYY-MM-DD, or just YYYY when only the birth year is shown in the document.
- category is optional and should keep labels like 30+, 45+, 120+, 200+ when present.
- recordTag is optional and should preserve the REC. column exactly when present, especially RDF.
- If position is missing, omit it.

MALFORMED JSON:
${rawText.substring(0, 20000)}`;

  const repaired = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: repairPrompt,
    config: { temperature: 0 },
  });

  return parseExtractedResultsJson(repaired.text ?? "");
}

export async function extractRaceResultsFromPdfBuffer(pdfBuffer: Buffer): Promise<ExtractedResults> {
  const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
  const { text: pdfText } = await extractText(pdf, { mergePages: true });

  if (!pdfText || pdfText.trim().length < 10) {
    throw new Error("PDF appears to be empty or contains no extractable text.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const prompt = `Extract all swimming competition results from the text below.

Return ONLY a valid JSON object with this exact structure:
{
  "results": [
    {
      "athleteName": "full name of the athlete",
      "athleteBirthDate": "YYYY-MM-DD or YYYY",
      "competitionName": "name of the competition or meet",
      "date": "YYYY-MM-DD",
      "distance": 100,
      "stroke": "FREESTYLE",
      "course": "SHORT_COURSE",
      "category": "45+",
      "timeString": "1:02.45",
      "timeMs": 62450,
      "position": 3,
      "isRelay": false,
      "recordTag": "RDF"
    }
  ]
}

Rules:
- Extract ALL results from ALL athletes and competitions in the document.
- distance: integer in meters (50, 100, 200, 400, 800, 1500).
- For relay events, use the TOTAL relay distance (example: 4x100 freestyle relay => 400).
- stroke: one of FREESTYLE, BACKSTROKE, BREASTSTROKE, BUTTERFLY, MEDLEY.
  Map: LIVRE/CRAWL=FREESTYLE, COSTAS=BACKSTROKE, PEITO=BREASTSTROKE, BORBOLETA=BUTTERFLY, MEDLEY/MISTO=MEDLEY.
- course: SHORT_COURSE (25m/SCM) or LONG_COURSE (50m/LCM).
- athleteBirthDate: capture the athlete's date of birth when present. Use YYYY-MM-DD when full date exists, or YYYY when the PDF shows only the birth year like (1976).
- category: capture the age-group/category when present, especially labels like 25+, 30+, 35+, 40+, 45+, 120+, 160+, 200+, 240+.
  For relay events prefer the relay category such as 120+, 160+, 200+.
- timeString: "MM:SS.cc" for times >= 1 min, or "SS.cc" for under 1 min.
- timeMs: time in milliseconds (integer).
- position: finishing placement if available, omit if not.
- isRelay: true for relay/revezamento events such as 4x50, 4x100, 4x200 or when the text explicitly mentions relay/revezamento; otherwise false.
- recordTag: optional. Capture the exact value from the PDF REC. column when present. Preserve codes like RDF exactly. If the REC. column is empty, omit recordTag.
- Pay special attention to tables shaped like: COL. PROVA FAIXA EQUIPE TEMPO REC. PONTOS ÍND.TÉC. DATA.
- date: use "2024-01-01" as fallback if not found.
- competitionName: use "Unknown Competition" if not found.
- Return ONLY the JSON. No markdown, no explanation.

TEXT:
${pdfText.substring(0, 50000)}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { temperature: 0 },
  });

  const rawText = response.text ?? "";

  try {
    return parseExtractedResultsJson(rawText);
  } catch (error) {
    console.warn("[results-ai] Falling back to JSON repair after invalid model output:", error);
    return repairExtractedResultsJson(ai, rawText);
  }
}

export async function extractRaceResultsFromPDF(pdfBase64: string): Promise<ExtractedResults> {
  return extractRaceResultsFromPdfBuffer(Buffer.from(pdfBase64, "base64"));
}
