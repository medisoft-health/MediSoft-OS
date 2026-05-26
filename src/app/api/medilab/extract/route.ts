import { NextResponse } from "next/server";
import { enforceRateLimit, requireSessionApi } from "@/lib/auth-helpers";
import { POLICIES } from "@/lib/rate-limit";
import {
  extractLabFromImage,
  extractLabFromText,
} from "@/lib/medilab/extract";
import * as XLSX from "xlsx";

/**
 * POST /api/medilab/extract
 *
 * Optimized per-type processing:
 *   PDF    → extract text with pdf-parse → send TEXT to Gemini (fast)
 *   Image  → compress with sharp (max 1MB) → send image to Gemini
 *   Excel  → parse with xlsx → map columns directly (NO AI needed)
 *   CSV    → parse as text → map columns directly (NO AI needed)
 *
 * Key insight: don't send raw binary to Gemini. Extract text first.
 */
export const runtime = "nodejs";
export const maxDuration = 180; // 3 minutes for large files

const MAX_FILE_BYTES = 20 * 1024 * 1024;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const PDF_TYPE = "application/pdf";
const EXCEL_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

export async function POST(request: Request) {
  const auth = await requireSessionApi();
  if ("response" in auth) return auth.response;

  const rl = await enforceRateLimit(auth.user, POLICIES.AI_GEMINI);
  if (!rl.ok) return rl.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with a `file` field." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File exceeds 20 MB." }, { status: 413 });
  }

  const mime = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  console.log(
    `[medilab/extract] File: ${file.name} | ${mime} | ${(file.size / 1024).toFixed(0)} KB`,
  );

  const headers = { ...rl.headers, "Cache-Control": "private, no-store" };

  try {
    // ── PDF → extract text → Gemini text analysis (FAST) ─────────
    if (mime === PDF_TYPE || ext === "pdf") {
      return await handlePdf(file, headers);
    }

    // ── Image → compress → Gemini vision ─────────────────────────
    if (IMAGE_TYPES.includes(mime) || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
      return await handleImage(file, mime, headers);
    }

    // ── Excel → parse directly (NO AI) ───────────────────────────
    if (EXCEL_TYPES.includes(mime) || ext === "xlsx" || ext === "xls") {
      return await handleExcel(file, headers);
    }

    // ── CSV → parse directly (NO AI) ─────────────────────────────
    if (mime === "text/csv" || ext === "csv") {
      return await handleCsv(file, headers);
    }

    return NextResponse.json(
      { error: `Unsupported: ${mime || ext}. Accepts PDF, JPG, PNG, XLSX, CSV.` },
      { status: 415 },
    );
  } catch (err) {
    console.error("[medilab/extract] Unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction failed." },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// PDF: extract text first, then send text to Gemini
// ─────────────────────────────────────────────────────────────────
async function handlePdf(
  file: File,
  headers: Record<string, string>,
) {
  console.log("[medilab/extract] PDF → extracting text with pdf-parse...");
  const pdfParse = (await import("pdf-parse")).default;
  const bytes = Buffer.from(await file.arrayBuffer());
  let textContent: string;

  try {
    const parsed = await pdfParse(bytes);
    textContent = parsed.text;
    console.log(
      `[medilab/extract] PDF text extracted: ${parsed.numpages} pages, ${textContent.length} chars`,
    );
  } catch (err) {
    console.error("[medilab/extract] PDF parse failed:", err);
    // Fallback: send the PDF as image to Gemini
    console.log("[medilab/extract] Falling back to Gemini vision for PDF...");
    const base64 = bytes.toString("base64");
    const result = await extractLabFromImage(base64, "application/pdf");
    if (result.kind !== "ok") {
      return NextResponse.json(
        { error: result.message, reason: result.kind },
        { status: 502 },
      );
    }
    return NextResponse.json(result.data, { headers });
  }

  if (textContent.trim().length < 20) {
    // Scanned PDF with no OCR text — send as image to Gemini
    console.log("[medilab/extract] PDF has no text (scanned). Using Gemini vision...");
    const base64 = bytes.toString("base64");
    const result = await extractLabFromImage(base64, "application/pdf");
    if (result.kind !== "ok") {
      return NextResponse.json(
        { error: result.message, reason: result.kind },
        { status: 502 },
      );
    }
    return NextResponse.json(result.data, { headers });
  }

  // Text-based PDF — send extracted text to Gemini (much faster)
  console.log("[medilab/extract] Sending extracted text to Gemini...");
  const result = await extractLabFromText(textContent);
  if (result.kind !== "ok") {
    return NextResponse.json(
      { error: result.message, reason: result.kind },
      { status: 502 },
    );
  }
  console.log(`[medilab/extract] ✓ Extracted ${result.data.results.length} results from PDF text`);
  return NextResponse.json(result.data, { headers });
}

// ─────────────────────────────────────────────────────────────────
// Image: compress with sharp, then send to Gemini vision
// ─────────────────────────────────────────────────────────────────
async function handleImage(
  file: File,
  mime: string,
  headers: Record<string, string>,
) {
  const sharp = (await import("sharp")).default;
  const rawBytes = Buffer.from(await file.arrayBuffer());

  // Compress to max 1MB JPEG for faster Gemini processing
  let processedBytes: Buffer;
  let processedMime: string;

  if (rawBytes.length > 1_000_000) {
    console.log(
      `[medilab/extract] Compressing image: ${(rawBytes.length / 1024).toFixed(0)} KB → target 1 MB`,
    );
    processedBytes = await sharp(rawBytes)
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    processedMime = "image/jpeg";
    console.log(
      `[medilab/extract] Compressed to ${(processedBytes.length / 1024).toFixed(0)} KB`,
    );
  } else {
    processedBytes = rawBytes;
    processedMime = mime || "image/jpeg";
  }

  console.log("[medilab/extract] Sending image to Gemini vision...");
  const base64 = processedBytes.toString("base64");
  const result = await extractLabFromImage(base64, processedMime);
  if (result.kind !== "ok") {
    console.error(`[medilab/extract] ✗ Gemini vision failed: ${result.message}`);
    return NextResponse.json(
      { error: result.message, reason: result.kind },
      { status: 502 },
    );
  }
  console.log(`[medilab/extract] ✓ Extracted ${result.data.results.length} results from image`);
  return NextResponse.json(result.data, { headers });
}

// ─────────────────────────────────────────────────────────────────
// Excel: parse directly — NO AI needed for structured data
// ─────────────────────────────────────────────────────────────────
async function handleExcel(
  file: File,
  headers: Record<string, string>,
) {
  console.log("[medilab/extract] Excel → parsing directly (no AI)...");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const workbook = XLSX.read(bytes, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return NextResponse.json({ error: "Excel has no sheets." }, { status: 400 });
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName],
    { defval: "" },
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Excel sheet is empty." }, { status: 400 });
  }

  // Try to intelligently map columns to lab result fields
  const results = mapRowsToLabResults(rows);

  if (results.length > 0) {
    console.log(`[medilab/extract] ✓ Parsed ${results.length} results from Excel directly`);
    return NextResponse.json(
      {
        panelName: sheetName !== "Sheet1" ? sheetName : "",
        panelCategory: "",
        laboratory: "",
        collectionDate: "",
        results,
      },
      { headers },
    );
  }

  // If direct mapping failed, fall back to sending as text to Gemini
  console.log("[medilab/extract] Direct mapping failed, sending to Gemini...");
  const textContent = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
  const geminiResult = await extractLabFromText(textContent);
  if (geminiResult.kind !== "ok") {
    return NextResponse.json(
      { error: geminiResult.message, reason: geminiResult.kind },
      { status: 502 },
    );
  }
  console.log(`[medilab/extract] ✓ Extracted ${geminiResult.data.results.length} results via Gemini`);
  return NextResponse.json(geminiResult.data, { headers });
}

// ─────────────────────────────────────────────────────────────────
// CSV: parse directly — NO AI needed
// ─────────────────────────────────────────────────────────────────
async function handleCsv(
  file: File,
  headers: Record<string, string>,
) {
  console.log("[medilab/extract] CSV → parsing directly (no AI)...");
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV has no data rows." }, { status: 400 });
  }

  // Parse as XLSX CSV for consistent handling
  const workbook = XLSX.read(text, { type: "string" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return NextResponse.json({ error: "Could not parse CSV." }, { status: 400 });
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName],
    { defval: "" },
  );

  const results = mapRowsToLabResults(rows);

  if (results.length > 0) {
    console.log(`[medilab/extract] ✓ Parsed ${results.length} results from CSV directly`);
    return NextResponse.json(
      { panelName: "", panelCategory: "", laboratory: "", collectionDate: "", results },
      { headers },
    );
  }

  // Fallback to Gemini
  console.log("[medilab/extract] Direct CSV mapping failed, sending to Gemini...");
  const geminiResult = await extractLabFromText(text);
  if (geminiResult.kind !== "ok") {
    return NextResponse.json(
      { error: geminiResult.message, reason: geminiResult.kind },
      { status: 502 },
    );
  }
  return NextResponse.json(geminiResult.data, { headers });
}

// ─────────────────────────────────────────────────────────────────
// Smart column mapping for Excel/CSV
// ─────────────────────────────────────────────────────────────────

/** Known column name patterns (case-insensitive) */
const COL_PATTERNS = {
  testName: [
    "test", "test name", "testname", "name", "parameter", "analyte",
    "investigation", "exam", "اسم الفحص", "الفحص", "التحليل",
  ],
  value: [
    "result", "value", "val", "observed", "measured",
    "النتيجة", "القيمة",
  ],
  unit: [
    "unit", "units", "uom", "الوحدة",
  ],
  referenceLow: [
    "ref low", "low", "min", "normal low", "reference low",
    "الحد الأدنى",
  ],
  referenceHigh: [
    "ref high", "high", "max", "normal high", "reference high",
    "الحد الأعلى",
  ],
  referenceRange: [
    "reference", "ref range", "normal range", "range", "reference range",
    "المرجع", "النطاق الطبيعي",
  ],
  flag: [
    "flag", "status", "interpretation", "abnormal",
    "الحالة", "التفسير",
  ],
};

function findColumn(
  headers: string[],
  patterns: string[],
): string | null {
  for (const h of headers) {
    const lower = h.toLowerCase().trim();
    for (const p of patterns) {
      if (lower === p || lower.includes(p)) return h;
    }
  }
  return null;
}

interface MappedResult {
  testName: string;
  value: string;
  unit: string;
  referenceLow: string;
  referenceHigh: string;
  flag: string;
}

function mapRowsToLabResults(
  rows: Record<string, unknown>[],
): MappedResult[] {
  if (rows.length === 0) return [];

  const colNames = Object.keys(rows[0]);
  const testNameCol = findColumn(colNames, COL_PATTERNS.testName);
  const valueCol = findColumn(colNames, COL_PATTERNS.value);

  // We need at least test name + value to proceed
  if (!testNameCol || !valueCol) return [];

  const unitCol = findColumn(colNames, COL_PATTERNS.unit);
  const refLowCol = findColumn(colNames, COL_PATTERNS.referenceLow);
  const refHighCol = findColumn(colNames, COL_PATTERNS.referenceHigh);
  const refRangeCol = findColumn(colNames, COL_PATTERNS.referenceRange);
  const flagCol = findColumn(colNames, COL_PATTERNS.flag);

  console.log(
    `[medilab/extract] Column mapping: test=${testNameCol}, value=${valueCol}, unit=${unitCol ?? "?"}, refLow=${refLowCol ?? "?"}, refHigh=${refHighCol ?? "?"}, range=${refRangeCol ?? "?"}, flag=${flagCol ?? "?"}`,
  );

  const results: MappedResult[] = [];

  for (const row of rows) {
    const testName = String(row[testNameCol] ?? "").trim();
    const value = String(row[valueCol] ?? "").trim();

    if (!testName || !value) continue;

    let refLow = refLowCol ? String(row[refLowCol] ?? "").trim() : "";
    let refHigh = refHighCol ? String(row[refHighCol] ?? "").trim() : "";

    // Parse combined "ref range" column like "3.5 - 5.0" or "70-99"
    if (!refLow && !refHigh && refRangeCol) {
      const rangeStr = String(row[refRangeCol] ?? "").trim();
      const match = rangeStr.match(
        /([0-9.,]+)\s*[-–—]\s*([0-9.,]+)/,
      );
      if (match) {
        refLow = match[1];
        refHigh = match[2];
      }
    }

    results.push({
      testName,
      value,
      unit: unitCol ? String(row[unitCol] ?? "").trim() : "",
      referenceLow: refLow,
      referenceHigh: refHigh,
      flag: flagCol ? String(row[flagCol] ?? "").trim() : "",
    });
  }

  return results;
}
