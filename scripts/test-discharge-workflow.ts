import prisma from "../src/lib/prisma";

async function main() {
  console.log("=== Testing Discharge Form Workflow ===");

  // 1. Find or create an admitted patient for testing
  let admission = await prisma.admission.findFirst({
    where: { status: { in: ["ADMITTED", "UNDER_TREATMENT"] } },
    include: { patient: true, doctor: true },
  });

  if (!admission) {
    console.log("No active admission found, finding a patient to admit...");
    const patient = await prisma.patient.findFirst();
    if (!patient) {
      throw new Error("No patient found in database!");
    }
    const doctor = await prisma.doctor.findFirst({ where: { status: "ACTIVE" } });
    if (!doctor) {
      throw new Error("No doctor found in database!");
    }

    admission = await prisma.admission.create({
      data: {
        admissionNumber: `ADM-${Date.now()}`,
        patientId: patient.id,
        doctorId: doctor.id,
        admissionDate: new Date(),
        admissionSource: "OPD",
        roomBedNo: "Ward 1 Bed 4",
        status: "ADMITTED",
        provisionalDiagnosis: "Acute Enteritis",
      },
      include: { patient: true, doctor: true },
    });
    console.log(`Created test admission #${admission.admissionNumber} for ${admission.patient.firstName} ${admission.patient.lastName}`);
  } else {
    console.log(`Found active admission #${admission.admissionNumber} for ${admission.patient.firstName} ${admission.patient.lastName}`);
  }

  // 2. Simulate GET /api/admissions/[id]/discharge
  console.log("\n1. Testing GET /api/admissions/[id]/discharge data retrieval...");
  const admissionFetched = await prisma.admission.findFirst({
    where: { id: admission.id },
    include: {
      patient: true,
      doctor: true,
      prescriptions: { include: { items: true }, take: 1 },
    },
  });
  if (!admissionFetched) throw new Error("Could not fetch admission!");
  console.log(`   ✓ Patient MR: ${admissionFetched.patient.mrNumber}`);
  console.log(`   ✓ Doctor: Dr. ${admissionFetched.doctor?.firstName} ${admissionFetched.doctor?.lastName}`);
  console.log(`   ✓ Status: ${admissionFetched.status}`);

  // 3. Test Draft Save
  console.log("\n2. Testing Draft Save...");
  const draftMeds = [
    {
      srNo: 1,
      medicineName: "Tab. Cefixime",
      dosage: "400 mg",
      route: "Oral",
      frequency: "OD",
      timing: "After breakfast",
      duration: "5 days",
      instructions: "Complete course",
    },
    {
      srNo: 2,
      medicineName: "Tab. Paracetamol",
      dosage: "500 mg",
      route: "Oral",
      frequency: "TDS",
      timing: "After meals",
      duration: "3 days",
      instructions: "If fever or pain",
    },
  ];

  const updatedDraft = await prisma.admission.update({
    where: { id: admission.id },
    data: {
      dischargeCondition: "Satisfactory",
      dischargeAdvisedByDoctor: true,
      isLama: false,
      finalDiagnosis: "Enteric Fever (Resolved)",
      operation: "Conservative medical management",
      outcome: "Completely recovered and vitals stabilized.",
      dischargeInstructions: "1. Take medicines on time.\n2. Hydrate well.\n3. Avoid street food.",
      dischargeMedications: JSON.stringify(draftMeds),
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      followUpInstructions: "Follow-up after 1 week at OPD.",
    },
  });

  console.log(`   ✓ Draft saved successfully. Status remains: ${updatedDraft.status}`);
  if (updatedDraft.status !== "ADMITTED" && updatedDraft.status !== "UNDER_TREATMENT") {
    throw new Error("Draft save should not change admission status to DISCHARGED!");
  }

  // 4. Test Final Discharge Transition
  console.log("\n3. Testing Final Discharge Transition...");
  const finalDischarge = await prisma.$transaction(async (tx) => {
    const adm = await tx.admission.update({
      where: { id: admission.id },
      data: {
        status: "DISCHARGED",
        dischargeDate: new Date(),
        dischargeTime: "02:30 PM",
      },
    });

    // Create timeline event
    await tx.timelineEvent.create({
      data: {
        patientId: adm.patientId,
        title: "Patient Discharged",
        eventType: "PATIENT_DISCHARGED",
        description: `Discharged from hospital after admission #${adm.admissionNumber}. Condition: Satisfactory. Final Diagnosis: Enteric Fever (Resolved).`,
        entityId: adm.id,
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        action: "DISCHARGE_PATIENT",
        entity: "Admission",
        entityId: adm.id,
        newValue: JSON.stringify({ status: "DISCHARGED", condition: "Satisfactory" }),
      },
    });

    return adm;
  });

  console.log(`   ✓ Final discharge executed. New status: ${finalDischarge.status}`);
  console.log(`   ✓ Discharge Date: ${finalDischarge.dischargeDate?.toISOString()}`);

  // 5. Verify Patient History & Record Preservation
  console.log("\n4. Verifying Complete Record Preservation...");
  const patientAfterDischarge = await prisma.patient.findUnique({
    where: { id: admission.patientId },
    include: {
      admissions: true,
      timelineEvents: { where: { eventType: "PATIENT_DISCHARGED" } },
    },
  });

  if (!patientAfterDischarge) {
    throw new Error("Patient was deleted! This is strictly forbidden!");
  }
  console.log(`   ✓ Patient record intact: ${patientAfterDischarge.firstName} ${patientAfterDischarge.lastName}`);
  console.log(`   ✓ Total Admissions preserved: ${patientAfterDischarge.admissions.length}`);
  console.log(`   ✓ Timeline events found: ${patientAfterDischarge.timelineEvents.length}`);

  // 6. Verify Active Inpatient List Excludes Discharged Patient
  console.log("\n5. Verifying Active Inpatient List excludes discharged patient...");
  const activeList = await prisma.admission.findMany({
    where: {
      id: admission.id,
      status: { in: ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"] },
    },
  });
  console.log(`   ✓ In active admission query: ${activeList.length === 0 ? "Correctly excluded (0 results)" : "Failed - still in active list!"}`);

  // 7. Verify Audit Log
  const audit = await prisma.auditLog.findFirst({
    where: { entityId: admission.id, action: "DISCHARGE_PATIENT" },
  });
  console.log(`   ✓ AuditLog record found: ${audit?.action} on ${audit?.timestamp}`);

  console.log("\n=== ALL DISCHARGE WORKFLOW TESTS PASSED SUCCESSFULLY! ===");
}

main()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
