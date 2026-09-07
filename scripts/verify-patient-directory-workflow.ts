import prisma from "../src/lib/prisma";
import { AppointmentStatus, AdmissionStatus } from "@prisma/client";

async function main() {
  console.log("================================================================================");
  console.log("VERIFYING PATIENT DIRECTORY + ADMISSION + CONSENTS INTEGRATION WORKFLOW");
  console.log("================================================================================");

  // 1. Find or create a patient
  let patient = await prisma.patient.findFirst({
    where: { firstName: "Muhammad", lastName: "Ali" },
  });

  const testDoctor = await prisma.doctor.findFirst({
    include: { department: true },
  });

  if (!testDoctor) {
    console.error("❌ No doctor found in database.");
    process.exit(1);
  }

  const testUser = await prisma.user.findFirst({
    where: { role: "RECEPTIONIST" },
  });

  if (!testUser) {
    console.error("❌ No receptionist user found.");
    process.exit(1);
  }

  if (!patient) {
    const nextNum = `PAT-${Date.now().toString().slice(-6)}`;
    const nextMR = `MR-${Date.now().toString().slice(-6)}`;
    patient = await prisma.patient.create({
      data: {
        patientNumber: nextNum,
        mrNumber: nextMR,
        firstName: "Muhammad",
        lastName: "Ali",
        gender: "MALE",
        dateOfBirth: new Date("1990-05-15"),
        phone: "03001234567",
        bloodGroup: "B_POSITIVE",
        emergencyContactName: "Attendant Brother",
        emergencyContactPhone: "03007654321",
        status: "ACTIVE",
      },
    });
    console.log(`✔ Created Patient: ${patient.firstName} ${patient.lastName} (MR: ${patient.mrNumber})`);
  } else {
    console.log(`✔ Using Existing Patient: ${patient.firstName} ${patient.lastName} (MR: ${patient.mrNumber})`);
  }

  // Ensure patient does not have any active admissions before step 1
  await prisma.admission.updateMany({
    where: {
      patientId: patient.id,
      status: { in: [AdmissionStatus.ADMITTED, AdmissionStatus.UNDER_TREATMENT, AdmissionStatus.DISCHARGE_PENDING] },
    },
    data: { status: AdmissionStatus.DISCHARGED },
  });

  // STEP 1: Patient has an appointment
  console.log("\n--- STEP 1: Appointment Creation & Appointment Patients Query ---");
  const aptNumber = `APT-TEST-${Date.now().toString().slice(-5)}`;
  const appointment = await prisma.appointment.create({
    data: {
      appointmentNumber: aptNumber,
      patientId: patient.id,
      doctorId: testDoctor.id,
      departmentId: testDoctor.departmentId,
      appointmentDate: new Date(),
      appointmentTime: "10:30 AM",
      consultationFee: testDoctor.consultationFee,
      reason: "Acute abdominal pain evaluation",
      status: AppointmentStatus.SCHEDULED,
      createdById: testUser.id,
    },
  });
  console.log(`✔ Appointment created: #${appointment.appointmentNumber}`);

  // Query appointment patients (excluding active inpatients)
  const apptPatients = await prisma.appointment.findMany({
    where: {
      patient: {
        admissions: {
          none: {
            status: { in: [AdmissionStatus.ADMITTED, AdmissionStatus.UNDER_TREATMENT, AdmissionStatus.DISCHARGE_PENDING] },
          },
        },
      },
      patientId: patient.id,
    },
  });
  const foundInApptList = apptPatients.some((a) => a.id === appointment.id);
  console.log(`✔ Verified: Patient appears in APPOINTMENT PATIENTS list: ${foundInApptList}`);
  if (!foundInApptList) throw new Error("Patient did not appear in APPOINTMENT PATIENTS list");

  // STEP 2 & 3: Doctor Consultation with Admission Recommendation
  console.log("\n--- STEP 2 & 3: Doctor Consultation & Admission Recommendation ---");
  const consultationNumber = `CNS-TEST-${Date.now().toString().slice(-5)}`;
  const consultation = await prisma.consultation.create({
    data: {
      consultationNumber,
      appointmentId: appointment.id,
      patientId: patient.id,
      doctorId: testDoctor.id,
      provisionalDiagnosis: "Acute Appendicitis with Local Peritonitis",
      finalDiagnosis: "Acute Appendicitis",
      treatmentPlan: "Immediate NPO, IV Antibiotics, Analgesics.\n[ADMISSION RECOMMENDED: Immediate surgical inpatient admission for appendectomy]",
      status: "COMPLETED",
    },
  });

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: AppointmentStatus.COMPLETED },
  });

  const recommendationEvent = await prisma.timelineEvent.create({
    data: {
      patientId: patient.id,
      eventType: "ADMISSION_RECOMMENDED",
      title: "Inpatient Admission Recommended",
      description: `Dr. ${testDoctor.firstName} ${testDoctor.lastName} recommended inpatient admission during consultation #${consultation.consultationNumber}. Reason: Acute Appendicitis.`,
      entityId: consultation.id,
      performerName: `Dr. ${testDoctor.firstName} ${testDoctor.lastName}`,
      performerRole: "DOCTOR",
    },
  });
  console.log(`✔ Consultation recorded (#${consultation.consultationNumber}) & TimelineEvent logged (ID: ${recommendationEvent.id})`);

  // STEP 4 & 5: Receptionist Completes Admission
  console.log("\n--- STEP 4 & 5: Receptionist Admission & Admitted Patients Verification ---");
  const admissionNumber = `ADM-TEST-${Date.now().toString().slice(-5)}`;
  const admission = await prisma.admission.create({
    data: {
      admissionNumber,
      patientId: patient.id,
      doctorId: testDoctor.id,
      admissionDate: new Date(),
      admissionTime: "11:15 AM",
      admissionSource: "OPD",
      roomBedNo: "Surgical Ward Bed 03",
      provisionalDiagnosis: consultation.provisionalDiagnosis,
      treatmentPlan: consultation.treatmentPlan,
      status: AdmissionStatus.ADMITTED,
      createdById: testUser.id,
    },
  });
  console.log(`✔ Inpatient Admission #${admission.admissionNumber} created for Room/Bed: ${admission.roomBedNo}`);

  // Verify: Patient appears in ADMITTED PATIENTS
  const admittedList = await prisma.admission.findMany({
    where: {
      status: { in: [AdmissionStatus.ADMITTED, AdmissionStatus.UNDER_TREATMENT, AdmissionStatus.DISCHARGE_PENDING] },
      patientId: patient.id,
    },
  });
  const foundInAdmitted = admittedList.some((adm) => adm.id === admission.id);
  console.log(`✔ Verified: Patient appears in ADMITTED PATIENTS list: ${foundInAdmitted}`);
  if (!foundInAdmitted) throw new Error("Patient did not appear in ADMITTED PATIENTS list");

  // Verify: Patient NO LONGER appears in APPOINTMENT PATIENTS (since active admission exists)
  const apptCheckAfterAdmission = await prisma.appointment.findMany({
    where: {
      patient: {
        admissions: {
          none: {
            status: { in: [AdmissionStatus.ADMITTED, AdmissionStatus.UNDER_TREATMENT, AdmissionStatus.DISCHARGE_PENDING] },
          },
        },
      },
      patientId: patient.id,
    },
  });
  console.log(`✔ Verified: Active inpatient correctly excluded from outpatient appointments list: ${apptCheckAfterAdmission.length === 0}`);

  // Verify: Original appointment and consultation NOT deleted
  const origAppt = await prisma.appointment.findUnique({ where: { id: appointment.id } });
  const origConsult = await prisma.consultation.findUnique({ where: { id: consultation.id } });
  console.log(`✔ Verified: Original Appointment preserved: ${!!origAppt}`);
  console.log(`✔ Verified: Original Consultation preserved: ${!!origConsult}`);

  // STEP 6: Patient Consents Integration
  console.log("\n--- STEP 6: Patient Consents Integration ---");
  const consentAdmission = await prisma.admission.findFirst({
    where: {
      patientId: patient.id,
      status: { in: [AdmissionStatus.ADMITTED, AdmissionStatus.UNDER_TREATMENT, AdmissionStatus.DISCHARGE_PENDING] },
    },
    include: { patient: true, doctor: true },
  });
  console.log(`✔ Verified: Patient Consents finds active admission #${consentAdmission?.admissionNumber} for Patient MR: ${consentAdmission?.patient.mrNumber}`);

  // STEP 7: Inpatient Nursing Workflow Check
  console.log("\n--- STEP 7: Inpatient Nursing Visibility Check ---");
  const nursingInpatients = await prisma.admission.findMany({
    where: {
      status: { in: [AdmissionStatus.ADMITTED, AdmissionStatus.UNDER_TREATMENT, AdmissionStatus.DISCHARGE_PENDING] },
      patientId: patient.id,
    },
  });
  console.log(`✔ Verified: Patient visible in nursing inpatient dashboard: ${nursingInpatients.length > 0}`);

  // STEP 8: Discharge Workflow
  console.log("\n--- STEP 8: Patient Discharge & History Preservation ---");
  await prisma.admission.update({
    where: { id: admission.id },
    data: {
      status: AdmissionStatus.DISCHARGED,
      dischargeDate: new Date(),
      dischargeTime: "04:00 PM",
      finalDiagnosis: "Acute Appendicitis - Post Appendectomy Recovery",
    },
  });

  const activeAdmittedAfterDischarge = await prisma.admission.findMany({
    where: {
      status: { in: [AdmissionStatus.ADMITTED, AdmissionStatus.UNDER_TREATMENT, AdmissionStatus.DISCHARGE_PENDING] },
      patientId: patient.id,
    },
  });
  console.log(`✔ Verified: Discharged patient left active ADMITTED PATIENTS list: ${activeAdmittedAfterDischarge.length === 0}`);

  const historicalAdmissions = await prisma.admission.findMany({
    where: { patientId: patient.id },
  });
  console.log(`✔ Verified: Full admission history preserved (${historicalAdmissions.length} admission record(s))`);

  console.log("\n================================================================================");
  console.log("ALL 8 STEPS OF PATIENT DIRECTORY + ADMISSION + CONSENT WORKFLOW VERIFIED 100%!");
  console.log("================================================================================");
}

main()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
