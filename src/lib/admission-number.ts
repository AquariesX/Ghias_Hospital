import prisma from "./prisma";

/**
 * Extracts the numeric sequence from an admission number (e.g. "ADM-2026-000001" -> 1).
 */
function extractAdmissionNumeric(numStr: string): number {
  const parts = numStr.split("-");
  if (parts.length >= 3) {
    const num = parseInt(parts[2], 10);
    return isNaN(num) ? 0 : num;
  }
  const match = numStr.match(/\d+$/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Generates the next sequential Admission Number (e.g. ADM-2026-000001).
 * Inspects existing admissions in the current year to ensure collision-free uniqueness.
 */
export async function generateNextAdmissionNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `ADM-${currentYear}-`;

  const admissions = await prisma.admission.findMany({
    where: {
      admissionNumber: {
        startsWith: yearPrefix,
      },
    },
    select: { admissionNumber: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let maxNum = 0;
  for (const item of admissions) {
    const num = extractAdmissionNumeric(item.admissionNumber);
    if (num > maxNum) {
      maxNum = num;
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `${yearPrefix}${String(nextNum).padStart(6, "0")}`;

  // Collision check
  while (await prisma.admission.findUnique({ where: { admissionNumber: candidate } })) {
    nextNum++;
    candidate = `${yearPrefix}${String(nextNum).padStart(6, "0")}`;
  }

  return candidate;
}
