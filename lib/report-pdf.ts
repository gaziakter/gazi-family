import PDFDocument from "pdfkit";
import path from "node:path";

import {
  reportTable,
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
    layout: "portrait",
    margin: 36,
    bufferPages: true,
    font: path.join(process.cwd(), "public/fonts/NotoSansBengali.ttf"),
    info: { Title: "Happy Family — Financial report", Author: "Happy Family" },
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
  const red = "#cf192b",
    ink = "#343430",
    gray = "#74746e";
  const headingOptions = { width, align: "center" as const };
  doc.fillColor(red).fontSize(23).text("Happy Family", left, 30, headingOptions);
  doc.fillColor(ink).fontSize(16).text(
    mode === "statement-month" ? "Income & Expense Statement" : table.title,
    left,
    66,
    headingOptions,
  );
  doc
    .fontSize(10)
    .fillColor(gray)
    .text(`Period: ${period}`, left, 93, headingOptions);
  doc.text(
    `Generated: ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })} (Asia/Dhaka)`,
    left,
    doc.y + 3,
    headingOptions,
  );
  if (demo)
    doc
      .fillColor(red)
      .text("DEMO REPORT — sample data", left, doc.y + 4, headingOptions);
  const dateRange = filters.filter((filter) => /^(From|To):/.test(filter));
  if (dateRange.length)
    doc.fillColor(gray).text(dateRange.join("  |  "), left, doc.y + 6, headingOptions);
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
    const valueText = amount(Number(value));
    let valueSize = 17;
    doc.fontSize(valueSize);
    while (doc.widthOfString(valueText) > width / 3 - 32 && valueSize > 8) {
      doc.fontSize(--valueSize);
    }
    doc
      .fillColor(ink)
      .text(valueText, x + 12, y + 24, { lineBreak: false });
  });
  y += 72;
  const widths = table.statement
    ? [width / 2 - 110, 110, width / 2 - 110, 110]
    : [55, 120, 65, 50, 75, 79, width - 444];
  const columns = table.columns.map((label, i) => ({
    label: table.statement ? ["Income", "Amount (BDT)", "Expense", "Amount (BDT)"][i] : label,
    width: widths[i],
  }));
  const bottom = doc.page.height - 52,
    lineHeight = 13;
  function header() {
    doc.fontSize(table.statement ? 9 : 8);
    const labels = columns.map((col) => wrap(col.label, col.width - 14));
    const headerHeight = Math.max(25, Math.max(...labels.map((lines) => lines.length)) * 13 + 14);
    doc.rect(left, y, width, headerHeight).fill(
      doc
        .linearGradient(left, y, left + width, y + 25)
        .stop(0, "#ed1c2e")
        .stop(0.5, "#d7192d")
        .stop(1, "#a91629"),
    );
    let x = left;
    doc.fillColor("#fffaf0");
    for (const [i, col] of columns.entries()) {
      labels[i].forEach((label, j) => doc.text(label, x + 7, y + 7 + j * 13, { lineBreak: false }));
      x += col.width;
    }
    y += headerHeight;
  }
  function nextPage() {
    doc.addPage({ size: "A4", layout: "portrait", margin: 36 });
    doc
      .fontSize(12)
      .fillColor(red)
      .text("Happy Family · Financial report", left, 26, headingOptions);
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
    if (table.statement && row.kind === "group") return;
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
