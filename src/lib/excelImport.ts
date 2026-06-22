type ExcelCell = string | number | boolean | Date | null | undefined;

export type ExcelColumn<T extends string> = {
  key: T;
  header: string;
  required?: boolean;
  example?: string;
};

export type ParsedExcelRow<T extends string> = Record<T, ExcelCell>;

function cellToText(value: ExcelCell) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function excelSerialToIso(value: number) {
  const utcDays = Math.floor(value - 25569);
  const date = new Date(utcDays * 86400 * 1000);
  return date.toISOString().slice(0, 10);
}

export function parseExcelDate(value: ExcelCell) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") return excelSerialToIso(value);

  const text = String(value).trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const slashMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export function parseExcelNumber(value: ExcelCell) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeGender(value: ExcelCell) {
  const text = cellToText(value).toLowerCase();
  if (["l", "laki", "laki-laki", "putra"].includes(text)) return "L";
  if (["p", "perempuan", "putri"].includes(text)) return "P";
  return "";
}

export function normalizeStatus(value: ExcelCell) {
  const text = cellToText(value).toLowerCase();
  if (["alumni", "keluar"].includes(text)) return text;
  return "aktif";
}

export async function downloadExcelTemplate<T extends string>({
  columns,
  filename,
  sheetName,
}: {
  columns: ExcelColumn<T>[];
  filename: string;
  sheetName: string;
}) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const importSheet = XLSX.utils.aoa_to_sheet([columns.map((column) => column.header)]);
  importSheet["!cols"] = columns.map((column) => ({
    wch: Math.max(column.header.length + 4, 16),
  }));

  const guideRows = [
    ["Kolom", "Wajib", "Contoh"],
    ...columns.map((column) => [
      column.header,
      column.required ? "Ya" : "Tidak",
      column.example || "",
    ]),
  ];
  const guideSheet = XLSX.utils.aoa_to_sheet(guideRows);
  guideSheet["!cols"] = [{ wch: 24 }, { wch: 10 }, { wch: 32 }];

  XLSX.utils.book_append_sheet(workbook, importSheet, sheetName);
  XLSX.utils.book_append_sheet(workbook, guideSheet, "Panduan");
  XLSX.writeFile(workbook, filename, { bookType: "xlsx" });
}

export async function parseExcelFile<T extends string>(
  file: File,
  columns: ExcelColumn<T>[],
) {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { cellDates: true, type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, ExcelCell>>(firstSheet, {
    defval: "",
    raw: true,
  });

  return rawRows
    .map((rawRow) => {
      const normalized = {} as ParsedExcelRow<T>;
      columns.forEach((column) => {
        normalized[column.key] = rawRow[column.header] ?? "";
      });
      return normalized;
    })
    .filter((row) =>
      columns.some((column) => cellToText(row[column.key]).length > 0),
    );
}

export function excelCellToText(value: ExcelCell) {
  return cellToText(value);
}
