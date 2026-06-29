/** Small helpers for building spreadsheet-friendly exports. */

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Build a CSV string from a header row and data rows. */
export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsv).join(","));
  return lines.join("\r\n");
}

/**
 * Build a TSV string (tab-separated) for pasting directly into Google Sheets or
 * Excel. Newlines/tabs within a cell are collapsed to spaces so the grid stays
 * intact when pasted.
 */
export function toTsv(headers: string[], rows: string[][]): string {
  const clean = (v: string) => v.replace(/[\t\r\n]+/g, " ").trim();
  const lines = [headers, ...rows].map((row) => row.map(clean).join("\t"));
  return lines.join("\n");
}

/** Trigger a client-side file download for the given text content. */
export function downloadFile(
  filename: string,
  content: string,
  mime = "text/csv;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** A filesystem-friendly slug for filenames. */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "export"
  );
}
