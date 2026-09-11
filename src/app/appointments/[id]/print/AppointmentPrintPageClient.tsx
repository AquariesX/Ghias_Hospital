"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, AlertCircle } from "lucide-react";
import AppointmentA4PrescriptionSlip, {
  A4PrescriptionSlipData,
} from "@/components/appointments/AppointmentA4PrescriptionSlip";

export default function AppointmentPrintPageClient({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const [data, setData] = useState<A4PrescriptionSlipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/appointments/${appointmentId}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to load appointment details");
        }
        const json = await res.json();
        const apt = json.appointment;

        // Calculate age
        const birthDate = apt.patient?.dateOfBirth
          ? new Date(apt.patient.dateOfBirth)
          : null;
        let age: number | string = "—";
        if (birthDate && !isNaN(birthDate.getTime())) {
          const diffMs = Date.now() - birthDate.getTime();
          age = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
        }

        // Format timestamp e.g. 9/10/2026 11:35:21 AM
        let formattedTimestamp = "";
        try {
          const createdAtDate = apt.createdAt ? new Date(apt.createdAt) : null;
          if (createdAtDate && !isNaN(createdAtDate.getTime())) {
            formattedTimestamp = `${createdAtDate.toLocaleDateString("en-US")} ${createdAtDate.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })}`;
          } else {
            formattedTimestamp = `${apt.appointmentDate} ${apt.appointmentTime || ""}`.trim();
          }
        } catch {
          formattedTimestamp = `${apt.appointmentDate} ${apt.appointmentTime || ""}`.trim();
        }

        // Extract vitals if consultation has recorded them
        const latestVitals = apt.consultation?.vitalSigns?.[0];
        const bloodPressure = latestVitals
          ? `${latestVitals.systolicBP || "—"}/${latestVitals.diastolicBP || "—"}`
          : null;

        // Extract medicines if consultation has prescriptions
        const medicinesList =
          apt.consultation?.prescriptions?.flatMap((p: any) =>
            (p.items || []).map((item: any) => ({
              id: item.id,
              medicineName: item.medicineName,
              dosage: item.dosage,
              frequency: item.frequency,
              route: item.route,
              duration: item.duration,
              instructions: item.instructions,
            }))
          ) || [];

        const slipData: A4PrescriptionSlipData = {
          appointmentNumber: apt.appointmentNumber,
          tokenNumber: apt.tokenNumber || 1,
          departmentName: apt.department?.name,
          appointmentType: apt.appointmentType,
          timestamp: formattedTimestamp,
          doctor: {
            doctorNameEnglish: apt.doctor.firstName.startsWith("Dr")
              ? `${apt.doctor.firstName} ${apt.doctor.lastName}`
              : `Dr. ${apt.doctor.firstName} ${apt.doctor.lastName}`,
            qualificationsEnglish:
              apt.doctor.qualifications ||
              (apt.doctor.specialization
                ? `Consultant (${apt.doctor.specialization})`
                : "M.B.B.S  F.C.P.S (Medicine)"),
            designationEnglish:
              apt.doctor.designationEnglish ||
              "Consultant Physician DHQ Hospital M.B.Din",
            doctorNameUrdu: apt.doctor.nameUrdu,
            specializationUrdu: apt.doctor.specializationUrdu,
            qualificationsUrdu: apt.doctor.qualificationsUrdu,
            subSpecialtyUrdu: apt.doctor.subSpecialtyUrdu,
          },
          patient: {
            mrNumber: apt.patient?.mrNumber || apt.mrNumber,
            patientNumber: apt.patient?.patientNumber,
            fullName: `${apt.patient?.firstName || ""} ${apt.patient?.lastName || ""}`.trim(),
            guardianName:
              apt.patient?.relatedPersonName ||
              apt.patient?.emergencyContactName,
            relationType:
              apt.patient?.relationType ||
              apt.patient?.emergencyContactRelation,
            age,
            gender: apt.patient?.gender,
            phone: apt.patient?.phone,
            address: apt.patient?.address,
          },
          vitals: latestVitals
            ? {
                bloodPressure: bloodPressure === "—/—" ? null : bloodPressure,
                pulse: latestVitals.pulse,
                temperature: latestVitals.temperature,
                weight: latestVitals.weight,
                testsAdvised: apt.consultation?.investigations,
                clinicalNotes: apt.consultation?.provisionalDiagnosis,
                advice: apt.consultation?.treatmentPlan,
              }
            : null,
          medicines: medicinesList,
        };

        setData(slipData);
      } catch (e: any) {
        setError(e.message || "Failed to load appointment details");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [appointmentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">
            Generating A4 Prescription Slip...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-rose-200 shadow-sm text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">
            Unable to Load Slip
          </h2>
          <p className="text-xs text-slate-600">{error}</p>
          <Link
            href={`/appointments/${appointmentId}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Appointment</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 print:bg-white print:p-0">
      {/* Top Action Bar - Hidden in print */}
      <div className="max-w-[210mm] mx-auto mb-4 flex items-center justify-between no-print bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
        <Link
          href={`/appointments/${appointmentId}`}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-950 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Appointment</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">
            Print Format: <strong>A4 Portrait</strong>
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print A4 Slip</span>
          </button>
        </div>
      </div>

      {/* The A4 Document Slip */}
      <AppointmentA4PrescriptionSlip data={data} />
    </div>
  );
}
