import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export interface AuthenticatedAdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

/**
 * Ensures the requesting user is authenticated and has the ADMIN role.
 * Throws a NextResponse if unauthenticated (401) or unauthorized (403).
 */
export async function requireAdminAccess(
  _request?: NextRequest
): Promise<AuthenticatedAdminUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw NextResponse.json(
      { error: "Authentication required to access financial and billing services" },
      { status: 401 }
    );
  }

  if (user.role !== "ADMIN") {
    throw NextResponse.json(
      { error: "Access denied. Only hospital administrators can access financial and billing modules." },
      { status: 403 }
    );
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}
