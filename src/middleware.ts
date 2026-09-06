import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = process.env.COOKIE_NAME || "gias_auth_token";
const JWT_SECRET = process.env.JWT_SECRET || "gias_hospital_super_secret_jwt_key_2026_phase1_secure";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);

interface DecodedToken {
  sub: string;
  role: string;
  email: string;
}

async function verifyToken(token: string): Promise<DecodedToken | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as DecodedToken;
  } catch {
    return null;
  }
}

function getRoleDashboard(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "DOCTOR":
      return "/doctor";
    case "NURSE":
    case "RECEPTIONIST":
    case "STAFF":
      return "/staff";
    default:
      return "/login";
  }
}

function isRoleAuthorizedForPath(role: string, pathname: string): boolean {
  if (pathname.startsWith("/admin")) {
    return role === "ADMIN";
  }
  if (pathname.startsWith("/doctor")) {
    return role === "DOCTOR";
  }
  if (pathname.startsWith("/staff")) {
    return role === "NURSE" || role === "RECEPTIONIST" || role === "STAFF";
  }
  if (pathname.startsWith("/patients")) {
    return (
      role === "ADMIN" ||
      role === "RECEPTIONIST" ||
      role === "STAFF" ||
      role === "DOCTOR" ||
      role === "NURSE"
    );
  }
  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const decoded = token ? await verifyToken(token) : null;

  const isProtectedPath =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/doctor") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/patients");

  const isLoginPath = pathname === "/login";
  const isRootPath = pathname === "/";

  // Root path handling
  if (isRootPath) {
    if (decoded) {
      const targetDashboard = getRoleDashboard(decoded.role);
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Login path handling: if already logged in, redirect to user's dashboard
  if (isLoginPath) {
    if (decoded) {
      const targetDashboard = getRoleDashboard(decoded.role);
      return NextResponse.redirect(new URL(targetDashboard, request.url));
    }
    return NextResponse.next();
  }

  // Protected route handling
  if (isProtectedPath) {
    // 1. Unauthenticated user trying to access protected route
    if (!decoded) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 2. Authenticated user accessing a route outside their authorized role
    if (!isRoleAuthorizedForPath(decoded.role, pathname)) {
      const userDashboard = getRoleDashboard(decoded.role);
      return NextResponse.redirect(new URL(userDashboard, request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/admin/:path*",
    "/doctor/:path*",
    "/staff/:path*",
  ],
};
