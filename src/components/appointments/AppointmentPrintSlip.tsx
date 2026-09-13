"use client";

import React, { useState } from "react";
import { Printer, X, FileText, Receipt } from "lucide-react";
import AppointmentA4PrescriptionSlip, {
  A4PrescriptionSlipData,
  PrescriptionMedicineItem,
} from "./AppointmentA4PrescriptionSlip";
import GhiasThermalTokenSlip from "../common/GhiasThermalTokenSlip";

export interface AppointmentSlipData {
  appointmentNumber: string;
  tokenNumber: number | string;
  queuePosition?: number | string | null;
  mrNumber?: string | null;
  patientNumber?: string | null;
  patientName: string;
  patientPhone: string;
  patientGender?: string | null;
  patientAge?: string | number | null;
  guardianName?: string | null;
  relationType?: string | null;
  address?: string | null;

  // Doctor credentials
  doctorName: string;
  specialization?: string | null;
  departmentName?: string | null;
  roomNumber?: string | null;
  qualificationsEnglish?: string | null;
  designationEnglish?: string | null;
  doctorNameUrdu?: string | null;
  specializationUrdu?: string | null;
  qualificationsUrdu?: string | null;
  subSpecialtyUrdu?: string | null;

  // Schedule & Payment
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: "REGULAR" | "FOLLOW_UP" | "EMERGENCY" | string;
  serviceType?: string | null;
  consultationFee: number | string;
  amount?: number | string;
  reason?: string | null;
  createdByName?: string | null;
  createdAt?: string | null;

  // Clinical & Prescriptions
  bloodPressure?: string | null;
  pulse?: string | number | null;
  temperature?: string | number | null;
  weight?: string | number | null;
  testsAdvised?: string | null;
  clinicalNotes?: string | null;
  advice?: string | null;
  medicines?: PrescriptionMedicineItem[];
}

interface Props {
  data: AppointmentSlipData;
  onClose?: () => void;
  isModal?: boolean;
  defaultLayout?: "A4" | "THERMAL";
}

export default function AppointmentPrintSlip({
  data,
  onClose,
  isModal = false,
  defaultLayout = "A4",
}: Props) {
  const [layout, setLayout] = useState<"A4" | "THERMAL">(defaultLayout);

  const handlePrint = () => {
    window.print();
  };

  const formattedTimestamp = (() => {
    try {
      // If we have createdAt with time, use that; otherwise build from date and time
      if (data.createdAt) {
        const d = new Date(data.createdAt);
        if (!isNaN(d.getTime())) {
          return `${d.toLocaleDateString("en-US")} ${d.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })}`;
        }
      }
      return `${data.appointmentDate} ${data.appointmentTime || ""}`.trim();
    } catch {
      return `${data.appointmentDate} ${data.appointmentTime || ""}`.trim();
    }
  })();

  // Transform into A4 data
  const a4Data: A4PrescriptionSlipData = {
    appointmentNumber: data.appointmentNumber,
    tokenNumber: data.tokenNumber,
    departmentName: data.departmentName,
    appointmentType: data.appointmentType,
    timestamp: formattedTimestamp,
    doctor: {
      doctorNameEnglish: data.doctorName.startsWith("Dr")
        ? data.doctorName
        : `Dr. ${data.doctorName}`,
      qualificationsEnglish:
        data.qualificationsEnglish ||
        (data.specialization ? `Consultant (${data.specialization})` : "M.B.B.S"),
      designationEnglish:
        data.designationEnglish ||
        "Consultant Physician DHQ Hospital M.B.Din",
      doctorNameUrdu: data.doctorNameUrdu,
      specializationUrdu: data.specializationUrdu,
      qualificationsUrdu: data.qualificationsUrdu,
      subSpecialtyUrdu: data.subSpecialtyUrdu,
    },
    patient: {
      mrNumber: data.mrNumber,
      patientNumber: data.patientNumber,
      fullName: data.patientName,
      guardianName: data.guardianName,
      relationType: data.relationType,
      age: data.patientAge,
      gender: data.patientGender,
      phone: data.patientPhone,
      address: data.address,
    },
    vitals: {
      bloodPressure: data.bloodPressure,
      pulse: data.pulse,
      temperature: data.temperature,
      weight: data.weight,
      testsAdvised: data.testsAdvised,
      clinicalNotes: data.clinicalNotes,
      advice: data.advice,
    },
    medicines: data.medicines,
  };

  // Render 80mm thermal view
  // Render 80mm thermal view matching official Ghias Hospital POS template
  const thermalSlipContent = (
    <GhiasThermalTokenSlip
      id="appointment-print-slip"
      data={{
        tokenNumber: data.tokenNumber,
        slipNumber: data.appointmentNumber || data.tokenNumber,
        mrNumber: data.mrNumber || data.patientNumber || "---",
        dateTime: data.createdAt || (data.appointmentDate ? `${data.appointmentDate} ${data.appointmentTime || ""}` : new Date()),
        doctorName: data.doctorName,
        patientName: data.patientName,
        gender: data.patientGender || "Male",
        address: data.address || "---",
        contactNo: data.patientPhone || "000",
        type:
          data.serviceType ||
          data.reason ||
          data.departmentName ||
          (data.appointmentType === "FOLLOW_UP"
            ? "Follow-up"
            : data.appointmentType === "EMERGENCY"
            ? "Emergency"
            : "OPD Consultation"),
        amount: data.amount != null ? data.amount : data.consultationFee,
      }}
    />
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-4 sm:p-5 space-y-3 my-4">
          {/* Modal Header with Format Switcher */}
          <div className="flex items-center justify-between no-print pb-2.5 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Print Patient Slip
                </h3>
                <p className="text-xs text-slate-500">
                  Select A4 Prescription Slip (Original Format) or 80mm Token Slip
                </p>
              </div>
            </div>

            {/* Layout Toggle */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setLayout("A4")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                  layout === "A4"
                    ? "bg-white text-teal-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>A4 Slip (Hospital Standard)</span>
              </button>
              <button
                type="button"
                onClick={() => setLayout("THERMAL")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                  layout === "THERMAL"
                    ? "bg-white text-teal-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>80mm Thermal</span>
              </button>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Slip Scrollable Container */}
          <div className="overflow-y-auto max-h-[75vh] p-2 bg-slate-100 rounded-xl flex justify-center">
            {layout === "A4" ? (
              <AppointmentA4PrescriptionSlip data={a4Data} />
            ) : (
              thermalSlipContent
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 no-print">
            <span className="text-xs text-slate-500">
              Format: <strong className="text-slate-800">{layout === "A4" ? "A4 Portrait (Prescription Slip)" : "80mm POS Thermal"}</strong>
            </span>

            <div className="flex items-center gap-3">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Close
                </button>
              )}
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print {layout === "A4" ? "A4 Slip" : "Receipt"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return layout === "A4" ? (
    <AppointmentA4PrescriptionSlip data={a4Data} />
  ) : (
    thermalSlipContent
  );
}
