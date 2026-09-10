import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generatePatientAndMRNumbers } from "@/lib/patient-number";
import { generateNextAdmissionNumber } from "@/lib/admission-number";
import { Gender, BloodGroup, EmergencyPriority } from "@prisma/client";

const emergencyTriageSchema = z.object({
  // Existing patient or new patient creation
  patientId: z.string().uuid("Invalid patient ID").optional().nullable(),
  
  // Primary Demographics (used when creating a new patient or updating)
  mrNumber: z.string().optional().nullable(),
  firstName: z.string().min(1, "First name is required").optional().nullable(),
  lastName: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
  age: z.union([z.number(), z.string()]).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  relationType: z.string().optional().nullable(), // "S/o", "D/o", "W/o", "Guardian", etc.
  relatedPersonName: z.string().optional().nullable(), // Father / Husband / Guardian Name
  maritalStatus: z.string().optional().nullable(), // Single, Married, Divorced, Widowed
  cnic: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),

  // Hospital Emergency Triage assessment
  triageLevel: z.enum([
    "RESUSCITATION",
    "EMERGENCY",
    "URGENT",
    "SEMI_URGENT",
    "NON_URGENT",
  ]).default("EMERGENCY"),
  targetTime: z.string().optional().nullable(),
  chiefComplaint: z.string().min(1, "Chief complaint is required").max(2000),
  observations: z.string().max(3000).optional().nullable(),
  painScore: z.number().int().min(0).max(10).optional().nullable(),
  generalCondition: z.string().max(200).optional().nullable(),

  // Timestamps
  admissionDateTime: z.string().optional().nullable(),
  dischargeDateTime: z.string().optional().nullable(),

  // Diagnoses
  provisionalDiagnosis: z.string().max(2000).optional().nullable(),
  finalDiagnosis: z.string().max(2000).optional().nullable(),

  // Medication Sheet (Dynamic array of emergency medications)
  medicationSheet: z.array(
    z.object({
      id: z.string().optional(),
      medicineName: z.string().min(1, "Medicine name is required"),
      dosage: z.string().optional().default(""),
      route: z.string().optional().default("IV"),
      frequency: z.string().optional().default("STAT"),
      timeAdministered: z.string().optional().default(""),
      status: z.string().optional().default("GIVEN"),
      instructions: z.string().optional().default(""),
    })
  ).optional().nullable(),

  // Triage vitals
  systolicBP: z.number().int().min(30).max(350).optional().nullable(),
  diastolicBP: z.number().int().min(20).max(250).optional().nullable(),
  pulse: z.number().int().min(20).max(300).optional().nullable(),
  temperature: z.number().min(70).max(115).optional().nullable(),
  oxygenSaturation: z.number().int().min(0).max(100).optional().nullable(),
  respiratoryRate: z.number().int().min(4).max(100).optional().nullable(),

  // Optional doctor assignment or bed bay
  doctorId: z.string().optional().nullable(),
  roomBedNo: z.string().optional().nullable(),
});

function mapTriageLevelToPriority(level: string): EmergencyPriority {
  switch (level) {
    case "RESUSCITATION":
      return "CRITICAL";
    case "EMERGENCY":
      return "HIGH";
    case "URGENT":
      return "URGENT";
    case "SEMI_URGENT":
    case "NON_URGENT":
    default:
      return "NORMAL";
  }
}

function getDefaultTargetTime(level: string): string {
  switch (level) {
    case "RESUSCITATION":
      return "Immediate (within 2 mins)";
    case "EMERGENCY":
      return "within 10 minutes";
    case "URGENT":
      return "within 30 minutes";
    case "SEMI_URGENT":
      return "within 60 minutes";
    case "NON_URGENT":
      return "within 120 minutes";
    default:
      return "within 30 minutes";
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const allowedRoles = ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "STAFF"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to record emergency triage" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parseResult = emergencyTriageSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const performerName = `${user.firstName} ${user.lastName}`.trim();
    const priority = mapTriageLevelToPriority(data.triageLevel);
    const targetTime = data.targetTime || getDefaultTargetTime(data.triageLevel);

    // Parse dates or fallback to now
    const admissionDateObj = data.admissionDateTime ? new Date(data.admissionDateTime) : new Date();
    const dischargeDateObj = data.dischargeDateTime ? new Date(data.dischargeDateTime) : null;

    const result = await prisma.$transaction(async (tx) => {
      let resolvedPatientId = data.patientId;

      // 1. If patientId is provided, optionally update primary demographic details if provided
      if (resolvedPatientId) {
        const existing = await tx.patient.findUnique({
          where: { id: resolvedPatientId },
        });

        if (!existing) {
          throw new Error("Specified patient was not found");
        }

        // Update with any newer info passed
        const updateData: Record<string, unknown> = {};
        if (data.relationType) updateData.relationType = data.relationType;
        if (data.relatedPersonName) updateData.relatedPersonName = data.relatedPersonName;
        if (data.maritalStatus) updateData.maritalStatus = data.maritalStatus;
        if (data.cnic && !existing.cnic) updateData.cnic = data.cnic;
        if (data.address && !existing.address) updateData.address = data.address;
        if (data.phone) updateData.phone = data.phone;

        if (Object.keys(updateData).length > 0) {
          await tx.patient.update({
            where: { id: resolvedPatientId },
            data: updateData,
          });
        }
      } else {
        // 2. Create brand-new emergency patient
        if (!data.firstName) {
          throw new Error("Patient first name is required when registering a new emergency patient");
        }

        const { patientNumber, mrNumber: generatedMr } = await generatePatientAndMRNumbers();
        const effectiveMrNumber = data.mrNumber?.trim() || generatedMr;

        let dob: Date;
        if (data.dateOfBirth) {
          dob = new Date(data.dateOfBirth);
        } else if (data.age) {
          const numAge = parseInt(String(data.age), 10) || 30;
          dob = new Date(new Date().getFullYear() - numAge, 0, 1);
        } else {
          dob = new Date(1990, 0, 1);
        }

        let validBloodGroup: BloodGroup = "O_POSITIVE";
        if (
          data.bloodGroup &&
          [
            "A_POSITIVE",
            "A_NEGATIVE",
            "B_POSITIVE",
            "B_NEGATIVE",
            "AB_POSITIVE",
            "AB_NEGATIVE",
            "O_POSITIVE",
            "O_NEGATIVE",
          ].includes(data.bloodGroup)
        ) {
          validBloodGroup = data.bloodGroup as BloodGroup;
        }

        const newPatient = await tx.patient.create({
          data: {
            patientNumber,
            mrNumber: effectiveMrNumber,
            firstName: data.firstName.trim(),
            lastName: data.lastName?.trim() || "",
            gender: (data.gender as Gender) || "MALE",
            dateOfBirth: dob,
            phone: data.phone?.trim() || "0000-0000000",
            address: data.address?.trim() || "Emergency Arrival",
            bloodGroup: validBloodGroup,
            cnic: data.cnic?.trim() || null,
            maritalStatus: data.maritalStatus?.trim() || null,
            relationType: data.relationType?.trim() || "Guardian",
            relatedPersonName: data.relatedPersonName?.trim() || "Attendant",
            emergencyContactName: data.emergencyContactName?.trim() || data.relatedPersonName?.trim() || "Attendant",
            emergencyContactPhone: data.emergencyContactPhone?.trim() || data.phone?.trim() || "0000-0000000",
            emergencyContactRelation: data.relationType?.trim() || "Guardian",
            status: "CRITICAL",
          },
        });

        resolvedPatientId = newPatient.id;
      }

      // 3. Create Emergency Admission record (so patient instantly surfaces in Ward & Nurse dashboards)
      const admissionNumber = await generateNextAdmissionNumber();
      const admissionTimeStr = admissionDateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const admission = await tx.admission.create({
        data: {
          admissionNumber,
          patientId: resolvedPatientId,
          admissionSource: "EMERGENCY",
          admissionDate: admissionDateObj,
          admissionTime: admissionTimeStr,
          roomBedNo: data.roomBedNo?.trim() || "ER Triage Bay",
          provisionalDiagnosis: data.provisionalDiagnosis?.trim() || data.chiefComplaint,
          finalDiagnosis: data.finalDiagnosis?.trim() || null,
          presentingComplaints: data.chiefComplaint,
          generalExamination: data.observations || `General Condition: ${data.generalCondition || "Under evaluation"}`,
          pulse: data.pulse,
          temperature: data.temperature,
          systolicBP: data.systolicBP,
          diastolicBP: data.diastolicBP,
          status: "ADMITTED",
          doctorId: data.doctorId || null,
          dischargeDate: dischargeDateObj ? dischargeDateObj : null,
          dischargeTime: dischargeDateObj ? dischargeDateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null,
          createdById: user.id,
        },
      });

      // 4. Create Emergency Triage Record
      const triage = await tx.emergencyTriage.create({
        data: {
          patientId: resolvedPatientId,
          chiefComplaint: data.chiefComplaint,
          priority,
          triageLevel: data.triageLevel,
          targetTime,
          admissionDateTime: admissionDateObj,
          dischargeDateTime: dischargeDateObj,
          provisionalDiagnosis: data.provisionalDiagnosis?.trim() || null,
          finalDiagnosis: data.finalDiagnosis?.trim() || null,
          medicationSheet: data.medicationSheet || [],
          painScore: data.painScore,
          generalCondition: data.generalCondition,
          observations: data.observations,
          systolicBP: data.systolicBP,
          diastolicBP: data.diastolicBP,
          pulse: data.pulse,
          temperature: data.temperature,
          oxygenSaturation: data.oxygenSaturation,
          respiratoryRate: data.respiratoryRate,
          admissionId: admission.id,
          triagedById: user.id,
          triagedByName: performerName,
          triagedAt: admissionDateObj,
        },
        include: {
          patient: true,
          admission: true,
        },
      });

      // 5. If vitals provided, record VitalSign entry
      const hasVitals =
        data.systolicBP !== undefined ||
        data.pulse !== undefined ||
        data.temperature !== undefined ||
        data.oxygenSaturation !== undefined ||
        data.respiratoryRate !== undefined;

      if (hasVitals) {
        await tx.vitalSign.create({
          data: {
            patientId: resolvedPatientId,
            admissionId: admission.id,
            encounterType: "EMERGENCY",
            systolicBP: data.systolicBP,
            diastolicBP: data.diastolicBP,
            pulse: data.pulse,
            temperature: data.temperature,
            respiratoryRate: data.respiratoryRate,
            oxygenSaturation: data.oxygenSaturation,
            painScore: data.painScore,
            generalCondition: data.generalCondition,
            observations: `Emergency Triage (${data.triageLevel}): ${data.chiefComplaint}. ${data.observations || ""}`.trim(),
            recordedById: user.id,
            recordedByName: performerName,
            recordedByRole: user.role,
            recordedAt: admissionDateObj,
          },
        });
      }

      // 6. Record Timeline Event
      await tx.timelineEvent.create({
        data: {
          patientId: resolvedPatientId,
          title: `Emergency Triage: ${data.triageLevel} (${targetTime})`,
          description: `Complaint: ${data.chiefComplaint} | Admission: ${admissionNumber} | Triaged by ${performerName} (${user.role})`,
          eventType: "EMERGENCY_TRIAGE_RECORDED",
          entityId: triage.id,
          performerName,
          performerRole: user.role,
        },
      });

      // 7. Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          userName: performerName,
          userRole: user.role,
          action: "CREATE_EMERGENCY_TRIAGE",
          entity: "EmergencyTriage",
          entityId: triage.id,
          newValue: JSON.stringify({
            triageLevel: data.triageLevel,
            priority,
            admissionNumber,
            patientId: resolvedPatientId,
            chiefComplaint: data.chiefComplaint,
          }),
        },
      });

      return triage;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Emergency patient triaged and registered successfully",
        data: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/staff/emergency/triage:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to record emergency triage" },
      { status: 500 }
    );
  }
}
