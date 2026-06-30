import type { CellValue, Column, ColumnType } from "@/types";

/**
 * Parse a single line of delimited text honouring quoted fields
 * (RFC 4180 style: quotes escape the delimiter and "" is a literal quote).
 */
function parseLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out.map((f) => f.trim());
}

/** Sniff the most likely delimiter from the header line. */
function detectDelimiter(sample: string): string {
  const candidates = [",", "\t", ";", "|"];
  let best = ",";
  let bestCount = -1;
  for (const d of candidates) {
    const count = sample.split(d).length;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

const isNumeric = (v: string): boolean =>
  v !== "" && !isNaN(Number(v)) && isFinite(Number(v));

// Reasonably strict date detection so numeric IDs aren't mis-typed as dates.
const DATE_RE =
  /^(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/\d{2,4})([ T]\d{1,2}:\d{2}(:\d{2})?)?$/;
const isDateLike = (v: string): boolean =>
  DATE_RE.test(v) && !isNaN(Date.parse(v));

function inferType(values: string[]): ColumnType {
  let numeric = 0;
  let date = 0;
  let nonEmpty = 0;
  for (const v of values) {
    if (v === "" || v == null) continue;
    nonEmpty++;
    if (isNumeric(v)) numeric++;
    else if (isDateLike(v)) date++;
  }
  if (nonEmpty === 0) return "string";
  if (numeric / nonEmpty >= 0.8) return "number";
  if (date / nonEmpty >= 0.8) return "date";
  return "string";
}

export interface ParsedCsv {
  columns: Column[];
  rows: CellValue[][];
}

/**
 * Parse raw CSV/TSV text into typed columns and a coerced value matrix.
 * Handles quoted fields, alternate delimiters, header detection and
 * headerless purely-numeric files.
 */
export function parseCSV(text: string): ParsedCsv {
  const lines = text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return { columns: [], rows: [] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const matrix = lines.map((l) => parseLine(l, delimiter));

  // Decide whether the first row is a header. If every first-row cell is
  // numeric, treat the file as headerless and synthesise column names.
  const firstRowAllNumeric = matrix[0].every((c) => isNumeric(c));
  let headers: string[];
  let dataStart: number;

  if (firstRowAllNumeric) {
    headers = matrix[0].map((_, i) => `Column ${i + 1}`);
    dataStart = 0;
  } else {
    headers = matrix[0].map((h, i) => (h === "" ? `Column ${i + 1}` : h));
    dataStart = 1;
  }

  let dataRows = matrix.slice(dataStart);

  // Some exporters (e.g. ImageJ) prepend an unlabelled index column.
  if (dataRows.length > 0 && dataRows[0].length === headers.length + 1) {
    headers = ["Index", ...headers];
  }

  const colCount = headers.length;

  // Normalise ragged rows to a consistent width.
  dataRows = dataRows.map((r) => {
    if (r.length === colCount) return r;
    if (r.length < colCount)
      return [...r, ...Array(colCount - r.length).fill("")];
    return r.slice(0, colCount);
  });

  const columns: Column[] = headers.map((name, index) => {
    const colValues = dataRows.map((r) => r[index] ?? "");
    return { name, index, type: inferType(colValues) };
  });

  const rows: CellValue[][] = dataRows.map((r) =>
    r.map((cell, ci) => {
      if (cell === "" || cell == null) return null;
      return columns[ci].type === "number" && isNumeric(cell)
        ? Number(cell)
        : cell;
    }),
  );

  return { columns, rows };
}

/** Extract a numeric column as a clean number[] (nulls/NaN removed). */
export function numericColumn(
  rows: CellValue[][],
  index: number,
): number[] {
  const out: number[] = [];
  for (const row of rows) {
    const v = row[index];
    if (typeof v === "number" && !isNaN(v)) out.push(v);
    else if (typeof v === "string" && v !== "" && !isNaN(Number(v)))
      out.push(Number(v));
  }
  return out;
}

/**
 * Extract paired (x, y) numeric points from two columns, dropping rows where
 * either value is missing/non-numeric. If x is non-numeric, the row index is
 * used as the x ordinate (and `xIsIndex` is reported as true).
 */
export function pairedNumeric(
  rows: CellValue[][],
  xIndex: number,
  yIndex: number,
  xIsNumeric: boolean,
): { x: number[]; y: number[]; labels: string[]; xIsIndex: boolean } {
  const x: number[] = [];
  const y: number[] = [];
  const labels: string[] = [];
  let counter = 0;

  for (const row of rows) {
    const rawY = row[yIndex];
    const yNum =
      typeof rawY === "number"
        ? rawY
        : typeof rawY === "string" && rawY !== "" && !isNaN(Number(rawY))
          ? Number(rawY)
          : NaN;
    if (isNaN(yNum)) continue;

    const rawX = row[xIndex];
    if (xIsNumeric) {
      const xNum =
        typeof rawX === "number"
          ? rawX
          : typeof rawX === "string" && rawX !== "" && !isNaN(Number(rawX))
            ? Number(rawX)
            : NaN;
      if (isNaN(xNum)) continue;
      x.push(xNum);
      labels.push(String(rawX));
    } else {
      x.push(counter);
      labels.push(rawX == null ? String(counter) : String(rawX));
    }
    y.push(yNum);
    counter++;
  }

  return { x, y, labels, xIsIndex: !xIsNumeric };
}
