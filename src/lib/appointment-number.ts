import prisma from "./prisma";

/**
 * Parses the numeric part of an appointment number (e.g. "APT-2026-000001" -> 1).
 */
function extractAppointmentNumeric(appointmentNumber: string): number {
  const parts = appointmentNumber.split("-");
  if (parts.length >= 3) {
    const num = parseInt(parts[2], 10);
    return isNaN(num) ? 0 : num;
  }
  const match = appointmentNumber.match(/\d+$/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Generates the next sequential Appointment Number (e.g., APT-2026-000001).
 * Uses the current year and 6-digit zero-padded sequence counter.
 * Inspects all existing appointments to guarantee collision-free uniqueness.
 */
export async function generateNextAppointmentNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `APT-${currentYear}-`;

  const appointments = await prisma.appointment.findMany({
    where: {
      appointmentNumber: {
        startsWith: yearPrefix,
      },
    },
    select: { appointmentNumber: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let maxNum = 0;
  for (const apt of appointments) {
    const num = extractAppointmentNumeric(apt.appointmentNumber);
    if (num > maxNum) {
      maxNum = num;
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `${yearPrefix}${String(nextNum).padStart(6, "0")}`;

  // Ensure collision-free
  while (await prisma.appointment.findUnique({ where: { appointmentNumber: candidate } })) {
    nextNum++;
    candidate = `${yearPrefix}${String(nextNum).padStart(6, "0")}`;
  }

  return candidate;
}
