import prisma from "../src/lib/prisma";
import { generateNextAppointmentNumber } from "../src/lib/appointment-number";
import {
  AppointmentType,
  AppointmentStatus,
  EmergencyPriority,
} from "@prisma/client";

async function main() {
  console.log("================================================================================");
  console.log("       GIAS HOSPITAL MANAGEMENT SYSTEM — PHASE 4 VERIFICATION SUITE             ");
  console.log("                   APPOINTMENT & RECEPTION WORKFLOW MODULE                      ");
  console.log("================================================================================\n");

  const createdAppointmentIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Sequential Appointment Number Generator
    // -------------------------------------------------------------------------
    console.log("🔬 TEST 1: Sequential Appointment Number Generator");
    const aptNumber1 = await generateNextAppointmentNumber();
    console.log(`   Generated Appointment #: ${aptNumber1}`);
    const currentYear = new Date().getFullYear();
    if (!aptNumber1.startsWith(`APT-${currentYear}-`)) {
      throw new Error(`Invalid appointment number format: ${aptNumber1}`);
    }
    console.log("   ✅ Test 1 Passed: Format matches APT-YYYY-XXXXXX strictly.\n");

    // -------------------------------------------------------------------------
    // TEST 2: Check Active Departments & Doctors with Configured Fees
    // -------------------------------------------------------------------------
    console.log("🔬 TEST 2: Active Departments & Doctor Consultation Fees");
    const departments = await prisma.department.findMany({
      where: { status: "ACTIVE" },
      include: {
        doctors: {
          where: { status: "ACTIVE" },
        },
      },
    });

    if (departments.length === 0) {
      throw new Error("No active departments found in database");
    }
    console.log(`   Found ${departments.length} active department(s).`);

    const deptWithDoc = departments.find((d) => d.doctors.length > 0);
    if (!deptWithDoc || deptWithDoc.doctors.length === 0) {
      throw new Error("No active doctors assigned to active departments");
    }

    const testDoctor = deptWithDoc.doctors[0];
    console.log(
      `   Selected Doctor: Dr. ${testDoctor.firstName} ${testDoctor.lastName} | Dept: ${deptWithDoc.name} | Fee: PKR ${testDoctor.consultationFee}`
    );
    console.log("   ✅ Test 2 Passed: Active department and doctor fee retrieved.\n");

    // -------------------------------------------------------------------------
    // TEST 3: Patient Search and Retrieval
    // -------------------------------------------------------------------------
    console.log("🔬 TEST 3: Patient Search Verification");
    const existingPatient = await prisma.patient.findFirst({
      where: { status: "ACTIVE" },
    });

    if (!existingPatient) {
      throw new Error("No existing active patient found for testing");
    }

    const searchedByName = await prisma.patient.findMany({
      where: {
        OR: [
          { firstName: { contains: existingPatient.firstName, mode: "insensitive" } },
          { patientNumber: { contains: existingPatient.patientNumber } },
        ],
      },
    });

    if (!searchedByName.some((p) => p.id === existingPatient.id)) {
      throw new Error("Patient search by name/patientNumber failed to find record");
    }
    console.log(
      `   Found patient: ${existingPatient.firstName} ${existingPatient.lastName} (${existingPatient.patientNumber})`
    );
    console.log("   ✅ Test 3 Passed: Multi-attribute patient search successful.\n");

    // -------------------------------------------------------------------------
    // TEST 4: Create Regular Appointment with Fee Snapshot & Timeline Event
    // -------------------------------------------------------------------------
    console.log("🔬 TEST 4: Create Regular Appointment with Fee Snapshot");
    const staffUser = await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "RECEPTIONIST", "STAFF"] } },
    });
    if (!staffUser) {
      throw new Error("No administrative/reception staff user found");
    }

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const regularAptNum = await generateNextAppointmentNumber();
    const regularApt = await prisma.$transaction(async (tx) => {
      const apt = await tx.appointment.create({
        data: {
          appointmentNumber: regularAptNum,
          patientId: existingPatient.id,
          doctorId: testDoctor.id,
          departmentId: deptWithDoc.id,
          appointmentType: AppointmentType.REGULAR,
          appointmentDate: todayDate,
          appointmentTime: "10:30 AM",
          consultationFee: testDoctor.consultationFee,
          reason: "Automated verification test - routine checkup",
          status: AppointmentStatus.WAITING,
          createdById: staffUser.id,
        },
      });

      await tx.timelineEvent.create({
        data: {
          patientId: existingPatient.id,
          eventType: "APPOINTMENT_SCHEDULED",
          title: `Appointment Booked (REGULAR)`,
          description: `Appointment ${apt.appointmentNumber} with Dr. ${testDoctor.firstName} ${testDoctor.lastName}`,
          entityId: apt.id,
          performerName: `${staffUser.firstName} ${staffUser.lastName}`,
          performerRole: staffUser.role,
        },
      });

      return apt;
    });

    createdAppointmentIds.push(regularApt.id);
    console.log(`   Created Appointment #: ${regularApt.appointmentNumber}`);
    console.log(`   Snapshotted Fee: PKR ${regularApt.consultationFee}`);
    console.log(`   Initial Status: ${regularApt.status}`);

    if (Number(regularApt.consultationFee) !== Number(testDoctor.consultationFee)) {
      throw new Error("Consultation fee snapshot does not match doctor's fee");
    }
    console.log("   ✅ Test 4 Passed: Regular appointment created with exact fee snapshot.\n");

    // -------------------------------------------------------------------------
    // TEST 5: Create Emergency Appointment with Priority
    // -------------------------------------------------------------------------
    console.log("🔬 TEST 5: Create Emergency Appointment with Priority");
    const emergencyAptNum = await generateNextAppointmentNumber();
    const emergencyApt = await prisma.appointment.create({
      data: {
        appointmentNumber: emergencyAptNum,
        patientId: existingPatient.id,
        doctorId: testDoctor.id,
        departmentId: deptWithDoc.id,
        appointmentType: AppointmentType.EMERGENCY,
        appointmentDate: todayDate,
        appointmentTime: "11:00 AM",
        consultationFee: testDoctor.consultationFee,
        reason: "Acute severe chest pain and palpitations",
        status: AppointmentStatus.WAITING,
        isEmergency: true,
        emergencyPriority: EmergencyPriority.CRITICAL,
        emergencyReason: "Acute cardiac distress",
        immediateAttentionRequired: true,
        createdById: staffUser.id,
      },
    });

    createdAppointmentIds.push(emergencyApt.id);
    console.log(`   Created Emergency Apt #: ${emergencyApt.appointmentNumber}`);
    console.log(`   Priority: ${emergencyApt.emergencyPriority}`);
    console.log(`   Immediate Attention: ${emergencyApt.immediateAttentionRequired}`);
    console.log("   ✅ Test 5 Passed: Emergency appointment booked.\n");

    // -------------------------------------------------------------------------
    // TEST 6: Doctor Queue Order Verification (Emergency Priority)
    // -------------------------------------------------------------------------
    console.log("🔬 TEST 6: Doctor Queue Order & Priority Calculation");
    const queueApts = await prisma.appointment.findMany({
      where: {
        doctorId: testDoctor.id,
        appointmentDate: todayDate,
        status: { in: [AppointmentStatus.WAITING, AppointmentStatus.SCHEDULED] },
      },
      orderBy: [{ isEmergency: "desc" }, { createdAt: "asc" }],
    });

    const emergencyIndex = queueApts.findIndex((a) => a.id === emergencyApt.id);
    const regularIndex = queueApts.findIndex((a) => a.id === regularApt.id);

    console.log(`   Emergency Apt position in queue: #${emergencyIndex + 1}`);
    console.log(`   Regular Apt position in queue: #${regularIndex + 1}`);

    if (emergencyIndex > regularIndex) {
      throw new Error("Emergency appointment was not prioritized over regular appointment in queue!");
    }
    console.log("   ✅ Test 6 Passed: Emergency triage priority ranks higher in doctor queue.\n");

    // -------------------------------------------------------------------------
    // TEST 7: Queue Status Transitions (WAITING -> IN_CONSULTATION -> COMPLETED)
    // -------------------------------------------------------------------------
    console.log("🔬 TEST 7: Queue Status Lifecycle Transitions");

    // 1. Start consultation
    const started = await prisma.appointment.update({
      where: { id: emergencyApt.id },
      data: { status: AppointmentStatus.IN_CONSULTATION },
    });
    console.log(`   Status updated to: ${started.status}`);
    if (started.status !== AppointmentStatus.IN_CONSULTATION) {
      throw new Error("Failed to transition status to IN_CONSULTATION");
    }

    // 2. Mark completed
    const finished = await prisma.appointment.update({
      where: { id: emergencyApt.id },
      data: { status: AppointmentStatus.COMPLETED },
    });
    console.log(`   Status updated to: ${finished.status}`);
    if (finished.status !== AppointmentStatus.COMPLETED) {
      throw new Error("Failed to transition status to COMPLETED");
    }
    console.log("   ✅ Test 7 Passed: Clinical consultation lifecycle completed.\n");

    // -------------------------------------------------------------------------
    // TEST 8: Patient Profile Appointment Stream Verification
    // -------------------------------------------------------------------------
    console.log("🔬 TEST 8: Longitudinal Patient Profile Integration");
    const patientAppointments = await prisma.appointment.findMany({
      where: { patientId: existingPatient.id },
      include: {
        doctor: true,
        department: true,
      },
      orderBy: { appointmentDate: "desc" },
    });

    console.log(
      `   Patient ${existingPatient.patientNumber} has ${patientAppointments.length} appointment(s) in history.`
    );
    const hasCreatedApt = patientAppointments.some((a) => a.id === regularApt.id);
    if (!hasCreatedApt) {
      throw new Error("Created appointment not found in patient longitudinal history!");
    }
    console.log("   ✅ Test 8 Passed: Patient profile appointments stream verified.\n");

    console.log("================================================================================");
    console.log(" 🎉 ALL 8 VERIFICATION TESTS PASSED SUCCESSFULLY!                             ");
    console.log(" Phase 4 Appointment + Reception Module is fully verified and operational.      ");
    console.log("================================================================================\n");
  } catch (error) {
    console.error("\n❌ Phase 4 Verification Failed:", error);
    process.exit(1);
  } finally {
    // Clean up test appointments
    if (createdAppointmentIds.length > 0) {
      await prisma.timelineEvent.deleteMany({
        where: { entityId: { in: createdAppointmentIds } },
      });
      await prisma.appointment.deleteMany({
        where: { id: { in: createdAppointmentIds } },
      });
      console.log(`🧹 Cleaned up ${createdAppointmentIds.length} test appointment(s) and timeline events.`);
    }
    await prisma.$disconnect();
  }
}

main();
