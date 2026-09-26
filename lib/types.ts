export const permissions = [
  "transactions.write",
  "categories.write",
  "budgets.write",
  "goals.write",
  "users.manage",
  "roles.manage",
  "reports.read",
] as const;
export type Role = { id: string; name: string; permissions: string[] };
export type Member = {
  id: string;
  name: string;
  email: string;
  roleId: string;
};
export type Category = {
  id: string;
  name: string;
  type: string;
  color: string;
};
export type Entry = {
  id: string;
  title: string;
  type: string;
  amount: number;
  date: string;
  account: string;
  note: string;
  categoryId: string;
  userId: string;
};
export type Budget = {
  id: string;
  categoryId: string;
  month: string;
  amount: number;
};
export type Goal = {
  id: string;
  name: string;
  target: number;
  saved: number;
  date: string;
};
export type Data = {
  transactions: Entry[];
  categories: Category[];
  users: Member[];
  roles: Role[];
  budgets: Budget[];
  goals: Goal[];
  currentUserId: string;
};
export type Collection =
  "transactions" | "categories" | "users" | "roles" | "budgets" | "goals";
export function totals(entries: Entry[]) {
  const income =
    entries
      .filter((e) => e.type === "income")
      .reduce((s, e) => s + Math.round(e.amount * 100), 0) / 100;
  const expense =
    entries
      .filter((e) => e.type === "expense")
      .reduce((s, e) => s + Math.round(e.amount * 100), 0) / 100;
  return {
    income,
    expense,
    balance: Math.round((income - expense) * 100) / 100,
  };
}
export function csvCell(value: unknown) {
  let s = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
