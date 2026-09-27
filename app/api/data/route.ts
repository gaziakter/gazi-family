import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUser, hashPassword, sameOrigin } from "@/lib/auth";
import { accountBalances, assertSufficientBalances } from "@/lib/accounts";
import {
  permissions,
  legacyTransactionPermissions,
  expandPermissions,
} from "@/lib/types";
class PermissionDenied extends Error {}
const text = z.string().trim().min(1).max(120);
const money = z.coerce
  .number()
  .finite()
  .positive()
  .max(999999999999.99)
  .refine(
    (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.01,
    "Use at most two decimal places",
  );
const date = z.iso.date().transform((s) => new Date(s + "T00:00:00Z"));
const schemas = {
  accounts: z.object({
    name: text,
    type: z.enum(["Cash", "Bank", "Mobile"]),
    bankName: z.string().trim().max(120).default(""),
    accountNumber: z.string().trim().max(80).default(""),
    branch: z.string().trim().max(120).default(""),
    openingBalance: z.coerce
      .number()
      .finite()
      .min(0)
      .max(999999999999.99)
      .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.01),
    active: z.boolean().default(true),
  }),
  transfers: z
    .object({
      fromAccountId: text,
      toAccountId: text,
      amount: money,
      date,
      note: z.string().max(1000).default(""),
    })
    .refine(
      (t) => t.fromAccountId !== t.toAccountId,
      "Choose two different accounts.",
    ),
  transactions: z.object({
    title: text,
    type: z.enum(["income", "expense"]),
    amount: money,
    date,
    account: text,
    note: z.string().max(1000).default(""),
    categoryId: text,
  }),
  categories: z.object({
    name: text,
    type: z.enum(["income", "expense"]),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  budgets: z.object({
    categoryId: text,
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    amount: money,
  }),
  goals: z
    .object({
      name: text,
      target: money,
      saved: z.coerce
        .number()
        .finite()
        .min(0)
        .max(999999999999.99)
        .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.01),
      date,
    })
    .refine((g) => g.saved <= g.target, "Saved amount cannot exceed target"),
  users: z.object({
    name: text,
    email: z
      .email()
      .max(200)
      .transform((s) => s.toLowerCase()),
    roleId: text,
    password: z.string().min(10).max(128).optional(),
  }),
  roles: z.object({
    name: text,
    permissions: z
      .array(z.enum([...permissions, ...legacyTransactionPermissions]))
      .transform(expandPermissions),
  }),
};
export async function GET() {
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const can = (p: string) => user.role.permissions.includes(p);
    const readTypes = ["income", "expense"].filter(
      (t) => can(`${t}.read`) || can("reports.read"),
    );
    const ledger = readTypes.length > 0;
    const categoryLookup =
      ledger ||
      [
        "income.create",
        "expense.create",
        "income.update",
        "expense.update",
        "budgets.read",
        "budgets.create",
        "budgets.update",
      ].some(can);
    const roleLookup =
      can("users.read") || can("users.create") || can("users.update");
    const [transactions, categories, users, roles, budgets, goals] =
      await Promise.all([
        ledger
          ? db.transaction.findMany({
              where: { type: { in: readTypes } },
              orderBy: { date: "desc" },
            })
          : [],
        can("categories.read") || categoryLookup ? db.category.findMany() : [],
        db.user.findMany({
          select: { id: true, name: true, email: true, roleId: true },
        }),
        db.role.findMany(),
        can("budgets.read") ? db.budget.findMany() : [],
        can("goals.read") ? db.goal.findMany() : [],
      ]);
    const accountAccess =
      ledger ||
      [
        "accounts.read",
        "transfers.read",
        "income.create",
        "expense.create",
        "income.update",
        "expense.update",
        "transfers.create",
        "transfers.update",
      ].some(can);
    const [accountRecords, balanceEntries, transferRecords] = accountAccess
      ? await Promise.all([
          db.account.findMany({ orderBy: { name: "asc" } }),
          db.transaction.findMany({
            select: { account: true, type: true, amount: true },
          }),
          db.transfer.findMany({ orderBy: { date: "desc" } }),
        ])
      : [[], [], []];
    const balances = accountBalances(
      accountRecords,
      balanceEntries,
      transferRecords,
    );
    return NextResponse.json({
      accounts: accountRecords.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        active: a.active,
        bankName: can("accounts.read") ? a.bankName : "",
        accountNumber: can("accounts.read") ? a.accountNumber : "",
        branch: can("accounts.read") ? a.branch : "",
        openingBalance: can("accounts.read") ? Number(a.openingBalance) : 0,
        balance: (balances.get(a.id) ?? 0) / 100,
      })),
      transfers: can("transfers.read")
        ? transferRecords.map((t) => ({
            ...t,
            amount: Number(t.amount),
            date: t.date.toISOString().slice(0, 10),
          }))
        : [],
      transactions: transactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
        date: t.date.toISOString().slice(0, 10),
      })),
      categories,
      users: users
        .filter((u) => u.id === user.id || can("users.read") || ledger)
        .map((u) =>
          u.id === user.id || can("users.read")
            ? u
            : { ...u, email: "", roleId: "" },
        ),
      roles: roles
        .filter((r) => r.id === user.roleId || can("roles.read") || roleLookup)
        .map((r) =>
          r.id === user.roleId || can("roles.read")
            ? r
            : { ...r, permissions: [] },
        ),
      budgets: budgets.map((b) => ({ ...b, amount: Number(b.amount) })),
      goals: goals.map((g) => ({
        ...g,
        target: Number(g.target),
        saved: Number(g.saved),
        date: g.date.toISOString().slice(0, 10),
      })),
      currentUserId: user.id,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load your family data." },
      { status: 503 },
    );
  }
}
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const { collection, action, id, values } = z
      .object({
        collection: z.enum([
          "accounts",
          "transfers",
          "transactions",
          "categories",
          "budgets",
          "goals",
          "users",
          "roles",
        ]),
        action: z.enum(["save", "delete"]),
        id: z.string().optional(),
        values: z.unknown().optional(),
      })
      .parse(await req.json());
    const operation = action === "delete" ? "delete" : id ? "update" : "create";
    if (
      !(collection === "transactions"
        ? ["income", "expense"].some((t) =>
            user.role.permissions.includes(`${t}.${operation}`),
          )
        : user.role.permissions.includes(`${collection}.${operation}`))
    )
      return NextResponse.json(
        { error: "Your role does not allow this action." },
        { status: 403 },
      );
    const canGrant = (p: string) => user.role.permissions.includes(p);
    await db.$transaction(
      async (tx) => {
        const financial = ["accounts", "transactions", "transfers"].includes(
          collection,
        );
        if (collection === "transactions") {
          const old = id
            ? await tx.transaction.findUniqueOrThrow({ where: { id } })
            : null;
          const next =
            action === "save" ? schemas.transactions.parse(values) : null;
          const required = [(old?.type ?? next?.type) + "." + operation];
          if (old && next && old.type !== next.type)
            required.push(old.type + ".delete", next.type + ".create");
          if (required.some((p) => !canGrant(p)))
            throw new PermissionDenied(
              "Your role does not allow this transaction action.",
            );
        }
        // A shared write serializes financial changes; concurrent snapshots fail safely.
        if (financial)
          await tx.account.updateMany({ data: { revision: { increment: 1 } } });
        const snapshot = async () => {
          const [accounts, entries, transfers] = await Promise.all([
            tx.account.findMany(),
            tx.transaction.findMany({
              select: { account: true, type: true, amount: true },
            }),
            tx.transfer.findMany(),
          ]);
          return {
            accounts,
            balances: accountBalances(accounts, entries, transfers),
          };
        };
        const before = financial ? await snapshot() : null;
        const validateBalances = async () => {
          if (!before) return;
          const after = await snapshot();
          if (
            collection === "accounts" &&
            after.accounts.some(
              (a) => !a.active && (after.balances.get(a.id) ?? 0) !== 0,
            )
          )
            throw Error("Inactive accounts must have zero balance.");
          assertSufficientBalances(
            before.balances,
            after.balances,
            after.accounts,
          );
        };
        const requireActive = async (id: string) => {
          const account = await tx.account.findUniqueOrThrow({ where: { id } });
          if (!account.active)
            throw Error("This account is inactive. Choose an active account.");
        };
        if (action === "delete") {
          if (!id) throw Error("An item is required.");
          if (collection === "accounts") {
            if (id === "Cash")
              throw Error("The default Cash account cannot be deleted.");
            if ((before?.balances.get(id) ?? 0) !== 0)
              throw Error(
                "Only an empty account with zero balance can be deleted.",
              );
            await tx.account.delete({ where: { id } });
          }
          if (collection === "transfers")
            await tx.transfer.delete({ where: { id } });
          if (collection === "users") {
            const target = await tx.user.findUniqueOrThrow({
              where: { id },
              include: { role: true },
            });
            if (id === user.id || target.role.name === "Owner")
              throw Error("The owner and current user cannot be removed.");
            await tx.user.delete({ where: { id } });
          }
          if (collection === "roles") {
            const role = await tx.role.findUniqueOrThrow({ where: { id } });
            if (role.permissions.some((p) => !canGrant(p)))
              throw Error(
                "You cannot assign a role with permissions you do not have.",
              );
            if (role.name === "Owner")
              throw Error("The Owner role is protected.");
            await tx.role.delete({ where: { id } });
          }
          if (collection === "transactions")
            await tx.transaction.delete({ where: { id } });
          if (collection === "categories")
            await tx.category.delete({ where: { id } });
          if (collection === "budgets")
            await tx.budget.delete({ where: { id } });
          if (collection === "goals") await tx.goal.delete({ where: { id } });
          await validateBalances();
          return;
        }
        if (collection === "transactions") {
          const data = schemas.transactions.parse(values);
          await requireActive(data.account);
          const category = await tx.category.findUniqueOrThrow({
            where: { id: data.categoryId },
          });
          if (category.type !== data.type)
            throw Error("Category must match the transaction type.");
          if (id) await tx.transaction.update({ where: { id }, data });
          else
            await tx.transaction.create({ data: { ...data, userId: user.id } });
        }
        if (collection === "accounts") {
          const data = schemas.accounts.parse(values);
          if (id === "Cash" && (data.type !== "Cash" || !data.active))
            throw Error("The default Cash account must remain active Cash.");
          if (id && !data.active && (before?.balances.get(id) ?? 0) !== 0)
            throw Error(
              "Transfer the remaining balance before deactivating this account.",
            );
          if (id) await tx.account.update({ where: { id }, data });
          else await tx.account.create({ data });
        }
        if (collection === "transfers") {
          const data = schemas.transfers.parse(values);
          await requireActive(data.fromAccountId);
          await requireActive(data.toAccountId);
          if (id) await tx.transfer.update({ where: { id }, data });
          else await tx.transfer.create({ data: { ...data, userId: user.id } });
        }
        if (collection === "categories") {
          const data = schemas.categories.parse(values);
          if (id) {
            const previous = await tx.category.findUniqueOrThrow({
              where: { id },
              include: {
                _count: { select: { transactions: true, budgets: true } },
              },
            });
            if (
              previous.type !== data.type &&
              (previous._count.transactions || previous._count.budgets)
            )
              throw Error("A used category cannot change type.");
            await tx.category.update({ where: { id }, data });
          } else await tx.category.create({ data });
        }
        if (collection === "budgets") {
          const data = schemas.budgets.parse(values);
          const c = await tx.category.findUniqueOrThrow({
            where: { id: data.categoryId },
          });
          if (c.type !== "expense") throw Error("Choose an expense category.");
          if (id) await tx.budget.update({ where: { id }, data });
          else await tx.budget.create({ data });
        }
        if (collection === "goals") {
          const data = schemas.goals.parse(values);
          if (id) await tx.goal.update({ where: { id }, data });
          else await tx.goal.create({ data });
        }
        if (collection === "roles") {
          const data = schemas.roles.parse(values);
          if (data.permissions.some((p) => !canGrant(p)))
            throw Error("You cannot grant permissions you do not have.");
          if (data.name.toLowerCase() === "owner")
            throw Error("The Owner role is protected.");
          if (id) {
            const old = await tx.role.findUniqueOrThrow({ where: { id } });
            if (old.name === "Owner")
              throw Error("The Owner role is protected.");
            await tx.role.update({ where: { id }, data });
          } else await tx.role.create({ data });
        }
        if (collection === "users") {
          const { password, ...data } = schemas.users.parse(values);
          const role = await tx.role.findUniqueOrThrow({
            where: { id: data.roleId },
          });
          if (role.permissions.some((p) => !canGrant(p)))
            throw Error(
              "You cannot assign a role with permissions you do not have.",
            );
          if (role.name === "Owner")
            throw Error("The Owner role cannot be assigned.");
          if (id) {
            const old = await tx.user.findUniqueOrThrow({
              where: { id },
              include: { role: true },
            });
            if (old.role.name === "Owner")
              throw Error("The owner account is protected.");
            await tx.user.update({
              where: { id },
              data: {
                ...data,
                ...(password ? { passwordHash: hashPassword(password) } : {}),
              },
            });
            if (password)
              await tx.session.deleteMany({ where: { userId: id } });
          } else {
            if (!password)
              throw Error("A password is required for new members.");
            await tx.user.create({
              data: { ...data, passwordHash: hashPassword(password) },
            });
          }
        }
        await validateBalances();
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PermissionDenied)
      return NextResponse.json({ error: error.message }, { status: 403 });
    let message = "Unable to save. Please try again.";
    if (error instanceof z.ZodError)
      message = error.issues[0]?.message ?? "Invalid input";
    else if (error instanceof Prisma.PrismaClientKnownRequestError)
      message =
        error.code === "P2002"
          ? "This record already exists."
          : error.code === "P2003"
            ? "This item is in use. Remove its linked records first."
            : error.code === "P2034"
              ? "Another change was made. Please try again."
              : "Record not found or could not be saved.";
    else if (error instanceof Error) message = error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
