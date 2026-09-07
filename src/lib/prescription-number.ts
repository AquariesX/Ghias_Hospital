import prisma from "./prisma";

/**
 * Extracts the numeric sequence from a prescription number (e.g. "RX-2026-000001" -> 1).
 */
function extractPrescriptionNumeric(numStr: string): number {
  const parts = numStr.split("-");
  if (parts.length >= 3) {
    const num = parseInt(parts[2], 10);
    return isNaN(num) ? 0 : num;
  }
  const match = numStr.match(/\d+$/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Generates the next sequential Prescription Number (e.g. RX-2026-000001).
 * Inspects all existing prescriptions in the current year to ensure collision-free uniqueness.
 */
export async function generateNextPrescriptionNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `RX-${currentYear}-`;

  const prescriptions = await prisma.prescription.findMany({
    where: {
      prescriptionNumber: {
        startsWith: yearPrefix,
      },
    },
    select: { prescriptionNumber: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let maxNum = 0;
  for (const item of prescriptions) {
    const num = extractPrescriptionNumeric(item.prescriptionNumber);
    if (num > maxNum) {
      maxNum = num;
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `${yearPrefix}${String(nextNum).padStart(6, "0")}`;

  // Collision check
  while (await prisma.prescription.findUnique({ where: { prescriptionNumber: candidate } })) {
    nextNum++;
    candidate = `${yearPrefix}${String(nextNum).padStart(6, "0")}`;
  }

  return candidate;
}
