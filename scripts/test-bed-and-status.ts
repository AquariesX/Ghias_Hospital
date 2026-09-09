import prisma from "@/lib/prisma";
import { generateNextReferralNumber } from "@/lib/referral-number";
import { generateNextDeathCertificateNumber } from "@/lib/death-certificate-number";
import { BedStatus, AdmissionStatus, PatientStatus } from "@prisma/client";

async function testStatusAndBedRelease() {
  console.log("=== Testing Bed Freeing and Patient Status (Referred / Death) ===");

  // 1. Create a dummy test room & bed
  const room = await prisma.room.create({
    data: {
      roomNumber: "TEST-999",
      name: "Testing Room",
      isActive: true,
      beds: {
        create: [
          {
            bedNumber: "BED-999A",
            status: BedStatus.FREE,
            isActive: true,
          },
        ],
      },
    },
    include: { beds: true },
  });
  const bed = room.beds[0];
  console.log(`Created Test Room ${room.roomNumber} with Bed ${bed.bedNumber} (Initial status: ${bed.status})`);

  // 2. Create a test patient
  const patient = await prisma.patient.create({
    data: {
      patientNumber: "P-TEST-999",
      mrNumber: "MR-TEST-999",
      firstName: "TestPatient",
      lastName: "StatusCheck",
      gender: "MALE",
      dateOfBirth: new Date("1990-01-01"),
      phone: "0300-9999999",
      bloodGroup: "O_POSITIVE",
      status: PatientStatus.ACTIVE,
      emergencyContactName: "Guardian",
      emergencyContactPhone: "0300-8888888",
    },
  });
  console.log(`Created Patient ${patient.firstName} ${patient.lastName} (Initial status: ${patient.status})`);

  // 3. Admit patient and occupy bed
  await prisma.bed.update({
    where: { id: bed.id },
    data: { status: BedStatus.SCHEDULED },
  });

  const admission = await prisma.admission.create({
    data: {
      admissionNumber: "ADM-TEST-999",
      patientId: patient.id,
      admissionDate: new Date(),
      admissionSource: "OPD",
      bedId: bed.id,
      roomBedNo: `Room ${room.roomNumber} - ${bed.bedNumber}`,
      status: AdmissionStatus.ADMITTED,
    },
  });
  console.log(`Created Admission ${admission.admissionNumber} on Bed ${bed.id}`);

  // TEST 1: Referral Form issuance -> Bed becomes FREE, Patient becomes REFERRED
  console.log("\n--- Executing Referral Form Flow ---");
  // Simulate API transaction
  await prisma.$transaction(async (tx) => {
    await tx.patientReferral.create({
      data: {
        referralNumber: await generateNextReferralNumber(),
        patientId: patient.id,
        admissionId: admission.id,
        referralDate: new Date(),
        hospitalReferredTo: "Test Specialized Hospital",
        reasonOfReferral: "Advanced tertiary testing",
      },
    });

    await tx.patient.update({
      where: { id: patient.id },
      data: { status: PatientStatus.REFERRED },
    });

    await tx.admission.update({
      where: { id: admission.id },
      data: {
        status: AdmissionStatus.REFERRED,
        dischargeDate: new Date(),
      },
    });

    if (admission.bedId) {
      await tx.bed.update({
        where: { id: admission.bedId },
        data: { status: BedStatus.FREE },
      });
    }
  });

  // Verify Bed is FREE and Patient is REFERRED
  const bedAfterReferral = await prisma.bed.findUnique({ where: { id: bed.id } });
  const patientAfterReferral = await prisma.patient.findUnique({ where: { id: patient.id } });
  const admissionAfterReferral = await prisma.admission.findUnique({ where: { id: admission.id } });

  console.log(`Verification after Referral:`);
  console.log(`- Bed status: ${bedAfterReferral?.status} (Expected: FREE)`);
  console.log(`- Patient status: ${patientAfterReferral?.status} (Expected: REFERRED)`);
  console.log(`- Admission status: ${admissionAfterReferral?.status} (Expected: REFERRED)`);

  if (bedAfterReferral?.status !== BedStatus.FREE || patientAfterReferral?.status !== PatientStatus.REFERRED) {
    throw new Error("Referral flow verification failed!");
  }
  console.log("✅ Referral test passed successfully.");

  // Re-book bed for Death Certificate test
  await prisma.bed.update({ where: { id: bed.id }, data: { status: BedStatus.SCHEDULED } });
  await prisma.admission.update({ where: { id: admission.id }, data: { status: AdmissionStatus.ADMITTED } });

  // TEST 2: Death Certificate issuance -> Bed becomes FREE, Patient becomes DECEASED
  console.log("\n--- Executing Death Certificate Flow ---");
  await prisma.$transaction(async (tx) => {
    await tx.deathCertificate.create({
      data: {
        certificateNumber: await generateNextDeathCertificateNumber(),
        patientId: patient.id,
        admissionId: admission.id,
        dateOfDeath: new Date(),
        timeOfDeath: "03:00 PM",
        causeOfDeath: "Cardiopulmonary Arrest",
        bodyReceivedBy: "Next of Kin",
      },
    });

    await tx.patient.update({
      where: { id: patient.id },
      data: { status: PatientStatus.DECEASED },
    });

    await tx.admission.update({
      where: { id: admission.id },
      data: {
        status: AdmissionStatus.DISCHARGED,
        dischargeCondition: "Deceased",
        outcome: "Expired",
        dischargeDate: new Date(),
      },
    });

    if (admission.bedId) {
      await tx.bed.update({
        where: { id: admission.bedId },
        data: { status: BedStatus.FREE },
      });
    }
  });

  // Verify Bed is FREE and Patient is DECEASED
  const bedAfterDeath = await prisma.bed.findUnique({ where: { id: bed.id } });
  const patientAfterDeath = await prisma.patient.findUnique({ where: { id: patient.id } });
  const admissionAfterDeath = await prisma.admission.findUnique({ where: { id: admission.id } });

  console.log(`Verification after Death:`);
  console.log(`- Bed status: ${bedAfterDeath?.status} (Expected: FREE)`);
  console.log(`- Patient status: ${patientAfterDeath?.status} (Expected: DECEASED)`);
  console.log(`- Admission status: ${admissionAfterDeath?.status} (Expected: DISCHARGED)`);

  if (bedAfterDeath?.status !== BedStatus.FREE || patientAfterDeath?.status !== PatientStatus.DECEASED) {
    throw new Error("Death Certificate flow verification failed!");
  }
  console.log("✅ Death Certificate test passed successfully.");

  // Clean up test data
  await prisma.patientReferral.deleteMany({ where: { patientId: patient.id } });
  await prisma.deathCertificate.deleteMany({ where: { patientId: patient.id } });
  await prisma.admission.deleteMany({ where: { patientId: patient.id } });
  await prisma.patient.delete({ where: { id: patient.id } });
  await prisma.bed.deleteMany({ where: { roomId: room.id } });
  await prisma.room.delete({ where: { id: room.id } });
  console.log("\n🧹 Test cleanup complete.");
  console.log("=== ALL TEST SCENARIOS VERIFIED 100% ===");
}

testStatusAndBedRelease()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
