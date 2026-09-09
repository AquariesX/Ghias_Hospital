import prisma from "../src/lib/prisma";
import { createSessionToken } from "../src/lib/auth";

const BASE_URL = "http://localhost:3000";

async function runAdmissionEnhancementVerification() {
  console.log("================================================================================");
  console.log("GIAS HOSPITAL — ADMISSION & DEPARTMENT NURSE VISIBILITY VERIFICATION");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (detail) console.log(`       -> ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       -> ${detail}`);
      failed++;
    }
  }

  // 1. Fetch Users
  const receptionistUser = await prisma.user.findFirst({
    where: { role: "RECEPTIONIST" },
  });
  if (!receptionistUser) throw new Error("Receptionist user not found.");

  const opdNurseUser = await prisma.user.findFirst({
    where: {
      role: "NURSE",
      staffProfile: { nurseDepartment: "OPD" },
    },
    include: { staffProfile: true },
  });
  if (!opdNurseUser) throw new Error("OPD Nurse user not found.");

  const erNurseUser = await prisma.user.findFirst({
    where: {
      role: "NURSE",
      staffProfile: { nurseDepartment: "EMERGENCY" },
    },
    include: { staffProfile: true },
  });
  if (!erNurseUser) throw new Error("Emergency Nurse user not found.");

  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });
  if (!adminUser) throw new Error("Admin user not found.");

  // Generate Session Tokens & Cookies
  const receptionistToken = await createSessionToken({
    sub: receptionistUser.id,
    email: receptionistUser.email,
    username: receptionistUser.username,
    role: receptionistUser.role,
    firstName: receptionistUser.firstName,
    lastName: receptionistUser.lastName,
    permissions: receptionistUser.permissions,
  });
  const receptionistCookie = `gias_auth_token=${receptionistToken}`;

  const opdNurseToken = await createSessionToken({
    sub: opdNurseUser.id,
    email: opdNurseUser.email,
    username: opdNurseUser.username,
    role: opdNurseUser.role,
    firstName: opdNurseUser.firstName,
    lastName: opdNurseUser.lastName,
    permissions: opdNurseUser.permissions,
  });
  const opdNurseCookie = `gias_auth_token=${opdNurseToken}`;

  const erNurseToken = await createSessionToken({
    sub: erNurseUser.id,
    email: erNurseUser.email,
    username: erNurseUser.username,
    role: erNurseUser.role,
    firstName: erNurseUser.firstName,
    lastName: erNurseUser.lastName,
    permissions: erNurseUser.permissions,
  });
  const erNurseCookie = `gias_auth_token=${erNurseToken}`;

  const adminToken = await createSessionToken({
    sub: adminUser.id,
    email: adminUser.email,
    username: adminUser.username,
    role: adminUser.role,
    firstName: adminUser.firstName,
    lastName: adminUser.lastName,
    permissions: adminUser.permissions,
  });
  const adminCookie = `gias_auth_token=${adminToken}`;

  // Check doctors and patients exist
  const doctor = await prisma.doctor.findFirst({ where: { status: "ACTIVE" } });
  if (!doctor) throw new Error("Active Doctor not found.");

  const testPatient1 = await prisma.patient.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!testPatient1) throw new Error("Patient 1 not found.");

  const testPatient2 = await prisma.patient.findFirst({
    where: { id: { not: testPatient1.id } },
    orderBy: { createdAt: "desc" },
  });
  if (!testPatient2) throw new Error("Patient 2 not found.");

  console.log("--- 1. Testing GET /api/doctors (Unified Doctor Selection) ---");
  const getDocRes = await fetch(`${BASE_URL}/api/doctors`, {
    headers: { Cookie: receptionistCookie },
  });
  assert(getDocRes.status === 200, "GET /api/doctors returns HTTP 200 for Receptionist");
  const docData = await getDocRes.json();
  assert(Array.isArray(docData.data) && docData.data.length > 0, "Doctors list returned in data array", `Found ${docData.data?.length} doctors`);
  assert(Array.isArray(docData.doctors), "Compatibility alias docData.doctors is also returned");

  console.log("\n--- 2. Testing POST /api/admissions (OPD Admission Creation) ---");
  const opdAdmissionPayload = {
    patientId: testPatient1.id,
    doctorId: doctor.id,
    roomBedNo: "Ward-OPD Bed 101",
    admissionSource: "OPD",
    provisionalDiagnosis: "Acute Appendicitis - Initial Assessment",
    finalDiagnosis: "Subacute Appendicitis",
    operation: "Emergency Appendectomy planned",
  };

  const createOpdRes = await fetch(`${BASE_URL}/api/admissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: receptionistCookie },
    body: JSON.stringify(opdAdmissionPayload),
  });
  assert(createOpdRes.status === 201, "OPD Admission returns HTTP 201 Created");
  const opdAdmissionJson = await createOpdRes.json();
  const opdAdmission = opdAdmissionJson.data || opdAdmissionJson.admission;
  assert(!!opdAdmission && !!opdAdmission.id, "Admission returned with valid ID");
  assert(!!opdAdmissionJson.data && !!opdAdmissionJson.admission, "Both json.data and json.admission returned for frontend safety");
  assert(opdAdmission.admissionSource === "OPD", "Admission source is OPD");
  assert(opdAdmission.operation === "Emergency Appendectomy planned", "Operation field correctly stored in database");
  assert(!!opdAdmission.admissionDate && !!opdAdmission.admissionTime, "Admission date and time auto-populated", `Time: ${opdAdmission.admissionTime}`);

  console.log("\n--- 3. Testing POST /api/admissions (Emergency Admission Creation) ---");
  const erAdmissionPayload = {
    patientId: testPatient2.id,
    doctorId: doctor.id,
    roomBedNo: "ER-Resus Bed 02",
    admissionSource: "EMERGENCY",
    provisionalDiagnosis: "Multiple Trauma - Road Traffic Accident",
    finalDiagnosis: "Femur Fracture + Hemothorax",
    operation: "Closed Reduction & Chest Tube Insertion",
  };

  const createErRes = await fetch(`${BASE_URL}/api/admissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: receptionistCookie },
    body: JSON.stringify(erAdmissionPayload),
  });
  assert(createErRes.status === 201, "Emergency Admission returns HTTP 201 Created");
  const erAdmissionJson = await createErRes.json();
  const erAdmission = erAdmissionJson.data || erAdmissionJson.admission;
  assert(erAdmission.admissionSource === "EMERGENCY", "Admission source is EMERGENCY");

  console.log("\n--- 4. Testing Strict Department Isolation for OPD Nurse ---");
  // OPD nurse calling GET /api/admissions
  const opdNurseListRes = await fetch(`${BASE_URL}/api/admissions`, {
    headers: { Cookie: opdNurseCookie },
  });
  assert(opdNurseListRes.status === 200, "OPD Nurse can list admissions (HTTP 200)");
  const opdNurseListData = await opdNurseListRes.json();
  const opdNurseAdmissions = opdNurseListData.data || opdNurseListData.admissions || [];
  const allOpdOnly = opdNurseAdmissions.every((a: any) => a.admissionSource === "OPD");
  assert(allOpdOnly, "OPD Nurse ONLY sees admissions with admissionSource === 'OPD'", `Returned ${opdNurseAdmissions.length} OPD records`);
  const containsErAdmissionInOpd = opdNurseAdmissions.some((a: any) => a.id === erAdmission.id);
  assert(!containsErAdmissionInOpd, "OPD Nurse cannot see the Emergency admission in admissions list");

  // OPD nurse calling GET /api/patients/admitted
  const opdAdmittedPatientsRes = await fetch(`${BASE_URL}/api/patients/admitted`, {
    headers: { Cookie: opdNurseCookie },
  });
  assert(opdAdmittedPatientsRes.status === 200, "OPD Nurse can query admitted patients (HTTP 200)");
  const opdAdmittedPatientsData = await opdAdmittedPatientsRes.json();
  const opdAdmittedList = opdAdmittedPatientsData.data || opdAdmittedPatientsData.admissions || [];
  assert(opdAdmittedList.every((a: any) => a.admissionSource === "OPD"), "OPD Nurse admitted patients list only contains OPD admissions");

  // OPD nurse attempting IDOR GET on Emergency admission
  const opdIdorRes = await fetch(`${BASE_URL}/api/admissions/${erAdmission.id}`, {
    headers: { Cookie: opdNurseCookie },
  });
  assert(opdIdorRes.status === 403, "IDOR Defense: OPD Nurse gets HTTP 403 Forbidden accessing Emergency admission");

  console.log("\n--- 5. Testing Strict Department Isolation for Emergency Nurse ---");
  // ER nurse calling GET /api/admissions
  const erNurseListRes = await fetch(`${BASE_URL}/api/admissions`, {
    headers: { Cookie: erNurseCookie },
  });
  assert(erNurseListRes.status === 200, "ER Nurse can list admissions (HTTP 200)");
  const erNurseListData = await erNurseListRes.json();
  const erNurseAdmissions = erNurseListData.data || erNurseListData.admissions || [];
  const allErOnly = erNurseAdmissions.every((a: any) => a.admissionSource === "EMERGENCY");
  assert(allErOnly, "Emergency Nurse ONLY sees admissions with admissionSource === 'EMERGENCY'", `Returned ${erNurseAdmissions.length} ER records`);
  const containsOpdAdmissionInEr = erNurseAdmissions.some((a: any) => a.id === opdAdmission.id);
  assert(!containsOpdAdmissionInEr, "Emergency Nurse cannot see the OPD admission in admissions list");

  // ER nurse attempting IDOR GET on OPD admission
  const erIdorRes = await fetch(`${BASE_URL}/api/admissions/${opdAdmission.id}`, {
    headers: { Cookie: erNurseCookie },
  });
  assert(erIdorRes.status === 403, "IDOR Defense: Emergency Nurse gets HTTP 403 Forbidden accessing OPD admission");

  console.log("\n--- 6. Testing Admin & Receptionist Visibility ---");
  const adminListRes = await fetch(`${BASE_URL}/api/admissions`, {
    headers: { Cookie: adminCookie },
  });
  assert(adminListRes.status === 200, "Admin can list all admissions (HTTP 200)");
  const adminListData = await adminListRes.json();
  const adminAdmissions = adminListData.data || adminListData.admissions || [];
  const hasBothSources =
    adminAdmissions.some((a: any) => a.admissionSource === "OPD") &&
    adminAdmissions.some((a: any) => a.admissionSource === "EMERGENCY");
  assert(hasBothSources, "Admin can see admissions from both OPD and EMERGENCY departments");

  // Receptionist Permissions / Consents endpoint
  const recAdmittedRes = await fetch(`${BASE_URL}/api/patients/admitted`, {
    headers: { Cookie: receptionistCookie },
  });
  assert(recAdmittedRes.status === 200, "Receptionist can query admitted patients for permissions/consents (HTTP 200)");
  const recAdmittedData = await recAdmittedRes.json();
  const recList = recAdmittedData.data || recAdmittedData.admissions || [];
  const recHasBoth =
    recList.some((a: any) => a.id === opdAdmission.id) &&
    recList.some((a: any) => a.id === erAdmission.id);
  assert(recHasBoth, "Newly admitted patients (both OPD and ER) appear in Receptionist Admitted Patients / Consents list");

  console.log("\n--- 7. Testing Nurse Initial Assessment & Atomic VitalSign Creation ---");
  const assessmentPayload = {
    presentingComplaints: "Severe right lower quadrant abdominal pain for 2 days, low-grade fever, nausea",
    medicationHistory: "Tab Paracetamol 500mg taken yesterday with minimal relief",
    familyHistory: "No history of bleeding disorders or surgical complications",
    allergies: ["Penicillin", "Sulfa drugs"],
    pulse: 88,
    temperature: 99.8,
    systolicBP: 125,
    diastolicBP: 82,
    respiratoryRate: 20,
    generalExamination: "Patient conscious, oriented. Tenderness and guarding in Right Iliac Fossa. Rovsing sign positive.",
    provisionalDiagnosis: "Acute Appendicitis - Verified by Ward Nurse",
    investigations: "CBC, Ultrasound Abdomen, Serum Electrolytes ordered",
    finalDiagnosis: "Acute Suppurative Appendicitis",
    operation: "Laparoscopic Appendectomy",
    nutritionalStatus: "NPO (Nil Per Os) for Surgery",
    weight: 68.5,
    height: 172.0,
    advisedDiet: "Strict NPO till surgical evaluation",
    treatmentPlan: "IV Cannula 18G, IV Normal Saline 1000ml @ 100ml/hr, Pre-op antibiotic Ceftriaxone 1g after skin test",
  };

  const updateRes = await fetch(`${BASE_URL}/api/admissions/${opdAdmission.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: opdNurseCookie },
    body: JSON.stringify(assessmentPayload),
  });
  assert(updateRes.status === 200, "Nurse Initial Assessment PUT returns HTTP 200 Success");
  const updateJson = await updateRes.json();
  const updatedAdm = updateJson.data || updateJson.admission;

  assert(updatedAdm.pulse === 88, "Pulse updated correctly in Admission model");
  assert(updatedAdm.systolicBP === 125 && updatedAdm.diastolicBP === 82, "Blood pressure updated in Admission model");
  assert(Number(updatedAdm.weight) === 68.5, "Weight recorded correctly in Admission model", `Weight: ${updatedAdm.weight}`);
  assert(updatedAdm.allergies.includes("Penicillin"), "Allergies array updated in Admission model");
  assert(updatedAdm.operation === "Laparoscopic Appendectomy", "Operation recorded in Nurse Initial Assessment");

  // Verify VitalSign was created atomically
  const vitalSign = await prisma.vitalSign.findFirst({
    where: { admissionId: opdAdmission.id },
    orderBy: { recordedAt: "desc" },
  });
  assert(!!vitalSign, "VitalSign record was atomically created linked to admissionId");
  if (vitalSign) {
    assert(vitalSign.patientId === testPatient1.id, "VitalSign linked to correct patientId");
    assert(vitalSign.pulse === 88, "VitalSign pulse matches recorded assessment (88)");
    assert(vitalSign.systolicBP === 125, "VitalSign systolicBP matches recorded assessment (125)");
    assert(vitalSign.diastolicBP === 82, "VitalSign diastolicBP matches recorded assessment (82)");
  }

  // Verify AuditLog and TimelineEvent
  const audit = await prisma.auditLog.findFirst({
    where: { entityId: opdAdmission.id, action: "UPDATE_ADMISSION" },
    orderBy: { timestamp: "desc" },
  });
  assert(!!audit, "AuditLog created recording the nurse clinical update");

  const timeline = await prisma.timelineEvent.findFirst({
    where: { entityId: opdAdmission.id, eventType: "NURSE_NOTE" },
    orderBy: { timestamp: "desc" },
  });
  assert(!!timeline, "TimelineEvent created recording NURSE_NOTE");

  // Cleanup test admissions
  console.log("\n--- Cleaning up test admissions ---");
  await prisma.vitalSign.deleteMany({ where: { admissionId: { in: [opdAdmission.id, erAdmission.id] } } });
  await prisma.timelineEvent.deleteMany({ where: { entityId: { in: [opdAdmission.id, erAdmission.id] } } });
  await prisma.auditLog.deleteMany({ where: { entityId: { in: [opdAdmission.id, erAdmission.id] } } });
  await prisma.admission.deleteMany({ where: { id: { in: [opdAdmission.id, erAdmission.id] } } });
  console.log("✔ Test admissions cleaned up cleanly.\n");

  console.log("================================================================================");
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAdmissionEnhancementVerification()
  .catch((err) => {
    console.error("Verification execution error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
