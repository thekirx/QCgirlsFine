import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateUser } from "@/modules/auth/service";
import { createSession, SESSION_COOKIE } from "@/server/auth/session";
import { prisma } from "@/server/db/client";

const inputSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });
export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Username and password are required." }, { status: 422 });
  const user = await authenticateUser(prisma, parsed.data.username.trim().toLowerCase(), parsed.data.password);
  if (!user) return NextResponse.json({ error: "The username or password is incorrect." }, { status: 401 });
  const token = await createSession(prisma, user.id);
  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 1800 });
  return response;
}
