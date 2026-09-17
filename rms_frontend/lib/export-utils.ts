import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportColumn {
  header: string;
  key: string;
  format?: (value: any, row: any) => string | number;
}

/**
 * Clean & format CSV string with BOM for Excel UTF-8 compatibility
 */
export function exportToCSV(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
) {
  const sanitize = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(sanitize).join(",");
  const dataLines = rows.map((row) => row.map(sanitize).join(","));
  const csvContent = "\uFEFF" + [headerLine, ...dataLines].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

/**
 * Native .xlsx export using SheetJS
 */
export function exportToExcel(
  filename: string,
  sheetName: string = "Data",
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
) {
  const aoa = [headers, ...rows.map((row) => row.map((val) => (val === null || val === undefined ? "" : val)))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Auto calculate column widths
  const colWidths = headers.map((header, colIdx) => {
    let maxLen = header.length;
    for (const r of rows) {
      const cellVal = r[colIdx];
      if (cellVal !== undefined && cellVal !== null) {
        maxLen = Math.max(maxLen, String(cellVal).length);
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

/**
 * Branded PDF Report export using jsPDF & autoTable
 */
export function exportToPDF(
  title: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  options?: {
    subtitle?: string;
    filename?: string;
    orientation?: "portrait" | "landscape";
  }
) {
  const orientation = options?.orientation || (headers.length > 6 ? "landscape" : "portrait");
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const filename = options?.filename || `${title.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 22, "F");

  // Logo / Brand
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("RAWSTITCH RETAIL MANAGEMENT SYSTEM", 14, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225); // Slate-300
  doc.text(
    `Generated: ${new Date().toLocaleString("en-GB")}`,
    pageWidth - 14,
    12,
    { align: "right" }
  );

  // Subheader / Report Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(title, 14, 34);

  if (options?.subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(options.subtitle, 14, 40);
  }

  const startY = options?.subtitle ? 46 : 39;

  // Render Table
  autoTable(doc, {
    head: [headers],
    body: rows.map((row) =>
      row.map((val) => (val === null || val === undefined ? "-" : String(val)))
    ),
    startY,
    theme: "grid",
    headStyles: {
      fillColor: [79, 70, 229], // Indigo 600
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate-50
    },
    styles: {
      overflow: "linebreak",
      cellWidth: "auto",
    },
    margin: { left: 14, right: 14, bottom: 18 },
    didDrawPage: (data) => {
      // Footer page numbering
      const pageCount = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : 1;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount} — Confidential • Rawstitch Retail`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: "center" }
      );
    },
  });

  doc.save(filename);
}
