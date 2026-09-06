import "dotenv/config";
import { UserRole, UserStatus } from "@prisma/client";
import prisma from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

async function main() {
  console.log("🌱 Seeding GIAS Hospital initial user accounts...");

  const adminPasswordHash = await hashPassword("Admin@1234");
  const doctorPasswordHash = await hashPassword("Doctor@1234");
  const nursePasswordHash = await hashPassword("Nurse@1234");
  const recepPasswordHash = await hashPassword("Recep@1234");
  const staffPasswordHash = await hashPassword("Staff@1234");

  const seedUsers = [
    {
      email: "admin@gias-hospital.com",
      username: "admin_user",
      passwordHash: adminPasswordHash,
      firstName: "System",
      lastName: "Administrator",
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      permissions: ["*"],
    },
    {
      email: "doctor@gias-hospital.com",
      username: "doctor_user",
      passwordHash: doctorPasswordHash,
      firstName: "Tariq",
      lastName: "Mahmood",
      role: UserRole.DOCTOR,
      status: UserStatus.ACTIVE,
      permissions: ["CONSULTATION_MANAGE", "PRESCRIPTION_MANAGE", "PATIENT_VIEW"],
    },
    {
      email: "nurse@gias-hospital.com",
      username: "nurse_user",
      passwordHash: nursePasswordHash,
      firstName: "Saba",
      lastName: "Naz",
      role: UserRole.NURSE,
      status: UserStatus.ACTIVE,
      permissions: ["VITAL_MANAGE", "NURSING_NOTE_MANAGE", "MEDICATION_ADMINISTER"],
    },
    {
      email: "receptionist@gias-hospital.com",
      username: "recep_user",
      passwordHash: recepPasswordHash,
      firstName: "Farah",
      lastName: "Khan",
      role: UserRole.RECEPTIONIST,
      status: UserStatus.ACTIVE,
      permissions: ["PATIENT_REGISTER", "APPOINTMENT_SCHEDULE"],
    },
    {
      email: "staff@gias-hospital.com",
      username: "staff_user",
      passwordHash: staffPasswordHash,
      firstName: "Bilal",
      lastName: "Akram",
      role: UserRole.STAFF,
      status: UserStatus.ACTIVE,
      permissions: ["STAFF_PORTAL_VIEW"],
    },
  ];

  for (const u of seedUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        username: u.username,
        passwordHash: u.passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        status: u.status,
        permissions: u.permissions,
      },
      create: u,
    });
    console.log(`✅ Seeded user: ${user.email} (${user.role})`);
  }

  // Also update existing accounts if present to have known passwords for development
  const existingAdmin = await prisma.user.findUnique({ where: { email: "admin@giashospital.org" } });
  if (existingAdmin) {
    await prisma.user.update({
      where: { email: "admin@giashospital.org" },
      data: { passwordHash: adminPasswordHash },
    });
    console.log("✅ Updated admin@giashospital.org with development password (Admin@1234)");
  }

  const existingDoctor = await prisma.user.findUnique({ where: { email: "dr.ahmed@giashospital.org" } });
  if (existingDoctor) {
    await prisma.user.update({
      where: { email: "dr.ahmed@giashospital.org" },
      data: { passwordHash: doctorPasswordHash },
    });
    console.log("✅ Updated dr.ahmed@giashospital.org with development password (Doctor@1234)");
  }

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
