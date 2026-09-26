import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  currentUser,
  hashPassword,
  verifyPassword,
  loginSession,
  sameOrigin,
} from "@/lib/auth";
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const user = await currentUser();
    if (!user)
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const { currentPassword, password } = z
      .object({
        currentPassword: z.string().min(1).max(128),
        password: z.string().min(10).max(128),
      })
      .parse(await req.json());
    if (!verifyPassword(currentPassword, user.passwordHash))
      return NextResponse.json(
        { error: "Your current password is incorrect." },
        { status: 400 },
      );
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(password) },
      }),
      db.session.deleteMany({ where: { userId: user.id } }),
    ]);
    await loginSession(user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Use a password of 10–128 characters and try again." },
      { status: 400 },
    );
  }
}
