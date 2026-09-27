export const permissions = [
  "accounts.read",
  "accounts.create",
  "accounts.update",
  "accounts.delete",
  "transfers.read",
  "transfers.create",
  "transfers.update",
  "transfers.delete",
  "overview.read",
  "income.read",
  "income.create",
  "income.update",
  "income.delete",
  "expense.read",
  "expense.create",
  "expense.update",
  "expense.delete",
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
  "reports.print",
] as const;
export const permissionGroups = [
  { key: "overview", label: "Overview", actions: ["read"] },
  {
    key: "income",
    label: "Income",
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "expense",
    label: "Expenses",
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "accounts",
    label: "Cash & Bank accounts",
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "transfers",
    label: "Account transfers",
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
  { key: "reports", label: "Reports", actions: ["read", "export", "print"] },
];
export const permissionLabels: Record<string, string> = {
  read: "View",
  create: "Create",
  update: "Update",
  delete: "Delete",
  export: "Export PDF",
  print: "Print",
};
export const readPermissions = [
  "accounts.read",
  "transfers.read",
  "overview.read",
  "income.read",
  "expense.read",
  "categories.read",
  "budgets.read",
  "goals.read",
  "users.read",
  "roles.read",
];
export const memberPermissions = [
  "transfers.create",
  "transfers.update",
  "transfers.delete",
  ...readPermissions,
  "income.create",
  "expense.create",
  "income.update",
  "expense.update",
  "income.delete",
  "expense.delete",
  "reports.read",
  "reports.export",
  "reports.print",
];
export const viewerPermissions = [
  ...readPermissions,
  "reports.read",
  "reports.export",
  "reports.print",
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
export type Account = {
  id: string;
  name: string;
  type: string;
  bankName: string;
  accountNumber: string;
  branch: string;
  openingBalance: number;
  active: boolean;
  balance: number;
};
export type Transfer = {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  note: string;
  userId: string;
};
export type Data = {
  accounts: Account[];
  transfers: Transfer[];
  transactions: Entry[];
  categories: Category[];
  users: Member[];
  roles: Role[];
  budgets: Budget[];
  goals: Goal[];
  currentUserId: string;
};
export type Collection =
  | "transactions"
  | "categories"
  | "users"
  | "roles"
  | "budgets"
  | "goals"
  | "accounts"
  | "transfers";
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

// Accept older role editors while storing only the detailed permissions.
export const legacyTransactionPermissions = [
  "transactions.read",
  "transactions.create",
  "transactions.update",
  "transactions.delete",
] as const;
export function expandPermissions(values: readonly string[]) {
  return [
    ...new Set(
      values.flatMap((p) =>
        p.startsWith("transactions.")
          ? ["income." + p.split(".")[1], "expense." + p.split(".")[1]]
          : [p],
      ),
    ),
  ];
}
