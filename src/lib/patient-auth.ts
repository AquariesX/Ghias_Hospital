import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import prisma from "./prisma";
import { UserRole, UserStatus } from "@prisma/client";

const COOKIE_NAME = process.env.COOKIE_NAME || "gias_auth_token";
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "gias_hospital_super_secret_jwt_key_2026_phase1_secure";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

export interface PatientAuthorizedUser {
  id: string;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: string[];
}

const READ_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.RECEPTIONIST,
  UserRole.STAFF,
  UserRole.DOCTOR,
  UserRole.NURSE,
];

const MANAGE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.RECEPTIONIST,
  UserRole.STAFF,
];

async function authenticate(request: NextRequest): Promise<PatientAuthorizedUser> {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    throw NextResponse.json({ error: "Unauthorized: Missing authentication token" }, { status: 401 });
  }

  let payload: { sub?: string; role?: string } | null = null;
  try {
    const { payload: p } = await jwtVerify(token, SECRET_KEY);
    payload = p as { sub?: string; role?: string };
  } catch {
    throw NextResponse.json({ error: "Unauthorized: Invalid session" }, { status: 401 });
  }

  if (!payload?.sub) {
    throw NextResponse.json({ error: "Unauthorized: Invalid session payload" }, { status: 401 });
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
    throw NextResponse.json({ error: "Unauthorized: Account is inactive or suspended" }, { status: 401 });
  }

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    permissions: user.permissions,
  };
}

/**
 * Ensures caller has read access to patient records (Admin, Receptionist, Staff, Doctor, Nurse).
 */
export async function requirePatientAccess(request: NextRequest): Promise<PatientAuthorizedUser> {
  const user = await authenticate(request);

  if (!READ_ROLES.includes(user.role)) {
    throw NextResponse.json(
      { error: "Forbidden: Access to patient directory not permitted for this role" },
      { status: 403 }
    );
  }

  return user;
}

/**
 * Ensures caller has write access to register/edit patients (Admin, Receptionist, Staff).
 */
export async function requirePatientManage(request: NextRequest): Promise<PatientAuthorizedUser> {
  const user = await authenticate(request);

  const hasRole = MANAGE_ROLES.includes(user.role);
  const hasPermission =
    user.permissions.includes("PATIENT_REGISTER") ||
    user.permissions.includes("PATIENT_MANAGE") ||
    user.permissions.includes("*");

  if (!hasRole && !hasPermission) {
    throw NextResponse.json(
      { error: "Forbidden: Receptionist or Administrator permissions required to manage patients" },
      { status: 403 }
    );
  }

  return user;
}
