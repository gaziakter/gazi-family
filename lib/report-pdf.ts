import PDFDocument from "pdfkit";
import path from "node:path";

import {
  reportTable,
  statementNote,
  type ReportRow,
  type ReportMode,
} from "./reports";
export type { ReportRow } from "./reports";
export async function createReportPdf(
  rows: ReportRow[],
  period: string,
  filters: string[],
  demo = false,
  mode: ReportMode = "transactions-date",
): Promise<Buffer> {
  const table = reportTable(rows, mode);
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 36,
    bufferPages: true,
    font: path.join(process.cwd(), "public/fonts/NotoSansBengali.ttf"),
    info: { Title: "Gazi Family — Financial report", Author: "Gazi Family" },
  });
  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const pageWidth = doc.page.width,
    left = 36,
    width = pageWidth - 72;
  const red = "#b70704",
    ink = "#343430",
    gray = "#74746e";
  doc.fillColor(red).fontSize(23).text("Gazi Family", left, 30);
  doc.fillColor(ink).fontSize(16).text(table.title, left, 66);
  doc
    .fontSize(10)
    .fillColor(gray)
    .text(`Period: ${period}`, left, 93, { width });
  doc.text(
    `Generated: ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })} (Asia/Dhaka)`,
    left,
    doc.y + 3,
    { width },
  );
  if (demo)
    doc
      .fillColor(red)
      .text("DEMO REPORT — sample data", left, doc.y + 4, { width });
  if (filters.length)
    doc.fillColor(gray).text(filters.join("  |  "), left, doc.y + 6, { width });
  if (table.statement)
    doc
      .fontSize(9)
      .fillColor(gray)
      .text(statementNote, left, doc.y + 6, { width });
  let y = doc.y + 18;
  const income =
    rows
      .filter((r) => r.type === "income")
      .reduce((s, r) => s + Math.round(r.amount * 100), 0) / 100;
  const expense =
    rows
      .filter((r) => r.type === "expense")
      .reduce((s, r) => s + Math.round(r.amount * 100), 0) / 100;
  const amount = (n: number) =>
    "৳" +
    new Intl.NumberFormat("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  [
    ["Income", income],
    ["Expenses", expense],
    [
      table.statement
        ? income < expense
          ? "Deficit"
          : "Surplus"
        : "Net balance",
      table.statement
        ? Math.abs(Math.round((income - expense) * 100) / 100)
        : Math.round((income - expense) * 100) / 100,
    ],
  ].forEach(([label, value], i) => {
    const x = left + i * (width / 3 + 4);
    doc.roundedRect(x, y, width / 3 - 8, 55, 5).fill("#fff3df");
    doc
      .fontSize(9)
      .fillColor(gray)
      .text(String(label), x + 12, y + 8, { lineBreak: false });
    doc
      .fontSize(17)
      .fillColor(ink)
      .text(amount(Number(value)), x + 12, y + 24, { lineBreak: false });
  });
  y += 72;
  const widths = table.statement
    ? [width / 2 - 125, 125, width / 2 - 125, 125]
    : [70, 185, 100, 62, 125, 114, width - 656];
  const columns = table.columns.map((label, i) => ({
    label,
    width: widths[i],
  }));
  const bottom = doc.page.height - 52,
    lineHeight = 13;
  function header() {
    if (table.statement) {
      doc.rect(left, y, width, 25).fill(red);
      doc.fontSize(12).fillColor("#fffaf0");
      doc.text("Income", left + 7, y + 5, { lineBreak: false });
      doc.text("Expense", left + width / 2 + 7, y + 5, { lineBreak: false });
      y += 25;
    }
    doc.rect(left, y, width, 25).fill(red);
    let x = left;
    doc.fontSize(9).fillColor("#fffaf0");
    for (const col of columns) {
      doc.text(col.label, x + 7, y + 7, { lineBreak: false });
      x += col.width;
    }
    y += 25;
  }
  function nextPage() {
    doc.addPage();
    doc
      .fontSize(12)
      .fillColor(red)
      .text("Gazi Family · Financial report", left, 26, { lineBreak: false });
    y = 53;
    header();
  }
  // Wrap by grapheme rather than code point so Bengali marks stay attached.
  const segmenter = new Intl.Segmenter("bn", { granularity: "grapheme" });
  function wrap(value: string, available: number) {
    const lines: string[] = [];
    for (const paragraph of value.split(/\r?\n/)) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        if (!word) continue;
        const candidate = line ? line + " " + word : word;
        if (doc.widthOfString(candidate) <= available) {
          line = candidate;
          continue;
        }
        if (line) {
          lines.push(line);
          line = "";
        }
        for (const { segment } of segmenter.segment(word)) {
          if (line && doc.widthOfString(line + segment) > available) {
            lines.push(line);
            line = "";
          }
          line += segment;
        }
      }
      lines.push(line);
    }
    return lines;
  }
  header();
  if (!rows.length) {
    doc
      .fontSize(11)
      .fillColor(gray)
      .text("No transactions match the selected filters.", left + 10, y + 20, {
        width: width - 20,
      });
  }
  table.lines.forEach((row, index) => {
    doc.fontSize(9);
    const layoutColumns =
      row.kind === "group" || row.kind === "balance" ? [{ width }] : columns;
    const lines = row.cells.map((value, i) =>
      wrap(value, layoutColumns[i].width - 14),
    );
    const count = Math.max(...lines.map((v) => v.length));
    let offset = 0;
    while (offset < count) {
      if (y + lineHeight + 16 > bottom) nextPage();
      const fit = Math.min(
        count - offset,
        Math.floor((bottom - y - 16) / lineHeight),
      );
      const height = fit * lineHeight + 16;
      doc
        .rect(left, y, width, height)
        .fill(
          row.kind === "group"
            ? "#eee6ef"
            : row.kind === "total"
              ? "#fff3df"
              : index % 2
                ? "#fffaf0"
                : "#f6f1e8",
        );
      doc.fontSize(9).fillColor(ink);
      let x = left;
      for (let c = 0; c < layoutColumns.length; c++) {
        lines[c]
          .slice(offset, offset + fit)
          .forEach((line, j) =>
            doc.text(line, x + 7, y + 7 + j * lineHeight, { lineBreak: false }),
          );
        x += layoutColumns[c].width;
      }
      if (table.statement && layoutColumns.length === 4)
        doc
          .moveTo(left + width / 2, y)
          .lineTo(left + width / 2, y + height)
          .strokeColor("#ddd3c6")
          .stroke();
      y += height;
      offset += fit;
    }
  });
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .fillColor(gray)
      .text(
        `${demo ? "Demo · " : ""}${rows.length} transactions · Currency: BDT`,
        left,
        doc.page.height - 32,
        { lineBreak: false },
      );
    doc.text(
      `Page ${i + 1} of ${pages.count}`,
      pageWidth - 110,
      doc.page.height - 32,
      { lineBreak: false },
    );
  }
  doc.end();
  return finished;
}
