import * as XLSX from "xlsx";
import jsPDF from "jspdf";

export type ExportFormat = "csv" | "xlsx" | "pdf";

export function generateCSV(
  data: Record<string, any>[],
  columns: string[],
  filename: string
): void {
  if (data.length === 0) return;

  const headers = columns;
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = row[col];
      if (value === null || value === undefined) return "";
      if (typeof value === "string" && value.includes(",")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    })
  );

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
  downloadFile(csv, `${filename}.csv`, "text/csv");
}

export function generateXLSX(
  data: Record<string, any>[],
  columns: string[],
  filename: string
): void {
  if (data.length === 0) return;

  const worksheet = XLSX.utils.json_to_sheet(data, { header: columns });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

  // Set column widths
  const colWidths = columns.map((col) => ({
    wch: Math.min(Math.max(col.length, 12), 30),
  }));
  worksheet["!cols"] = colWidths;

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function generatePDF(
  data: Record<string, any>[],
  columns: string[],
  filename: string
): void {
  if (data.length === 0) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;

  let yPosition = margin;
  const lineHeight = 7;
  const fontSize = 9;
  const headerFontSize = 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(headerFontSize);
  doc.text(filename, margin, yPosition);
  yPosition += lineHeight * 2;

  // Table headers
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(240, 240, 240);

  const colWidth = contentWidth / columns.length;
  columns.forEach((col, idx) => {
    const x = margin + idx * colWidth;
    doc.rect(x, yPosition - lineHeight + 1, colWidth, lineHeight, "F");
    doc.text(col, x + 2, yPosition);
  });

  yPosition += lineHeight + 2;
  doc.setFont("helvetica", "normal");
  doc.setDrawColor(200, 200, 200);

  // Table rows
  data.forEach((row) => {
    // Check if we need a new page
    if (yPosition + lineHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;

      // Repeat headers on new page
      doc.setFont("helvetica", "bold");
      doc.setFillColor(240, 240, 240);
      columns.forEach((col, idx) => {
        const x = margin + idx * colWidth;
        doc.rect(x, yPosition - lineHeight + 1, colWidth, lineHeight, "F");
        doc.text(col, x + 2, yPosition);
      });
      yPosition += lineHeight + 2;
      doc.setFont("helvetica", "normal");
    }

    columns.forEach((col, idx) => {
      const x = margin + idx * colWidth;
      const value = row[col];
      const text =
        value === null || value === undefined ? "" : String(value).substring(0, 30);
      doc.text(text, x + 2, yPosition);
    });

    yPosition += lineHeight;
  });

  doc.save(`${filename}.pdf`);
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatForExport(value: any): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value;
  return String(value);
}
