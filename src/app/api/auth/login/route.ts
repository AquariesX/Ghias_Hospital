import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { UserStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { createSessionToken, authCookieOptions, COOKIE_NAME } from "@/lib/auth";
import { getDashboardPath } from "@/lib/rbac";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const identifier = (body.identifier || body.email || body.username || "").trim();
    const password = body.password || "";

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Email or username and password are required" },
        { status: 400 }
      );
    }

    // Lookup user by email or username (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier, mode: "insensitive" } },
          { username: { equals: identifier, mode: "insensitive" } },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email/username or password" },
        { status: 401 }
      );
    }

    // Verify password hash
    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid email/username or password" },
        { status: 401 }
      );
    }

    // Check account status
    if (user.status === UserStatus.SUSPENDED) {
      return NextResponse.json(
        { error: "Account has been suspended. Please contact the hospital administrator." },
        { status: 403 }
      );
    }

    if (user.status === UserStatus.INACTIVE) {
      return NextResponse.json(
        { error: "Account is currently inactive. Please contact the hospital administrator." },
        { status: 403 }
      );
    }

    // Update lastLoginAt timestamp
    const loginTime = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: loginTime },
    });

    // Generate JWT token
    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      permissions: user.permissions,
    });

    // Set secure HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, authCookieOptions);

    const redirectUrl = getDashboardPath(user.role);

    return NextResponse.json({
      success: true,
      message: "Authentication successful",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
        lastLoginAt: loginTime,
      },
      redirectUrl,
    });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during authentication" },
      { status: 500 }
    );
  }
}
