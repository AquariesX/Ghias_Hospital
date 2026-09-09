import prisma from "../src/lib/prisma";
import { createSessionToken } from "../src/lib/auth";
import { UserRole, EmergencyPriority } from "@prisma/client";
import { GET as getStaffMe } from "../src/app/api/staff/me/route";
import { GET as getStaffDashboard } from "../src/app/api/staff/dashboard/route";
import { GET as getOpdQueue } from "../src/app/api/staff/opd/queue/route";
import { GET as getEmergencyQueue } from "../src/app/api/staff/emergency/queue/route";
import { GET as searchPatients } from "../src/app/api/staff/patients/route";
import { GET as getPatientDetails } from "../src/app/api/staff/patients/[id]/route";
import { GET as getVitals, POST as recordVitals } from "../src/app/api/staff/patients/[id]/vitals/route";
import { POST as recordEmergencyTriage } from "../src/app/api/staff/emergency/triage/route";
import { GET as getNursingNotes, POST as recordNursingNote } from "../src/app/api/staff/patients/[id]/nursing-notes/route";
import { GET as getDoctorConsultationWorkspace } from "../src/app/api/doctor/consultations/[appointmentId]/route";
import { NextRequest } from "next/server";

// Helper to create simulated NextRequest with auth cookie
function createMockRequest(
  url: string,
  token: string,
  method = "GET",
  body?: Record<string, unknown>
): NextRequest {
  const reqInit: RequestInit = {
    method,
    headers: {
      cookie: `gias_auth_token=${token}`,
      "content-type": "application/json",
    },
  };
  if (body) {
    reqInit.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), reqInit as any);
}

async function runPhase6Verification() {
  console.log("================================================================================");
  console.log("GIAS HOSPITAL — PHASE 6 NURSING / STAFF MODULE VERIFICATION SUITE");
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

  // 1. Prepare test users
  const opdNurseUser = await prisma.user.findUnique({
    where: { email: "nurse.opd@giashospital.org" },
    include: { staffProfile: true },
  });
  if (!opdNurseUser || !opdNurseUser.staffProfile) {
    throw new Error("OPD Nurse user not found in database.");
  }

  const erNurseUser = await prisma.user.findUnique({
    where: { email: "nurse.er@giashospital.org" },
    include: { staffProfile: true },
  });
  if (!erNurseUser || !erNurseUser.staffProfile) {
    throw new Error("Emergency Nurse user not found in database.");
  }

  const doctorUser = await prisma.user.findUnique({
    where: { email: "dr.ahmed@giashospital.org" },
    include: { doctorProfile: true },
  });
  if (!doctorUser || !doctorUser.doctorProfile) {
    throw new Error("Doctor user not found in database.");
  }

  const opdNurseToken = await createSessionToken({
    sub: opdNurseUser.id,
    email: opdNurseUser.email,
    username: opdNurseUser.username,
    role: opdNurseUser.role,
    firstName: opdNurseUser.firstName,
    lastName: opdNurseUser.lastName,
    permissions: opdNurseUser.permissions,
  });

  const erNurseToken = await createSessionToken({
    sub: erNurseUser.id,
    email: erNurseUser.email,
    username: erNurseUser.username,
    role: erNurseUser.role,
    firstName: erNurseUser.firstName,
    lastName: erNurseUser.lastName,
    permissions: erNurseUser.permissions,
  });

  const doctorToken = await createSessionToken({
    sub: doctorUser.id,
    email: doctorUser.email,
    username: doctorUser.username,
    role: doctorUser.role,
    firstName: doctorUser.firstName,
    lastName: doctorUser.lastName,
    permissions: doctorUser.permissions,
  });

  console.log("Authenticated test sessions generated:");
  console.log(`  - OPD Nurse:       ${opdNurseUser.firstName} ${opdNurseUser.lastName} (Dept: ${opdNurseUser.staffProfile.nurseDepartment})`);
  console.log(`  - ER Nurse:        ${erNurseUser.firstName} ${erNurseUser.lastName} (Dept: ${erNurseUser.staffProfile.nurseDepartment})`);
  console.log(`  - Doctor:          Dr. ${doctorUser.firstName} ${doctorUser.lastName}\n`);

  // Ensure test patient exists
  let testPatient = await prisma.patient.findFirst({
    orderBy: { createdAt: "desc" },
  });
  if (!testPatient) {
    testPatient = await prisma.patient.create({
      data: {
        patientNumber: "PAT-TEST-001",
        firstName: "Zainab",
        lastName: "Bibi",
        gender: "FEMALE",
        dateOfBirth: new Date("1995-05-15"),
        phone: "+923001122334",
        bloodGroup: "B_POSITIVE",
        allergies: ["Penicillin"],
        chronicConditions: ["Asthma"],
        emergencyContactName: "Muhammad Tariq",
        emergencyContactPhone: "+923009988776",
      },
    });
  }

  // Ensure today's test appointment exists for OPD and Doctor handoff
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let testAppointment = await prisma.appointment.findFirst({
    where: {
      patientId: testPatient.id,
      doctorId: doctorUser.doctorProfile.id,
      appointmentDate: todayStart,
    },
  });

  if (!testAppointment) {
    const dept = await prisma.department.findFirst();
    testAppointment = await prisma.appointment.create({
      data: {
        appointmentNumber: `APT-PH6-${Date.now().toString().slice(-6)}`,
        patientId: testPatient.id,
        doctorId: doctorUser.doctorProfile.id,
        departmentId: dept ? dept.id : doctorUser.doctorProfile.departmentId!,
        appointmentDate: todayStart,
        appointmentTime: "11:30 AM",
        consultationFee: 2000.0,
        reason: "Routine clinical assessment and follow-up",
        status: "WAITING",
        createdById: opdNurseUser.id,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Staff Identification & Profile (/api/staff/me)
  // ---------------------------------------------------------------------------
  {
    const req = createMockRequest("http://localhost:3000/api/staff/me", opdNurseToken);
    const res = await getStaffMe(req);
    const body = await res.json();

    assert(
      res.status === 200 &&
        body.data?.staff?.nurseDepartment === "OPD" &&
        body.data?.staff?.role === "STAFF_NURSE",
      "Test 1: Staff Identification API (GET /api/staff/me)",
      `Identified: ${body.data?.staff?.firstName} ${body.data?.staff?.lastName}, Department: ${body.data?.staff?.nurseDepartment}`
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 2: OPD Nurse Dashboard Metrics (/api/staff/dashboard)
  // ---------------------------------------------------------------------------
  {
    const req = createMockRequest("http://localhost:3000/api/staff/dashboard", opdNurseToken);
    const res = await getStaffDashboard(req);
    const body = await res.json();

    assert(
      res.status === 200 &&
        body.department === "OPD" &&
        typeof body.metrics?.totalPatients === "number" &&
        typeof body.metrics?.waiting === "number",
      "Test 2: OPD Nurse Dashboard Metrics (GET /api/staff/dashboard)",
      `Total OPD: ${body.metrics?.totalPatients}, Waiting: ${body.metrics?.waiting}, In Consultation: ${body.metrics?.inConsultation}`
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 3: OPD Patient Queue API (/api/staff/opd/queue)
  // ---------------------------------------------------------------------------
  {
    const req = createMockRequest("http://localhost:3000/api/staff/opd/queue", opdNurseToken);
    const res = await getOpdQueue(req);
    const body = await res.json();

    assert(
      res.status === 200 && Array.isArray(body.data) && body.data.length > 0,
      "Test 3: OPD Nursing Queue API (GET /api/staff/opd/queue)",
      `Queue returned ${body.data.length} appointment(s) awaiting nursing/doctor attention.`
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Strict Department Isolation (OPD nurse blocked from Emergency endpoints)
  // ---------------------------------------------------------------------------
  {
    const req = createMockRequest("http://localhost:3000/api/staff/emergency/queue", opdNurseToken);
    let blocked = false;
    let status = 0;
    try {
      const res = await getEmergencyQueue(req);
      status = res.status;
      blocked = res.status === 403;
    } catch (err: any) {
      if (err?.status === 403) {
        blocked = true;
        status = 403;
      }
    }

    assert(
      blocked,
      "Test 4: Strict Department Isolation — OPD Nurse Forbidden from Emergency Queue",
      `HTTP status returned: ${status} (Forbidden as expected)`
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Strict Department Isolation (Emergency nurse blocked from OPD queue)
  // ---------------------------------------------------------------------------
  {
    const req = createMockRequest("http://localhost:3000/api/staff/opd/queue", erNurseToken);
    let blocked = false;
    let status = 0;
    try {
      const res = await getOpdQueue(req);
      status = res.status;
      blocked = res.status === 403;
    } catch (err: any) {
      if (err?.status === 403) {
        blocked = true;
        status = 403;
      }
    }

    assert(
      blocked,
      "Test 5: Strict Department Isolation — ER Nurse Forbidden from OPD Queue",
      `HTTP status returned: ${status} (Forbidden as expected)`
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Record Vital Signs with Automated BMI Calculation
  // ---------------------------------------------------------------------------
  let initialVitalId = "";
  {
    const req = createMockRequest(
      `http://localhost:3000/api/staff/patients/${testPatient.id}/vitals`,
      opdNurseToken,
      "POST",
      {
        systolicBP: 125,
        diastolicBP: 82,
        pulse: 76,
        temperature: 98.6,
        respiratoryRate: 18,
        oxygenSaturation: 98,
        weight: 70, // 70 kg
        height: 175, // 175 cm -> BMI = 70 / (1.75^2) = 22.86
        painScore: 2,
        generalCondition: "Stable",
        observations: "Patient comfortable, vitals stable prior to doctor consultation.",
      }
    );

    const res = await recordVitals(req, { params: Promise.resolve({ id: testPatient.id }) });
    const body = await res.json();
    initialVitalId = body.data?.id;

    assert(
      res.status === 201 &&
        body.data?.systolicBP === 125 &&
        body.data?.recordedByRole === "NURSE" &&
        Number(body.data?.bmi) === 22.86,
      "Test 6: Vital Signs Recording & Automated BMI (POST /api/staff/patients/:id/vitals)",
      `VitalSign ID: ${body.data?.id}, BP: 125/82, SpO2: 98%, Auto-computed BMI: ${body.data?.bmi}`
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 7: Vital Sign Immutability & Append-Only History
  // ---------------------------------------------------------------------------
  {
    // Record second measurement 10 minutes later
    const req2 = createMockRequest(
      `http://localhost:3000/api/staff/patients/${testPatient.id}/vitals`,
      opdNurseToken,
      "POST",
      {
        systolicBP: 120,
        diastolicBP: 80,
        pulse: 72,
        temperature: 98.4,
        oxygenSaturation: 99,
        weight: 70,
        height: 175,
        painScore: 1,
        generalCondition: "Stable",
        observations: "Repeat vitals check.",
      }
    );
    await recordVitals(req2, { params: Promise.resolve({ id: testPatient.id }) });

    // Fetch vitals history
    const getReq = createMockRequest(
      `http://localhost:3000/api/staff/patients/${testPatient.id}/vitals`,
      opdNurseToken
    );
    const getRes = await getVitals(getReq, { params: Promise.resolve({ id: testPatient.id }) });
    const getBody = await getRes.json();

    const bothExist =
      getBody.data.length >= 2 &&
      getBody.data.some((v: any) => v.id === initialVitalId) &&
      getBody.data.some((v: any) => v.systolicBP === 120);

    assert(
      bothExist,
      "Test 7: Vital Sign Immutability — Historical Records Preserved Without Overwrite",
      `Patient now has ${getBody.data.length} historical vital sign records preserved in PostgreSQL.`
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 8: Doctor Clinical Handoff — Doctor sees Nurse-recorded Vitals
  // ---------------------------------------------------------------------------
  {
    const req = createMockRequest(
      `http://localhost:3000/api/doctor/consultations/${testAppointment.id}`,
      doctorToken
    );
    const res = await getDoctorConsultationWorkspace(req, {
      params: Promise.resolve({ appointmentId: testAppointment.id }),
    });
    const body = await res.json();

    const patientData = body.patient || body.data?.patient;
    const doctorSeesVitals =
      res.status === 200 &&
      patientData?.vitalSigns &&
      patientData.vitalSigns.length > 0 &&
      patientData.vitalSigns[0].recordedByRole === "NURSE";

    assert(
      doctorSeesVitals,
      "Test 8: Doctor Handoff Integration — Doctor Workspace Accesses Nurse Vitals",
      `Doctor loaded patient vitals: Latest BP ${patientData?.vitalSigns?.[0]?.systolicBP}/${patientData?.vitalSigns?.[0]?.diastolicBP} recorded by ${patientData?.vitalSigns?.[0]?.recordedByName}`
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 9: Emergency Nursing Dashboard & Emergency Triage Assessment
  // ---------------------------------------------------------------------------
  {
    // Check ER dashboard
    const dashReq = createMockRequest("http://localhost:3000/api/staff/dashboard", erNurseToken);
    const dashRes = await getStaffDashboard(dashReq);
    const dashBody = await dashRes.json();

    assert(
      dashRes.status === 200 && dashBody.department === "EMERGENCY",
      "Test 9a: Emergency Nursing Dashboard (GET /api/staff/dashboard)",
      `Department: EMERGENCY, Critical: ${dashBody.metrics?.critical}, High: ${dashBody.metrics?.high}`
    );

    // Record Emergency Triage
    const triageReq = createMockRequest(
      "http://localhost:3000/api/staff/emergency/triage",
      erNurseToken,
      "POST",
      {
        patientId: testPatient.id,
        chiefComplaint: "Acute shortness of breath and wheezing",
        priority: "HIGH",
        painScore: 6,
        generalCondition: "Moderate distress",
        observations: "Patient placed on 4L nasal cannula oxygen immediately.",
        systolicBP: 140,
        diastolicBP: 92,
        pulse: 104,
        temperature: 99.2,
        oxygenSaturation: 93,
        respiratoryRate: 26,
      }
    );

    const triageRes = await recordEmergencyTriage(triageReq);
    const triageBody = await triageRes.json();

    assert(
      triageRes.status === 201 &&
        triageBody.data?.priority === "HIGH" &&
        triageBody.data?.chiefComplaint === "Acute shortness of breath and wheezing",
      "Test 9b: Emergency Triage Assessment (POST /api/staff/emergency/triage)",
      `Triage recorded: Priority ${triageBody.data?.priority}, Triaged By: ${triageBody.data?.triagedByName}`
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 10: Clinical Nursing Notes (Outpatient without fake admission)
  // ---------------------------------------------------------------------------
  {
    const noteReq = createMockRequest(
      `http://localhost:3000/api/staff/patients/${testPatient.id}/nursing-notes`,
      opdNurseToken,
      "POST",
      {
        patientCondition: "Stable, resting comfortably",
        observation: "Breathing normalized following nebulizer. Color good.",
        intervention: "Administered prescribed salbutamol nebulization.",
        response: "Patient states wheezing has significantly decreased.",
        notes: "Ready for physician re-evaluation in 15 minutes.",
        department: "OPD",
      }
    );

    const noteRes = await recordNursingNote(noteReq, {
      params: Promise.resolve({ id: testPatient.id }),
    });
    const noteBody = await noteRes.json();

    assert(
      noteRes.status === 201 &&
        noteBody.data?.observation.includes("Breathing normalized") &&
        noteBody.data?.admissionId === null,
      "Test 10: Clinical Nursing Notes (POST /api/staff/patients/:id/nursing-notes)",
      `Nursing note logged: "${noteBody.data?.observation?.slice(0, 45)}..." (Admission: null / Outpatient)`
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 11: Patient Timeline & Audit Trail Logging
  // ---------------------------------------------------------------------------
  {
    const [timelineEvents, auditLogs] = await Promise.all([
      prisma.timelineEvent.findMany({
        where: {
          patientId: testPatient.id,
          eventType: { in: ["VITALS_RECORDED", "EMERGENCY_TRIAGE_RECORDED", "NURSING_NOTE_ADDED"] },
        },
        orderBy: { timestamp: "desc" },
      }),
      prisma.auditLog.findMany({
        where: {
          action: { in: ["RECORD_VITALS", "CREATE_EMERGENCY_TRIAGE", "CREATE_NURSING_NOTE"] },
        },
        orderBy: { timestamp: "desc" },
      }),
    ]);

    const timelineValid = timelineEvents.length >= 3;
    const auditValid = auditLogs.length >= 3;

    assert(
      timelineValid && auditValid,
      "Test 11: Longitudinal Timeline & System Audit Logging",
      `Found ${timelineEvents.length} clinical timeline events and ${auditLogs.length} verified audit records.`
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 12: Patient Directory Search for Nurses
  // ---------------------------------------------------------------------------
  {
    const searchReq = createMockRequest(
      `http://localhost:3000/api/staff/patients?search=${encodeURIComponent(testPatient.firstName)}`,
      opdNurseToken
    );
    const searchRes = await searchPatients(searchReq);
    const searchBody = await searchRes.json();

    assert(
      searchRes.status === 200 &&
        searchBody.data.length > 0 &&
        searchBody.data.some((p: any) => p.id === testPatient.id),
      "Test 12: Nurse Patient Search Directory (GET /api/staff/patients?search=...)",
      `Search for "${testPatient.firstName}" successfully returned ${searchBody.data.length} match(es).`
    );
  }

  console.log("\n================================================================================");
  console.log(`PHASE 6 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase6Verification()
  .catch((err) => {
    console.error("Verification execution error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
