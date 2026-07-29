import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revokeSession, SESSION_COOKIE } from "@/server/auth/session";
import { prisma } from "@/server/db/client";

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await revokeSession(prisma, token);
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
