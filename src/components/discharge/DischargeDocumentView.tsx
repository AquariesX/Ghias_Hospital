"use client";

import React from "react";

export interface DischargeMedicationItem {
  srNo?: number;
  medicineName: string;
  dosage: string;
  route: string;
  frequency: string;
  timing?: string;
  duration: string;
  instructions?: string | null;
}

export interface DischargeDocumentData {
  hospitalName?: string;
  regNumber?: string;
  title?: string;
  generatedAt?: string;
  generatedBy?: string;
  patient: {
    id: string;
    patientNumber: string;
    mrNumber: string;
    fullName: string;
    firstName: string;
    lastName: string;
    gender: string;
    ageYears: number | string;
    dateOfBirth?: string;
    phone: string;
    cnic?: string | null;
    relationType?: string | null;
    relatedPersonName?: string | null;
    address?: string | null;
  };
  admission: {
    id: string;
    admissionNumber: string;
    admissionDate: string;
    admissionTime?: string | null;
    dischargeDate?: string | null;
    dischargeTime?: string | null;
    roomBedNo?: string | null;
    admissionSource: string;
    status: string;
    presentingComplaints?: string | null;
    generalExamination?: string | null;
    investigations?: string | null;
    provisionalDiagnosis?: string | null;
    finalDiagnosis?: string | null;
    operation?: string | null;
    outcome?: string | null;
    dischargeCondition?: string | null; // Satisfactory, Fair, Poor
    dischargeAdvisedByDoctor?: boolean;
    isLama?: boolean;
    dischargeSummary?: string | null;
    dischargeInstructions?: string | null;
    followUpInstructions?: string | null;
    followUpDate?: string | null;
  };
  medications: DischargeMedicationItem[];
  doctor?: {
    id?: string;
    doctorNumber?: string;
    fullName: string;
    specialization?: string;
    departmentName?: string | null;
    roomNumber?: string | null;
  } | null;
}

interface DischargeDocumentViewProps {
  data: DischargeDocumentData;
  showWatermark?: boolean;
}

const URDU_FONT_STYLE: React.CSSProperties = {
  fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', Tahoma, 'Segoe UI', Arial, sans-serif",
  lineHeight: "2.0",
};

export default function DischargeDocumentView({
  data,
  showWatermark = false,
}: DischargeDocumentViewProps) {
  const { patient, admission, doctor, medications } = data;

  const isLama = admission.isLama || false;
  const isAdvised = admission.dischargeAdvisedByDoctor !== false;
  const condition = admission.dischargeCondition || "Satisfactory";

  // Format Dates
  const dischargeDateFormatted = admission.dischargeDate
    ? new Date(admission.dischargeDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

  const admissionDateFormatted = admission.admissionDate
    ? new Date(admission.admissionDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

  const guardianStr = patient.relatedPersonName
    ? `${patient.relationType ? `${patient.relationType}: ` : "S/O, D/O, W/O: "}${patient.relatedPersonName}`
    : patient.relationType || "—";

  const doctorName = doctor ? doctor.fullName : "Dr. Attending Physician";

  return (
    <div className="w-full text-slate-900 bg-white font-sans text-xs">
      {/* Official A4 Sheet Container matching Paper Form Layout */}
      <div
        className="relative bg-white border-2 border-slate-900 p-4 sm:p-5 print:p-4 mx-auto max-w-[210mm] flex flex-col justify-between"
        style={{ boxSizing: "border-box", minHeight: "285mm" }}
      >
        {/* Optional Watermark if Draft */}
        {showWatermark && (
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
          >
            <div className="transform -rotate-45 border-4 border-dashed border-amber-300/40 rounded-3xl py-4 px-8 text-center">
              <p className="text-4xl sm:text-5xl font-black tracking-widest text-amber-300/40 uppercase">
                DRAFT / PREVIEW COPY
              </p>
            </div>
          </div>
        )}

        <div className="relative z-10 flex flex-col flex-1 justify-between space-y-2.5 print:space-y-2">
          {/* HEADER: matching GIAS HOSPITAL PHALIA REG NO. R-59488 */}
          <div>
            <div className="text-center pb-1 border-b border-slate-900">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                {data.hospitalName || "GIAS HOSPITAL PHALIA"}
              </h1>
              <div className="flex items-center justify-center gap-3 text-[11px] font-bold text-slate-800 uppercase mt-0.5">
                <span>{data.regNumber || "REG NO. R-59488"}</span>
                <span>•</span>
                <span className="underline decoration-1 underline-offset-2">
                  {data.title || "DISCHARGE FORM (Patient Copy)"}
                </span>
              </div>
            </div>

            {/* PATIENT INFORMATION TABLE: EXACT ARRANGEMENT FROM PAPER FORM */}
            <div className="border border-slate-900 mt-2 text-[11px]">
              <div className="grid grid-cols-12 border-b border-slate-900">
                <div className="col-span-6 border-r border-slate-900 px-2 py-1 flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">MR Number:</span>
                  <span className="font-mono font-black text-slate-950">{patient.mrNumber}</span>
                </div>
                <div className="col-span-6 px-2 py-1 flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">Date:</span>
                  <span className="font-bold text-slate-950 font-mono">{dischargeDateFormatted}</span>
                </div>
              </div>

              <div className="grid grid-cols-12 border-b border-slate-900">
                <div className="col-span-6 border-r border-slate-900 px-2 py-1 flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">Patient Name:</span>
                  <span className="font-bold text-slate-950 uppercase">{patient.fullName}</span>
                </div>
                <div className="col-span-6 px-2 py-1 flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">Date of Admission:</span>
                  <span className="font-bold text-slate-950 font-mono">
                    {admissionDateFormatted} {admission.admissionTime ? `(${admission.admissionTime})` : ""}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-12">
                <div className="col-span-6 border-r border-slate-900 px-2 py-1 flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">S/O, D/O, W/O:</span>
                  <span className="font-medium text-slate-950">{guardianStr}</span>
                </div>
                <div className="col-span-6 px-2 py-1 flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">Age / Sex:</span>
                  <span className="font-bold text-slate-950">
                    {patient.ageYears ? `${patient.ageYears} Y` : "—"} / {patient.gender}
                  </span>
                  {admission.roomBedNo && (
                    <span className="ml-auto text-[10px] text-slate-600 font-mono">
                      Bed: <strong className="text-slate-900">{admission.roomBedNo}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CLINICAL SUMMARY SECTION */}
          <div className="border border-slate-900 p-2 space-y-1.5 text-[11px]">
            <div>
              <span className="font-bold text-slate-950 uppercase tracking-wide">
                PRESENTING COMPLAINT:
              </span>
              <p className="text-slate-800 mt-0.5 whitespace-pre-wrap pl-2 border-l-2 border-slate-300">
                {admission.presentingComplaints || "—"}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-950 uppercase tracking-wide">
                BRIEF HISTORY &amp; EXAMINATION:
              </span>
              <p className="text-slate-800 mt-0.5 whitespace-pre-wrap pl-2 border-l-2 border-slate-300 min-h-[1.5rem]">
                {admission.generalExamination || "General physical and clinical examination performed."}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-950 uppercase tracking-wide">
                DIAGNOSTIC INVESTIGATIONS SIGNIFICANT RESULTS:
              </span>
              <p className="text-slate-800 mt-0.5 whitespace-pre-wrap pl-2 border-l-2 border-slate-300 min-h-[1.5rem]">
                {admission.investigations || "Routine hematology and biochemistry within acceptable inpatient limits."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200">
              <div>
                <span className="font-bold text-slate-950 uppercase tracking-wide">DIAGNOSIS:</span>
                <p className="text-slate-900 font-semibold mt-0.5 pl-2 border-l-2 border-slate-300">
                  {admission.finalDiagnosis || admission.provisionalDiagnosis || "—"}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-950 uppercase tracking-wide">PROCEDURE DONE:</span>
                <p className="text-slate-900 font-semibold mt-0.5 pl-2 border-l-2 border-slate-300">
                  {admission.operation || "Conservative medical management"}
                </p>
              </div>
            </div>

            <div className="pt-1 border-t border-slate-200">
              <span className="font-bold text-slate-950 uppercase tracking-wide">OUTCOME:</span>
              <p className="text-slate-900 mt-0.5 pl-2 border-l-2 border-slate-300">
                {admission.outcome || "Improved, stable, and discharged in satisfactory condition."}
              </p>
            </div>
          </div>

          {/* DISCHARGE NOTES SECTION WITH CHECKBOXES & CONDITION */}
          <div className="border border-slate-900 p-2 text-[11px] space-y-1.5">
            <div className="font-bold text-slate-950 uppercase tracking-wider border-b border-slate-300 pb-0.5">
              DISCHARGE NOTES
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border border-slate-900 flex items-center justify-center font-bold text-xs bg-white">
                  {isAdvised && !isLama ? "✓" : ""}
                </span>
                <span className="font-semibold text-slate-900">Discharge advised by Doctor</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border border-slate-900 flex items-center justify-center font-bold text-xs bg-white">
                  {isLama ? "✓" : ""}
                </span>
                <span className="font-semibold text-rose-950">LAMA (Leave Against Medical Advice)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">Date of Discharge:</span>
                <span className="font-mono font-bold text-slate-950">{dischargeDateFormatted}</span>
                {admission.dischargeTime && (
                  <span className="font-mono text-slate-600 text-[10px]">({admission.dischargeTime})</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-800">Condition on Discharge:</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-900 flex items-center justify-center text-[9px] font-bold">
                    {condition.toLowerCase() === "satisfactory" ? "●" : ""}
                  </span>
                  <span>Satisfactory</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-900 flex items-center justify-center text-[9px] font-bold">
                    {condition.toLowerCase() === "fair" ? "●" : ""}
                  </span>
                  <span>Fair</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-900 flex items-center justify-center text-[9px] font-bold">
                    {condition.toLowerCase() === "poor" ? "●" : ""}
                  </span>
                  <span>Poor</span>
                </div>
              </div>
            </div>
          </div>

          {/* MEDICATION GIVEN ON DISCHARGE TABLE */}
          <div className="border border-slate-900 p-2 text-[11px] space-y-1">
            <div className="font-bold text-slate-950 uppercase tracking-wider">
              MEDICATION GIVEN ON DISCHARGE
            </div>

            <table className="w-full border-collapse border border-slate-900 text-left text-[10px] sm:text-[11px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-900 font-bold text-slate-900">
                  <th className="border-r border-slate-900 px-1.5 py-1 text-center w-8">Sr.</th>
                  <th className="border-r border-slate-900 px-2 py-1">Medicine</th>
                  <th className="border-r border-slate-900 px-2 py-1">Strength / Dose</th>
                  <th className="border-r border-slate-900 px-2 py-1">Route</th>
                  <th className="border-r border-slate-900 px-2 py-1">Frequency</th>
                  <th className="border-r border-slate-900 px-2 py-1">Timing</th>
                  <th className="px-2 py-1">Duration</th>
                </tr>
              </thead>
              <tbody>
                {medications.length > 0 ? (
                  medications.map((med, index) => (
                    <tr key={index} className="border-b border-slate-900 last:border-b-0">
                      <td className="border-r border-slate-900 px-1.5 py-1 text-center font-mono">
                        {med.srNo || index + 1}
                      </td>
                      <td className="border-r border-slate-900 px-2 py-1 font-bold text-slate-950">
                        {med.medicineName}
                      </td>
                      <td className="border-r border-slate-900 px-2 py-1 font-medium">{med.dosage || "—"}</td>
                      <td className="border-r border-slate-900 px-2 py-1">{med.route || "Oral"}</td>
                      <td className="border-r border-slate-900 px-2 py-1">{med.frequency || "—"}</td>
                      <td className="border-r border-slate-900 px-2 py-1">{med.timing || "After meals"}</td>
                      <td className="px-2 py-1 font-mono font-medium">{med.duration || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-2 py-2 text-center text-slate-500 italic">
                      No discharge medications prescribed. Follow general recovery instructions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* DISCHARGE INSTRUCTIONS / ADVICE SECTION WITH URDU SUPPORT */}
          <div className="border border-slate-900 p-2 text-[11px] space-y-1.5">
            <div className="font-bold text-slate-950 uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-0.5">
              <span>DISCHARGE INSTRUCTIONS / ADVICE</span>
              <span className="text-[10px] font-medium text-slate-500">ہدایات برائے ڈسچارج</span>
            </div>

            <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
              {admission.dischargeInstructions ||
                "1. Take all prescribed medicines at the exact stated times.\n2. Keep wounds clean and dry.\n3. Avoid strenuous physical activity.\n4. Contact hospital immediately in case of emergency fever, severe pain, or vomiting."}
            </p>

            {/* Urdu Advice Box */}
            <div
              dir="rtl"
              className="bg-slate-50 p-2 border border-slate-300 rounded text-slate-900 text-[11px] sm:text-[12px] leading-relaxed"
              style={URDU_FONT_STYLE}
            >
              <p>
                <strong>اہم ہدایات:</strong> تجویز کردہ ادویات باقاعدگی سے استعمال کریں۔ کسی بھی ایمرجنسی، تیز بخار، شدید درد، یا خون بہنے کی صورت میں فوری طور پر غیاث ہسپتال کے ایمرجنسی وارڈ سے رجوع کریں۔
              </p>
            </div>

            {/* Follow-up info */}
            {(admission.followUpDate || admission.followUpInstructions) && (
              <div className="pt-1 border-t border-slate-200 flex flex-wrap items-center gap-3 text-[11px]">
                <span className="font-bold text-slate-900">FOLLOW-UP APPOINTMENT:</span>
                {admission.followUpDate && (
                  <span>
                    Date: <strong className="font-mono">{new Date(admission.followUpDate).toLocaleDateString("en-GB")}</strong>
                  </span>
                )}
                {admission.followUpInstructions && (
                  <span className="text-slate-700 italic">({admission.followUpInstructions})</span>
                )}
              </div>
            )}
          </div>

          {/* DOCTOR SIGNATURE SECTION (PHYSICAL SIGNATURE LINE, NO FAKE SIG) */}
          <div className="border border-slate-900 grid grid-cols-12 text-[11px] p-2 bg-white">
            <div className="col-span-5 border-r border-slate-900 pr-2 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700">Doctor Name:</span>
                <span className="font-bold text-slate-950">{doctorName}</span>
              </div>
              {doctor?.specialization && (
                <div className="text-[10px] text-slate-500">
                  {doctor.specialization} {doctor.departmentName ? `• ${doctor.departmentName}` : ""}
                </div>
              )}
            </div>

            <div className="col-span-4 border-r border-slate-900 px-2 flex flex-col justify-end">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Sign:</span>
                <div className="border-b border-slate-900 flex-1 h-4"></div>
              </div>
            </div>

            <div className="col-span-3 pl-2 flex flex-col justify-center space-y-0.5">
              <div className="flex items-center gap-1">
                <span className="font-bold text-slate-700">Date:</span>
                <span className="font-mono text-slate-900">{dischargeDateFormatted}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-slate-700">Time:</span>
                <span className="font-mono text-slate-900">
                  {admission.dischargeTime || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="border-t-2 border-slate-900 pt-1 text-center">
            <p
              dir="rtl"
              className="text-[11px] sm:text-xs font-black text-slate-950 tracking-tight"
              style={URDU_FONT_STYLE}
            >
              گجرات روڈ نزد لیلی ڈین ایکسپو سنٹر پھالیہ / Ph: 0546-588567 / Mob: 0346-4049577
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
