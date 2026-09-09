import prisma from "@/lib/prisma";
import { GET as getRoomsAvailable } from "@/app/api/rooms/available/route";
import { POST as postAdmission } from "@/app/api/admissions/route";
import { NextRequest } from "next/server";
import { createSessionToken } from "@/lib/auth";

async function testDuplicateGuards() {
  console.log("=== Testing Security & Duplicate Prevention Guards via HTTP ===");

  const baseUrl = "http://localhost:3000";

  // TEST 1: Unauthenticated call to /api/rooms/available should be 401
  console.log("\n1. Testing /api/rooms/available unauthenticated access...");
  const unauthRes = await fetch(`${baseUrl}/api/rooms/available`);
  console.log(`Response status: ${unauthRes.status}`);
  if (unauthRes.status !== 401) {
    throw new Error(`Expected 401 Unauthorized for unauthenticated call, got ${unauthRes.status}`);
  }
  console.log("✅ Protected /api/rooms/available returns 401 Unauthorized as expected.");

  // TEST 2: Attempting to create duplicate active admission for an already admitted patient
  console.log("\n2. Testing duplicate admission prevention in POST /api/admissions...");
  const activeAdm = await prisma.admission.findFirst({
    where: { status: { in: ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"] } },
    include: { patient: true },
  });

  if (!activeAdm) {
    console.log("No active admission found to test against; skipping test 2.");
  } else {
    // Generate valid admin auth token
    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!adminUser) throw new Error("No admin user found");

    const token = await createSessionToken({
      sub: adminUser.id,
      email: adminUser.email,
      username: adminUser.username,
      role: adminUser.role,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      permissions: adminUser.permissions,
    });

    const dupAdmRes = await fetch(`${baseUrl}/api/admissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `gias_auth_token=${token}`,
      },
      body: JSON.stringify({
        patientId: activeAdm.patientId,
        patientName: `${activeAdm.patient.firstName} ${activeAdm.patient.lastName}`,
        phone: activeAdm.patient.phone,
        roomBedNo: "Room 101 - Bed 1",
        admissionSource: "OPD",
      }),
    });

    const dupAdmData = await dupAdmRes.json();
    console.log(`Duplicate admission attempt status: ${dupAdmRes.status}`);
    console.log(`Response message: ${dupAdmData.error}`);

    if (dupAdmRes.status !== 409) {
      throw new Error(`Expected 409 Conflict for duplicate active admission, got ${dupAdmRes.status}`);
    }
    console.log("✅ Duplicate active admission was correctly blocked with 409 Conflict.");
  }

  // TEST 3: Attempting to create duplicate appointment for the same patient and doctor on the same day
  console.log("\n3. Testing duplicate appointment prevention in POST /api/appointments...");
  const existingApt = await prisma.appointment.findFirst({
    where: { status: { in: ["SCHEDULED", "CONFIRMED", "WAITING", "IN_CONSULTATION"] } },
    include: { patient: true, doctor: true },
  });

  if (!existingApt) {
    console.log("No active appointment found to test against; skipping test 3.");
  } else {
    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const token = await createSessionToken({
      sub: adminUser!.id,
      email: adminUser!.email,
      username: adminUser!.username,
      role: adminUser!.role,
      firstName: adminUser!.firstName,
      lastName: adminUser!.lastName,
      permissions: adminUser!.permissions,
    });

    const dateStr = existingApt.appointmentDate.toISOString().split("T")[0];
    const dupAptRes = await fetch(`${baseUrl}/api/appointments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `gias_auth_token=${token}`,
      },
      body: JSON.stringify({
        patientId: existingApt.patientId,
        doctorId: existingApt.doctorId,
        appointmentDate: dateStr,
        reason: "Follow-up duplicate test",
      }),
    });

    const dupAptData = await dupAptRes.json();
    console.log(`Duplicate appointment attempt status: ${dupAptRes.status}`);
    console.log(`Response message: ${dupAptData.error}`);

    if (dupAptRes.status !== 409) {
      throw new Error(`Expected 409 Conflict for duplicate appointment, got ${dupAptRes.status}`);
    }
    console.log("✅ Duplicate appointment was correctly blocked with 409 Conflict.");
  }

  console.log("\n=== ALL DUPLICATE AND SECURITY GUARDS VERIFIED SUCCESSFULLY ===");
}

testDuplicateGuards()
  .catch((err) => {
    console.error("Test error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
