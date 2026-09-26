import test from "node:test";
import assert from "node:assert/strict";
import { createReportPdf, type ReportRow } from "../lib/report-pdf";
import type { ReportMode } from "../lib/reports";
const row: ReportRow = {
  date: "2026-09-26",
  title: "পরিবারের বাজার",
  note: "চাল, ডাল ও সবজি",
  type: "expense",
  amount: 3300.25,
  category: "বাজার",
  account: "Cash",
  member: "গাজী পরিবার",
};
test("creates a real PDF with an embedded Bengali font", async () => {
  const buffer = await createReportPdf(
    [row],
    "2026-09",
    ["Account: Cash"],
    true,
  );
  assert.equal(buffer.subarray(0, 5).toString(), "%PDF-");
  assert.match(buffer.toString("latin1"), /\/FontFile2/);
  assert.match(buffer.toString("latin1"), /%%EOF/);
});
test("paginates long notes and many transactions without dropping content", async () => {
  const rows = Array.from({ length: 65 }, (_, i) => ({
    ...row,
    title: row.title + " " + i,
    note: i === 0 ? "পরিবারের প্রয়োজনীয় জিনিসপত্র ".repeat(150) : row.note,
  }));
  const buffer = await createReportPdf(rows, "All time", []);
  const pages = (buffer.toString("latin1").match(/\/Type \/Page\b/g) ?? [])
    .length;
  assert.ok(pages >= 4, `Expected multiple pages, got ${pages}`);
});
test("exports an empty report", async () => {
  const buffer = await createReportPdf([], "2026-09", []);
  assert.equal(
    (buffer.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length,
    1,
  );
});
test("exports each grouped report mode", async () => {
  for (const mode of [
    "transactions-date",
    "transactions-head",
    "statement-date",
    "statement-month",
  ] as ReportMode[]) {
    const buffer = await createReportPdf([row], "2026-09", [], false, mode);
    assert.equal(buffer.subarray(0, 5).toString(), "%PDF-");
  }
});
