import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    response.cookies.set(COOKIE_NAME, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("Logout API error:", error);
    const response = NextResponse.json(
      { success: true, message: "Logged out" },
      { status: 200 }
    );
    response.cookies.set(COOKIE_NAME, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
    return response;
  }
}
