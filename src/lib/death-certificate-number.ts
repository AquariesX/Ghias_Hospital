import prisma from "./prisma";

function extractDeathCertNumeric(numStr: string): number {
  const parts = numStr.split("-");
  if (parts.length >= 3) {
    const num = parseInt(parts[2], 10);
    return isNaN(num) ? 0 : num;
  }
  const match = numStr.match(/\d+$/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Generates the next sequential Death Certificate Number (e.g. DC-2026-000001).
 * Inspects existing death certificates in the current year to ensure collision-free uniqueness.
 */
export async function generateNextDeathCertificateNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `DC-${currentYear}-`;

  const certificates = await prisma.deathCertificate.findMany({
    where: {
      certificateNumber: {
        startsWith: yearPrefix,
      },
    },
    select: { certificateNumber: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let maxNum = 0;
  for (const item of certificates) {
    const num = extractDeathCertNumeric(item.certificateNumber);
    if (num > maxNum) {
      maxNum = num;
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `${yearPrefix}${String(nextNum).padStart(6, "0")}`;

  // Collision check
  while (await prisma.deathCertificate.findUnique({ where: { certificateNumber: candidate } })) {
    nextNum++;
    candidate = `${yearPrefix}${String(nextNum).padStart(6, "0")}`;
  }

  return candidate;
}
