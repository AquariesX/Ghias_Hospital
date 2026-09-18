"use client";

import React from "react";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AssessmentSheetPrintClientProps {
  admission: {
    id: string;
    admissionNumber: string;
    admissionDate: string;
    admissionTime?: string | null;
    roomBedNo?: string | null;
    admissionSource: string;
    doctorName?: string | null;
    presentingComplaints?: string | null;
    medicationHistory?: string | null;
    familyHistory?: string | null;
    allergies: string[];
    generalExamination?: string | null;
    pulse?: number | null;
    temperature?: number | null;
    systolicBP?: number | null;
    diastolicBP?: number | null;
    respiratoryRate?: number | null;
    weight?: number | null;
    height?: number | null;
    bmi?: number | null;
    provisionalDiagnosis?: string | null;
    investigations?: string | null;
    finalDiagnosis?: string | null;
    nutritionalStatus?: string | null;
    advisedDiet?: string | null;
    treatmentPlan?: string | null;
    patient: {
      firstName: string;
      lastName: string;
      mrNumber?: string | null;
      patientNumber: string;
      gender: string;
      dateOfBirth: string;
      phone: string;
      address?: string | null;
      relationType?: string | null;
      relatedPersonName?: string | null;
    };
    doctor?: {
      firstName: string;
      lastName: string;
      specialization: string;
      doctorNumber: string;
      department?: { name: string } | null;
    } | null;
  };
}

function calculateAge(dobString?: string): string {
  if (!dobString) return "";
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return "";
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    years--;
  }
  return years >= 0 ? `${years} Y` : "";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

export default function AssessmentSheetPrintClient({
  admission,
}: AssessmentSheetPrintClientProps) {
  const handlePrint = () => {
    window.print();
  };

  const patient = admission.patient;
  const patientFullName = `${patient.firstName} ${patient.lastName}`.trim();
  const mrNumber = patient.mrNumber || patient.patientNumber;
  const doctorName =
    admission.doctorName ||
    (admission.doctor ? `Dr. ${admission.doctor.firstName} ${admission.doctor.lastName}` : "Attending Physician");
  const age = calculateAge(patient.dateOfBirth);

  const bpString =
    admission.systolicBP && admission.diastolicBP
      ? `${admission.systolicBP} / ${admission.diastolicBP} mmHg`
      : admission.systolicBP
      ? `${admission.systolicBP} mmHg`
      : "";

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 font-sans text-slate-900 print:bg-white print:p-0">
      {/* Top Action Bar (Hidden in Print) */}
      <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <Link
          href="/patients?tab=admitted"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Admitted Patients</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/admissions"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition"
          >
            Admit Another Patient
          </Link>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 px-4 py-2 rounded-xl shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Clinical Chart</span>
          </button>
        </div>
      </div>

      {/* Official Clinical Assessment Chart Container (A4 Printable) */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-400 print:border-0 rounded-xl print:rounded-none shadow-sm print:shadow-none p-6 sm:p-8 text-black text-xs leading-relaxed print:p-0">
        <div className="border border-black p-4 space-y-3 font-serif">
          {/* Header */}
          <div className="relative border-b-2 border-black pb-2 text-center">
            <span className="absolute left-0 top-0 text-sm font-bold font-sans">02</span>
            
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider font-sans">
              GHIAS HOSPITAL PHALIA
            </h1>
            <p className="text-xs font-bold uppercase tracking-widest font-sans">
              REG NO. R-59488
            </p>

            {/* Date & Time block on top right */}
            <div className="absolute right-0 top-0 border border-black text-[11px] font-sans text-left">
              <div className="px-2 py-0.5 border-b border-black">
                <span className="font-bold">Date:</span> {formatDate(admission.admissionDate)}
              </div>
              <div className="px-2 py-0.5">
                <span className="font-bold">Time:</span> {admission.admissionTime || "—"}
              </div>
            </div>
          </div>

          {/* Patient Details Row */}
          <div className="border border-black">
            <div className="grid grid-cols-12 border-b border-black divide-x divide-black">
              <div className="col-span-6 p-1.5 font-sans">
                <span className="font-bold uppercase tracking-wider text-[11px]">MR Number: </span>
                <span className="font-mono font-bold text-sm">{mrNumber}</span>
              </div>
              <div className="col-span-3 p-1.5 font-sans">
                <span className="font-bold uppercase tracking-wider text-[11px]">Adm #: </span>
                <span className="font-mono font-bold">{admission.admissionNumber}</span>
              </div>
              <div className="col-span-3 p-1.5 font-sans">
                <span className="font-bold uppercase tracking-wider text-[11px]">Ward/Bed: </span>
                <span className="font-bold">{admission.roomBedNo || "—"}</span>
              </div>
            </div>

            <div className="grid grid-cols-12 divide-x divide-black">
              <div className="col-span-6 p-1.5 font-sans">
                <span className="font-bold uppercase tracking-wider text-[11px]">Patient Name: </span>
                <span className="font-bold text-sm uppercase">{patientFullName}</span>
                {patient.relatedPersonName && (
                  <span className="text-[11px] text-slate-700 ml-1.5 font-normal">
                    ({patient.relationType || "S/O"} {patient.relatedPersonName})
                  </span>
                )}
              </div>
              <div className="col-span-3 p-1.5 font-sans">
                <span className="font-bold uppercase tracking-wider text-[11px]">Age / Sex: </span>
                <span className="font-bold">{age || "—"} / {patient.gender}</span>
              </div>
              <div className="col-span-3 p-1.5 font-sans">
                <span className="font-bold uppercase tracking-wider text-[11px]">Source: </span>
                <span className="font-bold">[{admission.admissionSource}]</span>
              </div>
            </div>
          </div>

          {/* Presenting Complaints */}
          <div className="border border-black p-2 min-h-[70px]">
            <div className="font-bold uppercase tracking-wider text-[11px] font-sans mb-1 text-slate-900">
              Presenting Complaints:
            </div>
            <p className="whitespace-pre-line font-sans text-xs min-h-[36px]">
              {admission.presentingComplaints || "None recorded at admission."}
            </p>
          </div>

          {/* Medication History */}
          <div className="border border-black p-2 min-h-[60px]">
            <div className="font-bold uppercase tracking-wider text-[11px] font-sans mb-1 text-slate-900">
              Medication History:
            </div>
            <p className="whitespace-pre-line font-sans text-xs min-h-[30px]">
              {admission.medicationHistory || "Nil"}
            </p>
          </div>

          {/* Family History */}
          <div className="border border-black p-2 min-h-[50px]">
            <div className="font-bold uppercase tracking-wider text-[11px] font-sans mb-1 text-slate-900">
              Family History:
            </div>
            <p className="whitespace-pre-line font-sans text-xs min-h-[24px]">
              {admission.familyHistory || "Nil"}
            </p>
          </div>

          {/* Allergies */}
          <div className="border border-black p-2">
            <div className="font-bold uppercase tracking-wider text-[11px] font-sans mb-1 text-slate-900">
              Allergies:
            </div>
            <p className="font-sans text-xs font-semibold">
              {admission.allergies && admission.allergies.length > 0
                ? admission.allergies.join(", ")
                : "No known drug/food allergies recorded."}
            </p>
          </div>

          {/* Vitals Strip: Pulse | Temp | BP | R/R */}
          <div className="border border-black">
            <div className="grid grid-cols-4 divide-x divide-black text-center font-sans">
              <div className="p-1.5">
                <span className="font-bold uppercase tracking-wider text-[10px] block text-slate-600">Pulse:</span>
                <span className="font-bold font-mono text-sm">
                  {admission.pulse ? `${admission.pulse} bpm` : "—"}
                </span>
              </div>
              <div className="p-1.5">
                <span className="font-bold uppercase tracking-wider text-[10px] block text-slate-600">Temp:</span>
                <span className="font-bold font-mono text-sm">
                  {admission.temperature ? `${admission.temperature} °F` : "—"}
                </span>
              </div>
              <div className="p-1.5">
                <span className="font-bold uppercase tracking-wider text-[10px] block text-slate-600">BP:</span>
                <span className="font-bold font-mono text-sm">{bpString || "—"}</span>
              </div>
              <div className="p-1.5">
                <span className="font-bold uppercase tracking-wider text-[10px] block text-slate-600">R/R:</span>
                <span className="font-bold font-mono text-sm">
                  {admission.respiratoryRate ? `${admission.respiratoryRate} /min` : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* General Physical Examination */}
          <div className="border border-black p-2 min-h-[70px]">
            <div className="font-bold uppercase tracking-wider text-[11px] font-sans mb-1 text-slate-900">
              General Physical Examination:
            </div>
            <p className="whitespace-pre-line font-sans text-xs min-h-[36px]">
              {admission.generalExamination || "Stable. No acute distress observed."}
            </p>
          </div>

          {/* Provisional Diagnosis */}
          <div className="border border-black p-2">
            <div className="font-bold uppercase tracking-wider text-[11px] font-sans mb-1 text-slate-900">
              Provisional Diagnosis:
            </div>
            <p className="font-sans text-xs font-semibold">
              {admission.provisionalDiagnosis || "Under Observation / Evaluation"}
            </p>
          </div>

          {/* Investigations */}
          <div className="border border-black p-2 min-h-[60px]">
            <div className="font-bold uppercase tracking-wider text-[11px] font-sans mb-1 text-slate-900">
              Investigations:
            </div>
            <p className="whitespace-pre-line font-sans text-xs min-h-[30px]">
              {admission.investigations || "Routine admission baseline tests."}
            </p>
          </div>

          {/* Final Diagnosis */}
          <div className="border border-black p-2">
            <div className="font-bold uppercase tracking-wider text-[11px] font-sans mb-1 text-slate-900">
              Final Diagnosis:
            </div>
            <p className="font-sans text-xs font-semibold">
              {admission.finalDiagnosis || "Pending final clinical evaluation"}
            </p>
          </div>

          {/* NUTRITIONAL STATUS: Weight | Height */}
          <div className="border border-black">
            <div className="grid grid-cols-12 divide-x divide-black p-1.5 font-sans">
              <div className="col-span-4">
                <span className="font-bold uppercase tracking-wider text-[11px]">Nutritional Status: </span>
                <span className="font-semibold">{admission.nutritionalStatus || "Well-nourished"}</span>
              </div>
              <div className="col-span-4 px-2">
                <span className="font-bold uppercase tracking-wider text-[11px]">Weight: </span>
                <span className="font-mono font-bold">
                  {admission.weight ? `${admission.weight} kg` : "—"}
                </span>
              </div>
              <div className="col-span-4 px-2">
                <span className="font-bold uppercase tracking-wider text-[11px]">Height: </span>
                <span className="font-mono font-bold">
                  {admission.height ? `${admission.height} cm` : "—"}
                </span>
                {admission.bmi && (
                  <span className="ml-2 text-[10px] text-slate-600 font-mono">
                    (BMI: {admission.bmi})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Advised Diet */}
          <div className="border border-black p-2">
            <div className="font-bold uppercase tracking-wider text-[11px] font-sans mb-1 text-slate-900">
              Advised Diet:
            </div>
            <p className="font-sans text-xs font-semibold">
              {admission.advisedDiet || "Regular / Hospital Soft Diet as tolerated"}
            </p>
          </div>

          {/* Treatment Plan */}
          <div className="border border-black p-2 min-h-[75px]">
            <div className="font-bold uppercase tracking-wider text-[11px] font-sans mb-1 text-slate-900">
              Treatment Plan:
            </div>
            <p className="whitespace-pre-line font-sans text-xs min-h-[40px]">
              {admission.treatmentPlan || "Inpatient routine care, vitals monitoring q4h, IV fluids & symptomatic therapy."}
            </p>
          </div>

          {/* Doctor Sign-off Box */}
          <div className="border border-black">
            <div className="grid grid-cols-12 divide-x divide-black text-center font-sans text-[11px]">
              <div className="col-span-5 p-2 text-left">
                <span className="font-bold block text-[10px] uppercase text-slate-600">Doctor Name:</span>
                <span className="font-bold text-xs">{doctorName}</span>
                {admission.doctor?.specialization && (
                  <span className="text-[10px] text-slate-600 block">({admission.doctor.specialization})</span>
                )}
              </div>
              <div className="col-span-3 p-2 flex flex-col justify-between min-h-[50px]">
                <span className="font-bold block text-[10px] uppercase text-slate-600">Sign:</span>
                <div className="border-b border-dashed border-black/60 mt-4" />
              </div>
              <div className="col-span-2 p-2">
                <span className="font-bold block text-[10px] uppercase text-slate-600">Date:</span>
                <span className="font-bold mt-2 block">{formatDate(admission.admissionDate)}</span>
              </div>
              <div className="col-span-2 p-2">
                <span className="font-bold block text-[10px] uppercase text-slate-600">Time:</span>
                <span className="font-bold mt-2 block">{admission.admissionTime || "—"}</span>
              </div>
            </div>
          </div>

          {/* Official Urdu & English Hospital Footer */}
          <div className="pt-2 text-center font-sans border-t border-black/80 flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] text-slate-800">
            <div className="font-mono font-semibold">
              Ph: 0546-566567 / Mob: 0346-4949577
            </div>
            <div className="text-right font-medium" dir="rtl">
              گجرات پھالیہ روڈ نزد ٹیلی فون ایکسچینج پھالیہ
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
