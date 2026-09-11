"use client";

import React, { useState } from "react";
import { Printer, X, FileText, Receipt } from "lucide-react";
import AppointmentA4PrescriptionSlip, {
  A4PrescriptionSlipData,
  PrescriptionMedicineItem,
} from "./AppointmentA4PrescriptionSlip";

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
  consultationFee: number | string;
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
  const thermalSlipContent = (
    <div
      id="appointment-print-slip"
      className="bg-white text-slate-900 w-full max-w-[380px] mx-auto p-4 border-2 border-dashed border-slate-300 rounded-xl shadow-sm print:border-none print:shadow-none print:p-2 print:m-0 font-sans text-xs"
    >
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #appointment-print-slip,
          #appointment-print-slip * {
            visibility: visible;
          }
          #appointment-print-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 80mm;
            margin: 0;
            padding: 6px;
            border: none;
            box-shadow: none;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Hospital Header */}
      <div className="text-center pb-2 border-b-2 border-slate-800">
        <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 leading-none">
          GHIAS HOSPITAL
        </h2>
        <p className="text-[10px] font-semibold text-slate-600 tracking-wider uppercase mt-1">
          Medical Center &amp; Clinical Care
        </p>
        <p className="text-[9px] text-slate-500 mt-0.5">
          Main Hospital Road • Phalia • 0546-566567
        </p>
        <div className="mt-1.5 inline-block px-2 py-0.5 rounded bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider">
          OPD Token Slip
        </div>
      </div>

      {/* Token & Ref */}
      <div className="flex items-center justify-between py-2 border-b border-dashed border-slate-300">
        <div>
          <span className="text-[9px] font-bold uppercase text-slate-500 block">
            Token Number
          </span>
          <span className="font-mono font-black text-3xl text-teal-800 leading-none block mt-0.5">
            #{data.tokenNumber}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-bold uppercase text-slate-500 block">
            Appointment Ref
          </span>
          <span className="font-mono font-bold text-xs text-slate-900 block mt-0.5">
            {data.appointmentNumber}
          </span>
        </div>
      </div>

      {/* Patient info */}
      <div className="py-2 border-b border-slate-200 space-y-1">
        <div className="flex justify-between">
          <span className="text-slate-500">MR #:</span>
          <span className="font-bold font-mono">
            {data.mrNumber || data.patientNumber || "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Patient:</span>
          <span className="font-bold">{data.patientName}</span>
        </div>
        {data.guardianName && (
          <div className="flex justify-between">
            <span className="text-slate-500">S/O, D/O:</span>
            <span>{data.guardianName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-500">Phone:</span>
          <span className="font-mono">{data.patientPhone || "—"}</span>
        </div>
        <div className="flex justify-between text-[11px] text-slate-600">
          <span>
            {data.patientGender || "—"} • {data.patientAge ? `${data.patientAge} yrs` : ""}
          </span>
          <span>{formattedTimestamp}</span>
        </div>
      </div>

      {/* Doctor info */}
      <div className="py-2 border-b border-slate-200">
        <span className="text-[10px] text-slate-500 block">Physician:</span>
        <span className="font-bold text-slate-900 block text-xs">
          {data.doctorName.startsWith("Dr") ? data.doctorName : `Dr. ${data.doctorName}`}
        </span>
        {data.specialization && (
          <span className="text-[11px] text-teal-800 block">
            {data.specialization}
          </span>
        )}
      </div>

      {/* Fee */}
      <div className="py-2 border-b-2 border-slate-800 flex items-center justify-between">
        <span className="font-bold uppercase text-[10px] text-slate-500">
          Consultation Fee
        </span>
        <span className="font-mono font-black text-sm text-emerald-800">
          PKR {Number(data.consultationFee).toLocaleString()}
        </span>
      </div>

      <div className="pt-2 text-center text-[9px] text-slate-500">
        Please wait in the OPD lounge until Token #{data.tokenNumber} is called.
      </div>
    </div>
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
