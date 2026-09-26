"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Wallet,
  ReceiptText,
  Shapes,
  Users,
  ShieldCheck,
  ChartNoAxesCombined,
  Target,
  Menu,
  X,
  LogOut,
  Download,
  TrendingUp,
  Check,
  House,
  Leaf,
  CalendarDays,
  Pencil,
  Trash2,
  LoaderCircle,
  Globe,
  CheckCircle2,
  Landmark,
  ShoppingBag,
  Car,
  Heart,
  Briefcase,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import PasswordDialog from "./password-dialog";
import { categoryColor } from "@/lib/theme";
import { demoData } from "@/lib/demo";
import { Data, Collection, permissions, totals, csvCell } from "@/lib/types";
type Page =
  | "overview"
  | "income"
  | "expenses"
  | "categories"
  | "budgets"
  | "goals"
  | "members"
  | "roles"
  | "reports";
const nav: { id: Page; label: string; bn: string; icon: LucideIcon }[] = [
  {
    id: "overview",
    label: "Overview",
    bn: "সারসংক্ষেপ",
    icon: LayoutDashboard,
  },
  { id: "income", label: "Income", bn: "আয়", icon: ArrowDownLeft },
  { id: "expenses", label: "Expenses", bn: "ব্যয়", icon: ArrowUpRight },
  { id: "categories", label: "Categories", bn: "ক্যাটাগরি", icon: Shapes },
  { id: "budgets", label: "Budgets", bn: "বাজেট", icon: Wallet },
  { id: "goals", label: "Savings goals", bn: "সঞ্চয়ের লক্ষ্য", icon: Target },
  { id: "reports", label: "Reports", bn: "রিপোর্ট", icon: ChartNoAxesCombined },
  { id: "members", label: "Family members", bn: "পরিবারের সদস্য", icon: Users },
  {
    id: "roles",
    label: "Roles & permissions",
    bn: "ভূমিকা ও অনুমতি",
    icon: ShieldCheck,
  },
];
const access: Record<Collection, string> = {
  transactions: "transactions.write",
  categories: "categories.write",
  budgets: "budgets.write",
  goals: "goals.write",
  users: "users.manage",
  roles: "roles.manage",
};
const collectionFor: Partial<Record<Page, Collection>> = {
  income: "transactions",
  expenses: "transactions",
  categories: "categories",
  budgets: "budgets",
  goals: "goals",
  members: "users",
  roles: "roles",
};
const money = (n: number) =>
  "৳" + new Intl.NumberFormat("en-BD", { maximumFractionDigits: 2 }).format(n);
const dateLabel = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
function IconFor({ name }: { name: string }) {
  const Icon = /grocer|food/i.test(name)
    ? Utensils
    : /home|bill|rent/i.test(name)
      ? House
      : /salary|freelance/i.test(name)
        ? Briefcase
        : /transport/i.test(name)
          ? Car
          : /health/i.test(name)
            ? Heart
            : ShoppingBag;
  return <Icon size={17} />;
}
export default function Dashboard({ demo }: { demo: boolean }) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [data, setData] = useState<Data | null>(null),
    [page, setPage] = useState<Page>("overview"),
    [month, setMonth] = useState(today().slice(0, 7)),
    [language, setLanguage] = useState(false),
    [mobile, setMobile] = useState(false),
    [search, setSearch] = useState(""),
    [account, setAccount] = useState("all"),
    [categoryFilter, setCategoryFilter] = useState("all"),
    [memberFilter, setMemberFilter] = useState("all"),
    [reportPeriod, setReportPeriod] = useState("month"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [auth, setAuth] = useState<"loading" | "setup" | "login" | "ready">(
      "loading",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(""),
    [modal, setModal] = useState<{
      collection: Collection;
      item?: Record<string, unknown>;
      type?: string;
    } | null>(null),
    [deleteItem, setDeleteItem] = useState<{
      collection: Collection;
      id: string;
    } | null>(null);
  const t = (en: string, bn: string) => (language ? bn : en);
  async function fetchData() {
    const res = await fetch("/api/data");
    const body = await res.json();
    if (!res.ok) throw Error(body.error);
    setData(body);
    setAuth("ready");
  }
  useEffect(() => {
    if (demo) {
      try {
        const saved = localStorage.getItem("gazi-family-demo-v1");
        setData(saved ? JSON.parse(saved) : demoData());
      } catch {
        setData(demoData());
      }
      setAuth("ready");
    } else {
      fetch("/api/auth")
        .then((r) => r.json())
        .then(async (b) => {
          if (b.error) throw Error(b.error);
          if (b.user) await fetchData();
          else setAuth(b.setup ? "setup" : "login");
        })
        .catch((e) => {
          setError(e.message);
          setAuth("login");
        });
    }
  }, [demo]);
  useEffect(() => {
    if (demo && data) {
      try {
        localStorage.setItem("gazi-family-demo-v1", JSON.stringify(data));
      } catch {
        setToast("Browser storage is full. Changes will not survive a reload.");
      }
    }
  }, [demo, data]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal(null);
        setDeleteItem(null);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
  const me = data?.users.find((u) => u.id === data.currentUserId),
    myRole = data?.roles.find((r) => r.id === me?.roleId);
  const can = (c: Collection) => !!myRole?.permissions.includes(access[c]);
  const entries = useMemo(
    () => data?.transactions.filter((e) => e.date.startsWith(month)) ?? [],
    [data, month],
  );
  const summary = totals(entries),
    allSummary = totals(data?.transactions ?? []);
  const reportEntries =
    page === "reports" && reportPeriod !== "month"
      ? (data?.transactions ?? []).filter(
          (e) => reportPeriod === "all" || e.date.startsWith(month.slice(0, 4)),
        )
      : entries;
  const filtered = reportEntries
    .filter(
      (e) =>
        (page !== "income" || e.type === "income") &&
        (page !== "expenses" || e.type === "expense") &&
        (account === "all" || e.account === account) &&
        (categoryFilter === "all" || e.categoryId === categoryFilter) &&
        (memberFilter === "all" || e.userId === memberFilter) &&
        (!from || e.date >= from) &&
        (!to || e.date <= to) &&
        `${e.title} ${e.note} ${data?.categories.find((c) => c.id === e.categoryId)?.name}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  function navigate(p: Page) {
    setMemberFilter("all");
    setReportPeriod("month");
    setPage(p);
    setSearch("");
    setAccount("all");
    setCategoryFilter("all");
    setFrom("");
    setTo("");
    setMobile(false);
  }
  async function mutate(
    collection: Collection,
    action: "save" | "delete",
    values?: Record<string, unknown>,
    id?: string,
  ) {
    if (!data || !can(collection))
      throw Error("Your role does not allow this action.");
    if (demo) {
      const next = structuredClone(data);
      const list = next[collection] as unknown as Record<string, unknown>[];
      if (action === "delete") {
        if (
          collection === "users" &&
          (id === data.currentUserId ||
            data.transactions.some((e) => e.userId === id))
        )
          throw Error(
            "Current members or members with transactions cannot be removed.",
          );
        if (
          collection === "categories" &&
          (data.transactions.some((e) => e.categoryId === id) ||
            data.budgets.some((e) => e.categoryId === id))
        )
          throw Error("This category is in use.");
        if (
          collection === "roles" &&
          (data.users.some((u) => u.roleId === id) ||
            data.roles.find((r) => r.id === id)?.name === "Owner")
        )
          throw Error("This role is protected or in use.");
        list.splice(
          list.findIndex((i) => i.id === id),
          1,
        );
      } else {
        const v = { ...values };
        delete v.password;
        if (
          collection === "roles" &&
          (v.name === "Owner" ||
            data.roles.find((r) => r.id === id)?.name === "Owner")
        )
          throw Error("The Owner role is protected.");
        if (
          collection === "users" &&
          (data.roles.find((r) => r.id === v.roleId)?.name === "Owner" ||
            id === data.currentUserId)
        )
          throw Error("The owner account is protected.");
        if (collection === "goals" && Number(v.saved) > Number(v.target))
          throw Error("Saved amount cannot exceed target.");
        if (
          collection === "categories" &&
          id &&
          data.categories.find((c) => c.id === id)?.type !== v.type &&
          (data.transactions.some((e) => e.categoryId === id) ||
            data.budgets.some((b) => b.categoryId === id))
        )
          throw Error("A used category cannot change type.");
        if (
          list.some(
            (i) =>
              i.id !== id &&
              ((collection === "categories" &&
                i.name === v.name &&
                i.type === v.type) ||
                (collection === "roles" && i.name === v.name) ||
                (collection === "users" &&
                  String(i.email).toLowerCase() ===
                    String(v.email).toLowerCase()) ||
                (collection === "budgets" &&
                  i.categoryId === v.categoryId &&
                  i.month === v.month)),
          )
        )
          throw Error("This record already exists.");
        const row = {
          ...v,
          id: id ?? crypto.randomUUID(),
          ...(collection === "transactions"
            ? {
                userId: id
                  ? list.find((i) => i.id === id)?.userId
                  : data.currentUserId,
              }
            : {}),
        };
        if (id) list[list.findIndex((i) => i.id === id)] = row;
        else list.push(row);
      }
      setData(next);
    } else {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collection, action, values, id }),
      });
      const body = await res.json();
      if (!res.ok) throw Error(body.error);
      await fetchData();
    }
    setToast(
      action === "delete"
        ? t("Record deleted", "তথ্য মুছে ফেলা হয়েছে")
        : t("Saved successfully", "সফলভাবে সংরক্ষিত হয়েছে"),
    );
  }
  function exportCSV() {
    if (!myRole?.permissions.includes("reports.read")) return;
    const rows = [
      [
        "Date",
        "Description",
        "Type",
        "Category",
        "Account",
        "Member",
        "Amount (BDT)",
        "Note",
      ],
      ...filtered.map((e) => [
        e.date,
        e.title,
        e.type,
        data?.categories.find((c) => c.id === e.categoryId)?.name,
        e.account,
        data?.users.find((u) => u.id === e.userId)?.name,
        e.amount,
        e.note,
      ]),
    ];
    const blob = new Blob(
      ["\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8;" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gazi-family-${reportPeriod === "all" ? "all-time" : reportPeriod === "year" ? month.slice(0, 4) : month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast("Report exported");
  }
  async function signIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: auth, ...Object.fromEntries(f) }),
      });
      const b = await res.json();
      if (!res.ok) throw Error(b.error);
      await fetchData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (auth === "loading")
    return (
      <div className="loading">
        <div className="brand-icon">
          <House />
        </div>
        <h2>Gazi Family</h2>
        <LoaderCircle className="spin" />
      </div>
    );
  if (auth !== "ready" || !data)
    return (
      <main className="auth-page">
        <div className="auth-story">
          <div className="brand">
            <span className="brand-icon">
              <House size={23} />
            </span>
            Gazi Family<span className="brand-dot">.</span>
          </div>
          <div>
            <span className="eyebrow">A LITTLE MORE TOGETHER</span>
            <h1>
              A happy home.
              <br />A healthier financial future.
            </h1>
            <p>
              Make room for what matters. Keep your family’s income, expenses,
              and shared dreams in one thoughtful place.
            </p>
          </div>
          <small>Made for your family. Built for everyday life.</small>
        </div>
        <form className="auth-form" onSubmit={signIn}>
          <span className="mini-label">YOUR FAMILY, CONNECTED</span>
          <h1>
            {auth === "setup" ? "Welcome to Gazi Family" : "Welcome home"}
          </h1>
          <p>
            {auth === "setup"
              ? "Create the owner account to get started."
              : "Sign in to your family’s financial space."}
          </p>
          {auth === "setup" && (
            <label>
              Your name
              <input
                name="name"
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
              />
            </label>
          )}
          <label>
            Email address
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              minLength={10}
              maxLength={128}
              required
              autoComplete={
                auth === "setup" ? "new-password" : "current-password"
              }
            />
          </label>
          <small>Use at least 10 characters.</small>
          {error && <div className="error">{error}</div>}
          <button className="btn primary" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={18} />
            ) : auth === "setup" ? (
              "Create family account"
            ) : (
              "Sign in"
            )}
            <ArrowRight size={17} />
          </button>
        </form>
      </main>
    );
  const category = (id: string) => data.categories.find((c) => c.id === id);
  const monthName = new Date(month + "-01T00:00:00").toLocaleDateString(
    language ? "bn-BD" : "en-US",
    { month: "long", year: "numeric" },
  );
  const currentNav = nav.find((n) => n.id === page)!;
  const expenseGroups = data.categories
    .filter((c) => c.type === "expense")
    .map((c) => ({
      ...c,
      total: entries
        .filter((e) => e.type === "expense" && e.categoryId === c.id)
        .reduce((s, e) => s + e.amount, 0),
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
  const trend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(month + "-01T00:00:00");
    d.setMonth(d.getMonth() - 5 + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      label: d.toLocaleDateString("en-US", { month: "short" }),
      ...totals(data.transactions.filter((e) => e.date.startsWith(key))),
    };
  });
  const chartMax =
    Math.max(...trend.map((v) => Math.max(v.income, v.expense)), 10000) * 1.15;
  const openAdd = () =>
    setModal({
      collection: collectionFor[page] ?? "transactions",
      type: page === "income" ? "income" : "expense",
    });
  const actions = (collection: Collection, item: object) =>
    can(collection) ? (
      <div className="row-actions">
        <button
          title="Edit"
          aria-label="Edit record"
          onClick={() =>
            setModal({ collection, item: item as Record<string, unknown> })
          }
        >
          <Pencil size={14} />
        </button>
        <button
          title="Delete"
          aria-label="Delete record"
          onClick={() =>
            setDeleteItem({ collection, id: (item as { id: string }).id })
          }
        >
          <Trash2 size={14} />
        </button>
      </div>
    ) : null;
  const transactionsTable = (limit?: number) => (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>{t("Transaction", "লেনদেন")}</th>
            <th>{t("Category", "ক্যাটাগরি")}</th>
            <th>{t("Date", "তারিখ")}</th>
            <th>{t("Account", "অ্যাকাউন্ট")}</th>
            <th className="align-right">{t("Amount", "পরিমাণ")}</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(0, limit).map((e) => (
            <tr key={e.id}>
              <td>
                <div className="transaction-name">
                  <span
                    className={
                      "transaction-icon " + (e.type === "income" ? "green" : "")
                    }
                  >
                    <IconFor name={category(e.categoryId)?.name ?? ""} />
                  </span>
                  <div>
                    <strong>{e.title}</strong>
                    <small>
                      {data.users.find((u) => u.id === e.userId)?.name ??
                        "Family member"}
                    </small>
                  </div>
                </div>
              </td>
              <td>
                <span className="category-tag">
                  {category(e.categoryId)?.name}
                </span>
              </td>
              <td className="muted nowrap">{dateLabel(e.date)}</td>
              <td className="muted">{e.account}</td>
              <td
                className={
                  "amount align-right " +
                  (e.type === "income" ? "positive" : "")
                }
              >
                {e.type === "income" ? "+" : "−"}
                {money(e.amount)}
              </td>
              <td>{actions("transactions", e)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!filtered.length && (
        <div className="empty">
          <ReceiptText size={30} />
          <h3>{t("No transactions yet", "এখনো কোনো লেনদেন নেই")}</h3>
          <p>
            {t(
              "Add a transaction or adjust your filters.",
              "নতুন লেনদেন যোগ করুন অথবা ফিল্টার বদলান।",
            )}
          </p>
        </div>
      )}
    </div>
  );
  const budgetList = (full = false) => (
    <div className={full ? "budget-grid" : "budget-list"}>
      {data.budgets
        .filter((b) => b.month === month)
        .map((b) => {
          const c = category(b.categoryId),
            spent = entries
              .filter(
                (e) => e.type === "expense" && e.categoryId === b.categoryId,
              )
              .reduce((s, e) => s + e.amount, 0),
            pct = (spent / b.amount) * 100;
          return (
            <div
              className={full ? "card budget-item large" : "budget-item"}
              key={b.id}
            >
              <div className="budget-top">
                <span className="budget-name">
                  <span
                    className="dot"
                    style={{ background: categoryColor(c?.color) }}
                  />
                  {c?.name}
                </span>
                {full ? (
                  actions("budgets", b)
                ) : (
                  <span className={pct > 100 ? "negative" : "muted"}>
                    {Math.round(pct)}%
                  </span>
                )}
              </div>
              <div className="budget-values">
                <strong>{money(spent)}</strong>
                <span> / {money(b.amount)}</span>
              </div>
              <div className="progress-track">
                <div
                  style={{
                    width: Math.min(pct, 100) + "%",
                    background: pct > 100 ? "#b70704" : categoryColor(c?.color),
                  }}
                />
              </div>
              {full && (
                <small className={pct > 100 ? "negative" : "muted"}>
                  {money(Math.abs(b.amount - spent))}{" "}
                  {pct > 100 ? "over budget" : "remaining"}
                </small>
              )}
            </div>
          );
        })}
      {!data.budgets.some((b) => b.month === month) && (
        <div className="empty">
          <Wallet />
          <p>
            {t(
              "Set a budget to make every taka count.",
              "খরচ নিয়ন্ত্রণে একটি বাজেট তৈরি করুন।",
            )}
          </p>
        </div>
      )}
    </div>
  );
  return (
    <div className="app-shell">
      {mobile && (
        <div className="sidebar-scrim" onClick={() => setMobile(false)} />
      )}
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
        >
          <span className="brand-icon">
            <House size={22} />
          </span>
          <span>
            Gazi Family<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="family-space">
          <span className="family-avatar">GF</span>
          <div>
            <strong>{t("Our family space", "আমাদের পরিবার")}</strong>
            <small>
              <span className="status-dot" />{" "}
              {t("Personal account", "ব্যক্তিগত অ্যাকাউন্ট")}
            </small>
          </div>
          <ChevronDown size={14} />
        </div>
        <span className="nav-label">{t("WORKSPACE", "ওয়ার্কস্পেস")}</span>
        <nav>
          {nav
            .slice(0, 7)
            .filter(
              (n) =>
                n.id !== "reports" ||
                myRole?.permissions.includes("reports.read"),
            )
            .map((n) => (
              <button
                key={n.id}
                className={"nav-item " + (page === n.id ? "active" : "")}
                onClick={() => navigate(n.id)}
              >
                <n.icon size={19} />
                <span>{language ? n.bn : n.label}</span>
                {n.id === "overview" && <span className="active-dot" />}
              </button>
            ))}
        </nav>
        <span className="nav-label manage-label">
          {t("FAMILY MANAGEMENT", "পরিবার ব্যবস্থাপনা")}
        </span>
        <nav>
          {nav.slice(7).map((n) => (
            <button
              key={n.id}
              className={"nav-item " + (page === n.id ? "active" : "")}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={19} />
              <span>{language ? n.bn : n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="together-card">
            <span className="little-leaf">
              <Leaf size={21} />
            </span>
            <h4>
              {t("Small steps. Shared dreams.", "ছোট পদক্ষেপ। একসাথে স্বপ্ন।")}
            </h4>
            <p>
              {t(
                "A little planning today, a brighter tomorrow together.",
                "আজকের একটু পরিকল্পনা, আগামী দিনের সুন্দর পরিবার।",
              )}
            </p>
            <button onClick={() => navigate("goals")}>
              {t("Explore savings goals", "সঞ্চয়ের লক্ষ্য দেখুন")}
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="profile">
            <span className="profile-avatar">
              {me?.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <strong>{me?.name}</strong>
              <small>
                {myRole?.name ?? "Member"}
                {demo ? " · Demo" : ""}
              </small>
            </div>
            {!demo && (
              <button
                title="Sign out"
                onClick={async () => {
                  try {
                    const r = await fetch("/api/auth", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "logout" }),
                    });
                    if (!r.ok) throw Error();
                    setData(null);
                    setAuth("login");
                  } catch {
                    setToast("Could not sign out. Please try again.");
                  }
                }}
              >
                <LogOut size={17} />
              </button>
            )}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <House size={16} />
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{language ? currentNav.bn : currentNav.label}</strong>
          </div>
          <div className="topbar-right">
            {demo && (
              <span className="demo-badge">
                <span /> Demo workspace
              </span>
            )}
            <button
              className="language-button"
              onClick={() => setLanguage(!language)}
            >
              <Globe size={16} />
              {language ? "English" : "বাংলা"}
            </button>
            <span className="topbar-divider" />
            <button
              className="top-avatar"
              title="Change password"
              onClick={() =>
                demo
                  ? setToast(
                      "Password management is available in the connected workspace.",
                    )
                  : setPasswordOpen(true)
              }
            >
              {me?.name[0]}
            </button>
          </div>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === "overview"
                  ? t("YOUR FAMILY, AT A GLANCE", "এক নজরে আপনার পরিবার")
                  : t(
                      "EVERY LITTLE DETAIL MATTERS",
                      "প্রতিটি হিসাব গুরুত্বপূর্ণ",
                    )}
              </div>
              <h1>
                {page === "overview"
                  ? t(
                      "A little more peace of mind.",
                      "পরিবারের হিসাবে, একটু স্বস্তি।",
                    )
                  : language
                    ? currentNav.bn
                    : currentNav.label}
                {page === "overview" && (
                  <span className="heading-spark">✳</span>
                )}
              </h1>
              <p>
                {page === "overview"
                  ? t(
                      "Welcome back, " +
                        (me?.name.split(" ")[0] ?? "Gazi") +
                        ". Let’s make room for what matters.",
                      "স্বাগতম! পরিবারের প্রতিটি আয়-ব্যয় থাকুক আপনার হাতের মুঠোয়।",
                    )
                  : t(
                      "Keep your family’s finances organized, together.",
                      "পরিবারের আর্থিক হিসাব গুছিয়ে রাখুন একসাথে।",
                    )}
              </p>
            </div>
            <div className="heading-actions">
              <label className="month-picker">
                <CalendarDays size={16} />
                <span>{monthName}</span>
                <input
                  aria-label="Select month"
                  type="month"
                  value={month}
                  onChange={(e) => {
                    if (e.target.value) setMonth(e.target.value);
                  }}
                />
                <ChevronDown size={14} />
              </label>
              {(page === "overview"
                ? can("transactions")
                : collectionFor[page] && can(collectionFor[page]!)) && (
                <button className="btn primary" onClick={openAdd}>
                  <Plus size={17} />
                  {page === "overview" ||
                  page === "income" ||
                  page === "expenses"
                    ? t("Add transaction", "লেনদেন যোগ করুন")
                    : t("Add new", "নতুন যোগ করুন")}
                </button>
              )}
              {page === "reports" &&
                myRole?.permissions.includes("reports.read") && (
                  <button className="btn primary" onClick={exportCSV}>
                    <Download size={16} />
                    Export CSV
                  </button>
                )}
            </div>
          </div>
          {page === "overview" && (
            <>
              <section className="stat-grid">
                <div className="stat-card balance-card">
                  <div className="stat-top">
                    <span>{t("Total balance", "মোট ব্যালেন্স")}</span>
                    <span className="stat-icon">
                      <Wallet size={19} />
                    </span>
                  </div>
                  <h2>{money(allSummary.balance)}</h2>
                  <div className="stat-foot">
                    <span className="balance-pill">
                      <span /> {t("All accounts", "সকল অ্যাকাউন্ট")}
                    </span>
                    <span>{t("All time", "সর্বমোট")}</span>
                  </div>
                  <div className="balance-decoration" />
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <span>{t("Total income", "মোট আয়")}</span>
                    <span className="stat-icon pale-green">
                      <ArrowDownLeft size={19} />
                    </span>
                  </div>
                  <h2>{money(summary.income)}</h2>
                  <div className="stat-foot">
                    <span className="positive">
                      <TrendingUp size={14} />{" "}
                      {entries.filter((e) => e.type === "income").length}{" "}
                      {t("transactions", "লেনদেন")}
                    </span>
                    <span>{t("This month", "এই মাসে")}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <span>{t("Total expenses", "মোট ব্যয়")}</span>
                    <span className="stat-icon pale-orange">
                      <ArrowUpRight size={19} />
                    </span>
                  </div>
                  <h2>{money(summary.expense)}</h2>
                  <div className="stat-foot">
                    <span className="soft-orange">
                      <ReceiptText size={14} />{" "}
                      {entries.filter((e) => e.type === "expense").length}{" "}
                      {t("transactions", "লেনদেন")}
                    </span>
                    <span>{t("This month", "এই মাসে")}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-top">
                    <span>{t("Net savings", "নিট সঞ্চয়")}</span>
                    <span className="stat-icon pale-blue">
                      <Landmark size={19} />
                    </span>
                  </div>
                  <h2>{money(summary.balance)}</h2>
                  <div className="stat-foot">
                    <span className="savings-rate">
                      {summary.income
                        ? Math.round((summary.balance / summary.income) * 100)
                        : 0}
                      % {t("savings rate", "সঞ্চয়ের হার")}
                    </span>
                    <span>{t("This month", "এই মাসে")}</span>
                  </div>
                </div>
              </section>
              <section className="charts-grid">
                <div className="card cashflow-card">
                  <div className="card-heading">
                    <div>
                      <h3>{t("Income vs. expenses", "আয় ও ব্যয়ের তুলনা")}</h3>
                      <p>
                        {t(
                          "A bigger picture of your family’s cash flow",
                          "পরিবারের আয়-ব্যয়ের সামগ্রিক চিত্র",
                        )}
                      </p>
                    </div>
                    <span className="period-chip">
                      {t("Last 6 months", "গত ৬ মাস")}
                      <ChevronDown size={13} />
                    </span>
                  </div>
                  <div className="chart-legend">
                    <span>
                      <i className="legend-square income" />
                      Income
                    </span>
                    <span>
                      <i className="legend-square expense" />
                      Expenses
                    </span>
                  </div>
                  <div className="bar-chart">
                    <div className="chart-y">
                      {[1, 0.75, 0.5, 0.25, 0].map((v) => (
                        <span key={v}>
                          {Math.round((chartMax * v) / 1000)}k
                        </span>
                      ))}
                    </div>
                    <div className="chart-plot">
                      <div className="chart-lines">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <i key={i} />
                        ))}
                      </div>
                      <div className="chart-bars">
                        {trend.map((v, i) => (
                          <div
                            className={
                              "bar-group " + (i === 5 ? "selected" : "")
                            }
                            key={v.label}
                          >
                            <div className="bar-pair">
                              <div
                                className="bar income"
                                style={{
                                  height: (v.income / chartMax) * 100 + "%",
                                }}
                                title={`${v.label} income: ${money(v.income)}`}
                              />
                              <div
                                className="bar expense"
                                style={{
                                  height: (v.expense / chartMax) * 100 + "%",
                                }}
                                title={`${v.label} expenses: ${money(v.expense)}`}
                              />
                            </div>
                            <span>{v.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="chart-insight">
                    <span>
                      <TrendingUp size={15} />
                    </span>
                    {summary.balance >= 0
                      ? t(
                          "You’re spending less than you earn. Keep it going!",
                          "আয়ের চেয়ে ব্যয় কম হচ্ছে। এভাবেই এগিয়ে যান!",
                        )
                      : t(
                          "Expenses are above income. A budget can help.",
                          "ব্যয় আয়ের চেয়ে বেশি। বাজেট পরিকল্পনা করুন।",
                        )}
                  </div>
                </div>
                <div className="card spending-card">
                  <div className="card-heading">
                    <div>
                      <h3>{t("Where it goes", "খরচ কোথায় হচ্ছে")}</h3>
                      <p>
                        {t("Expenses by category", "ক্যাটাগরি অনুযায়ী ব্যয়")}
                      </p>
                    </div>
                    <span className="quiet-icon">
                      <Shapes size={18} />
                    </span>
                  </div>
                  <div className="donut-wrap">
                    <svg
                      viewBox="0 0 180 180"
                      role="img"
                      aria-label="Expense breakdown"
                    >
                      <circle
                        cx="90"
                        cy="90"
                        r="69"
                        fill="none"
                        stroke="#eee6db"
                        strokeWidth="21"
                      />
                      {expenseGroups.map((c, i) => {
                        const circumference = 2 * Math.PI * 69,
                          offset =
                            (expenseGroups
                              .slice(0, i)
                              .reduce((s, g) => s + g.total, 0) /
                              summary.expense) *
                            circumference;
                        return (
                          <circle
                            key={c.id}
                            cx="90"
                            cy="90"
                            r="69"
                            fill="none"
                            stroke={categoryColor(c.color)}
                            strokeWidth="21"
                            strokeDasharray={`${Math.max(0, (c.total / summary.expense) * circumference - 4)} ${circumference}`}
                            strokeDashoffset={-offset}
                            transform="rotate(-90 90 90)"
                          />
                        );
                      })}
                    </svg>
                    <div className="donut-label">
                      <span>Total spent</span>
                      <strong>{money(summary.expense)}</strong>
                      <small>This month</small>
                    </div>
                  </div>
                  <div className="spending-legend">
                    {expenseGroups.slice(0, 4).map((c) => (
                      <div key={c.id}>
                        <span>
                          <i
                            className="dot"
                            style={{ background: categoryColor(c.color) }}
                          />
                          {c.name}
                        </span>
                        <strong>
                          {Math.round((c.total / summary.expense) * 100)}%
                        </strong>
                      </div>
                    ))}
                    {expenseGroups.length > 4 && (
                      <div>
                        <span>
                          <i
                            className="dot"
                            style={{ background: "#d68b83" }}
                          />
                          Other categories
                        </span>
                        <strong>
                          {Math.round(
                            (expenseGroups
                              .slice(4)
                              .reduce((s, c) => s + c.total, 0) /
                              summary.expense) *
                              100,
                          )}
                          %
                        </strong>
                      </div>
                    )}
                    {!expenseGroups.length && (
                      <p className="muted">
                        Your spending breakdown will appear here.
                      </p>
                    )}
                  </div>
                </div>
              </section>
              <section className="lower-grid">
                <div className="card recent-card">
                  <div className="card-heading">
                    <div>
                      <h3>{t("Recent transactions", "সাম্প্রতিক লেনদেন")}</h3>
                      <p>
                        {t(
                          "The little details, all in one place",
                          "সব লেনদেন, এক জায়গায়",
                        )}
                      </p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() =>
                        navigate(
                          myRole?.permissions.includes("reports.read")
                            ? "reports"
                            : "expenses",
                        )
                      }
                    >
                      {t("View all", "সব দেখুন")}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                  {transactionsTable(5)}
                </div>
                <div className="card budget-card">
                  <div className="card-heading">
                    <div>
                      <h3>{t("Monthly budgets", "মাসিক বাজেট")}</h3>
                      <p>
                        {t("A plan for every taka", "প্রতিটি টাকার পরিকল্পনা")}
                      </p>
                    </div>
                    <button
                      className="quiet-icon"
                      aria-label="View budgets"
                      onClick={() => navigate("budgets")}
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                  {budgetList()}
                  <button
                    className="budget-bottom"
                    onClick={() => navigate("budgets")}
                  >
                    {t("Manage budgets", "বাজেট পরিচালনা")}
                    <ArrowRight size={15} />
                  </button>
                </div>
              </section>
              <div className="gentle-banner">
                <span className="banner-leaf">
                  <Leaf size={22} />
                </span>
                <div>
                  <strong>
                    {t(
                      "Building a better tomorrow, together.",
                      "একসাথে গড়ি সুন্দর আগামী।",
                    )}
                  </strong>
                  <span>
                    {t(
                      "Your family’s dreams deserve a plan. Start with a small savings goal.",
                      "পরিবারের স্বপ্নের জন্য আজ থেকেই একটু একটু করে সঞ্চয় করুন।",
                    )}
                  </span>
                </div>
                <button onClick={() => navigate("goals")}>
                  {t("Set a goal", "লক্ষ্য তৈরি করুন")}
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </>
          )}
          {(page === "income" || page === "expenses" || page === "reports") && (
            <>
              {page === "reports" &&
              !myRole?.permissions.includes("reports.read") ? (
                <div className="card empty">
                  <ShieldCheck />
                  <h3>Report access is restricted</h3>
                </div>
              ) : (
                <>
                  <div className="report-summary">
                    <div className="card">
                      <span>Income</span>
                      <h2 className="positive">
                        {money(totals(filtered).income)}
                      </h2>
                    </div>
                    <div className="card">
                      <span>Expenses</span>
                      <h2>{money(totals(filtered).expense)}</h2>
                    </div>
                    <div className="card">
                      <span>Net balance</span>
                      <h2>{money(totals(filtered).balance)}</h2>
                    </div>
                  </div>
                  <div className="card">
                    <div className="filters">
                      <div className="search-input">
                        <Search size={17} />
                        <input
                          placeholder={t(
                            "Search transactions…",
                            "লেনদেন খুঁজুন…",
                          )}
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                      <select
                        aria-label="Filter account"
                        value={account}
                        onChange={(e) => setAccount(e.target.value)}
                      >
                        <option value="all">All accounts</option>
                        {["Cash", "Bank", "bKash", "Nagad"].map((a) => (
                          <option key={a}>{a}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Filter category"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                      >
                        <option value="all">All categories</option>
                        {data.categories.map((c) => (
                          <option value={c.id} key={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {page === "reports" && (
                        <>
                          <select
                            aria-label="Report period"
                            value={reportPeriod}
                            onChange={(e) => setReportPeriod(e.target.value)}
                          >
                            <option value="month">Selected month</option>
                            <option value="year">Selected year</option>
                            <option value="all">All time</option>
                          </select>
                          <select
                            aria-label="Filter family member"
                            value={memberFilter}
                            onChange={(e) => setMemberFilter(e.target.value)}
                          >
                            <option value="all">All members</option>
                            {data.users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                      {page === "reports" && (
                        <>
                          <label className="date-filter">
                            From
                            <input
                              type="date"
                              value={from}
                              onChange={(e) => setFrom(e.target.value)}
                            />
                          </label>
                          <label className="date-filter">
                            To
                            <input
                              type="date"
                              value={to}
                              onChange={(e) => setTo(e.target.value)}
                            />
                          </label>
                        </>
                      )}
                    </div>
                    {transactionsTable()}
                    <div className="table-footer">
                      {filtered.length} transactions ·{" "}
                      {page === "reports" && reportPeriod === "all"
                        ? "All time"
                        : page === "reports" && reportPeriod === "year"
                          ? month.slice(0, 4)
                          : monthName}
                      {page === "reports" && (
                        <button
                          className="text-button"
                          onClick={() => window.print()}
                        >
                          Print report <ArrowUpRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {page === "reports" && (
                    <div className="card report-breakdown">
                      <h3>Category breakdown</h3>
                      {data.categories.map((c) => {
                        const amount = filtered
                          .filter((e) => e.categoryId === c.id)
                          .reduce((s, e) => s + e.amount, 0);
                        return amount > 0 ? (
                          <div className="breakdown-row" key={c.id}>
                            <span>
                              <i
                                className="dot"
                                style={{ background: categoryColor(c.color) }}
                              />
                              {c.name}{" "}
                              <small className="muted">({c.type})</small>
                            </span>
                            <strong>{money(amount)}</strong>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {page === "budgets" && (
            <>
              <div className="info-strip">
                <Wallet size={19} />
                {t(
                  "Monthly limits help your family stay on track. Spending is calculated automatically.",
                  "মাসিক সীমা নির্ধারণ করুন। লেনদেন থেকে খরচ স্বয়ংক্রিয়ভাবে হিসাব হবে।",
                )}
              </div>
              {budgetList(true)}
            </>
          )}
          {page === "goals" && (
            <>
              <div className="info-strip">
                <Leaf size={19} />
                {t(
                  "Save for the things you love. Update your saved amount as you make progress. Goals are tracked separately from your account balance.",
                  "পছন্দের স্বপ্নের জন্য সঞ্চয় করুন। জমার পরিমাণ আপডেট করুন। এই হিসাব অ্যাকাউন্ট ব্যালেন্স থেকে আলাদা।",
                )}
              </div>
              <div className="goal-grid">
                {data.goals.map((g, i) => (
                  <div className="card goal-card" key={g.id}>
                    <div className="goal-top">
                      <span className="goal-icon">
                        {i % 2 ? <ShieldCheck /> : <Target />}
                      </span>
                      {actions("goals", g)}
                    </div>
                    <h3>{g.name}</h3>
                    <p className="muted">Target date · {dateLabel(g.date)}</p>
                    <h2>
                      {money(g.saved)} <small>of {money(g.target)}</small>
                    </h2>
                    <div className="progress-track">
                      <div
                        style={{
                          width:
                            Math.min((g.saved / g.target) * 100, 100) + "%",
                        }}
                      />
                    </div>
                    <div className="goal-meta">
                      <span>
                        {Math.round((g.saved / g.target) * 100)}% saved
                      </span>
                      <span>{money(g.target - g.saved)} to go</span>
                    </div>
                  </div>
                ))}
                {!data.goals.length && (
                  <div className="card empty">
                    <Target />
                    <h3>Your next family dream starts here.</h3>
                    <p>Add your first savings goal.</p>
                  </div>
                )}
              </div>
            </>
          )}
          {page === "categories" && (
            <div className="category-grid">
              {["income", "expense"].map((type) => (
                <div className="card" key={type}>
                  <div className="card-heading">
                    <div>
                      <h3>
                        {type === "income"
                          ? t("Income categories", "আয়ের ক্যাটাগরি")
                          : t("Expense categories", "ব্যয়ের ক্যাটাগরি")}
                      </h3>
                      <p>Organize every transaction</p>
                    </div>
                    <Shapes size={19} />
                  </div>
                  {data.categories
                    .filter((c) => c.type === type)
                    .map((c) => (
                      <div className="category-row" key={c.id}>
                        <span
                          className="transaction-icon"
                          style={{ color: categoryColor(c.color) }}
                        >
                          <IconFor name={c.name} />
                        </span>
                        <div>
                          <strong>{c.name}</strong>
                          <small>
                            {
                              data.transactions.filter(
                                (e) => e.categoryId === c.id,
                              ).length
                            }{" "}
                            transactions
                          </small>
                        </div>
                        {actions("categories", c)}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          )}
          {page === "members" && (
            <div className="card">
              <div className="card-heading">
                <div>
                  <h3>{t("Your family", "আপনার পরিবার")}</h3>
                  <p>
                    {data.users.length} members sharing a better financial
                    future
                  </p>
                </div>
                <Users size={21} />
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="transaction-name">
                            <span className="profile-avatar">{u.name[0]}</span>
                            <strong>
                              {u.name}
                              {u.id === me?.id && (
                                <small className="muted"> (you)</small>
                              )}
                            </strong>
                          </div>
                        </td>
                        <td className="muted">{u.email}</td>
                        <td>
                          <span className="category-tag">
                            {data.roles.find((r) => r.id === u.roleId)?.name}
                          </span>
                        </td>
                        <td>
                          <span className="active-status">
                            <span />
                            Active
                          </span>
                        </td>
                        <td>
                          {data.roles.find((r) => r.id === u.roleId)?.name !==
                            "Owner" && actions("users", u)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {page === "roles" && (
            <>
              <div className="info-strip">
                <ShieldCheck size={19} />
                All members can view the family ledger. Permissions control
                changes and report access. The Owner role is protected.
              </div>
              <div className="role-grid">
                {data.roles.map((r) => (
                  <div className="card role-card" key={r.id}>
                    <div className="goal-top">
                      <span className="goal-icon">
                        <ShieldCheck />
                      </span>
                      {r.name !== "Owner" && actions("roles", r)}
                    </div>
                    <h3>{r.name}</h3>
                    <p className="muted">
                      {data.users.filter((u) => u.roleId === r.id).length}{" "}
                      members
                    </p>
                    <div className="permission-list">
                      {permissions.map((p) => (
                        <div
                          key={p}
                          className={
                            !r.permissions.includes(p)
                              ? "disabled-permission"
                              : ""
                          }
                        >
                          {r.permissions.includes(p) ? (
                            <Check size={15} />
                          ) : (
                            <X size={15} />
                          )}
                          <span>
                            {p.replace(".", " · ").replace("write", "manage")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          <footer className="page-footer">
            <span>
              <span className="footer-brand">Gazi Family</span> ·{" "}
              {t("A little more together.", "একটু বেশি একসাথে।")}
            </span>
            <span>
              <ShieldCheck size={13} />
              {demo
                ? t(
                    "Demo data · saved in this browser",
                    "ডেমো তথ্য · এই ব্রাউজারে সংরক্ষিত",
                  )
                : t(
                    "Your private family workspace",
                    "আপনার ব্যক্তিগত পারিবারিক হিসাব",
                  )}
            </span>
          </footer>
        </main>
      </div>
      {passwordOpen && <PasswordDialog close={() => setPasswordOpen(false)} />}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
      {modal && (
        <RecordModal
          modal={modal}
          data={data}
          month={month}
          close={() => setModal(null)}
          save={async (values) => {
            await mutate(
              modal.collection,
              "save",
              values,
              modal.item?.id as string | undefined,
            );
            setModal(null);
          }}
        />
      )}
      {deleteItem && (
        <div className="modal-backdrop">
          <div
            className="modal confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <span className="delete-icon">
              <Trash2 />
            </span>
            <h2 id="delete-title">Delete this record?</h2>
            <p>
              This permanently removes the record. Linked categories, roles and
              members cannot be deleted.
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setDeleteItem(null)}>
                Cancel
              </button>
              <button
                className="btn danger"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await mutate(
                      deleteItem.collection,
                      "delete",
                      undefined,
                      deleteItem.id,
                    );
                    setDeleteItem(null);
                  } catch (e) {
                    setToast((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Delete record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function RecordModal({
  modal,
  data,
  month,
  close,
  save,
}: {
  modal: {
    collection: Collection;
    item?: Record<string, unknown>;
    type?: string;
  };
  data: Data;
  month: string;
  close: () => void;
  save: (values: Record<string, unknown>) => Promise<void>;
}) {
  const { collection, item } = modal;
  const [type, setType] = useState(
      String(item?.type ?? modal.type ?? "expense"),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const val = (key: string, fallback: string | number = "") =>
    String(item?.[key] ?? fallback);
  const titles: Record<Collection, string> = {
    transactions: "transaction",
    categories: "category",
    budgets: "budget",
    goals: "savings goal",
    users: "family member",
    roles: "role",
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const values: Record<string, unknown> = Object.fromEntries(form);
    for (const k of ["amount", "target", "saved"])
      if (k in values) values[k] = Number(values[k]);
    if (collection === "roles") values.permissions = form.getAll("permissions");
    if (collection === "users" && !values.password) delete values.password;
    try {
      await save(values);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) close();
      }}
    >
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onSubmit={submit}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            const nodes = e.currentTarget.querySelectorAll<HTMLElement>(
              "button:not(:disabled),input,select,textarea",
            );
            const first = nodes[0],
              last = nodes[nodes.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">GAZI FAMILY</span>
            <h2 id="modal-title">
              {item ? "Edit" : "Add"} {titles[collection]}
            </h2>
          </div>
          <button type="button" aria-label="Close dialog" onClick={close}>
            <X size={20} />
          </button>
        </div>
        {(collection === "transactions" || collection === "categories") && (
          <div className="type-toggle">
            <button
              type="button"
              className={type === "income" ? "selected" : ""}
              onClick={() => setType("income")}
            >
              <ArrowDownLeft size={16} />
              Income
            </button>
            <button
              type="button"
              className={type === "expense" ? "selected" : ""}
              onClick={() => setType("expense")}
            >
              <ArrowUpRight size={16} />
              Expense
            </button>
            <input type="hidden" name="type" value={type} />
          </div>
        )}
        <div className="form-fields">
          {collection === "transactions" && (
            <>
              <label>
                Description
                <input
                  autoFocus
                  name="title"
                  placeholder="e.g. Weekly groceries"
                  defaultValue={val("title")}
                  required
                  maxLength={120}
                />
              </label>
              <div className="form-grid">
                <label>
                  Amount (৳)
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="999999999999.99"
                    defaultValue={val("amount")}
                    required
                  />
                </label>
                <label>
                  Date
                  <input
                    name="date"
                    type="date"
                    defaultValue={val("date", today())}
                    required
                  />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  Category
                  <select
                    name="categoryId"
                    aria-label="Category"
                    key={type}
                    defaultValue={
                      data.categories.find((c) => c.id === item?.categoryId)
                        ?.type === type
                        ? val("categoryId")
                        : ""
                    }
                    required
                  >
                    <option value="">Select category</option>
                    {data.categories
                      .filter((c) => c.type === type)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Account
                  <select
                    aria-label="Account"
                    name="account"
                    defaultValue={val("account", "Cash")}
                  >
                    {["Cash", "Bank", "bKash", "Nagad"].map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Note <span className="muted">(optional)</span>
                <textarea
                  name="note"
                  defaultValue={val("note")}
                  maxLength={1000}
                  placeholder="A little detail for later…"
                />
              </label>
            </>
          )}
          {collection === "categories" && (
            <>
              <label>
                Category name
                <input
                  autoFocus
                  name="name"
                  required
                  maxLength={120}
                  defaultValue={val("name")}
                />
              </label>
              <label>
                Category color
                <input
                  name="color"
                  type="color"
                  defaultValue={categoryColor(val("color", "#b70704"))}
                />
              </label>
            </>
          )}
          {collection === "budgets" && (
            <>
              <label>
                Expense category
                <select
                  autoFocus
                  name="categoryId"
                  aria-label="Expense category"
                  defaultValue={val("categoryId")}
                  required
                >
                  <option value="">Select category</option>
                  {data.categories
                    .filter((c) => c.type === "expense")
                    .map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </label>
              <div className="form-grid">
                <label>
                  Monthly limit (৳)
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="999999999999.99"
                    required
                    defaultValue={val("amount")}
                  />
                </label>
                <label>
                  Month
                  <input
                    type="month"
                    name="month"
                    defaultValue={val("month", month)}
                    required
                  />
                </label>
              </div>
            </>
          )}
          {collection === "goals" && (
            <>
              <label>
                Goal name
                <input
                  autoFocus
                  name="name"
                  required
                  maxLength={120}
                  placeholder="e.g. Family vacation"
                  defaultValue={val("name")}
                />
              </label>
              <div className="form-grid">
                <label>
                  Target amount (৳)
                  <input
                    name="target"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="999999999999.99"
                    required
                    defaultValue={val("target")}
                  />
                </label>
                <label>
                  Already saved (৳)
                  <input
                    name="saved"
                    type="number"
                    step="0.01"
                    min="0"
                    max="999999999999.99"
                    required
                    defaultValue={val("saved", 0)}
                  />
                </label>
              </div>
              <label>
                Target date
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={val("date", today())}
                />
              </label>
            </>
          )}
          {collection === "users" && (
            <>
              <label>
                Full name
                <input
                  autoFocus
                  name="name"
                  required
                  maxLength={120}
                  defaultValue={val("name")}
                />
              </label>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  defaultValue={val("email")}
                />
              </label>
              <label>
                {item ? "New password (leave blank to keep)" : "Password"}
                <input
                  name="password"
                  type="password"
                  required={!item}
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="At least 10 characters"
                />
              </label>
              <label>
                Role
                <select
                  aria-label="Role"
                  name="roleId"
                  defaultValue={val("roleId")}
                  required
                >
                  <option value="">Choose role</option>
                  {data.roles
                    .filter((r) => r.name !== "Owner")
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </label>
            </>
          )}
          {collection === "roles" && (
            <>
              <label>
                Role name
                <input
                  autoFocus
                  name="name"
                  required
                  maxLength={120}
                  defaultValue={val("name")}
                />
              </label>
              <div className="permission-checkboxes">
                {permissions.map((p) => (
                  <label key={p}>
                    <input
                      type="checkbox"
                      name="permissions"
                      value={p}
                      defaultChecked={(
                        item?.permissions as string[] | undefined
                      )?.includes(p)}
                    />
                    {p.replace(".", " · ").replace("write", "manage")}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="modal-actions">
          <button className="btn" type="button" onClick={close} disabled={busy}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Check size={16} />
            )}
            Save {titles[collection]}
          </button>
        </div>
      </form>
    </div>
  );
}
