import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import prisma from "./prisma";
import { UserRole, UserStatus } from "@prisma/client";

const COOKIE_NAME = process.env.COOKIE_NAME || "gias_auth_token";
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "gias_hospital_super_secret_jwt_key_2026_phase1_secure";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

export interface AppointmentAuthorizedUser {
  id: string;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: string[];
  doctorProfile?: {
    id: string;
    doctorNumber: string;
    firstName: string;
    lastName: string;
    departmentId: string | null;
  } | null;
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

async function authenticate(request: NextRequest): Promise<AppointmentAuthorizedUser> {
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
      { error: "Unauthorized: Invalid session" },
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
      doctorProfile: {
        select: {
          id: true,
          doctorNumber: true,
          firstName: true,
          lastName: true,
          departmentId: true,
        },
      },
    },
  });

  if (!user || user.status !== UserStatus.ACTIVE) {
    throw NextResponse.json(
      { error: "Unauthorized: Account is inactive or suspended" },
      { status: 401 }
    );
  }

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    permissions: user.permissions,
    doctorProfile: user.doctorProfile,
  };
}

/**
 * Ensures caller has read access to appointments and doctor queues.
 */
export async function requireAppointmentAccess(
  request: NextRequest
): Promise<AppointmentAuthorizedUser> {
  const user = await authenticate(request);

  if (!READ_ROLES.includes(user.role)) {
    throw NextResponse.json(
      { error: "Forbidden: Access to appointments not permitted for this role" },
      { status: 403 }
    );
  }

  return user;
}

/**
 * Ensures caller has write access to create, reschedule, or cancel appointments.
 */
export async function requireAppointmentManage(
  request: NextRequest
): Promise<AppointmentAuthorizedUser> {
  const user = await authenticate(request);

  const hasRole = MANAGE_ROLES.includes(user.role);
  const hasPermission =
    user.permissions.includes("APPOINTMENT_SCHEDULE") ||
    user.permissions.includes("APPOINTMENT_MANAGE") ||
    user.permissions.includes("*");

  if (!hasRole && !hasPermission) {
    throw NextResponse.json(
      { error: "Forbidden: Receptionist or Administrator permissions required to manage appointments" },
      { status: 403 }
    );
  }

  return user;
}

/**
 * Ensures caller is either an Administrator or the Doctor managing their own queue.
 */
export async function requireDoctorOrAdminAccess(
  request: NextRequest,
  targetDoctorId?: string
): Promise<AppointmentAuthorizedUser> {
  const user = await authenticate(request);

  if (user.role === UserRole.ADMIN) {
    return user;
  }

  if (user.role === UserRole.DOCTOR) {
    if (targetDoctorId && user.doctorProfile && user.doctorProfile.id !== targetDoctorId) {
      throw NextResponse.json(
        { error: "Forbidden: Clinicians may only manage their own clinical queue" },
        { status: 403 }
      );
    }
    return user;
  }

  throw NextResponse.json(
    { error: "Forbidden: Doctor or Administrator access required" },
    { status: 403 }
  );
}
