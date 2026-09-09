"use client";

import React from "react";

export interface ReferralMedicineItem {
  srNo?: number;
  medicine: string;
  dose: string;
  route: string;
  frequency: string;
  timing?: string;
  duration: string;
}

export interface ReferralDocumentData {
  hospitalName?: string;
  regNumber?: string;
  title?: string;
  generatedAt?: string;
  generatedBy?: string;
  referralNumber: string;
  referralDate: string;
  referralTime?: string | null;
  hospitalReferredTo: string;
  reasonOfReferral: string;
  presentingComplaints?: string | null;
  provisionalDiagnosis?: string | null;
  historyAndExamination?: string | null;
  investigations?: string | null;
  finalDiagnosis?: string | null;
  procedureDone?: string | null;
  conditionAtReferral?: string | null;
  referralNotes?: string | null;
  treatmentGiven: ReferralMedicineItem[];
  patient: {
    id: string;
    patientNumber: string;
    mrNumber: string;
    fullName: string;
    gender: string;
    ageYears: number | string;
    phone: string;
    cnic?: string | null;
    relationType?: string | null;
    relatedPersonName?: string | null;
    address?: string | null;
  };
  admission?: {
    id: string;
    admissionNumber: string;
    admissionDate: string;
    admissionTime?: string | null;
    roomBedNo?: string | null;
  } | null;
  doctor?: {
    id?: string;
    fullName: string;
    specialization?: string;
    departmentName?: string | null;
  } | null;
}

interface ReferralDocumentViewProps {
  data: ReferralDocumentData;
  showWatermark?: boolean;
}

export default function ReferralDocumentView({
  data,
  showWatermark = false,
}: ReferralDocumentViewProps) {
  const { patient, admission, doctor, treatmentGiven } = data;

  const referralDateFormatted = data.referralDate
    ? new Date(data.referralDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

  const admissionDateFormatted = admission?.admissionDate
    ? new Date(admission.admissionDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "OPD Walk-in / Not Admitted";

  const guardianStr = patient.relatedPersonName
    ? `${patient.relationType ? `${patient.relationType}: ` : "S/O, D/O, W/O: "}${patient.relatedPersonName}`
    : patient.relationType || "—";

  const doctorName = doctor ? doctor.fullName : data.doctor?.fullName || "Attending Medical Officer";

  const condition = data.conditionAtReferral || "Satisfactory";

  return (
    <div className="w-full text-slate-900 bg-white font-sans text-xs">
      {/* Official A4 Sheet Container */}
      <div
        className="relative bg-white border-2 border-slate-900 p-4 sm:p-5 print:p-4 mx-auto max-w-[210mm] flex flex-col justify-between"
        style={{ boxSizing: "border-box", minHeight: "285mm" }}
      >
        {/* Optional Watermark */}
        {showWatermark && (
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
          >
            <div className="transform -rotate-45 border-4 border-dashed border-amber-300/40 rounded-3xl py-4 px-8 text-center">
              <p className="text-4xl sm:text-5xl font-black tracking-widest text-amber-300/40 uppercase">
                DRAFT / PREVIEW
              </p>
            </div>
          </div>
        )}

        <div className="relative z-10 flex flex-col flex-1 justify-between space-y-2.5 print:space-y-2">
          {/* HEADER */}
          <div>
            <div className="text-center pb-1 border-b border-slate-900">
              <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono">
                <span>Ref #: <strong>{data.referralNumber}</strong></span>
                <span>GIAS Health System</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                {data.hospitalName || "GIAS HOSPITAL PHALIA"}
              </h1>
              <div className="flex items-center justify-center gap-3 text-[11px] font-bold text-slate-800 uppercase mt-0.5">
                <span>{data.regNumber || "REG NO. R-59488"}</span>
                <span>•</span>
                <span className="underline decoration-1 underline-offset-2">
                  {data.title || "REFERRAL FORM (File Record Copy)"}
                </span>
              </div>
            </div>

            {/* PATIENT INFORMATION TABLE */}
            <div className="border border-slate-900 mt-2 text-[11px]">
              <div className="grid grid-cols-12 border-b border-slate-900">
                <div className="col-span-6 border-r border-slate-900 px-2 py-1 flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">MR Number:</span>
                  <span className="font-mono font-black text-slate-950">{patient.mrNumber}</span>
                </div>
                <div className="col-span-6 px-2 py-1 flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">Date:</span>
                  <span className="font-bold text-slate-950 font-mono">
                    {referralDateFormatted} {data.referralTime ? `(${data.referralTime})` : ""}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-12 border-b border-slate-900">
                <div className="col-span-6 border-r border-slate-900 px-2 py-1 flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">Patient Name:</span>
                  <span className="font-bold text-slate-950 uppercase">{patient.fullName}</span>
                </div>
                <div className="col-span-6 px-2 py-1 flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">Date of Admission:</span>
                  <span className="font-medium text-slate-950 font-mono">
                    {admissionDateFormatted} {admission?.admissionTime ? `(${admission.admissionTime})` : ""}
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
                  {admission?.roomBedNo && (
                    <span className="ml-auto text-[10px] text-slate-600 font-mono">
                      Bed: <strong className="text-slate-900">{admission.roomBedNo}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CLINICAL SUMMARY SECTIONS */}
          <div className="space-y-2 text-[11px]">
            {/* Presenting Complaint & Provisional Diagnosis */}
            <div className="grid grid-cols-12 border border-slate-900">
              <div className="col-span-6 border-r border-slate-900 p-2 min-h-[46px]">
                <span className="font-bold text-slate-900 block uppercase text-[10px] tracking-wider mb-0.5">
                  Presenting Complaint:
                </span>
                <p className="text-slate-800 whitespace-pre-wrap leading-tight">
                  {data.presentingComplaints || "—"}
                </p>
              </div>
              <div className="col-span-6 p-2 min-h-[46px]">
                <span className="font-bold text-slate-900 block uppercase text-[10px] tracking-wider mb-0.5">
                  Provisional Diagnosis:
                </span>
                <p className="text-slate-800 whitespace-pre-wrap leading-tight">
                  {data.provisionalDiagnosis || "—"}
                </p>
              </div>
            </div>

            {/* Brief History & Examination */}
            <div className="border border-slate-900 p-2 min-h-[50px]">
              <span className="font-bold text-slate-900 block uppercase text-[10px] tracking-wider mb-0.5">
                Brief History & Examination:
              </span>
              <p className="text-slate-800 whitespace-pre-wrap leading-tight">
                {data.historyAndExamination || "Clinical history recorded at referral."}
              </p>
            </div>

            {/* Investigations Significant Results */}
            <div className="border border-slate-900 p-2 min-h-[42px]">
              <span className="font-bold text-slate-900 block uppercase text-[10px] tracking-wider mb-0.5">
                Investigations Significant Results:
              </span>
              <p className="text-slate-800 whitespace-pre-wrap leading-tight">
                {data.investigations || "Relevant diagnostic tests and lab investigations as per clinical file."}
              </p>
            </div>

            {/* Diagnosis & Procedure Done */}
            <div className="grid grid-cols-12 border border-slate-900">
              <div className="col-span-7 border-r border-slate-900 p-2 min-h-[42px]">
                <span className="font-bold text-slate-900 block uppercase text-[10px] tracking-wider mb-0.5">
                  Diagnosis:
                </span>
                <p className="text-slate-800 font-medium whitespace-pre-wrap leading-tight">
                  {data.finalDiagnosis || data.provisionalDiagnosis || "Clinical Assessment"}
                </p>
              </div>
              <div className="col-span-5 p-2 min-h-[42px]">
                <span className="font-bold text-slate-900 block uppercase text-[10px] tracking-wider mb-0.5">
                  Procedure Done:
                </span>
                <p className="text-slate-800 whitespace-pre-wrap leading-tight">
                  {data.procedureDone || "None / Conservative Management"}
                </p>
              </div>
            </div>

            {/* Condition at Time of Referral */}
            <div className="border border-slate-900 px-3 py-1.5 flex flex-wrap items-center justify-between bg-slate-50/50">
              <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                Condition at the Time of Referral:
              </span>
              <div className="flex items-center gap-6 text-[11px] font-bold">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`inline-block w-3.5 h-3.5 border border-slate-900 text-center text-[10px] leading-3 font-bold ${
                      condition === "Satisfactory" ? "bg-slate-900 text-white" : "bg-white"
                    }`}
                  >
                    {condition === "Satisfactory" ? "✓" : ""}
                  </span>
                  <span>Satisfactory</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={`inline-block w-3.5 h-3.5 border border-slate-900 text-center text-[10px] leading-3 font-bold ${
                      condition === "Fair" ? "bg-slate-900 text-white" : "bg-white"
                    }`}
                  >
                    {condition === "Fair" ? "✓" : ""}
                  </span>
                  <span>Fair</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={`inline-block w-3.5 h-3.5 border border-slate-900 text-center text-[10px] leading-3 font-bold ${
                      condition === "Poor" ? "bg-slate-900 text-white" : "bg-white"
                    }`}
                  >
                    {condition === "Poor" ? "✓" : ""}
                  </span>
                  <span>Poor</span>
                </span>
              </div>
            </div>

            {/* Referral Notes (if provided) */}
            {data.referralNotes && (
              <div className="border border-slate-900 p-2 min-h-[38px]">
                <span className="font-bold text-slate-900 block uppercase text-[10px] tracking-wider mb-0.5">
                  Referral Notes:
                </span>
                <p className="text-slate-800 whitespace-pre-wrap leading-tight">
                  {data.referralNotes}
                </p>
              </div>
            )}

            {/* TREATMENT GIVEN TABLE */}
            <div>
              <div className="font-bold text-slate-950 uppercase text-[10px] tracking-wider mb-1 flex items-center justify-between">
                <span>Treatment Given:</span>
                <span className="text-[9px] text-slate-500 font-normal">
                  Medicines administered/prescribed during hospital encounter
                </span>
              </div>
              <div className="border border-slate-900 overflow-hidden">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-900 text-slate-900 font-bold">
                      <th className="py-1 px-1.5 border-r border-slate-900 w-10 text-center">Sr. No.</th>
                      <th className="py-1 px-2 border-r border-slate-900">Medicine</th>
                      <th className="py-1 px-2 border-r border-slate-900 w-24">Strength / Dose</th>
                      <th className="py-1 px-2 border-r border-slate-900 w-16">Route</th>
                      <th className="py-1 px-2 border-r border-slate-900 w-24">Frequency</th>
                      <th className="py-1 px-2 border-r border-slate-900 w-20">Timing</th>
                      <th className="py-1 px-2 w-16 text-center">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {treatmentGiven && treatmentGiven.length > 0 ? (
                      treatmentGiven.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-300 last:border-b-0">
                          <td className="py-1 px-1.5 border-r border-slate-300 text-center font-bold">
                            {item.srNo || idx + 1}
                          </td>
                          <td className="py-1 px-2 border-r border-slate-300 font-bold text-slate-950">
                            {item.medicine}
                          </td>
                          <td className="py-1 px-2 border-r border-slate-300">{item.dose || "—"}</td>
                          <td className="py-1 px-2 border-r border-slate-300">{item.route || "Oral"}</td>
                          <td className="py-1 px-2 border-r border-slate-300">{item.frequency || "—"}</td>
                          <td className="py-1 px-2 border-r border-slate-300">{item.timing || "—"}</td>
                          <td className="py-1 px-2 text-center">{item.duration || "—"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-3 text-center text-slate-400 italic">
                          Supportive care and emergency stabilization provided.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* HOSPITAL REFERRED TO & REASON OF REFERRAL */}
            <div className="border-2 border-slate-900 p-2.5 bg-slate-50/40 space-y-1.5">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-12 sm:col-span-7 flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider shrink-0">
                    Name of Hospital to be Referred:
                  </span>
                  <span className="font-black text-slate-950 uppercase underline decoration-1 text-xs">
                    {data.hospitalReferredTo}
                  </span>
                </div>
                <div className="col-span-12 sm:col-span-5 flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider shrink-0">
                    Reason of Referral:
                  </span>
                  <span className="font-medium text-slate-900 text-xs">
                    {data.reasonOfReferral}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SIGNATURE & STAMP FOOTER */}
          <div className="pt-2 border-t-2 border-slate-900 mt-auto">
            <div className="grid grid-cols-12 gap-4 items-end text-[10px]">
              {/* Doctor Details */}
              <div className="col-span-4 space-y-1">
                <div>
                  <span className="font-bold text-slate-600 uppercase block text-[9px]">Doctor Name:</span>
                  <span className="font-black text-slate-950 text-xs block">{doctorName}</span>
                  {doctor?.specialization && (
                    <span className="text-[10px] text-slate-600 block">{doctor.specialization}</span>
                  )}
                </div>
                <div className="pt-1 text-[10px] text-slate-600">
                  <span>Date: <strong>{referralDateFormatted}</strong></span>
                  <span className="ml-3">Time: <strong>{data.referralTime || "—"}</strong></span>
                </div>
              </div>

              {/* Physical Signature Line */}
              <div className="col-span-5 text-center">
                <div className="border-b border-slate-900 w-44 mx-auto mb-1 h-8" />
                <span className="font-bold uppercase text-[9px] tracking-wider text-slate-800 block">
                  Doctor Signature & Medical Stamp
                </span>
                <span className="text-[8px] text-slate-400 block">
                  (Official hospital verification signature)
                </span>
              </div>

              {/* Hospital Stamp Box */}
              <div className="col-span-3 text-right">
                <div className="border border-dashed border-slate-400 w-28 h-14 ml-auto flex items-center justify-center text-[8px] text-slate-400 uppercase tracking-wider text-center p-1">
                  Hospital Stamp
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[8px] text-slate-400 pt-2 border-t border-slate-200 mt-2 font-mono">
              <span>GIAS HOSPITAL MANAGEMENT SYSTEM • REFERRAL FORM #{data.referralNumber}</span>
              <span>RECORD COPY • GENERATED: {new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
