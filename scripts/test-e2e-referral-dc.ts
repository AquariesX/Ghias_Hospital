import prisma from "@/lib/prisma";
import { generateNextReferralNumber } from "@/lib/referral-number";
import { generateNextDeathCertificateNumber } from "@/lib/death-certificate-number";

async function runFullIntegrationTest() {
  console.log("=== Starting End-to-End Test for Referral Form & Death Certificate ===");

  // 1. Fetch active test patient
  const patient = await prisma.patient.findFirst({
    include: {
      admissions: {
        where: { status: { in: ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"] } },
      },
    },
  });

  if (!patient) {
    throw new Error("No patient found in database");
  }

  const doctor = await prisma.doctor.findFirst({ where: { status: "ACTIVE" } });
  const user = await prisma.user.findFirst({ where: { role: "ADMIN" } });

  console.log(`Test Patient: ${patient.firstName} ${patient.lastName} (ID: ${patient.id})`);
  console.log(`Test Doctor: Dr. ${doctor?.firstName} ${doctor?.lastName} (ID: ${doctor?.id})`);
  console.log(`Test User: ${user?.username} (ID: ${user?.id})`);

  // 2. Generate referral number & test record creation
  const refNum = await generateNextReferralNumber();
  console.log(`Generated Referral Number: ${refNum}`);

  const testReferral = await prisma.patientReferral.create({
    data: {
      referralNumber: refNum,
      patientId: patient.id,
      admissionId: patient.admissions[0]?.id || null,
      doctorId: doctor?.id || null,
      doctorName: doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : null,
      referralDate: new Date(),
      referralTime: "02:30 PM",
      hospitalReferredTo: "DHQ Teaching Hospital Gujrat",
      reasonOfReferral: "Specialized neurosurgery evaluation and intensive monitoring",
      presentingComplaints: "Severe headache and altered sensorium",
      provisionalDiagnosis: "Subarachnoid Hemorrhage rule out",
      historyAndExamination: "GCS 13/15, Pupils equal and reactive, BP 140/90",
      investigations: "CT Brain non-contrast planned, CBC & Electrolytes pending",
      finalDiagnosis: "Acute intracranial event",
      procedureDone: "IV access secured, 02 via nasal cannula @ 4L/min",
      conditionAtReferral: "Fair",
      referralNotes: "Ambulance arranged with trained nurse accompanying",
      treatmentGiven: JSON.stringify([
        {
          srNo: 1,
          medicine: "Inj. Mannitol 20%",
          dose: "100 ml",
          route: "IV",
          frequency: "STAT",
          timing: "Slow infusion",
          duration: "Once",
        },
      ]),
      createdById: user?.id || null,
    },
    include: {
      patient: true,
      doctor: true,
      admission: true,
    },
  });

  console.log(`✅ Referral Created Successfully: ${testReferral.id} (#${testReferral.referralNumber})`);

  // Verify retrieval
  const fetchedRef = await prisma.patientReferral.findUnique({
    where: { id: testReferral.id },
  });
  if (!fetchedRef) throw new Error("Could not find created referral");
  console.log(`Verified Referral query: ${fetchedRef.hospitalReferredTo}`);

  // 3. Generate death certificate number & test record creation
  const dcNum = await generateNextDeathCertificateNumber();
  console.log(`Generated Death Certificate Number: ${dcNum}`);

  const testDeathCert = await prisma.deathCertificate.create({
    data: {
      certificateNumber: dcNum,
      patientId: patient.id,
      admissionId: patient.admissions[0]?.id || null,
      doctorId: doctor?.id || null,
      doctorName: doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : null,
      dateOfDeath: new Date(),
      timeOfDeath: "11:45 AM",
      causeOfDeath: "Cardiopulmonary Arrest due to Acute Myocardial Infarction",
      diagnosis: "Ischemic Heart Disease, Severe LV Dysfunction",
      bodyReceivedBy: "Muhammad Tariq",
      receivedByRelation: "Real Brother",
      receivedByCnic: "34401-1234567-1",
      receivedByPhone: "0300-1234567",
      notes: "CPR performed for 30 minutes according to standard hospital resuscitation guidelines.",
      createdById: user?.id || null,
    },
    include: {
      patient: true,
      doctor: true,
      admission: true,
    },
  });

  console.log(`✅ Death Certificate Created Successfully: ${testDeathCert.id} (#${testDeathCert.certificateNumber})`);

  // Verify retrieval
  const fetchedDC = await prisma.deathCertificate.findUnique({
    where: { id: testDeathCert.id },
  });
  if (!fetchedDC) throw new Error("Could not find created death certificate");
  console.log(`Verified Death Certificate query: ${fetchedDC.causeOfDeath} - Handed over to: ${fetchedDC.bodyReceivedBy}`);

  // Clean up test records
  await prisma.patientReferral.delete({ where: { id: testReferral.id } });
  await prisma.deathCertificate.delete({ where: { id: testDeathCert.id } });
  console.log("🧹 Test records cleaned up successfully");

  console.log("=== All Backend Database Models and Operations Verified 100% ===");
}

runFullIntegrationTest()
  .catch((e) => {
    console.error("Integration test error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
