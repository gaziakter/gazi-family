export type ReportMode =
  | "transactions-date"
  | "transactions-head"
  | "statement-date"
  | "statement-month";
export type ReportRow = {
  date: string;
  title: string;
  note: string;
  type: string;
  amount: number;
  category: string;
  categoryId?: string;
  account: string;
  member: string;
};
export type ReportLine = {
  kind: "group" | "detail" | "total" | "balance";
  cells: string[];
};
export const reportTitles: Record<ReportMode, string> = {
  "transactions-date": "Transaction report · Date-wise",
  "transactions-head": "Transaction report · Head-wise",
  "statement-date": "Income & Expense Statement · Date-wise",
  "statement-month": "Income & Expense Statement · Month-wise",
};
export const statementNote =
  "Income on the left and expenses on the right, grouped by head. Surplus or deficit is income minus expenses for the selected period.";
export function reportMonthLabel(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return month;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(month + "-01T00:00:00Z"));
}
export function inReportPeriod(
  date: string,
  period: string,
  month: string,
  from: string,
  to: string,
) {
  return (
    (period === "all" ||
      period === "date" ||
      date.startsWith(period === "year" ? month.slice(0, 4) : month)) &&
    (!from || date >= from) &&
    (!to || date <= to)
  );
}
const format = (cents: number) =>
  "৳" +
  new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
const balanceLabel = (cents: number) =>
  `${cents < 0 ? "Deficit" : "Surplus"}: ${format(Math.abs(cents))}`;
export function reportTable(rows: ReportRow[], mode: ReportMode) {
  const statement = mode.startsWith("statement");
  const groups = new Map<string, ReportRow[]>();
  for (const row of [...rows].sort(
    (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title),
  )) {
    const key =
      mode === "transactions-head"
        ? `${row.type}:${row.categoryId ?? row.category}`
        : mode === "statement-month"
          ? row.date.slice(0, 7)
          : row.date;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  const lines: ReportLine[] = [];
  let incomeTotal = 0,
    expenseTotal = 0;
  const sorted = [...groups.entries()].sort((a, b) =>
    mode === "transactions-head"
      ? a[1][0].category.localeCompare(b[1][0].category) ||
        a[0].localeCompare(b[0])
      : a[0].localeCompare(b[0]),
  );
  for (const [key, entries] of sorted) {
    const title =
      mode === "transactions-head"
        ? `${entries[0].category} (${entries[0].type})`
        : mode === "statement-month"
          ? reportMonthLabel(key)
          : key;
    lines.push({ kind: "group", cells: [title] });
    if (statement) {
      const incomeHeads = new Map<string, { name: string; cents: number }>();
      const expenseHeads = new Map<string, { name: string; cents: number }>();
      let income = 0,
        expense = 0;
      for (const row of entries) {
        const cents = Math.round(row.amount * 100);
        const heads = row.type === "income" ? incomeHeads : expenseHeads;
        const id = row.categoryId ?? row.category;
        heads.set(id, {
          name: row.category,
          cents: (heads.get(id)?.cents ?? 0) + cents,
        });
        if (row.type === "income") income += cents;
        else expense += cents;
      }
      const byName = (a: { name: string }, b: { name: string }) =>
        a.name.localeCompare(b.name);
      const incomes = [...incomeHeads.values()].sort(byName);
      const expenses = [...expenseHeads.values()].sort(byName);
      for (let i = 0; i < Math.max(incomes.length, expenses.length); i++) {
        lines.push({
          kind: "detail",
          cells: [
            incomes[i]?.name ?? "",
            incomes[i] ? format(incomes[i].cents) : "",
            expenses[i]?.name ?? "",
            expenses[i] ? format(expenses[i].cents) : "",
          ],
        });
      }
      incomeTotal += income;
      expenseTotal += expense;
      lines.push({
        kind: "total",
        cells: [
          "Total income",
          format(income),
          "Total expense",
          format(expense),
        ],
      });
      lines.push({ kind: "balance", cells: [balanceLabel(income - expense)] });
    } else {
      let income = 0,
        expense = 0;
      for (const row of entries) {
        const cents = Math.round(row.amount * 100);
        if (row.type === "income") income += cents;
        else expense += cents;
        lines.push({
          kind: "detail",
          cells: [
            row.date,
            row.title + (row.note ? "\n" + row.note : ""),
            row.category,
            row.account,
            row.member,
            row.type === "income" ? format(cents) : "—",
            row.type === "expense" ? format(cents) : "—",
          ],
        });
      }
      lines.push({
        kind: "total",
        cells: [
          "Subtotal",
          `${entries.length} transactions`,
          "",
          "",
          "",
          format(income),
          format(expense),
        ],
      });
    }
  }
  if (statement && rows.length) {
    lines.push({
      kind: "total",
      cells: [
        "Grand total income",
        format(incomeTotal),
        "Grand total expense",
        format(expenseTotal),
      ],
    });
    lines.push({
      kind: "balance",
      cells: ["Overall " + balanceLabel(incomeTotal - expenseTotal)],
    });
  }
  return {
    title: reportTitles[mode],
    statement,
    lines,
    income: incomeTotal / 100,
    expense: expenseTotal / 100,
    balance: (incomeTotal - expenseTotal) / 100,
    columns: statement
      ? ["Income head", "Amount (BDT)", "Expense head", "Amount (BDT)"]
      : [
          "Date",
          "Description / note",
          "Head",
          "Account",
          "Member",
          "Income (BDT)",
          "Expense (BDT)",
        ],
  };
}
