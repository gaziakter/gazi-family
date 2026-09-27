import test from "node:test";
import assert from "node:assert/strict";
import { reportTable, inReportPeriod, type ReportRow } from "../lib/reports";
const row = (
  date: string,
  type: string,
  amount: number,
  category: string,
  account = "Cash",
): ReportRow => ({
  date,
  type,
  amount,
  category,
  account,
  title: category,
  note: "",
  member: "Family",
});
const rows = [
  row("2026-08-31", "income", 5000, "Salary"),
  row("2026-09-01", "expense", 3300, "Groceries"),
  row("2026-09-01", "income", 1000, "Freelance"),
];
test("date ranges include both endpoints and span months", () => {
  assert.equal(
    rows.filter((r) =>
      inReportPeriod(r.date, "date", "2026-09", "2026-08-31", "2026-09-01"),
    ).length,
    3,
  );
  assert.equal(
    rows.filter((r) => inReportPeriod(r.date, "month", "2026-09", "", ""))
      .length,
    2,
  );
  assert.equal(
    inReportPeriod("2026-09-02", "date", "2026-09", "2026-08-31", "2026-09-01"),
    false,
  );
});
test("transactions group by date or head and keep income/expense names separate", () => {
  assert.deepEqual(
    reportTable(rows, "transactions-date")
      .lines.filter((l) => l.kind === "group")
      .map((l) => l.cells[0]),
    ["2026-08-31", "2026-09-01"],
  );
  const table = reportTable(
    [...rows, row("2026-09-01", "income", 100, "Groceries")],
    "transactions-head",
  );
  assert.equal(table.lines.filter((l) => l.kind === "group").length, 4);
  assert.equal(table.lines.filter((l) => l.kind === "detail").length, 4);
});

test("statement places actual income left and expenses right, preserving cents", () => {
  const table = reportTable(
    [
      row("2026-09-01", "income", 5000.1, "Salary"),
      row("2026-09-01", "income", 100, "Salary", "Bank"),
      row("2026-09-01", "expense", 3300.05, "Groceries"),
      row("2026-09-01", "expense", 50, "Travel"),
    ],
    "statement-date",
  );
  assert.equal(table.income, 5100.1);
  assert.equal(table.expense, 3350.05);
  assert.equal(table.balance, 1750.05);
  const detail = table.lines.filter((l) => l.kind === "detail");
  assert.equal(detail.length, 2);
  assert.equal(detail[0].cells[0], "Salary");
  assert.ok(detail[0].cells[1].includes("5,100.10"));
  assert.equal(detail[0].cells[2], "Groceries");
  assert.ok(detail[0].cells[3].includes("3,300.05"));
  assert.deepEqual(detail[1].cells.slice(0, 2), ["", ""]);
  assert.equal(detail[1].cells[2], "Travel");
});
test("monthly statements show independent period totals, surplus and deficit", () => {
  const table = reportTable(rows, "statement-month");
  assert.deepEqual(
    table.lines.filter((l) => l.kind === "group").map((l) => l.cells[0]),
    ["August 2026", "September 2026"],
  );
  assert.equal(table.income, 6000);
  assert.equal(table.expense, 3300);
  assert.equal(table.balance, 2700);
  const balances = table.lines.filter((l) => l.kind === "balance");
  assert.ok(balances[0].cells[0].startsWith("Surplus:"));
  assert.ok(balances[1].cells[0].startsWith("Deficit:"));
  assert.ok(balances[1].cells[0].includes("2,300.00"));
  assert.equal(reportTable([], "statement-month").balance, 0);
  const expenseOnly = reportTable([rows[1]], "statement-date");
  assert.deepEqual(
    expenseOnly.lines.find((l) => l.kind === "detail")!.cells.slice(0, 2),
    ["", ""],
  );
});
