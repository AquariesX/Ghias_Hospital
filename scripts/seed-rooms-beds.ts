import prisma from "../src/lib/prisma";
import { BedStatus } from "@prisma/client";

async function seedRooms() {
  console.log("Seeding real hospital rooms and beds...");

  const roomsData = [
    {
      roomNumber: "101",
      name: "General Ward A",
      department: "INPATIENT",
      beds: [
        { bedNumber: "Bed 1", status: BedStatus.FREE, notes: "Standard Hospital Bed" },
        { bedNumber: "Bed 2", status: BedStatus.FREE, notes: "Oxygen Wall Port" },
        { bedNumber: "Bed 3", status: BedStatus.FREE, notes: "Standard Hospital Bed" },
      ],
    },
    {
      roomNumber: "102",
      name: "Private Deluxe Room",
      department: "INPATIENT",
      beds: [
        { bedNumber: "Bed 1", status: BedStatus.FREE, notes: "Motorized Adjustable Bed" },
      ],
    },
    {
      roomNumber: "201",
      name: "Emergency Observation Ward",
      department: "EMERGENCY",
      beds: [
        { bedNumber: "ER Bed 1", status: BedStatus.FREE, notes: "Monitor & Defibrillator Port" },
        { bedNumber: "ER Bed 2", status: BedStatus.FREE, notes: "Monitor & Suction Unit" },
      ],
    },
    {
      roomNumber: "ICU-01",
      name: "Intensive Care Unit",
      department: "ICU",
      beds: [
        { bedNumber: "ICU Bed 1", status: BedStatus.FREE, notes: "Ventilator Supported" },
        { bedNumber: "ICU Bed 2", status: BedStatus.FREE, notes: "Ventilator Supported" },
      ],
    },
  ];

  for (const r of roomsData) {
    const existing = await prisma.room.findUnique({ where: { roomNumber: r.roomNumber } });
    if (!existing) {
      const room = await prisma.room.create({
        data: {
          roomNumber: r.roomNumber,
          name: r.name,
          department: r.department,
          isActive: true,
        },
      });

      for (const b of r.beds) {
        await prisma.bed.create({
          data: {
            roomId: room.id,
            bedNumber: b.bedNumber,
            status: b.status,
            isActive: true,
            notes: b.notes,
          },
        });
      }
      console.log(`Created Room ${r.roomNumber} with ${r.beds.length} beds.`);
    } else {
      console.log(`Room ${r.roomNumber} already exists.`);
    }
  }

  console.log("Seeding completed successfully.");
}

seedRooms()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
