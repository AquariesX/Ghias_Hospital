import prisma from "./prisma";

function extractReferralNumeric(numStr: string): number {
  const parts = numStr.split("-");
  if (parts.length >= 3) {
    const num = parseInt(parts[2], 10);
    return isNaN(num) ? 0 : num;
  }
  const match = numStr.match(/\d+$/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Generates the next sequential Referral Number (e.g. REF-2026-000001).
 * Inspects existing referrals in the current year to ensure collision-free uniqueness.
 */
export async function generateNextReferralNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `REF-${currentYear}-`;

  const referrals = await prisma.patientReferral.findMany({
    where: {
      referralNumber: {
        startsWith: yearPrefix,
      },
    },
    select: { referralNumber: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let maxNum = 0;
  for (const item of referrals) {
    const num = extractReferralNumeric(item.referralNumber);
    if (num > maxNum) {
      maxNum = num;
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `${yearPrefix}${String(nextNum).padStart(6, "0")}`;

  // Collision check
  while (await prisma.patientReferral.findUnique({ where: { referralNumber: candidate } })) {
    nextNum++;
    candidate = `${yearPrefix}${String(nextNum).padStart(6, "0")}`;
  }

  return candidate;
}
