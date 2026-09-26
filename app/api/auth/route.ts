import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  currentUser,
  hashPassword,
  verifyPassword,
  loginSession,
  sameOrigin,
  tokenHash,
} from "@/lib/auth";
import { permissions, memberPermissions, viewerPermissions } from "@/lib/types";
import { z } from "zod";
const attempts = new Map<string, { count: number; until: number }>();
export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json({ demo: true });
  try {
    const user = await currentUser();
    return NextResponse.json({
      setup: !(await db.family.count()),
      user: user ? { id: user.id, name: user.name, email: user.email } : null,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Cannot connect to PostgreSQL. Check DATABASE_URL and run migrations.",
      },
      { status: 503 },
    );
  }
}
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const input = z
      .object({
        action: z.enum(["setup", "login", "logout"]),
        email: z.email().max(200).optional(),
        password: z.string().min(10).max(128).optional(),
        name: z.string().trim().min(2).max(80).optional(),
      })
      .parse(await req.json());
    if (input.action === "logout") {
      const jar = await cookies();
      const token = jar.get("gazi_session")?.value;
      if (token)
        await db.session.deleteMany({ where: { id: tokenHash(token) } });
      jar.delete("gazi_session");
      return NextResponse.json({ ok: true });
    }
    if (!input.email || !input.password)
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    const email = input.email.toLowerCase();
    const old = attempts.get(email);
    if (old && old.until > Date.now() && old.count >= 8)
      return NextResponse.json(
        { error: "Too many attempts. Try again in 15 minutes." },
        { status: 429 },
      );
    if (attempts.size > 10000)
      for (const [key, value] of attempts)
        if (value.until < Date.now()) attempts.delete(key);
    attempts.set(email, {
      count: old && old.until > Date.now() ? old.count + 1 : 1,
      until: old && old.until > Date.now() ? old.until : Date.now() + 900000,
    });
    let user;
    if (input.action === "setup") {
      if (!input.name)
        return NextResponse.json(
          { error: "Name is required." },
          { status: 400 },
        );
      user = await db.$transaction(async (tx) => {
        await tx.family.create({ data: { id: "gazi-family" } });
        const role = await tx.role.create({
          data: { name: "Owner", permissions: [...permissions] },
        });
        await tx.role.createMany({
          data: [
            {
              name: "Member",
              permissions: memberPermissions,
            },
            { name: "Viewer", permissions: viewerPermissions },
          ],
        });
        await tx.category.createMany({
          data: [
            { name: "Salary", type: "income" },
            { name: "Freelance", type: "income" },
            { name: "Groceries", type: "expense" },
            { name: "Home & bills", type: "expense" },
            { name: "Transport", type: "expense" },
            { name: "Health", type: "expense" },
            { name: "Shopping", type: "expense" },
          ],
        });
        return tx.user.create({
          data: {
            name: input.name!,
            email,
            passwordHash: hashPassword(input.password!),
            roleId: role.id,
          },
        });
      });
    } else {
      user = await db.user.findUnique({ where: { email } });
      if (!user || !verifyPassword(input.password, user.passwordHash))
        return NextResponse.json(
          { error: "Email or password is incorrect." },
          { status: 401 },
        );
    }
    attempts.delete(email);
    await loginSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? "Please provide a valid email and a password of 10–128 characters."
            : "Could not sign in or set up. The family may already exist.",
      },
      { status: 400 },
    );
  }
}
