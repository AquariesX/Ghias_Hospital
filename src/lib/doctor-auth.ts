import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import prisma from "./prisma";
import { UserRole, UserStatus, Doctor } from "@prisma/client";

const COOKIE_NAME = process.env.COOKIE_NAME || "gias_auth_token";
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "gias_hospital_super_secret_jwt_key_2026_phase1_secure";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

export interface DoctorAuthorizedUser {
  user: {
    id: string;
    email: string;
    username: string | null;
    firstName: string;
    lastName: string;
    role: UserRole;
    permissions: string[];
  };
  doctor: Doctor & {
    department: {
      id: string;
      name: string;
      code: string;
    } | null;
  };
}

/**
 * Strict authentication and authorization helper for Doctor APIs.
 * 1. Verifies the caller is authenticated with an ACTIVE user account.
 * 2. Verifies the user has the DOCTOR role.
 * 3. Resolves the associated Doctor profile from the database.
 * 4. Never trusts a doctorId passed in query or body parameters.
 */
export async function requireDoctorAuth(
  request: NextRequest
): Promise<DoctorAuthorizedUser> {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    throw NextResponse.json(
      { error: "Unauthorized: Missing authentication token" },
      { status: 401 }
    );
  }

  let payload: { sub?: string; role?: string } | null = null;
  try {
    const { payload: p } = await jwtVerify(token, SECRET_KEY);
    payload = p as { sub?: string; role?: string };
  } catch {
    throw NextResponse.json(
      { error: "Unauthorized: Invalid or expired session" },
      { status: 401 }
    );
  }

  if (!payload?.sub) {
    throw NextResponse.json(
      { error: "Unauthorized: Invalid session payload" },
      { status: 401 }
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
      permissions: true,
    },
  });

  if (!user || user.status !== UserStatus.ACTIVE) {
    throw NextResponse.json(
      { error: "Unauthorized: User account is inactive or disabled" },
      { status: 401 }
    );
  }

  if (user.role !== UserRole.DOCTOR) {
    throw NextResponse.json(
      { error: "Forbidden: Access restricted strictly to clinical medical doctors" },
      { status: 403 }
    );
  }

  // Find linked doctor profile
  const doctor = await prisma.doctor.findFirst({
    where: {
      OR: [{ userId: user.id }, { email: user.email }],
    },
    include: {
      department: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  if (!doctor || doctor.status !== "ACTIVE") {
    throw NextResponse.json(
      { error: "Forbidden: No active Doctor clinical profile linked to this user account" },
      { status: 403 }
    );
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: user.permissions,
    },
    doctor,
  };
}
