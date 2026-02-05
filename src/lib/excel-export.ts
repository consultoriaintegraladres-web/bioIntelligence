"use client";

import * as XLSX from "xlsx";

interface ExcelExportOptions {
  fileName: string;
  sheetName?: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

export function exportToExcel({ fileName, sheetName = "Datos", headers, rows }: ExcelExportOptions) {
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-width columns
  const colWidths = headers.map((header, colIdx) => {
    let maxWidth = header.length;
    for (const row of rows) {
      const cellValue = String(row[colIdx] ?? "");
      if (cellValue.length > maxWidth) {
        maxWidth = cellValue.length;
      }
    }
    return { wch: Math.min(maxWidth + 2, 60) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
