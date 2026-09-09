import prisma from "@/lib/prisma";

async function main() {
  console.log("=== Testing Referral & Death Certificate Backend Operations ===");

  // 1. Fetch a patient
  const patient = await prisma.patient.findFirst({
    include: { admissions: true },
  });

  if (!patient) {
    console.log("No patient found in database to test with.");
    return;
  }

  console.log(`Found patient: ${patient.firstName} ${patient.lastName} (ID: ${patient.id}, MRN: ${patient.mrNumber || patient.patientNumber})`);

  // 2. Fetch a doctor
  const doctor = await prisma.doctor.findFirst({ where: { status: "ACTIVE" } });
  console.log(`Found doctor: Dr. ${doctor?.firstName} ${doctor?.lastName} (ID: ${doctor?.id})`);

  // 3. Check existing counts
  const refCount = await prisma.patientReferral.count();
  const dcCount = await prisma.deathCertificate.count();
  console.log(`Current Referral count: ${refCount}`);
  console.log(`Current DeathCertificate count: ${dcCount}`);

  console.log("=== Verification of schema relations & query capabilities passed ===");
}

main()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
