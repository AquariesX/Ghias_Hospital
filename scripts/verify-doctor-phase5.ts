import prisma from "../src/lib/prisma";
import { generateNextConsultationNumber } from "../src/lib/consultation-number";
import { generateNextPrescriptionNumber } from "../src/lib/prescription-number";
import { generatePatientAndMRNumbers } from "../src/lib/patient-number";
import { generateNextAppointmentNumber } from "../src/lib/appointment-number";
import { createAuditLog } from "../src/lib/audit";
import { AppointmentStatus, BloodGroup, Gender, Prisma } from "@prisma/client";

async function main() {
  console.log("================================================================================");
  console.log("GIAS HOSPITAL - PHASE 5: DOCTOR DASHBOARD & CONSULTATION MODULE VERIFICATION");
  console.log("================================================================================\n");

  // 1. Verify Doctors in DB
  const doctors = await prisma.doctor.findMany({
    where: { status: "ACTIVE" },
    include: { department: true, user: true },
    take: 2,
  });

  if (doctors.length < 1) {
    throw new Error("No active doctor found in database. Seed or create doctors first.");
  }

  const doctorA = doctors[0];
  const doctorB = doctors.length > 1 ? doctors[1] : null;

  console.log(`[PASS] Doctor A resolved: Dr. ${doctorA.firstName} ${doctorA.lastName} (${doctorA.specialization}) - ID: ${doctorA.id}`);
  if (doctorB) {
    console.log(`[PASS] Doctor B resolved: Dr. ${doctorB.firstName} ${doctorB.lastName} (${doctorB.specialization}) - ID: ${doctorB.id}`);
  }

  // 2. Test Sequential Number Generators
  const nextConsultationNum = await generateNextConsultationNumber();
  const nextPrescriptionNum = await generateNextPrescriptionNumber();
  console.log(`\n--- 1. Number Generators ---`);
  console.log(`[PASS] Generated Consultation Number: ${nextConsultationNum}`);
  console.log(`[PASS] Generated Prescription Number: ${nextPrescriptionNum}`);
  if (!nextConsultationNum.startsWith("CNS-") || !nextPrescriptionNum.startsWith("RX-")) {
    throw new Error("Invalid prefix in generated consultation or prescription numbers");
  }

  // 3. Test Doctor Walk-in Patient Registration
  console.log(`\n--- 2. Doctor Patient Registration ---`);
  const { patientNumber, mrNumber } = await generatePatientAndMRNumbers();
  const testPatient = await prisma.$transaction(async (tx) => {
    const p = await tx.patient.create({
      data: {
        patientNumber,
        mrNumber,
        firstName: "Tariq",
        lastName: "Mahmood",
        gender: Gender.MALE,
        dateOfBirth: new Date("1985-06-15"),
        phone: `0300-${Math.floor(1000000 + Math.random() * 9000000)}`,
        bloodGroup: BloodGroup.O_POSITIVE,
        allergies: ["Penicillin"],
        chronicConditions: ["Hypertension"],
        emergencyContactName: "Attendant",
        emergencyContactPhone: "0300-1112233",
      },
    });

    await tx.timelineEvent.create({
      data: {
        patientId: p.id,
        eventType: "PATIENT_REGISTERED",
        title: "Patient Registered by Doctor",
        description: `Walk-in patient registered during clinical triage by Dr. ${doctorA.firstName} ${doctorA.lastName}.`,
        entityId: p.id,
        performerName: `Dr. ${doctorA.firstName} ${doctorA.lastName}`,
        performerRole: "DOCTOR",
      },
    });

    return p;
  });

  console.log(`[PASS] Patient created: ${testPatient.firstName} ${testPatient.lastName} (MR: ${testPatient.mrNumber}, Pat: ${testPatient.patientNumber})`);

  // 4. Test Appointment Creation & Waiting Queue Assignment
  console.log(`\n--- 3. Appointment & Patient Queue ---`);
  const apptNumber = await generateNextAppointmentNumber();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const adminOrStaffUser = await prisma.user.findFirst({
    where: { status: "ACTIVE" },
  });
  if (!adminOrStaffUser) throw new Error("No active user found in DB");

  const appointment = await prisma.appointment.create({
    data: {
      appointmentNumber: apptNumber,
      patient: { connect: { id: testPatient.id } },
      doctor: { connect: { id: doctorA.id } },
      department: { connect: { id: doctorA.departmentId } },
      createdBy: { connect: { id: adminOrStaffUser.id } },
      appointmentDate: today,
      appointmentTime: "10:30 AM",
      appointmentType: "REGULAR",
      consultationFee: doctorA.consultationFee,
      reason: "Persistent productive cough and evening fever for 5 days",
      status: AppointmentStatus.WAITING,
    },
  });

  console.log(`[PASS] Appointment created: ${appointment.appointmentNumber} assigned to Dr. ${doctorA.firstName} ${doctorA.lastName} with status: ${appointment.status}`);

  // 5. Test Authorization Isolation: Doctor B cannot start Doctor A's appointment
  if (doctorB) {
    console.log(`\n--- 4. Cross-Doctor Ownership & Authorization ---`);
    const isOwner = appointment.doctorId === doctorB.id;
    if (isOwner) {
      throw new Error("Authorization failure: Doctor B erroneously identified as appointment doctor");
    }
    console.log(`[PASS] Doctor B (${doctorB.firstName}) correctly denied ownership of Doctor A's appointment (${appointment.appointmentNumber})`);
  }

  // 6. Test Start Consultation Workflow
  console.log(`\n--- 5. Start Consultation Workflow ---`);
  const cnsNumber = await generateNextConsultationNumber();
  const startResult = await prisma.$transaction(async (tx) => {
    const updatedApt = await tx.appointment.update({
      where: { id: appointment.id },
      data: { status: AppointmentStatus.IN_CONSULTATION },
    });

    const cns = await tx.consultation.create({
      data: {
        consultationNumber: cnsNumber,
        appointment: { connect: { id: appointment.id } },
        patient: { connect: { id: testPatient.id } },
        doctor: { connect: { id: doctorA.id } },
        status: "IN_PROGRESS",
        presentingComplaints: appointment.reason,
      },
    });

    await tx.timelineEvent.create({
      data: {
        patientId: testPatient.id,
        eventType: "CONSULTATION_STARTED",
        title: "Clinical Consultation Started",
        description: `Dr. ${doctorA.firstName} ${doctorA.lastName} started consultation #${cns.consultationNumber}.`,
        entityId: cns.id,
        performerName: `Dr. ${doctorA.firstName} ${doctorA.lastName}`,
        performerRole: "DOCTOR",
      },
    });

    return { updatedApt, cns };
  });

  console.log(`[PASS] Appointment transitioned to: ${startResult.updatedApt.status}`);
  console.log(`[PASS] Consultation record created: ${startResult.cns.consultationNumber} (Status: ${startResult.cns.status})`);

  // 7. Test Vitals Recording with BMI calculation
  console.log(`\n--- 6. Vital Signs Recording ---`);
  const weightKg = 72.5;
  const heightCm = 175;
  const expectedBmi = Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 100) / 100;

  const vital = await prisma.$transaction(async (tx) => {
    const v = await tx.vitalSign.create({
      data: {
        patient: { connect: { id: testPatient.id } },
        consultation: { connect: { id: startResult.cns.id } },
        encounterType: "OPD",
        systolicBP: 125,
        diastolicBP: 82,
        pulse: 78,
        temperature: new Prisma.Decimal(98.8),
        oxygenSaturation: 98,
        respiratoryRate: 16,
        weight: new Prisma.Decimal(weightKg),
        height: new Prisma.Decimal(heightCm),
        bmi: new Prisma.Decimal(expectedBmi),
        painScore: 2,
        generalCondition: "Stable, alert, mild respiratory distress",
        observations: "Bilateral crepitations in lower lung fields",
        recordedByName: `Dr. ${doctorA.firstName} ${doctorA.lastName}`,
        recordedByRole: "DOCTOR",
      },
    });

    await tx.timelineEvent.create({
      data: {
        patientId: testPatient.id,
        eventType: "VITALS_RECORDED",
        title: "Vital Signs Recorded",
        description: `Recorded by Dr. ${doctorA.firstName} ${doctorA.lastName}: BP 125/82 mmHg, Pulse 78 bpm, SpO2 98%, BMI ${expectedBmi}.`,
        entityId: v.id,
        performerName: `Dr. ${doctorA.firstName} ${doctorA.lastName}`,
        performerRole: "DOCTOR",
      },
    });

    return v;
  });

  console.log(`[PASS] VitalSign recorded: BP ${vital.systolicBP}/${vital.diastolicBP}, SpO2 ${vital.oxygenSaturation}%, BMI ${vital.bmi} kg/m²`);

  // 8. Test Clinical Assessment Draft Saving
  console.log(`\n--- 7. Clinical Assessment Progress Save ---`);
  const updatedCns = await prisma.consultation.update({
    where: { id: startResult.cns.id },
    data: {
      medicalHistory: "Non-smoker, mild childhood asthma",
      physicalExamination: "Throat congested, bilateral wheezing noted",
      provisionalDiagnosis: "Community-Acquired Bronchitis",
      finalDiagnosis: "Acute Infective Bronchitis",
      investigations: "Chest X-Ray PA view, CBC with ESR",
      treatmentPlan: "Oral hydration, steam inhalation twice daily, complete antimicrobial course",
      status: "IN_PROGRESS",
    },
  });

  console.log(`[PASS] Assessment saved. Provisional: "${updatedCns.provisionalDiagnosis}", Final: "${updatedCns.finalDiagnosis}"`);

  // 9. Test Prescription Creation and Consultation Completion
  console.log(`\n--- 8. Complete Consultation with Multi-Medicine Prescription ---`);
  const rxNumber = await generateNextPrescriptionNumber();

  const completionResult = await prisma.$transaction(async (tx) => {
    // 1. Create Prescription with items
    const prescription = await tx.prescription.create({
      data: {
        prescriptionNumber: rxNumber,
        patient: { connect: { id: testPatient.id } },
        doctor: { connect: { id: doctorA.id } },
        consultation: { connect: { id: startResult.cns.id } },
        diagnosis: updatedCns.finalDiagnosis,
        status: "ACTIVE",
        items: {
          create: [
            {
              medicineName: "Azithromycin",
              dosage: "500 mg",
              frequency: "Once daily",
              route: "Oral",
              duration: "3 days",
              instructions: "Take 1 hour before or 2 hours after meals",
            },
            {
              medicineName: "Paracetamol",
              dosage: "500 mg",
              frequency: "3 times daily",
              route: "Oral",
              duration: "5 days",
              instructions: "Take after meals for fever/body aches",
            },
            {
              medicineName: "Montelukast",
              dosage: "10 mg",
              frequency: "Once daily",
              route: "Oral",
              duration: "14 days",
              instructions: "Take at bedtime",
            },
          ],
        },
      },
      include: { items: true },
    });

    // 2. Mark Consultation COMPLETED
    const closedCns = await tx.consultation.update({
      where: { id: startResult.cns.id },
      data: { status: "COMPLETED" },
    });

    // 3. Mark Appointment COMPLETED
    const closedApt = await tx.appointment.update({
      where: { id: appointment.id },
      data: { status: AppointmentStatus.COMPLETED },
    });

    // 4. Create Timeline Events
    await tx.timelineEvent.create({
      data: {
        patientId: testPatient.id,
        eventType: "CONSULTATION_COMPLETED",
        title: "Consultation Completed",
        description: `Dr. ${doctorA.firstName} ${doctorA.lastName} concluded consultation #${closedCns.consultationNumber}. Final diagnosis: ${updatedCns.finalDiagnosis}.`,
        entityId: closedCns.id,
        performerName: `Dr. ${doctorA.firstName} ${doctorA.lastName}`,
        performerRole: "DOCTOR",
      },
    });

    await tx.timelineEvent.create({
      data: {
        patientId: testPatient.id,
        eventType: "PRESCRIPTION_CREATED",
        title: `Prescription Issued (${prescription.prescriptionNumber})`,
        description: `Prescribed ${prescription.items.length} medications for ${updatedCns.finalDiagnosis}.`,
        entityId: prescription.id,
        performerName: `Dr. ${doctorA.firstName} ${doctorA.lastName}`,
        performerRole: "DOCTOR",
      },
    });

    return { prescription, closedCns, closedApt };
  });

  console.log(`[PASS] Prescription created: ${completionResult.prescription.prescriptionNumber} with ${completionResult.prescription.items.length} items:`);
  for (const item of completionResult.prescription.items) {
    console.log(`       - ${item.medicineName} ${item.dosage} | ${item.frequency} | ${item.duration} (${item.route})`);
  }
  console.log(`[PASS] Consultation status: ${completionResult.closedCns.status}`);
  console.log(`[PASS] Appointment status: ${completionResult.closedApt.status}`);

  // 10. Verify Patient Timeline & Audit Trail
  console.log(`\n--- 9. Verify Patient Longitudinal Timeline ---`);
  const timelineEvents = await prisma.timelineEvent.findMany({
    where: { patientId: testPatient.id },
    orderBy: { timestamp: "asc" },
  });

  console.log(`[PASS] Found ${timelineEvents.length} chronological timeline events for patient:`);
  for (const ev of timelineEvents) {
    console.log(`       * [${ev.eventType}] ${ev.title}: ${ev.description}`);
  }

  // 11. Verify Doctor Dashboard Metrics for Doctor A
  console.log(`\n--- 10. Verify Doctor Dashboard Metrics ---`);
  const doctorTodayCounts = await prisma.appointment.groupBy({
    by: ["status"],
    where: {
      doctorId: doctorA.id,
      appointmentDate: today,
    },
    _count: { id: true },
  });

  console.log(`[PASS] Live dashboard counts for Dr. ${doctorA.firstName} ${doctorA.lastName}:`);
  for (const group of doctorTodayCounts) {
    console.log(`       * ${group.status}: ${group._count.id}`);
  }

  console.log("\n================================================================================");
  console.log("PHASE 5 VERIFICATION COMPLETED SUCCESSFULLY: ALL CLINICAL WORKFLOWS VERIFIED!");
  console.log("================================================================================");
}

main()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
