import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import prisma from "./prisma";
import { UserRole, UserStatus, Staff, StaffRole, NurseDepartment, StaffStatus } from "@prisma/client";

const COOKIE_NAME = process.env.COOKIE_NAME || "gias_auth_token";
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "gias_hospital_super_secret_jwt_key_2026_phase1_secure";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

export interface StaffAuthorizedContext {
  user: {
    id: string;
    email: string;
    username: string | null;
    firstName: string;
    lastName: string;
    role: UserRole;
    permissions: string[];
  };
  staff: Staff & {
    department: {
      id: string;
      name: string;
      code: string;
    } | null;
  };
}

export interface RequireStaffAuthOptions {
  requiredDepartment?: NurseDepartment;
  allowedRoles?: StaffRole[];
  requireNurse?: boolean;
}

/**
 * Strict authentication and authorization helper for Staff and Nursing APIs.
 * 1. Verifies the caller is authenticated with an ACTIVE user account.
 * 2. Resolves the associated Staff profile from the database via userId or email.
 * 3. Verifies StaffStatus is ACTIVE.
 * 4. Checks role constraints (e.g., HEAD_NURSE, STAFF_NURSE).
 * 5. Enforces strict NurseDepartment boundaries (OPD vs EMERGENCY) to prevent privilege escalation.
 * 6. Never trusts a staffId or department passed in query or body parameters.
 */
export async function requireStaffAuth(
  request: NextRequest,
  options: RequireStaffAuthOptions = {}
): Promise<StaffAuthorizedContext> {
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

  // Find linked staff profile
  const staff = await prisma.staff.findFirst({
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

  if (!staff) {
    throw NextResponse.json(
      { error: "Forbidden: No staff profile linked to this user account" },
      { status: 403 }
    );
  }

  if (staff.status !== StaffStatus.ACTIVE) {
    throw NextResponse.json(
      { error: "Forbidden: Staff account is not active (status: " + staff.status + ")" },
      { status: 403 }
    );
  }

  // If nursing role is required
  const isNurse =
    user.role === UserRole.NURSE ||
    staff.role === StaffRole.HEAD_NURSE ||
    staff.role === StaffRole.STAFF_NURSE;

  if (options.requireNurse && !isNurse) {
    throw NextResponse.json(
      { error: "Forbidden: Access restricted strictly to nursing staff" },
      { status: 403 }
    );
  }

  // Check allowed roles if specified
  if (options.allowedRoles && options.allowedRoles.length > 0) {
    if (!options.allowedRoles.includes(staff.role)) {
      throw NextResponse.json(
        { error: `Forbidden: Staff role ${staff.role} is not authorized for this operation` },
        { status: 403 }
      );
    }
  }

  // Enforce Nurse Department Isolation
  if (options.requiredDepartment) {
    // HEAD_NURSE has supervisory oversight across both OPD and EMERGENCY
    const isHeadNurse = staff.role === StaffRole.HEAD_NURSE;
    if (!isHeadNurse && staff.nurseDepartment !== options.requiredDepartment) {
      throw NextResponse.json(
        {
          error: `Forbidden: This operation requires ${options.requiredDepartment} department access. Your current department is ${staff.nurseDepartment || "None"}.`,
        },
        { status: 403 }
      );
    }
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
    staff,
  };
}
