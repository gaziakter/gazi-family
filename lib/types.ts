export const permissions = [
  "transactions.read",
  "transactions.create",
  "transactions.update",
  "transactions.delete",
  "categories.read",
  "categories.create",
  "categories.update",
  "categories.delete",
  "budgets.read",
  "budgets.create",
  "budgets.update",
  "budgets.delete",
  "goals.read",
  "goals.create",
  "goals.update",
  "goals.delete",
  "users.read",
  "users.create",
  "users.update",
  "users.delete",
  "roles.read",
  "roles.create",
  "roles.update",
  "roles.delete",
  "reports.read",
  "reports.export",
] as const;
export const permissionGroups = [
  {
    key: "transactions",
    label: "Transactions (Income & Expense)",
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "categories",
    label: "Categories",
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "budgets",
    label: "Budgets",
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "goals",
    label: "Savings goals",
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "users",
    label: "Family members",
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "roles",
    label: "Roles & permissions",
    actions: ["read", "create", "update", "delete"],
  },
  { key: "reports", label: "Reports", actions: ["read", "export"] },
];
export const permissionLabels: Record<string, string> = {
  read: "View",
  create: "Create",
  update: "Update",
  delete: "Delete",
  export: "Export PDF",
};
export const readPermissions = [
  "transactions.read",
  "categories.read",
  "budgets.read",
  "goals.read",
  "users.read",
  "roles.read",
];
export const memberPermissions = [
  ...readPermissions,
  "transactions.create",
  "transactions.update",
  "transactions.delete",
  "reports.read",
  "reports.export",
];
export const viewerPermissions = [
  ...readPermissions,
  "reports.read",
  "reports.export",
];

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
