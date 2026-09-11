"use client";

import React, { useRef } from "react";
import { Printer, X, Download } from "lucide-react";
import GhiasHospitalLogo from "@/components/common/GhiasHospitalLogo";

export interface PrescriptionMedicineItem {
  id?: string;
  medicineName: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  duration?: string;
  instructions?: string | null;
}

export interface DoctorSlipTemplate {
  // English credentials
  doctorNameEnglish: string;
  qualificationsEnglish?: string | null;
  designationEnglish?: string | null;

  // Urdu credentials
  doctorNameUrdu?: string | null;
  specializationUrdu?: string | null;
  qualificationsUrdu?: string | null;
  subSpecialtyUrdu?: string | null;
}

export interface PatientSlipDetails {
  mrNumber?: string | null;
  patientNumber?: string | null;
  fullName: string;
  guardianName?: string | null;
  relationType?: string | null; // S/O, D/O, W/O, Guardian
  age?: string | number | null;
  gender?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface VitalSignDetails {
  bloodPressure?: string | null;
  pulse?: string | number | null;
  temperature?: string | number | null;
  weight?: string | number | null;
  testsAdvised?: string | null;
  clinicalNotes?: string | null;
  advice?: string | null;
}

export interface A4PrescriptionSlipData {
  appointmentNumber: string;
  tokenNumber: number | string;
  departmentName?: string | null;
  appointmentType?: string | null; // REGULAR, EMERGENCY, FOLLOW_UP
  timestamp: string; // formatted date & time string e.g. "9/10/2026 11:35:21 AM"

  doctor: DoctorSlipTemplate;
  patient: PatientSlipDetails;
  vitals?: VitalSignDetails | null;
  medicines?: PrescriptionMedicineItem[];
}

interface Props {
  data: A4PrescriptionSlipData;
  onClose?: () => void;
  isModal?: boolean;
}

export default function AppointmentA4PrescriptionSlip({
  data,
  onClose,
  isModal = false,
}: Props) {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  // Dynamic doctor credentials - strictly reflecting the selected doctor
  const doctorNameEn =
    data.doctor.doctorNameEnglish?.trim() || "Attending Doctor";
  const qualEn =
    data.doctor.qualificationsEnglish?.trim() || "";
  const desigEn =
    data.doctor.designationEnglish?.trim() || "";

  const doctorNameUr = (() => {
    if (data.doctor.doctorNameUrdu?.trim()) {
      return data.doctor.doctorNameUrdu.trim();
    }
    if (doctorNameEn.toLowerCase().includes("ali ghias")) {
      return "ڈاکٹر علی غیاث تارڑ";
    }
    const cleanName = doctorNameEn.replace(/^Dr\.?\s*/i, "");
    return `ڈاکٹر ${cleanName}`;
  })();

  const specUr = (() => {
    if (data.doctor.specializationUrdu?.trim()) {
      return data.doctor.specializationUrdu.trim();
    }
    if (doctorNameEn.toLowerCase().includes("ali ghias")) {
      return "ماہر امراض دل، شوگر، معدہ، جگر";
    }
    return "";
  })();

  const qualUr = (() => {
    if (data.doctor.qualificationsUrdu?.trim()) {
      return data.doctor.qualificationsUrdu.trim();
    }
    if (doctorNameEn.toLowerCase().includes("ali ghias")) {
      return "ایم بی بی ایس، ایف سی پی ایس (میڈیسن)";
    }
    return data.doctor.qualificationsEnglish?.trim() || "";
  })();

  const subSpecUr = (() => {
    if (data.doctor.subSpecialtyUrdu?.trim()) {
      return data.doctor.subSpecialtyUrdu.trim();
    }
    if (doctorNameEn.toLowerCase().includes("ali ghias")) {
      return "سابق کنسلٹنٹ فزیشن، جنرل ہسپتال لاہور۔ میڈیکل اسپیشلسٹ";
    }
    return data.doctor.designationEnglish?.trim() || "";
  })();

  // Patient relation label
  const relationLabel = (() => {
    const t = (data.patient.relationType || "").toUpperCase();
    if (t.includes("FATHER") || t.includes("S/O")) return "S/O :";
    if (t.includes("MOTHER") || t.includes("D/O")) return "D/O :";
    if (t.includes("HUSBAND") || t.includes("W/O") || t.includes("SPOUSE"))
      return "W/O :";
    return "S/O D/O W/O :";
  })();

  const slipContent = (
    <div
      ref={componentRef}
      id="a4-prescription-slip"
      className="bg-white text-slate-950 w-full max-w-[210mm] min-h-[297mm] mx-auto p-[8mm_12mm_10mm_12mm] shadow-md print:shadow-none print:m-0 print:p-[6mm_10mm_8mm_10mm] font-sans flex flex-col justify-between box-border text-[13px] leading-normal"
      style={{
        boxSizing: "border-box",
      }}
    >
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 10mm;
          }
          body * {
            visibility: hidden !important;
          }
          #a4-prescription-slip,
          #a4-prescription-slip * {
            visibility: visible !important;
          }
          #a4-prescription-slip {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 290mm !important;
            margin: 0 !important;
            padding: 6mm 10mm !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Header Section */}
      <div className="w-full">
        {/* Top Hospital Name in Urdu Nastaliq */}
        <div className="text-center pt-1 pb-1">
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 font-nastaliq"
            style={{
              fontFamily:
                "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif",
              lineHeight: "1.6",
            }}
          >
            غیاث ہسپتال
          </h1>
        </div>

        {/* 3-Part Header Row: Left Doctor (English) | Center Logo | Right Doctor (Urdu) */}
        <div className="grid grid-cols-[38%_24%_38%] items-center pt-1 pb-3">
          {/* Left Column: Doctor English Credentials */}
          <div className="text-left space-y-1 pr-2">
            <h2 className="text-xl font-bold text-slate-950 tracking-tight leading-snug">
              {doctorNameEn}
            </h2>
            {qualEn && (
              <p className="text-[12px] font-semibold text-slate-800 leading-tight">
                {qualEn}
              </p>
            )}
            {desigEn && (
              <p className="text-[11.5px] font-normal text-slate-700 leading-tight">
                {desigEn}
              </p>
            )}
          </div>

          {/* Center Column: Hospital Emblem */}
          <div className="flex flex-col items-center justify-center">
            <GhiasHospitalLogo size={74} />
          </div>

          {/* Right Column: Doctor Urdu Credentials */}
          <div
            className="text-right space-y-0.5 pl-2 font-nastaliq"
            dir="rtl"
            style={{
              fontFamily:
                "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif",
            }}
          >
            <h2 className="text-2xl font-bold text-slate-950 tracking-tight leading-tight">
              {doctorNameUr}
            </h2>
            {specUr && (
              <p className="text-[12.5px] font-semibold text-slate-900 leading-snug">
                {specUr}
              </p>
            )}
            {qualUr && (
              <p className="text-[11.5px] font-medium text-slate-800 leading-snug">
                {qualUr}
              </p>
            )}
            {subSpecUr && (
              <p className="text-[10.5px] text-slate-700 leading-snug">
                {subSpecUr}
              </p>
            )}
          </div>
        </div>

        {/* Crisp Dividing Line below Header */}
        <div className="w-full border-b border-slate-700 mb-2"></div>

        {/* Patient Information Bar */}
        <div className="text-[12.5px] text-slate-900 space-y-2 py-1">
          {/* Line 1: MR # | Out Door | Token # | Contact No | Timestamp */}
          <div className="flex items-center justify-between font-medium">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-950">MR # :</span>
              <span className="font-bold font-mono text-[13px]">
                {data.patient.mrNumber || data.patient.patientNumber || "—"}
              </span>
            </div>

            <div className="px-3 py-0.5 border border-slate-400 rounded text-[11.5px] font-semibold uppercase tracking-wider text-slate-800">
              {data.departmentName ||
                (data.appointmentType === "EMERGENCY"
                  ? "Emergency"
                  : "Out Door")}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-950">Token # :</span>
              <span className="font-black font-mono text-base text-slate-950">
                {data.tokenNumber}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-950">Contact No :</span>
              <span className="font-mono text-slate-800">
                {data.patient.phone || "—"}
              </span>
            </div>

            <div className="text-right font-mono text-[11.5px] text-slate-700">
              {data.timestamp}
            </div>
          </div>

          {/* Line 2: Name | S/O D/O W/O | Age | Gender | Address */}
          <div className="flex items-center justify-between text-[12.5px] pt-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-950">Name :</span>
              <span className="font-semibold underline decoration-slate-400 underline-offset-2">
                {data.patient.fullName}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-950">{relationLabel}</span>
              <span className="underline decoration-slate-400 underline-offset-2">
                {data.patient.guardianName || "—"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-950">Age :</span>
              <span>
                {data.patient.age
                  ? /yrs|years/i.test(String(data.patient.age))
                    ? String(data.patient.age)
                    : `${data.patient.age} Yrs`
                  : "—"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-950">Gender :</span>
              <span className="capitalize">
                {data.patient.gender?.toLowerCase() || "—"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 max-w-[200px] truncate">
              <span className="font-bold text-slate-950">Address :</span>
              <span
                className="truncate underline decoration-slate-400 underline-offset-2"
                title={data.patient.address || ""}
              >
                {data.patient.address || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Crisp Dividing Line below Patient Info */}
        <div className="w-full border-b border-slate-700 mt-2 mb-0"></div>
      </div>

      {/* Body: Two Columns (Left: Clinical Notes | Right: Prescription Writing Area) */}
      <div className="w-full flex-1 grid grid-cols-[28%_72%] min-h-[580px] border-b border-slate-700">
        {/* Left Column: Clinical Notes & Vitals */}
        <div className="border-r border-slate-700 p-3 flex flex-col justify-between pr-4">
          <div className="space-y-4">
            {/* Title */}
            <h3 className="text-base font-bold text-slate-950 underline decoration-slate-950 underline-offset-4 tracking-wide pb-1">
              Clinical Notes
            </h3>

            {/* Vital Signs Fields with dotted/solid ruled lines */}
            <div className="space-y-3.5 pt-1 text-[13px]">
              {/* B.P. */}
              <div className="flex items-baseline gap-1">
                <span className="font-bold min-w-[50px] text-slate-900">
                  B.P. :
                </span>
                <span className="flex-1 border-b border-slate-500 font-mono font-semibold pl-1">
                  {data.vitals?.bloodPressure || "\u00A0"}
                </span>
              </div>

              {/* Pulse */}
              <div className="flex items-baseline gap-1">
                <span className="font-bold min-w-[50px] text-slate-900">
                  Pulse :
                </span>
                <span className="flex-1 border-b border-slate-500 font-mono font-semibold pl-1">
                  {data.vitals?.pulse ? `${data.vitals.pulse} bpm` : "\u00A0"}
                </span>
              </div>

              {/* Temp */}
              <div className="flex items-baseline gap-1">
                <span className="font-bold min-w-[50px] text-slate-900">
                  Temp :
                </span>
                <span className="flex-1 border-b border-slate-500 font-mono font-semibold pl-1">
                  {data.vitals?.temperature
                    ? `${data.vitals.temperature} °F`
                    : "\u00A0"}
                </span>
              </div>

              {/* Weight */}
              <div className="flex items-baseline gap-1">
                <span className="font-bold min-w-[50px] text-slate-900">
                  Weight :
                </span>
                <span className="flex-1 border-b border-slate-500 font-mono font-semibold pl-1">
                  {data.vitals?.weight
                    ? `${data.vitals.weight} kg`
                    : "\u00A0"}
                </span>
              </div>

              {/* Test */}
              <div className="flex items-baseline gap-1">
                <span className="font-bold min-w-[50px] text-slate-900">
                  Test :
                </span>
                <span className="flex-1 border-b border-slate-500 font-semibold pl-1 text-[11.5px]">
                  {data.vitals?.testsAdvised || "\u00A0"}
                </span>
              </div>
            </div>

            {/* Additional ruled lines for doctor notes */}
            <div className="pt-6 space-y-3.5">
              <div className="border-b border-slate-300 w-full h-4"></div>
              <div className="border-b border-slate-300 w-full h-4"></div>
              <div className="border-b border-slate-300 w-full h-4"></div>
              <div className="border-b border-slate-300 w-full h-4"></div>
            </div>
          </div>

          {/* Lower section of Left Column: Advise */}
          <div className="pt-10 pb-4">
            <h4 className="text-sm font-bold text-slate-950 underline decoration-slate-950 underline-offset-2">
              Advise
            </h4>
            <div className="mt-2 space-y-3">
              <div className="border-b border-slate-400 w-full h-4 text-xs italic text-slate-700">
                {data.vitals?.advice || ""}
              </div>
              <div className="border-b border-slate-300 w-full h-4"></div>
              <div className="border-b border-slate-300 w-full h-4"></div>
              <div className="border-b border-slate-300 w-full h-4"></div>
            </div>
          </div>
        </div>

        {/* Right Column: Rx Prescription Area */}
        <div className="p-4 pl-6 flex flex-col justify-between relative">
          {/* Top Right Rx Emblem */}
          <div className="flex items-start justify-end pb-2">
            <div className="w-9 h-9 rounded-full border-2 border-slate-700 flex items-center justify-center font-serif text-lg font-bold text-slate-800 select-none">
              R
            </div>
          </div>

          {/* If digital prescription medicines are entered, render them cleanly */}
          {data.medicines && data.medicines.length > 0 ? (
            <div className="space-y-4 pt-1 flex-1">
              <div className="space-y-3">
                {data.medicines.map((med, idx) => (
                  <div
                    key={med.id || idx}
                    className="pb-2 border-b border-dashed border-slate-300"
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="font-bold text-sm text-slate-950">
                        {idx + 1}. {med.medicineName}
                      </span>
                      {med.dosage && (
                        <span className="text-xs font-semibold text-slate-700">
                          {med.dosage}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-600 mt-0.5">
                      {med.frequency && <span>Freq: {med.frequency}</span>}
                      {med.duration && <span>Duration: {med.duration}</span>}
                      {med.route && <span>Route: {med.route}</span>}
                    </div>
                    {med.instructions && (
                      <p className="text-[11px] italic text-slate-500 mt-0.5">
                        Note: {med.instructions}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Ruled lines below medicines for additional doctor handwritten prescription */}
              <div className="pt-4 space-y-6 opacity-30">
                <div className="border-b border-slate-300 w-full"></div>
                <div className="border-b border-slate-300 w-full"></div>
                <div className="border-b border-slate-300 w-full"></div>
                <div className="border-b border-slate-300 w-full"></div>
                <div className="border-b border-slate-300 w-full"></div>
              </div>
            </div>
          ) : (
            /* Open clean pad area matching the physical slip with subtle guide lines */
            <div className="flex-1 space-y-7 pt-4 opacity-40">
              <div className="border-b border-slate-200 w-full"></div>
              <div className="border-b border-slate-200 w-full"></div>
              <div className="border-b border-slate-200 w-full"></div>
              <div className="border-b border-slate-200 w-full"></div>
              <div className="border-b border-slate-200 w-full"></div>
              <div className="border-b border-slate-200 w-full"></div>
              <div className="border-b border-slate-200 w-full"></div>
              <div className="border-b border-slate-200 w-full"></div>
              <div className="border-b border-slate-200 w-full"></div>
              <div className="border-b border-slate-200 w-full"></div>
              <div className="border-b border-slate-200 w-full"></div>
              <div className="border-b border-slate-200 w-full"></div>
            </div>
          )}

          {/* Doctor Signature Line at bottom right */}
          <div className="pt-6 flex justify-end">
            <div className="text-center min-w-[160px]">
              <div className="border-b border-slate-600 w-full mb-1"></div>
              <span className="text-[11px] font-semibold text-slate-700">
                Doctor's Signature &amp; Stamp
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Band (Grey Bar with Phone numbers on left & Urdu address on right) */}
      <div className="w-full mt-2">
        <div
          className="w-full px-5 py-3 rounded-sm flex items-center justify-between text-slate-900 border border-slate-300 min-h-[60px]"
          style={{
            backgroundColor: "#d1d5db", // crisp light charcoal/slate grey from photo
          }}
        >
          {/* Left: Phone numbers */}
          <div className="text-left font-mono font-bold text-sm tracking-wide leading-tight">
            <div>0546-566567</div>
            <div className="mt-0.5">0346-4949577</div>
          </div>

          {/* Right: Hospital Address in Urdu Nastaliq */}
          <div
            className="text-right text-sm sm:text-base font-bold font-nastaliq"
            dir="rtl"
            style={{
              fontFamily:
                "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif",
              lineHeight: "1.7",
            }}
          >
            غیاث ہسپتال، مین گجرات روڈ پھالیہ نزد ٹیلی فون ایکسچینج
          </div>
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-4 sm:p-6 space-y-4 my-6">
          {/* Modal Header */}
          <div className="flex items-center justify-between no-print pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  OPD / Prescription Print Slip (A4)
                </h3>
                <p className="text-xs text-slate-500">
                  Ready for high-quality standard A4 portrait printing
                </p>
              </div>
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

          {/* Slip Scrollable Container for Screen Preview */}
          <div className="overflow-y-auto max-h-[75vh] p-2 bg-slate-100 rounded-xl flex justify-center">
            {slipContent}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 no-print">
            <div className="text-xs text-slate-500">
              Paper size: <strong className="text-slate-800">A4 Portrait</strong>
            </div>

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
                <span>Print A4 Slip</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return slipContent;
}
