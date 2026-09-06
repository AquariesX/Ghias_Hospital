import prisma from "./prisma";

/**
 * Parses the numeric part of a patient number (supports "P-XXXXXX" or "PAT-XXXXXX").
 */
function extractPatientNumeric(patientNumber: string): number {
  const match = patientNumber.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Parses the numeric part of an MR number (supports "MR-XXXXXX").
 */
function extractMRNumeric(mrNumber: string): number {
  const match = mrNumber.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Generates the next sequential Patient Number (e.g., P-000001, P-000102).
 * Inspects all existing patient numbers to guarantee uniqueness.
 */
export async function generateNextPatientNumber(): Promise<string> {
  const patients = await prisma.patient.findMany({
    select: { patientNumber: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let maxNum = 0;
  for (const p of patients) {
    const num = extractPatientNumeric(p.patientNumber);
    if (num > maxNum) maxNum = num;
  }

  let nextNum = maxNum + 1;
  let candidate = `P-${String(nextNum).padStart(6, "0")}`;

  // Ensure collision-free
  while (await prisma.patient.findUnique({ where: { patientNumber: candidate } })) {
    nextNum++;
    candidate = `P-${String(nextNum).padStart(6, "0")}`;
  }

  return candidate;
}

/**
 * Generates the next sequential Medical Record Number (e.g., MR-000001, MR-000102).
 * Inspects all existing MR numbers to guarantee uniqueness.
 */
export async function generateNextMRNumber(): Promise<string> {
  const patients = await prisma.patient.findMany({
    where: { mrNumber: { not: null } },
    select: { mrNumber: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let maxNum = 0;
  for (const p of patients) {
    if (p.mrNumber) {
      const num = extractMRNumeric(p.mrNumber);
      if (num > maxNum) maxNum = num;
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `MR-${String(nextNum).padStart(6, "0")}`;

  // Ensure collision-free
  while (await prisma.patient.findUnique({ where: { mrNumber: candidate } })) {
    nextNum++;
    candidate = `MR-${String(nextNum).padStart(6, "0")}`;
  }

  return candidate;
}

/**
 * Atomically generates both next Patient Number and next MR Number.
 */
export async function generatePatientAndMRNumbers(): Promise<{
  patientNumber: string;
  mrNumber: string;
}> {
  const [patientNumber, mrNumber] = await Promise.all([
    generateNextPatientNumber(),
    generateNextMRNumber(),
  ]);
  return { patientNumber, mrNumber };
}
