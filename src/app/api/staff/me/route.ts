import { NextRequest, NextResponse } from "next/server";
import { requireStaffAuth } from "@/lib/staff-auth";

export async function GET(request: NextRequest) {
  try {
    const { user, staff } = await requireStaffAuth(request);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        staff: {
          id: staff.id,
          staffNumber: staff.staffNumber,
          firstName: staff.firstName,
          lastName: staff.lastName,
          role: staff.role,
          phone: staff.phone,
          email: staff.email,
          qualification: staff.qualification,
          shift: staff.shift,
          status: staff.status,
          nurseDepartment: staff.nurseDepartment,
          department: staff.department,
        },
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error("Error in GET /api/staff/me:", error);
    return NextResponse.json(
      { error: "Failed to retrieve staff profile" },
      { status: 500 }
    );
  }
}
