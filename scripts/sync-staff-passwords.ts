import prisma from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";
import { UserRole, UserStatus } from "@prisma/client";

async function syncStaffPasswords() {
  console.log("================================================================================");
  console.log("GIAS HOSPITAL - SYNC & CONFIGURE NURSE / STAFF PORTAL PASSWORDS");
  console.log("================================================================================\n");

  const defaultPassword = "password123";
  const passwordHash = await hashPassword(defaultPassword);

  const staffMembers = await prisma.staff.findMany({
    include: {
      user: true,
    },
    orderBy: { staffNumber: "asc" },
  });

  console.log(`Found ${staffMembers.length} staff member(s) in system.\n`);

  for (const staff of staffMembers) {
    let userRole: UserRole = UserRole.STAFF;
    if (staff.role === "HEAD_NURSE" || staff.role === "STAFF_NURSE") {
      userRole = UserRole.NURSE;
    } else if (staff.role === "RECEPTIONIST") {
      userRole = UserRole.RECEPTIONIST;
    } else if (staff.role === "ADMINISTRATOR") {
      userRole = UserRole.ADMIN;
    }

    if (staff.user) {
      await prisma.user.update({
        where: { id: staff.user.id },
        data: {
          passwordHash,
          status: UserStatus.ACTIVE,
          role: userRole,
          firstName: staff.firstName,
          lastName: staff.lastName,
        },
      });
      console.log(`[UPDATED] User account updated for ${staff.firstName} ${staff.lastName} (${staff.email})`);
    } else {
      let user = await prisma.user.findUnique({
        where: { email: staff.email },
      });

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash,
            status: UserStatus.ACTIVE,
            role: userRole,
            firstName: staff.firstName,
            lastName: staff.lastName,
          },
        });
        console.log(`[LINKED-EXISTING] User account linked for ${staff.firstName} ${staff.lastName} (${staff.email})`);
      } else {
        user = await prisma.user.create({
          data: {
            email: staff.email,
            passwordHash,
            firstName: staff.firstName,
            lastName: staff.lastName,
            role: userRole,
            status: UserStatus.ACTIVE,
          },
        });
        console.log(`[CREATED] User account created for ${staff.firstName} ${staff.lastName} (${staff.email})`);
      }

      await prisma.staff.update({
        where: { id: staff.id },
        data: { userId: user.id },
      });
    }

    console.log(`  -> Role: ${staff.role} | Dept: ${staff.nurseDepartment || "N/A"}`);
    console.log(`  -> Login Email:    ${staff.email}`);
    console.log(`  -> Login Password: ${defaultPassword}`);
    console.log(`  -> Portal:         http://localhost:3000/login -> /staff\n`);
  }

  console.log("================================================================================");
  console.log("ALL STAFF & NURSES CONFIGURED FOR PORTAL ACCESS SUCCESSFULLY!");
  console.log("================================================================================");
}

syncStaffPasswords()
  .catch((e) => {
    console.error("Error syncing staff passwords:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
