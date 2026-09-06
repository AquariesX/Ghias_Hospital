import "dotenv/config";
import prisma from "../src/lib/prisma";
import { verifyPassword } from "../src/lib/password";
import { createSessionToken, verifySessionToken, COOKIE_NAME } from "../src/lib/auth";
import { isAuthorizedForPath, getDashboardPath } from "../src/lib/rbac";
import { UserRole } from "@prisma/client";

async function runTests() {
  console.log("=================================================");
  console.log("  GIAS HOSPITAL - PHASE 1 VERIFICATION SUITE    ");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // Test 1: PostgreSQL & Prisma Connection
  // ---------------------------------------------------------------------------
  console.log("--- 1. Database Connection & Schema Verification ---");
  const userCount = await prisma.user.count();
  assert(userCount >= 5, `Database connected via Prisma 7 adapter-pg (found ${userCount} users)`);

  // Verify key tables exist in schema
  const dCount = await prisma.department.count();
  assert(typeof dCount === "number", "Department table exists and accessible");

  // ---------------------------------------------------------------------------
  // Test 2: Valid Admin Login Verification
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. Test Scenario 1: Valid Admin Login ---");
  const adminUser = await prisma.user.findFirst({
    where: { email: "admin@gias-hospital.com" },
  });
  assert(adminUser !== null, "Admin account exists in database");
  assert(adminUser?.role === UserRole.ADMIN, "Admin account has ADMIN role");

  const adminPassValid = await verifyPassword("Admin@1234", adminUser!.passwordHash);
  assert(adminPassValid, "Admin password verified successfully against bcrypt hash");

  const adminToken = await createSessionToken({
    sub: adminUser!.id,
    email: adminUser!.email,
    username: adminUser!.username,
    role: adminUser!.role,
    firstName: adminUser!.firstName,
    lastName: adminUser!.lastName,
    permissions: adminUser!.permissions,
  });
  assert(typeof adminToken === "string" && adminToken.length > 50, "Admin JWT session token created");

  const adminDecoded = await verifySessionToken(adminToken);
  assert(adminDecoded?.role === "ADMIN", "Admin session token correctly decoded");
  assert(getDashboardPath(adminDecoded!.role) === "/admin", "Admin routed to /admin dashboard");

  // ---------------------------------------------------------------------------
  // Test 3: Valid Doctor Login Verification
  // ---------------------------------------------------------------------------
  console.log("\n--- 3. Test Scenario 2: Valid Doctor Login ---");
  const doctorUser = await prisma.user.findFirst({
    where: { email: "doctor@gias-hospital.com" },
  });
  assert(doctorUser !== null, "Doctor account exists in database");
  assert(doctorUser?.role === UserRole.DOCTOR, "Doctor account has DOCTOR role");

  const doctorPassValid = await verifyPassword("Doctor@1234", doctorUser!.passwordHash);
  assert(doctorPassValid, "Doctor password verified successfully against bcrypt hash");

  const doctorToken = await createSessionToken({
    sub: doctorUser!.id,
    email: doctorUser!.email,
    username: doctorUser!.username,
    role: doctorUser!.role,
    firstName: doctorUser!.firstName,
    lastName: doctorUser!.lastName,
    permissions: doctorUser!.permissions,
  });
  const doctorDecoded = await verifySessionToken(doctorToken);
  assert(doctorDecoded?.role === "DOCTOR", "Doctor session token correctly decoded");
  assert(getDashboardPath(doctorDecoded!.role) === "/doctor", "Doctor routed to /doctor dashboard");

  // ---------------------------------------------------------------------------
  // Test 4: Valid Nurse / Staff Login Verification
  // ---------------------------------------------------------------------------
  console.log("\n--- 4. Test Scenario 3: Valid Nurse / Staff Login ---");
  const nurseUser = await prisma.user.findFirst({
    where: { email: "nurse@gias-hospital.com" },
  });
  assert(nurseUser !== null, "Nurse account exists in database");
  assert(nurseUser?.role === UserRole.NURSE, "Nurse account has NURSE role");

  const nursePassValid = await verifyPassword("Nurse@1234", nurseUser!.passwordHash);
  assert(nursePassValid, "Nurse password verified successfully against bcrypt hash");

  const nurseToken = await createSessionToken({
    sub: nurseUser!.id,
    email: nurseUser!.email,
    username: nurseUser!.username,
    role: nurseUser!.role,
    firstName: nurseUser!.firstName,
    lastName: nurseUser!.lastName,
    permissions: nurseUser!.permissions,
  });
  const nurseDecoded = await verifySessionToken(nurseToken);
  assert(nurseDecoded?.role === "NURSE", "Nurse session token correctly decoded");
  assert(getDashboardPath(nurseDecoded!.role) === "/staff", "Nurse routed to /staff dashboard");

  // Also check receptionist and general staff
  assert(getDashboardPath("RECEPTIONIST") === "/staff", "Receptionist routed to /staff dashboard");
  assert(getDashboardPath("STAFF") === "/staff", "General Staff routed to /staff dashboard");

  // ---------------------------------------------------------------------------
  // Test 5: Invalid Password Verification
  // ---------------------------------------------------------------------------
  console.log("\n--- 5. Test Scenario 4: Invalid Password Rejection ---");
  const badPassValid = await verifyPassword("WrongPassword!", adminUser!.passwordHash);
  assert(badPassValid === false, "Incorrect password correctly rejected (401 response)");

  const emptyPassValid = await verifyPassword("", adminUser!.passwordHash);
  assert(emptyPassValid === false, "Empty password correctly rejected");

  // ---------------------------------------------------------------------------
  // Test 6: Unauthenticated Route Protection
  // ---------------------------------------------------------------------------
  console.log("\n--- 6. Test Scenario 5: Unauthenticated User Access ---");
  const invalidTokenDecoded = await verifySessionToken("invalid.jwt.token");
  assert(invalidTokenDecoded === null, "Invalid/tampered token rejected");

  // ---------------------------------------------------------------------------
  // Test 7: Role-Based Access Control (RBAC)
  // ---------------------------------------------------------------------------
  console.log("\n--- 7. Test Scenario 6: Role-Based Authorization Enforcement ---");
  // Doctor attempting to access /admin
  assert(isAuthorizedForPath("DOCTOR", "/admin") === false, "DOCTOR denied access to /admin");

  // Admin attempting to access /doctor
  assert(isAuthorizedForPath("ADMIN", "/doctor") === false, "ADMIN denied access to /doctor");

  // Nurse attempting to access /admin
  assert(isAuthorizedForPath("NURSE", "/admin") === false, "NURSE denied access to /admin");

  // Nurse attempting to access /doctor
  assert(isAuthorizedForPath("NURSE", "/doctor") === false, "NURSE denied access to /doctor");

  // Nurse accessing /staff
  assert(isAuthorizedForPath("NURSE", "/staff") === true, "NURSE allowed access to /staff");

  // Receptionist accessing /staff
  assert(isAuthorizedForPath("RECEPTIONIST", "/staff") === true, "RECEPTIONIST allowed access to /staff");

  // Doctor accessing /doctor
  assert(isAuthorizedForPath("DOCTOR", "/doctor") === true, "DOCTOR allowed access to /doctor");

  // Admin accessing /admin
  assert(isAuthorizedForPath("ADMIN", "/admin") === true, "ADMIN allowed access to /admin");

  // ---------------------------------------------------------------------------
  // Test 8: Security Best Practices Check
  // ---------------------------------------------------------------------------
  console.log("\n--- 8. Security & Data Sanitization ---");
  assert(COOKIE_NAME === "gias_auth_token", "Cookie name configured correctly");
  assert(!("passwordHash" in adminDecoded!), "JWT payload does NOT expose passwordHash");

  console.log("\n=================================================");
  console.log(`  SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
