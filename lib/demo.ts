import {
  Data,
  permissions,
  memberPermissions,
  viewerPermissions,
} from "./types";
export function demoData(): Data {
  const month = new Date()
    .toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" })
    .slice(0, 7);
  const data: Data = {
    currentUserId: "u1",
    roles: [
      { id: "r1", name: "Owner", permissions: [...permissions] },
      {
        id: "r2",
        name: "Member",
        permissions: memberPermissions,
      },
      { id: "r3", name: "Viewer", permissions: viewerPermissions },
    ],
    users: [
      { id: "u1", name: "Gazi Akter", email: "gazi@example.com", roleId: "r1" },
      {
        id: "u2",
        name: "Nusrat Gazi",
        email: "nusrat@example.com",
        roleId: "r2",
      },
    ],
    categories: [
      { id: "c1", name: "Salary", type: "income", color: "#36796a" },
      { id: "c2", name: "Freelance", type: "income", color: "#80a68a" },
      { id: "c3", name: "Groceries", type: "expense", color: "#36796a" },
      { id: "c4", name: "Home & bills", type: "expense", color: "#a6ba98" },
      { id: "c5", name: "Shopping", type: "expense", color: "#e1b67c" },
      { id: "c6", name: "Transport", type: "expense", color: "#8b9fc4" },
      { id: "c7", name: "Health", type: "expense", color: "#cd9088" },
    ],
    transactions: [
      {
        id: "t1",
        title: "Monthly salary",
        type: "income",
        amount: 85000,
        date: month + "-01",
        account: "Bank",
        categoryId: "c1",
        userId: "u1",
        note: "",
      },
      {
        id: "t2",
        title: "Website project",
        type: "income",
        amount: 18500,
        date: month + "-05",
        account: "Bank",
        categoryId: "c2",
        userId: "u1",
        note: "",
      },
      {
        id: "t3",
        title: "Weekly groceries",
        type: "expense",
        amount: 4250,
        date: month + "-08",
        account: "Cash",
        categoryId: "c3",
        userId: "u2",
        note: "Weekly family essentials",
      },
      {
        id: "t4",
        title: "Electricity & internet",
        type: "expense",
        amount: 3800,
        date: month + "-07",
        account: "bKash",
        categoryId: "c4",
        userId: "u1",
        note: "",
      },
      {
        id: "t5",
        title: "Home rent",
        type: "expense",
        amount: 18000,
        date: month + "-03",
        account: "Bank",
        categoryId: "c4",
        userId: "u1",
        note: "",
      },
      {
        id: "t6",
        title: "Family shopping",
        type: "expense",
        amount: 5600,
        date: month + "-06",
        account: "Bank",
        categoryId: "c5",
        userId: "u2",
        note: "",
      },
      {
        id: "t7",
        title: "Daily commute",
        type: "expense",
        amount: 1600,
        date: month + "-04",
        account: "Cash",
        categoryId: "c6",
        userId: "u1",
        note: "",
      },
      {
        id: "t8",
        title: "Pharmacy",
        type: "expense",
        amount: 1250,
        date: month + "-02",
        account: "Cash",
        categoryId: "c7",
        userId: "u2",
        note: "",
      },
    ],
    budgets: [
      { id: "b1", categoryId: "c3", month, amount: 12000 },
      { id: "b2", categoryId: "c4", month, amount: 25000 },
      { id: "b3", categoryId: "c5", month, amount: 8000 },
    ],
    goals: [
      {
        id: "g1",
        name: "Family vacation",
        target: 100000,
        saved: 65000,
        date: "2027-06-01",
      },
      {
        id: "g2",
        name: "Emergency fund",
        target: 300000,
        saved: 120000,
        date: "2027-12-01",
      },
    ],
  };
  for (let i = 1; i <= 5; i++) {
    const d = new Date(month + "-01T00:00:00");
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    data.transactions.push(
      {
        id: `history-income-${i}`,
        title: "Monthly salary",
        type: "income",
        amount: [0, 92000, 78000, 88000, 72000, 80000][i],
        date: key + "-01",
        account: "Bank",
        categoryId: "c1",
        userId: "u1",
        note: "Sample historical data",
      },
      {
        id: `history-expense-${i}`,
        title: "Monthly household expenses",
        type: "expense",
        amount: [0, 58000, 45000, 52000, 49000, 42000][i],
        date: key + "-10",
        account: "Bank",
        categoryId: "c4",
        userId: "u1",
        note: "Sample historical data",
      },
    );
  }
  return data;
}
