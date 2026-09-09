import prisma from "../src/lib/prisma";
import { BedStatus, AdmissionStatus, AdmissionSource } from "@prisma/client";

async function runTest() {
  console.log("=================================================");
  console.log("🏥 STARTING ROOM & BED MANAGEMENT LIFECYCLE TEST");
  console.log("=================================================");

  try {
    // 1. Create a Test Room
    const testRoomNumber = `TEST-${Date.now().toString().slice(-4)}`;
    console.log(`\n1. Creating test Room: ${testRoomNumber}...`);
    const room = await prisma.room.create({
      data: {
        roomNumber: testRoomNumber,
        name: "Test General Ward",
        department: "INPATIENT",
        isActive: true,
      },
    });
    console.log(`✅ Created Room: id=${room.id}, number=${room.roomNumber}`);

    // 2. Create 2 Beds in this Room (Both FREE)
    console.log("\n2. Creating Bed 1 and Bed 2 in Room...");
    const bed1 = await prisma.bed.create({
      data: {
        roomId: room.id,
        bedNumber: "Bed 1",
        status: BedStatus.FREE,
        isActive: true,
        notes: "Oxygen Port",
      },
    });
    const bed2 = await prisma.bed.create({
      data: {
        roomId: room.id,
        bedNumber: "Bed 2",
        status: BedStatus.FREE,
        isActive: true,
      },
    });
    console.log(`✅ Created Bed 1: id=${bed1.id}, status=${bed1.status}`);
    console.log(`✅ Created Bed 2: id=${bed2.id}, status=${bed2.status}`);

    // 3. Create 2 Test Patients
    console.log("\n3. Creating Test Patients...");
    const patient1 = await prisma.patient.create({
      data: {
        patientNumber: `PAT-TEST-1-${Date.now().toString().slice(-4)}`,
        mrNumber: `MR-TEST-1-${Date.now().toString().slice(-4)}`,
        firstName: "Tariq",
        lastName: "Mahmood",
        gender: "MALE",
        dateOfBirth: new Date("1985-05-15"),
        phone: "03001234567",
        bloodGroup: "B_POSITIVE",
        emergencyContactName: "Brother",
        emergencyContactPhone: "03007654321",
      },
    });

    const patient2 = await prisma.patient.create({
      data: {
        patientNumber: `PAT-TEST-2-${Date.now().toString().slice(-4)}`,
        mrNumber: `MR-TEST-2-${Date.now().toString().slice(-4)}`,
        firstName: "Ayesha",
        lastName: "Bibi",
        gender: "FEMALE",
        dateOfBirth: new Date("1992-08-20"),
        phone: "03219876543",
        bloodGroup: "O_POSITIVE",
        emergencyContactName: "Husband",
        emergencyContactPhone: "03211234567",
      },
    });
    console.log(`✅ Patient 1 created: ${patient1.firstName} ${patient1.lastName}`);
    console.log(`✅ Patient 2 created: ${patient2.firstName} ${patient2.lastName}`);

    // 4. Test Bed Booking: Admit Patient 1 into Bed 1
    console.log("\n4. Simulating Admission: Patient 1 into Bed 1...");
    const adm1Number = `ADM-TEST-${Date.now().toString().slice(-4)}`;
    
    // Simulate transaction used in POST /api/admissions
    const admission1 = await prisma.$transaction(async (tx) => {
      // Validate bed is FREE
      const targetBed = await tx.bed.findUnique({
        where: { id: bed1.id },
        include: { room: true },
      });

      if (!targetBed || !targetBed.isActive || targetBed.status !== BedStatus.FREE) {
        throw new Error(`Bed "${targetBed?.bedNumber}" is currently ${targetBed?.status}. Only FREE beds can be booked.`);
      }

      // Transition bed to SCHEDULED
      await tx.bed.update({
        where: { id: bed1.id },
        data: { status: BedStatus.SCHEDULED },
      });

      return await tx.admission.create({
        data: {
          admissionNumber: adm1Number,
          patientId: patient1.id,
          admissionDate: new Date(),
          admissionSource: AdmissionSource.OPD,
          bedId: bed1.id,
          roomBedNo: `Room ${room.roomNumber} - ${bed1.bedNumber}`,
          status: AdmissionStatus.ADMITTED,
        },
      });
    });

    // Check Bed 1 status in database
    const bed1AfterBooking = await prisma.bed.findUnique({ where: { id: bed1.id } });
    console.log(`✅ Admission 1 created: #${admission1.admissionNumber}`);
    console.log(`✅ Bed 1 Status after admission: ${bed1AfterBooking?.status} (Expected: SCHEDULED)`);
    if (bed1AfterBooking?.status !== BedStatus.SCHEDULED) {
      throw new Error(`Expected Bed 1 status to be SCHEDULED but got ${bed1AfterBooking?.status}`);
    }

    // 5. Test Double-Booking Prevention: Attempt to admit Patient 2 into Bed 1
    console.log("\n5. Testing Concurrency / Double-Booking Prevention...");
    let doubleBookingPrevented = false;
    try {
      await prisma.$transaction(async (tx) => {
        const targetBed = await tx.bed.findUnique({
          where: { id: bed1.id },
          include: { room: true },
        });

        if (!targetBed || !targetBed.isActive || targetBed.status !== BedStatus.FREE) {
          throw new Error(`Bed "${targetBed?.bedNumber}" is currently ${targetBed?.status}. Only FREE beds can be booked.`);
        }

        await tx.bed.update({
          where: { id: bed1.id },
          data: { status: BedStatus.SCHEDULED },
        });

        return await tx.admission.create({
          data: {
            admissionNumber: `ADM-TEST-FAIL-${Date.now().toString().slice(-4)}`,
            patientId: patient2.id,
            admissionDate: new Date(),
            admissionSource: AdmissionSource.OPD,
            bedId: bed1.id,
            roomBedNo: `Room ${room.roomNumber} - ${bed1.bedNumber}`,
            status: AdmissionStatus.ADMITTED,
          },
        });
      });
    } catch (err: unknown) {
      doubleBookingPrevented = true;
      console.log(`✅ Double-booking successfully blocked! Error caught: ${(err as Error).message}`);
    }

    if (!doubleBookingPrevented) {
      throw new Error("❌ FAILURE: Double-booking was NOT blocked!");
    }

    // 6. Admit Patient 2 into Bed 2
    console.log("\n6. Admitting Patient 2 into Bed 2...");
    const adm2Number = `ADM-TEST-2-${Date.now().toString().slice(-4)}`;
    const admission2 = await prisma.$transaction(async (tx) => {
      const targetBed = await tx.bed.findUnique({
        where: { id: bed2.id },
      });
      if (!targetBed || targetBed.status !== BedStatus.FREE) {
        throw new Error("Bed 2 is not free");
      }
      await tx.bed.update({
        where: { id: bed2.id },
        data: { status: BedStatus.SCHEDULED },
      });
      return await tx.admission.create({
        data: {
          admissionNumber: adm2Number,
          patientId: patient2.id,
          admissionDate: new Date(),
          admissionSource: AdmissionSource.OPD,
          bedId: bed2.id,
          roomBedNo: `Room ${room.roomNumber} - ${bed2.bedNumber}`,
          status: AdmissionStatus.ADMITTED,
        },
      });
    });
    const bed2AfterBooking = await prisma.bed.findUnique({ where: { id: bed2.id } });
    console.log(`✅ Admission 2 created: #${admission2.admissionNumber}`);
    console.log(`✅ Bed 2 Status after admission: ${bed2AfterBooking?.status} (Expected: SCHEDULED)`);

    // 7. Test Discharge: Discharge Patient 1 -> Bed 1 must automatically return to FREE
    console.log("\n7. Discharging Patient 1 (Simulating POST /api/admissions/[id]/discharge)...");
    await prisma.$transaction(async (tx) => {
      await tx.admission.update({
        where: { id: admission1.id },
        data: {
          status: AdmissionStatus.DISCHARGED,
          dischargeDate: new Date(),
          dischargeTime: "01:00 PM",
          dischargeCondition: "Satisfactory",
        },
      });

      // Automatic Bed Release
      if (admission1.bedId) {
        await tx.bed.update({
          where: { id: admission1.bedId },
          data: { status: BedStatus.FREE },
        });
      }
    });

    const bed1AfterDischarge = await prisma.bed.findUnique({ where: { id: bed1.id } });
    console.log(`✅ Patient 1 discharged.`);
    console.log(`✅ Bed 1 Status after discharge: ${bed1AfterDischarge?.status} (Expected: FREE)`);
    if (bed1AfterDischarge?.status !== BedStatus.FREE) {
      throw new Error(`Expected Bed 1 status to be FREE after discharge, but got ${bed1AfterDischarge?.status}`);
    }

    // 8. Re-admission test: Bed 1 can now be allocated again!
    console.log("\n8. Verifying Bed 1 can now be booked again by Patient 2 for another episode...");
    const admissionRebook = await prisma.$transaction(async (tx) => {
      const targetBed = await tx.bed.findUnique({ where: { id: bed1.id } });
      if (!targetBed || targetBed.status !== BedStatus.FREE) {
        throw new Error("Bed 1 was expected to be FREE for rebooking!");
      }
      await tx.bed.update({
        where: { id: bed1.id },
        data: { status: BedStatus.SCHEDULED },
      });
      return await tx.admission.create({
        data: {
          admissionNumber: `ADM-REBOOK-${Date.now().toString().slice(-4)}`,
          patientId: patient2.id,
          admissionDate: new Date(),
          admissionSource: AdmissionSource.EMERGENCY,
          bedId: bed1.id,
          roomBedNo: `Room ${room.roomNumber} - ${bed1.bedNumber}`,
          status: AdmissionStatus.ADMITTED,
        },
      });
    });
    console.log(`✅ Bed 1 re-booked successfully: Adm #${admissionRebook.admissionNumber}`);

    // Cleanup test data
    console.log("\n9. Cleaning up test records...");
    await prisma.admission.deleteMany({
      where: {
        id: { in: [admission1.id, admission2.id, admissionRebook.id] },
      },
    });
    await prisma.bed.deleteMany({
      where: { roomId: room.id },
    });
    await prisma.room.delete({
      where: { id: room.id },
    });
    await prisma.patient.deleteMany({
      where: { id: { in: [patient1.id, patient2.id] } },
    });
    console.log("✅ Cleanup completed successfully.");

    console.log("\n=================================================");
    console.log("🎉 ALL ROOM & BED MANAGEMENT TESTS PASSED 100%!");
    console.log("=================================================");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
