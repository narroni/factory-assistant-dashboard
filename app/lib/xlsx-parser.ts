import * as XLSX from "xlsx";

export type XLSXParseResult = {
  summary: string; // human-readable text for LLM
  sheets: SheetInfo[];
  rowCount: number;
  charCount: number;
};

export type SheetInfo = {
  name: string;
  headers: string[];
  rowCount: number;
  preview: string; // first few rows as text
};

const MAX_ROWS_PER_SHEET = 100; // Limit to first 100 rows
const MAX_TOTAL_CHARS = 20000; // Cap total at 20k chars
const MAX_ROWS_IN_PREVIEW = 10; // Show first 10 rows in preview

/**
 * Parse XLSX file buffer and extract structured text summary.
 * Safe: limits rows, characters, and sheets to avoid token explosion.
 */
export function parseXLSX(buffer: Buffer): XLSXParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheets: SheetInfo[] = [];
    let totalChars = 0;
    let totalRows = 0;

    // Process each sheet
    for (const sheetName of workbook.SheetNames.slice(0, 5)) {
      // Limit to first 5 sheets
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

      if (data.length === 0) continue;

      const headers = (data[0] ?? []).map((h) => String(h ?? "").trim()).filter(Boolean);
      if (headers.length === 0) continue;

      // Extract preview (first N rows)
      const previewRows = data.slice(1, Math.min(MAX_ROWS_IN_PREVIEW + 1, data.length));
      const preview = formatRowsAsText(headers, previewRows);

      const sheetInfo: SheetInfo = {
        name: sheetName,
        headers,
        rowCount: Math.min(data.length - 1, MAX_ROWS_PER_SHEET),
        preview,
      };

      sheets.push(sheetInfo);
      totalRows += sheetInfo.rowCount;
      totalChars += preview.length;

      // Stop if getting too large
      if (totalChars > MAX_TOTAL_CHARS) {
        break;
      }
    }

    // Build summary
    const summary = buildXLSXSummary(sheets, totalRows, buffer.length);
    return {
      summary: summary.slice(0, MAX_TOTAL_CHARS),
      sheets,
      rowCount: totalRows,
      charCount: summary.length,
    };
  } catch (err) {
    console.error("[xlsx-parser] parse failed:", err);
    return {
      summary: `[XLSX file] Error parsing: ${err instanceof Error ? err.message : "Unknown error"}`,
      sheets: [],
      rowCount: 0,
      charCount: 0,
    };
  }
}

/**
 * Format rows as readable text (CSV-like but formatted).
 */
function formatRowsAsText(headers: string[], rows: unknown[][]): string {
  const lines: string[] = [];

  // Header line
  lines.push(headers.join(" | "));
  lines.push("-".repeat(Math.min(80, headers.join(" | ").length)));

  // Data rows
  for (const row of rows) {
    const cells = headers.map((_, i) => {
      const val = row[i];
      if (val === null || val === undefined) return "";
      return String(val).trim();
    });
    lines.push(cells.join(" | "));
  }

  return lines.join("\n");
}

/**
 * Build human-readable XLSX summary for LLM context.
 */
function buildXLSXSummary(sheets: SheetInfo[], totalRows: number, fileSizeBytes: number): string {
  const fileSizeKB = Math.round(fileSizeBytes / 1024);
  const lines: string[] = [
    `XLSX File Summary (${fileSizeKB} KB)`,
    `Total sheets: ${sheets.length}`,
    `Total data rows: ${totalRows}`,
    "",
  ];

  for (const sheet of sheets) {
    lines.push(`Sheet: ${sheet.name}`);
    lines.push(`Columns: ${sheet.headers.join(", ")}`);
    lines.push(`Rows: ${sheet.rowCount}${sheet.rowCount > MAX_ROWS_IN_PREVIEW ? ` (showing first ${MAX_ROWS_IN_PREVIEW})` : ""}`);
    lines.push("");
    lines.push(sheet.preview);
    lines.push("");
  }

  return lines.join("\n");
}
