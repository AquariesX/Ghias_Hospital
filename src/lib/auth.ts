import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { UserRole, UserStatus } from "@prisma/client";
import prisma from "./prisma";

export const COOKIE_NAME = process.env.COOKIE_NAME || "gias_auth_token";
const JWT_SECRET = process.env.JWT_SECRET || "gias_hospital_super_secret_jwt_key_2026_phase1_secure";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

export interface AuthSessionPayload {
  sub: string; // User ID
  email: string;
  username: string | null;
  role: UserRole;
  firstName: string;
  lastName: string;
  permissions: string[];
}

export interface SafeUser {
  id: string;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  permissions: string[];
  lastLoginAt: Date | null;
  createdAt: Date;
}

/**
 * Generates a signed JWT session token with a 24-hour expiration.
 */
export async function createSessionToken(payload: AuthSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET_KEY);
}

/**
 * Verifies and decodes a JWT session token.
 * Returns null if token is invalid or expired.
 */
export async function verifySessionToken(token: string): Promise<AuthSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as AuthSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Standard cookie configuration for the auth token.
 */
export const authCookieOptions = {
  name: COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24, // 24 hours in seconds
};

/**
 * Server-side helper to get the currently authenticated user from cookies and database.
 * Validates that the user exists and has an ACTIVE status.
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const payload = await verifySessionToken(token);
    if (!payload?.sub) {
      return null;
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
        permissions: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Error retrieving current user:", error);
    return null;
  }
}
