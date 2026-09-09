import prisma from "@/lib/prisma";

async function inspectAndFix() {
  const patient = await prisma.patient.findUnique({
    where: { id: "b5acfe9c-b928-4f71-9e73-b35a58170bbc" },
    include: {
      admissions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!patient) {
    console.log("Patient not found");
    return;
  }

  console.log(`Patient: ${patient.firstName} ${patient.lastName} (${patient.mrNumber})`);
  console.log("Admissions:");
  for (const adm of patient.admissions) {
    console.log(`- ID: ${adm.id}, Number: ${adm.admissionNumber}, Status: ${adm.status}, Date: ${adm.admissionDate.toISOString().slice(0, 10)}, BedId: ${adm.bedId}, RoomBed: ${adm.roomBedNo}`);
  }

  // The older active admission ADM-2026-000011 should be marked DISCHARGED if ADM-2026-000012 is the latest active admission
  const activeAdms = patient.admissions.filter((a) =>
    ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"].includes(a.status)
  );

  if (activeAdms.length > 1) {
    console.log("\nFound multiple active admissions for this patient!");
    // Keep the latest active admission, close the previous one
    const [latest, ...older] = activeAdms;
    console.log(`Keeping latest active admission: ${latest.admissionNumber}`);

    for (const oldAdm of older) {
      console.log(`Closing duplicate/previous active admission ${oldAdm.admissionNumber} as DISCHARGED...`);
      await prisma.admission.update({
        where: { id: oldAdm.id },
        data: {
          status: "DISCHARGED",
          dischargeDate: new Date(oldAdm.admissionDate),
          dischargeSummary: "Closed prior admission record during deduplication audit.",
          dischargeCondition: "Satisfactory",
        },
      });

      if (oldAdm.bedId && oldAdm.bedId !== latest.bedId) {
        await prisma.bed.update({
          where: { id: oldAdm.bedId },
          data: { status: "FREE" },
        });
      }
    }
    console.log("✅ Successfully resolved duplicate active admission.");
  } else {
    console.log("Patient has no duplicate active admissions.");
  }
}

inspectAndFix()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
