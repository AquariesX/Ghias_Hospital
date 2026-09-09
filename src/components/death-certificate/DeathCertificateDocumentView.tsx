"use client";

import React from "react";

export interface DeathCertificateData {
  hospitalName?: string;
  regNumber?: string;
  title?: string;
  certificateNumber: string;
  dateOfDeath: string;
  timeOfDeath: string;
  causeOfDeath: string;
  diagnosis?: string | null;
  bodyReceivedBy: string;
  receivedByRelation?: string | null;
  receivedByCnic?: string | null;
  receivedByPhone?: string | null;
  notes?: string | null;
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

interface DeathCertificateDocumentViewProps {
  data: DeathCertificateData;
  showWatermark?: boolean;
}

export default function DeathCertificateDocumentView({
  data,
  showWatermark = false,
}: DeathCertificateDocumentViewProps) {
  const { patient, admission, doctor } = data;

  const deathDateFormatted = data.dateOfDeath
    ? new Date(data.dateOfDeath).toLocaleDateString("en-GB", {
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
    : "Not Admitted / Outpatient";

  const guardianStr = patient.relatedPersonName
    ? `${patient.relationType ? `${patient.relationType}: ` : "S/O, D/O, W/O: "}${patient.relatedPersonName}`
    : patient.relationType || "—";

  const doctorName = doctor ? doctor.fullName : data.doctor?.fullName || "Attending Medical Officer";

  return (
    <div className="w-full text-slate-900 bg-white font-sans text-xs">
      {/* Official A4 Sheet Container */}
      <div
        className="relative bg-white border-4 border-slate-900 p-6 sm:p-8 print:p-6 mx-auto max-w-[210mm] flex flex-col justify-between"
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

        <div className="relative z-10 flex flex-col flex-1 justify-between space-y-4">
          {/* HEADER */}
          <div>
            <div className="text-center pb-3 border-b-2 border-slate-900">
              <div className="flex items-center justify-between text-[11px] text-slate-600 font-mono mb-1">
                <span>Certificate #: <strong>{data.certificateNumber}</strong></span>
                <span>GIAS Health System</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 uppercase">
                {data.hospitalName || "GIAS HOSPITAL PHALIA"}
              </h1>
              <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-800 uppercase mt-1">
                <span>{data.regNumber || "REG NO. R-59488"}</span>
                <span>•</span>
                <span className="underline decoration-2 underline-offset-4 text-sm tracking-wider">
                  {data.title || "DEATH CERTIFICATE"}
                </span>
              </div>
            </div>

            {/* DECEASED PATIENT DEMOGRAPHICS TABLE */}
            <div className="border-2 border-slate-900 mt-4 text-xs">
              <div className="grid grid-cols-12 border-b border-slate-900 bg-slate-50/60">
                <div className="col-span-6 border-r border-slate-900 p-2 flex items-center gap-2">
                  <span className="font-bold text-slate-700">MR Number:</span>
                  <span className="font-mono font-black text-slate-950 text-sm">{patient.mrNumber}</span>
                </div>
                <div className="col-span-6 p-2 flex items-center gap-2">
                  <span className="font-bold text-slate-700">Certificate Date:</span>
                  <span className="font-bold text-slate-950 font-mono">{deathDateFormatted}</span>
                </div>
              </div>

              <div className="grid grid-cols-12 border-b border-slate-900">
                <div className="col-span-6 border-r border-slate-900 p-2 flex items-center gap-2">
                  <span className="font-bold text-slate-700">Patient Name:</span>
                  <span className="font-black text-slate-950 uppercase text-sm">{patient.fullName}</span>
                </div>
                <div className="col-span-6 p-2 flex items-center gap-2">
                  <span className="font-bold text-slate-700">Admission Details:</span>
                  <span className="font-medium text-slate-950 font-mono">
                    {admission ? `Adm #${admission.admissionNumber} (${admissionDateFormatted})` : admissionDateFormatted}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-12 border-b border-slate-900">
                <div className="col-span-6 border-r border-slate-900 p-2 flex items-center gap-2">
                  <span className="font-bold text-slate-700">Father / Husband Name:</span>
                  <span className="font-medium text-slate-950">{guardianStr}</span>
                </div>
                <div className="col-span-6 p-2 flex items-center gap-2">
                  <span className="font-bold text-slate-700">Age / Sex:</span>
                  <span className="font-bold text-slate-950">
                    {patient.ageYears ? `${patient.ageYears} Years` : "—"} / {patient.gender}
                  </span>
                  {patient.cnic && (
                    <span className="ml-auto text-[11px] text-slate-600 font-mono">
                      CNIC: <strong>{patient.cnic}</strong>
                    </span>
                  )}
                </div>
              </div>

              {patient.address && (
                <div className="grid grid-cols-12 p-2">
                  <div className="col-span-12 flex items-center gap-2">
                    <span className="font-bold text-slate-700">Permanent Residential Address:</span>
                    <span className="text-slate-900">{patient.address}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MEDICAL CERTIFICATION OF DEATH */}
          <div className="border-2 border-slate-900 p-4 space-y-3 bg-slate-50/30">
            <div className="border-b border-slate-300 pb-2">
              <span className="text-xs font-black text-slate-950 uppercase tracking-wider block">
                Medical Particulars of Death
              </span>
              <span className="text-[10px] text-slate-500">
                Certified by the attending physician based on clinical findings and hospital encounter
              </span>
            </div>

            <div className="grid grid-cols-12 gap-3 text-xs">
              <div className="col-span-6 bg-white p-3 rounded-lg border border-slate-300">
                <span className="font-bold text-slate-600 uppercase text-[10px] block mb-1">
                  Date of Death:
                </span>
                <span className="text-base font-black text-slate-950 font-mono">
                  {deathDateFormatted}
                </span>
              </div>

              <div className="col-span-6 bg-white p-3 rounded-lg border border-slate-300">
                <span className="font-bold text-slate-600 uppercase text-[10px] block mb-1">
                  Time of Death:
                </span>
                <span className="text-base font-black text-slate-950 font-mono">
                  {data.timeOfDeath}
                </span>
              </div>

              <div className="col-span-12 bg-white p-3 rounded-lg border border-slate-300 space-y-1">
                <span className="font-bold text-slate-700 uppercase text-[10px] block">
                  Cause of Death (Immediate / Underlying):
                </span>
                <p className="text-sm font-bold text-slate-950 leading-relaxed whitespace-pre-wrap">
                  {data.causeOfDeath}
                </p>
              </div>

              {data.diagnosis && (
                <div className="col-span-12 bg-white p-3 rounded-lg border border-slate-300 space-y-1">
                  <span className="font-bold text-slate-700 uppercase text-[10px] block">
                    Clinical Diagnosis / Morbid Conditions:
                  </span>
                  <p className="text-xs text-slate-900 leading-relaxed whitespace-pre-wrap">
                    {data.diagnosis}
                  </p>
                </div>
              )}

              {data.notes && (
                <div className="col-span-12 bg-white p-3 rounded-lg border border-slate-300 space-y-1">
                  <span className="font-bold text-slate-700 uppercase text-[10px] block">
                    Remarks / Additional Notes:
                  </span>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap">{data.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* DEAD BODY HANDOVER VERIFICATION */}
          <div className="border-2 border-slate-900 p-4 space-y-3 bg-white">
            <div className="border-b border-slate-300 pb-1.5 flex items-center justify-between">
              <span className="text-xs font-black text-slate-950 uppercase tracking-wider block">
                Dead Body Handover & Custody Verification
              </span>
              <span className="text-[10px] text-slate-500 italic">
                Official acknowledgment of custody receipt
              </span>
            </div>

            <div className="grid grid-cols-12 gap-3 text-xs">
              <div className="col-span-6 border-b border-slate-300 pb-1.5">
                <span className="font-bold text-slate-600 block text-[10px] uppercase">
                  Dead Body Received By:
                </span>
                <span className="text-sm font-bold text-slate-950 uppercase block mt-0.5">
                  {data.bodyReceivedBy}
                </span>
              </div>

              <div className="col-span-6 border-b border-slate-300 pb-1.5">
                <span className="font-bold text-slate-600 block text-[10px] uppercase">
                  Relationship to Deceased:
                </span>
                <span className="text-sm font-semibold text-slate-950 block mt-0.5">
                  {data.receivedByRelation || "Next of kin"}
                </span>
              </div>

              <div className="col-span-6 border-b border-slate-300 pb-1.5">
                <span className="font-bold text-slate-600 block text-[10px] uppercase">
                  CNIC of Recipient:
                </span>
                <span className="text-xs font-mono font-bold text-slate-950 block mt-0.5">
                  {data.receivedByCnic || "—"}
                </span>
              </div>

              <div className="col-span-6 border-b border-slate-300 pb-1.5">
                <span className="font-bold text-slate-600 block text-[10px] uppercase">
                  Contact Phone:
                </span>
                <span className="text-xs font-mono font-semibold text-slate-950 block mt-0.5">
                  {data.receivedByPhone || "—"}
                </span>
              </div>

              <div className="col-span-12 pt-3 flex items-end justify-between">
                <div className="space-y-1">
                  <div className="border-b border-slate-900 w-56 h-8" />
                  <span className="text-[10px] font-bold text-slate-800 uppercase block">
                    Signature / Thumb Impression of Recipient
                  </span>
                  <span className="text-[9px] text-slate-500 block">
                    I confirm receipt of the deceased remains in hospital custody.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ATTENDING PHYSICIAN VERIFICATION & STAMP */}
          <div className="pt-3 border-t-2 border-slate-900 mt-auto">
            <div className="grid grid-cols-12 gap-4 items-end text-xs">
              {/* Doctor Details */}
              <div className="col-span-5 space-y-1">
                <span className="font-bold text-slate-600 uppercase block text-[10px]">
                  Attending Medical Officer:
                </span>
                <span className="font-black text-slate-950 text-sm block">{doctorName}</span>
                {doctor?.specialization && (
                  <span className="text-xs text-slate-600 block">{doctor.specialization}</span>
                )}
                <div className="pt-1 text-[11px] text-slate-600">
                  <span>Issued Date: <strong>{deathDateFormatted}</strong></span>
                </div>
              </div>

              {/* Physical Doctor Signature Line */}
              <div className="col-span-4 text-center">
                <div className="border-b border-slate-900 w-48 mx-auto mb-1.5 h-10" />
                <span className="font-bold uppercase text-[10px] tracking-wider text-slate-900 block">
                  Medical Officer Signature
                </span>
                <span className="text-[9px] text-slate-500 block">
                  (Official medical verification)
                </span>
              </div>

              {/* Hospital Stamp Box */}
              <div className="col-span-3 text-right">
                <div className="border-2 border-dashed border-slate-400 w-32 h-20 ml-auto flex items-center justify-center text-[9px] text-slate-400 uppercase tracking-wider text-center p-2 font-bold">
                  Hospital Official Stamp
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] text-slate-400 pt-3 border-t border-slate-200 mt-3 font-mono">
              <span>GIAS HOSPITAL MANAGEMENT SYSTEM • CERTIFICATE #{data.certificateNumber}</span>
              <span>LEGAL RECORD COPY • GENERATED: {new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
