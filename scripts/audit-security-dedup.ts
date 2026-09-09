import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";

async function main() {
  console.log("==================================================");
  console.log("   GIAS HOSPITAL - FULL SECURITY & DATA AUDIT    ");
  console.log("==================================================\n");

  const projectRoot = path.resolve(__dirname, "..");
  const apiDir = path.join(projectRoot, "src/app/api");

  // 1. API ROUTE SECURITY SCAN
  console.log(">>> 1. AUDITING API ROUTE AUTHENTICATION & GUARDS");

  function getRouteFiles(dir: string): string[] {
    let files: string[] = [];
    for (const item of fs.readdirSync(dir)) {
      const p = path.join(dir, item);
      if (fs.statSync(p).isDirectory()) {
        files = files.concat(getRouteFiles(p));
      } else if (item === "route.ts") {
        files.push(p);
      }
    }
    return files;
  }

  const routeFiles = getRouteFiles(apiDir);
  console.log(`Found ${routeFiles.length} API routes.`);

  const unauthenticatedRoutes: string[] = [];
  const authenticatedRoutes: { path: string; guard: string }[] = [];

  const publicWhitelistedRoutes = [
    "src/app/api/auth/login/route.ts",
  ];

  for (const file of routeFiles) {
    const rel = path.relative(projectRoot, file).replace(/\\/g, "/");
    const content = fs.readFileSync(file, "utf8");

    if (publicWhitelistedRoutes.some((p) => rel === p)) {
      continue;
    }

    const authMatches = [
      "getCurrentUser",
      "requirePatientAccess",
      "requirePatientManage",
      "requireAppointmentAccess",
      "requireAppointmentManage",
      "requirePermissionManage",
      "requireDoctor",
      "requireStaff",
      "requireAdmin",
      "verifyToken",
      "verifySessionToken",
      "getUserFromToken",
    ].filter((term) => content.includes(term));

    if (authMatches.length > 0) {
      authenticatedRoutes.push({ path: rel, guard: authMatches.join(", ") });
    } else {
      unauthenticatedRoutes.push(rel);
    }
  }

  if (unauthenticatedRoutes.length > 0) {
    console.warn(`⚠️  ${unauthenticatedRoutes.length} ROUTES MISSING EXPLICIT AUTH GUARDS:`);
    unauthenticatedRoutes.forEach((r) => console.warn(`   - ${r}`));
  } else {
    console.log("✅ All protected API routes contain explicit authentication guards!");
  }

  // 2. USER PASSWORDS & SECURITY
  console.log("\n>>> 2. AUDITING USER AUTHENTICATION & PASSWORDS IN DB");
  const users = await prisma.user.findMany({
    select: { id: true, username: true, email: true, role: true, status: true, passwordHash: true },
  });
  console.log(`Found ${users.length} user accounts in database.`);

  let insecurePasswords = 0;
  for (const u of users) {
    const isBcrypt = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(u.passwordHash);
    if (!isBcrypt) {
      console.warn(`⚠️ User ${u.username || u.email} does NOT have a valid bcrypt hash!`);
      insecurePasswords++;
    }
  }
  if (insecurePasswords === 0) {
    console.log("✅ All user accounts are secured with strong bcrypt password hashes.");
  }

  // 3. DATABASE DEDUPLICATION CHECKS
  console.log("\n>>> 3. AUDITING DATABASE DATA INTEGRITY & DUPLICATES");

  // Patients
  const allPatients = await prisma.patient.findMany();
  console.log(`Total Patients in database: ${allPatients.length}`);

  const mrSet = new Map<string, number>();
  const patNumSet = new Map<string, number>();
  const cnicSet = new Map<string, number>();
  const phoneNameSet = new Map<string, number>();

  for (const p of allPatients) {
    if (p.mrNumber) {
      mrSet.set(p.mrNumber, (mrSet.get(p.mrNumber) || 0) + 1);
    }
    if (p.patientNumber) {
      patNumSet.set(p.patientNumber, (patNumSet.get(p.patientNumber) || 0) + 1);
    }
    if (p.cnic) {
      cnicSet.set(p.cnic, (cnicSet.get(p.cnic) || 0) + 1);
    }
    const key = `${p.phone}_${p.firstName.toLowerCase().trim()}_${p.lastName.toLowerCase().trim()}`;
    phoneNameSet.set(key, (phoneNameSet.get(key) || 0) + 1);
  }

  let duplicatePatients = 0;
  for (const [mr, count] of mrSet.entries()) {
    if (count > 1) {
      console.warn(`⚠️ Duplicate MR Number found: ${mr} (count: ${count})`);
      duplicatePatients++;
    }
  }
  for (const [pn, count] of patNumSet.entries()) {
    if (count > 1) {
      console.warn(`⚠️ Duplicate Patient Number found: ${pn} (count: ${count})`);
      duplicatePatients++;
    }
  }
  for (const [cnic, count] of cnicSet.entries()) {
    if (count > 1) {
      console.warn(`⚠️ Duplicate CNIC found: ${cnic} (count: ${count})`);
      duplicatePatients++;
    }
  }
  for (const [key, count] of phoneNameSet.entries()) {
    if (count > 1) {
      console.warn(`⚠️ Duplicate patient (same phone & name): ${key} (count: ${count})`);
      duplicatePatients++;
    }
  }
  if (duplicatePatients === 0) {
    console.log("✅ No duplicate patient records found by MR, Patient Number, CNIC, or Phone+Name.");
  }

  // Active Admissions
  console.log("\n--- Checking Active Admissions ---");
  const activeAdmissions = await prisma.admission.findMany({
    where: { status: { in: ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"] } },
  });
  console.log(`Active admissions: ${activeAdmissions.length}`);

  const patientActiveAdmissions = new Map<string, string[]>();
  for (const adm of activeAdmissions) {
    const list = patientActiveAdmissions.get(adm.patientId) || [];
    list.push(adm.admissionNumber);
    patientActiveAdmissions.set(adm.patientId, list);
  }

  let dupAdmissions = 0;
  for (const [patientId, admList] of patientActiveAdmissions.entries()) {
    if (admList.length > 1) {
      console.warn(`⚠️ Patient ${patientId} has MULTIPLE active admissions: ${admList.join(", ")}`);
      dupAdmissions++;
    }
  }
  if (dupAdmissions === 0) {
    console.log("✅ No patient has multiple concurrent active admissions.");
  }

  // Beds & Rooms
  console.log("\n--- Checking Rooms & Beds ---");
  const rooms = await prisma.room.findMany({ include: { beds: true } });
  console.log(`Total Rooms: ${rooms.length}`);
  const roomNumSet = new Map<string, number>();
  let dupBeds = 0;

  for (const r of rooms) {
    roomNumSet.set(r.roomNumber, (roomNumSet.get(r.roomNumber) || 0) + 1);
    const bedNums = new Set<string>();
    for (const b of r.beds) {
      if (bedNums.has(b.bedNumber)) {
        console.warn(`⚠️ Room ${r.roomNumber} has duplicate bed number: ${b.bedNumber}`);
        dupBeds++;
      }
      bedNums.add(b.bedNumber);
    }
  }
  for (const [rNum, count] of roomNumSet.entries()) {
    if (count > 1) {
      console.warn(`⚠️ Duplicate Room Number: ${rNum} (count: ${count})`);
      dupBeds++;
    }
  }
  if (dupBeds === 0) {
    console.log("✅ Rooms and bed numbers are strictly unique.");
  }

  // Check Bed occupation consistency
  const activeBedsWithAdmissions = await prisma.admission.findMany({
    where: {
      status: { in: ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"] },
      bedId: { not: null },
    },
    select: { id: true, admissionNumber: true, bedId: true },
  });

  const bedOccupationCount = new Map<string, string[]>();
  for (const a of activeBedsWithAdmissions) {
    if (a.bedId) {
      const list = bedOccupationCount.get(a.bedId) || [];
      list.push(a.admissionNumber);
      bedOccupationCount.set(a.bedId, list);
    }
  }

  let doubleBookedBeds = 0;
  for (const [bedId, adms] of bedOccupationCount.entries()) {
    if (adms.length > 1) {
      console.warn(`⚠️ Bed ${bedId} is double-booked across active admissions: ${adms.join(", ")}`);
      doubleBookedBeds++;
    }
  }
  if (doubleBookedBeds === 0) {
    console.log("✅ No beds are double-booked across admissions.");
  }

  // Check Appointments
  console.log("\n--- Checking Appointments ---");
  const appointments = await prisma.appointment.findMany();
  console.log(`Total Appointments: ${appointments.length}`);
  const aptNums = new Set<string>();
  let dupApt = 0;
  for (const apt of appointments) {
    if (aptNums.has(apt.appointmentNumber)) {
      console.warn(`⚠️ Duplicate Appointment Number: ${apt.appointmentNumber}`);
      dupApt++;
    }
    aptNums.add(apt.appointmentNumber);
  }
  if (dupApt === 0) {
    console.log("✅ All appointment numbers are strictly unique.");
  }

  // Check Referrals and Death Certificates
  console.log("\n--- Checking Referrals & Death Certificates ---");
  const referrals = await prisma.patientReferral.findMany();
  const deathCerts = await prisma.deathCertificate.findMany();
  console.log(`Referrals: ${referrals.length}, Death Certificates: ${deathCerts.length}`);

  const refNums = new Set<string>();
  let dupRef = 0;
  for (const ref of referrals) {
    if (refNums.has(ref.referralNumber)) {
      console.warn(`⚠️ Duplicate Referral Number: ${ref.referralNumber}`);
      dupRef++;
    }
    refNums.add(ref.referralNumber);
  }

  const dcNums = new Set<string>();
  let dupDc = 0;
  for (const dc of deathCerts) {
    if (dcNums.has(dc.certificateNumber)) {
      console.warn(`⚠️ Duplicate Certificate Number: ${dc.certificateNumber}`);
      dupDc++;
    }
    dcNums.add(dc.certificateNumber);
  }

  if (dupRef === 0 && dupDc === 0) {
    console.log("✅ Referral and Death Certificate numbers are completely unique.");
  }

  // 4. FRONTEND MIDDLEWARE MATCHER COVERAGE
  console.log("\n>>> 4. AUDITING FRONTEND MIDDLEWARE PROTECTION");
  const middlewarePath = path.join(projectRoot, "src/middleware.ts");
  const middlewareContent = fs.readFileSync(middlewarePath, "utf8");

  const appPages = fs
    .readdirSync(path.join(projectRoot, "src/app"))
    .filter((f) => fs.statSync(path.join(projectRoot, "src/app", f)).isDirectory());

  console.log(`Top-level app directories: ${appPages.join(", ")}`);
  for (const page of appPages) {
    if (page === "api" || page === "login") continue;
    const isMatched = middlewareContent.includes(`"/${page}/:path*"`) || middlewareContent.includes(`"/${page}"`);
    if (!isMatched) {
      console.warn(`⚠️  Top-level app directory '/${page}' is NOT explicitly listed in middleware matcher!`);
    } else {
      console.log(`   - /${page} is protected in middleware matcher.`);
    }
  }

  console.log("\n==================================================");
  console.log("               AUDIT SCAN COMPLETED               ");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("Audit error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
