import prisma from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { UserRole, UserStatus } from "@prisma/client";

async function main() {
  console.log("================================================================================");
  console.log("GIAS HOSPITAL - SYNC & CONFIGURE DOCTOR PORTAL PASSWORDS");
  console.log("================================================================================\n");

  const defaultPassword = "password123";
  const passwordHash = await hashPassword(defaultPassword);

  const doctors = await prisma.doctor.findMany({
    include: {
      user: true,
      department: true,
    },
    orderBy: { doctorNumber: "asc" },
  });

  console.log(`Found ${doctors.length} doctor profile(s) in system.\n`);

  for (const doc of doctors) {
    let user = doc.user;

    // Check if a user with this doctor's email already exists
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: doc.email },
      });
    }

    if (!user) {
      // Create user account
      user = await prisma.user.create({
        data: {
          email: doc.email,
          passwordHash,
          firstName: doc.firstName,
          lastName: doc.lastName,
          role: UserRole.DOCTOR,
          status: UserStatus.ACTIVE,
          permissions: [
            "DOCTOR_WORKSPACE",
            "CONSULTATION_MANAGE",
            "VITALS_MANAGE",
            "PRESCRIPTION_MANAGE",
          ],
        },
      });

      console.log(`[CREATED] User account created for Dr. ${doc.firstName} ${doc.lastName} (${doc.email})`);
    } else {
      // Ensure user has role DOCTOR and is ACTIVE, and set known password if needed
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          role: UserRole.DOCTOR,
          status: UserStatus.ACTIVE,
          passwordHash,
        },
      });

      console.log(`[UPDATED] User account updated for Dr. ${doc.firstName} ${doc.lastName} (${doc.email})`);
    }

    // Link doctor to user if not linked
    if (doc.userId !== user.id) {
      await prisma.doctor.update({
        where: { id: doc.id },
        data: { userId: user.id },
      });
      console.log(`[LINKED] Linked Dr. ${doc.firstName} ${doc.lastName} to user ID ${user.id}`);
    }

    console.log(`  -> Login Email:    ${doc.email}`);
    console.log(`  -> Login Password: ${defaultPassword}`);
    console.log(`  -> Doctor Portal:  http://localhost:3000/login -> redirects to /doctor\n`);
  }

  console.log("================================================================================");
  console.log("ALL DOCTORS CONFIGURED FOR PORTAL ACCESS SUCCESSFULLY!");
  console.log("================================================================================");
}

main()
  .catch((err) => {
    console.error("Error setting doctor passwords:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
