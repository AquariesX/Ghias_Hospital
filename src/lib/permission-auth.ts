import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import { UserRole } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: string;
  permissions: string[];
}

const PERMISSION_VIEW_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.RECEPTIONIST,
  UserRole.STAFF,
  UserRole.DOCTOR,
];

const PERMISSION_MANAGE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.RECEPTIONIST,
  UserRole.STAFF,
];

/**
 * Validates that the request comes from an authenticated user with permission-view privileges.
 * Throws a NextResponse if unauthenticated or forbidden.
 */
export async function requirePermissionAccess(
  _request?: NextRequest
): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw NextResponse.json(
      { error: "Unauthorized: Authentication required" },
      { status: 401 }
    );
  }

  if (user.status !== "ACTIVE") {
    throw NextResponse.json(
      { error: "Forbidden: User account is not active" },
      { status: 403 }
    );
  }

  if (!PERMISSION_VIEW_ROLES.includes(user.role as UserRole)) {
    throw NextResponse.json(
      { error: "Forbidden: You do not have permission to view patient permissions" },
      { status: 403 }
    );
  }

  return user as unknown as AuthenticatedUser;
}

/**
 * Validates that the request comes from an authenticated user authorized to generate
 * and print patient permissions (Admin, Receptionist, Staff).
 */
export async function requirePermissionManage(
  _request?: NextRequest
): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw NextResponse.json(
      { error: "Unauthorized: Authentication required" },
      { status: 401 }
    );
  }

  if (user.status !== "ACTIVE") {
    throw NextResponse.json(
      { error: "Forbidden: User account is not active" },
      { status: 403 }
    );
  }

  if (!PERMISSION_MANAGE_ROLES.includes(user.role as UserRole)) {
    throw NextResponse.json(
      { error: "Forbidden: Receptionist or Administrator permissions required to generate permission documents" },
      { status: 403 }
    );
  }

  return user as unknown as AuthenticatedUser;
}
