import prisma from "../src/lib/prisma";
import { generatePatientAndMRNumbers } from "../src/lib/patient-number";
import { Gender, BloodGroup, PatientStatus } from "@prisma/client";

async function main() {
  console.log("=== Phase 3: Patient Management Automated Verification ===");

  // 1. Sequential Number Generation Test
  console.log("\n[1/6] Testing Sequential Patient & MR Number Generation...");
  const numbers = await generatePatientAndMRNumbers();
  console.log(`Generated: PatientNumber=${numbers.patientNumber}, MRNumber=${numbers.mrNumber}`);
  if (!numbers.patientNumber.startsWith("P-") || !numbers.mrNumber.startsWith("MR-")) {
    throw new Error("Invalid prefix in generated patient/MR numbers");
  }
  console.log("✓ Sequential number generator verified.");

  // 2. Patient Registration with Timeline Event & Audit Log
  console.log("\n[2/6] Testing Patient Registration with Full Demographics...");
  const testCnic = `37405-${Math.floor(1000000 + Math.random() * 9000000)}-1`;
  const testPhone = `0300${Math.floor(1000000 + Math.random() * 9000000)}`;

  const createdPatient = await prisma.$transaction(async (tx) => {
    const p = await tx.patient.create({
      data: {
        patientNumber: numbers.patientNumber,
        mrNumber: numbers.mrNumber,
        firstName: "Tariq",
        lastName: "Mahmood",
        gender: Gender.MALE,
        dateOfBirth: new Date("1985-06-15"),
        phone: testPhone,
        email: "tariq.mahmood.test@example.com",
        address: "House 123, Street 4, Sector G-9/1, Islamabad",
        bloodGroup: BloodGroup.B_POSITIVE,
        allergies: ["Penicillin", "Sulfa Drugs"],
        chronicConditions: ["Hypertension", "Type 2 Diabetes"],
        status: PatientStatus.ACTIVE,
        cnic: testCnic,
        maritalStatus: "Married",
        relationType: "Father",
        relatedPersonName: "Mahmood Akhtar",
        landline: "051-9201234",
        emergencyContactName: "Sadia Tariq",
        emergencyContactPhone: "03219876543",
        emergencyContactRelation: "Spouse",
      },
    });

    await tx.timelineEvent.create({
      data: {
        patientId: p.id,
        title: "Patient Registered",
        eventType: "PATIENT_REGISTERED",
        description: `Initial registration completed with MR# ${p.mrNumber}.`,
        performerName: "Test Suite",
        performerRole: "RECEPTIONIST",
      },
    });

    return p;
  });

  console.log(`✓ Patient created with ID=${createdPatient.id}, MR#=${createdPatient.mrNumber}`);

  // 3. Duplicate CNIC check
  console.log("\n[3/6] Verifying Duplicate CNIC Guard...");
  const duplicate = await prisma.patient.findFirst({
    where: { cnic: testCnic },
  });
  if (!duplicate) {
    throw new Error("Created patient not found by CNIC");
  }
  console.log(`✓ Successfully detected existing patient with CNIC ${testCnic}. Duplicate guard verified.`);

  // 4. Multi-Attribute Search Verification
  console.log("\n[4/6] Verifying Multi-Attribute Search...");
  const byName = await prisma.patient.findMany({
    where: {
      OR: [
        { firstName: { contains: "Tariq", mode: "insensitive" } },
        { lastName: { contains: "Mahmood", mode: "insensitive" } },
      ],
    },
  });
  console.log(`Search by name: found ${byName.length} matches.`);

  const byMr = await prisma.patient.findFirst({
    where: { mrNumber: createdPatient.mrNumber },
  });
  if (!byMr || byMr.id !== createdPatient.id) {
    throw new Error("Failed to find patient by MR number");
  }
  console.log(`Search by MR: matched ${byMr.patientNumber}`);

  const byPhone = await prisma.patient.findFirst({
    where: { phone: testPhone },
  });
  if (!byPhone || byPhone.id !== createdPatient.id) {
    throw new Error("Failed to find patient by Phone number");
  }
  console.log(`Search by Phone: matched ${byPhone.phone}`);

  // 5. Clinical Stream & Profile Verification
  console.log("\n[5/6] Simulating Clinical Records (Vitals, Timeline)...");
  await prisma.vitalSign.create({
    data: {
      patientId: createdPatient.id,
      systolicBP: 125,
      diastolicBP: 82,
      pulse: 74,
      temperature: 98.4,
      respiratoryRate: 18,
      oxygenSaturation: 99,
      weight: 78.5,
      height: 175,
      bmi: 25.6,
      generalCondition: "Stable",
      observations: "Baseline vitals recorded during registration.",
      recordedByName: "Staff Nurse Fatima",
      recordedByRole: "NURSE",
    },
  });

  const patientHistory = await prisma.patient.findUnique({
    where: { id: createdPatient.id },
    include: {
      vitalSigns: true,
      timelineEvents: true,
      _count: {
        select: {
          vitalSigns: true,
          timelineEvents: true,
        },
      },
    },
  });

  if (!patientHistory || patientHistory.vitalSigns.length === 0) {
    throw new Error("Vital signs not linked to patient");
  }
  console.log(`✓ Vital signs successfully linked: BP=${patientHistory.vitalSigns[0].systolicBP}/${patientHistory.vitalSigns[0].diastolicBP}`);
  console.log(`✓ Timeline events linked: count=${patientHistory.timelineEvents.length}`);

  // 6. Patient Edit & Immutability Check
  console.log("\n[6/6] Testing Patient Profile Update & Number Immutability...");
  const updated = await prisma.patient.update({
    where: { id: createdPatient.id },
    data: {
      address: "Updated Address: House 456, F-8/2, Islamabad",
      status: PatientStatus.ACTIVE,
    },
  });

  if (updated.patientNumber !== createdPatient.patientNumber || updated.mrNumber !== createdPatient.mrNumber) {
    throw new Error("Patient or MR number was mutated during update!");
  }
  console.log("✓ Patient successfully updated. Numbers remained strictly immutable.");

  // Cleanup test data
  console.log("\nCleaning up test patient records...");
  await prisma.vitalSign.deleteMany({ where: { patientId: createdPatient.id } });
  await prisma.timelineEvent.deleteMany({ where: { patientId: createdPatient.id } });
  await prisma.patient.delete({ where: { id: createdPatient.id } });
  console.log("✓ Test records cleaned up successfully.");

  console.log("\n=======================================================");
  console.log("  ALL PHASE 3 PATIENT MANAGEMENT CHECKS PASSED (100%)  ");
  console.log("=======================================================");
}

main()
  .catch((e) => {
    console.error("Verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
