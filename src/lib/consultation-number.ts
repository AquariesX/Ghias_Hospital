import prisma from "./prisma";

/**
 * Extracts the numeric sequence from a consultation number (e.g. "CNS-2026-000001" -> 1).
 */
function extractConsultationNumeric(numStr: string): number {
  const parts = numStr.split("-");
  if (parts.length >= 3) {
    const num = parseInt(parts[2], 10);
    return isNaN(num) ? 0 : num;
  }
  const match = numStr.match(/\d+$/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Generates the next sequential Consultation Number (e.g. CNS-2026-000001).
 * Inspects all existing consultations in the current year to ensure collision-free uniqueness.
 */
export async function generateNextConsultationNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `CNS-${currentYear}-`;

  const consultations = await prisma.consultation.findMany({
    where: {
      consultationNumber: {
        startsWith: yearPrefix,
      },
    },
    select: { consultationNumber: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let maxNum = 0;
  for (const item of consultations) {
    const num = extractConsultationNumeric(item.consultationNumber);
    if (num > maxNum) {
      maxNum = num;
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `${yearPrefix}${String(nextNum).padStart(6, "0")}`;

  // Collision check
  while (await prisma.consultation.findUnique({ where: { consultationNumber: candidate } })) {
    nextNum++;
    candidate = `${yearPrefix}${String(nextNum).padStart(6, "0")}`;
  }

  return candidate;
}
