import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import prisma from "./prisma";
import { UserRole, UserStatus } from "@prisma/client";

const COOKIE_NAME = process.env.COOKIE_NAME || "gias_auth_token";
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "gias_hospital_super_secret_jwt_key_2026_phase1_secure";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

export interface AdminUser {
  id: string;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
}

/**
 * Guards an Admin API route. Reads the auth cookie, verifies the JWT,
 * confirms the user is ACTIVE with role=ADMIN, and returns the user.
 *
 * On failure throws a NextResponse with the appropriate status code.
 * Callers should wrap in try/catch and return the thrown response.
 */
export async function requireAdmin(request: NextRequest): Promise<AdminUser> {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { sub?: string; role?: string } | null = null;
  try {
    const { payload: p } = await jwtVerify(token, SECRET_KEY);
    payload = p as { sub?: string; role?: string };
  } catch {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!payload?.sub) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (payload.role !== "ADMIN") {
    throw NextResponse.json(
      { error: "Forbidden: Administrator access required" },
      { status: 403 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
    },
  });

  if (!user || user.status !== UserStatus.ACTIVE) {
    throw NextResponse.json(
      { error: "Unauthorized: Account is inactive or not found" },
      { status: 401 }
    );
  }

  if (user.role !== UserRole.ADMIN) {
    throw NextResponse.json(
      { error: "Forbidden: Administrator access required" },
      { status: 403 }
    );
  }

  return user;
}
