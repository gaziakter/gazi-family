import { z } from "zod";
import { db } from "@/lib/db";
import { currentUser, sameOrigin } from "@/lib/auth";
import { createReportPdf } from "@/lib/report-pdf";
import { inReportPeriod } from "@/lib/reports";
export const runtime = "nodejs";
const string = z.string().max(120);
const schema = z.object({
  demo: z.boolean().default(false),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  period: z.enum(["month", "year", "all", "date"]),
  mode: z
    .enum([
      "transactions-date",
      "transactions-head",
      "statement-date",
      "statement-month",
    ])
    .default("transactions-date"),
  account: string,
  categoryId: string,
  memberId: string,
  search: z.string().max(1000),
  from: z.union([z.iso.date(), z.literal("")]),
  to: z.union([z.iso.date(), z.literal("")]),
  demoRows: z
    .array(
      z.object({
        date: z.iso.date(),
        title: string,
        note: z.string().max(1000),
        type: z.enum(["income", "expense"]),
        amount: z.number().finite().positive().max(999999999999.99),
        category: string,
        account: string,
        member: string,
        categoryId: string,
        userId: string,
      }),
    )
    .max(1000)
    .optional(),
});
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const body = await req.text();
    if (body.length > 2_000_000)
      return Response.json(
        { error: "Report request is too large." },
        { status: 413 },
      );
    const input = schema.parse(JSON.parse(body));
    if (input.from && input.to && input.from > input.to)
      return Response.json(
        { error: "From date must be on or before To date." },
        { status: 400 },
      );
    let rows;
    if (input.demo) {
      rows = input.demoRows ?? [];
    } else {
      const user = await currentUser();
      if (!user)
        return Response.json({ error: "Please sign in." }, { status: 401 });
      if (
        !user.role.permissions.includes("reports.read") ||
        !user.role.permissions.includes("reports.export")
      )
        return Response.json(
          { error: "Your role does not allow report exports." },
          { status: 403 },
        );
      // Read actual records on the server; never accept client-supplied real balances.
      const entries = await db.transaction.findMany({
        include: { category: true, user: { select: { name: true } } },
        orderBy: { date: "desc" },
      });
      rows = entries.map((e) => ({
        date: e.date.toISOString().slice(0, 10),
        title: e.title,
        note: e.note,
        type: e.type,
        amount: Number(e.amount),
        category: e.category.name,
        account: e.account,
        member: e.user.name,
        categoryId: e.categoryId,
        userId: e.userId,
      }));
    }
    const filtered = rows
      .filter(
        (e) =>
          inReportPeriod(
            e.date,
            input.period,
            input.month,
            input.from,
            input.to,
          ) &&
          (input.account === "all" || e.account === input.account) &&
          (input.categoryId === "all" || e.categoryId === input.categoryId) &&
          (input.memberId === "all" || e.userId === input.memberId) &&
          (!input.from || e.date >= input.from) &&
          (!input.to || e.date <= input.to) &&
          `${e.title} ${e.note} ${e.category}`
            .toLowerCase()
            .includes(input.search.toLowerCase()),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
    const period =
      input.period === "date"
        ? "Date range"
        : input.period === "all"
          ? "All time"
          : input.period === "year"
            ? input.month.slice(0, 4)
            : input.month;
    const filters = [
      input.account !== "all" ? `Account: ${input.account}` : "All accounts",
      input.categoryId !== "all"
        ? `Category: ${rows.find((r) => r.categoryId === input.categoryId)?.category ?? "Selected category"}`
        : "All categories",
      input.memberId !== "all"
        ? `Member: ${rows.find((r) => r.userId === input.memberId)?.member ?? "Selected member"}`
        : "All members",
      input.from ? `From: ${input.from}` : "",
      input.to ? `To: ${input.to}` : "",
      input.search ? `Search: ${input.search}` : "",
    ].filter(Boolean);
    const pdf = await createReportPdf(
      filtered,
      period,
      filters,
      input.demo,
      input.mode,
    );
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="gazi-family-${input.mode}-${period.toLowerCase().replaceAll(" ", "-")}.pdf"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return Response.json(
        { error: "Invalid report filters or demo data." },
        { status: 400 },
      );
    console.error("PDF export failed", error);
    return Response.json(
      { error: "Unable to create the PDF report. Please try again." },
      { status: 500 },
    );
  }
}
