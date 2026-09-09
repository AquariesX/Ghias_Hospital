"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ReferralDocumentView, { ReferralDocumentData } from "@/components/referral/ReferralDocumentView";

export default function ReferralPrintClient({ referralId }: { referralId: string }) {
  const [data, setData] = useState<ReferralDocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/referrals/${referralId}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to load referral record");
        }
        const json = await res.json();
        const ref = json.referral;

        // Map API response to ReferralDocumentData
        let parsedTreatments: any[] = [];
        if (ref.treatmentGiven) {
          try {
            parsedTreatments = typeof ref.treatmentGiven === "string" ? JSON.parse(ref.treatmentGiven) : ref.treatmentGiven;
          } catch {
            parsedTreatments = [];
          }
        }

        // Calculate age
        const birthDate = ref.patient?.dateOfBirth ? new Date(ref.patient.dateOfBirth) : null;
        let ageYears: number | string = "—";
        if (birthDate) {
          const diffMs = Date.now() - birthDate.getTime();
          ageYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
        }

        const docData: ReferralDocumentData = {
          hospitalName: "GIAS HOSPITAL PHALIA",
          regNumber: "R-59488",
          title: "REFERRAL FORM (File Record Copy)",
          referralNumber: ref.referralNumber,
          referralDate: ref.referralDate,
          referralTime: ref.referralTime,
          hospitalReferredTo: ref.hospitalReferredTo,
          reasonOfReferral: ref.reasonOfReferral,
          presentingComplaints: ref.presentingComplaints,
          provisionalDiagnosis: ref.provisionalDiagnosis,
          historyAndExamination: ref.historyAndExamination,
          investigations: ref.investigations,
          finalDiagnosis: ref.finalDiagnosis,
          procedureDone: ref.procedureDone,
          conditionAtReferral: ref.conditionAtReferral,
          referralNotes: ref.referralNotes,
          treatmentGiven: parsedTreatments,
          patient: {
            id: ref.patient?.id,
            patientNumber: ref.patient?.patientNumber,
            mrNumber: ref.patient?.mrNumber || ref.patient?.patientNumber,
            fullName: `${ref.patient?.firstName || ""} ${ref.patient?.lastName || ""}`.trim(),
            gender: ref.patient?.gender,
            ageYears,
            phone: ref.patient?.phone,
            cnic: ref.patient?.cnic,
            relationType: ref.patient?.relationType,
            relatedPersonName: ref.patient?.relatedPersonName,
            address: ref.patient?.address,
          },
          admission: ref.admission
            ? {
                id: ref.admission.id,
                admissionNumber: ref.admission.admissionNumber,
                admissionDate: ref.admission.admissionDate,
                admissionTime: ref.admission.admissionTime,
                roomBedNo: ref.admission.roomBedNo,
              }
            : null,
          doctor: ref.doctor
            ? {
                id: ref.doctor.id,
                fullName: `Dr. ${ref.doctor.firstName} ${ref.doctor.lastName}`.trim(),
                specialization: ref.doctor.specialization,
                departmentName: ref.doctor.department?.name,
              }
            : ref.doctorName
            ? { fullName: ref.doctorName }
            : null,
        };

        setData(docData);
      } catch (e: any) {
        setError(e.message || "Failed to load referral");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [referralId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 print:bg-white text-slate-700">
        <div className="text-center p-8 bg-white rounded-xl shadow-md border border-slate-200">
          <div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="font-medium">Loading Referral Form for Printing...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-xl shadow border border-red-200 text-center">
          <p className="text-rose-600 font-semibold mb-2">Error Loading Document</p>
          <p className="text-sm text-slate-600 mb-4">{error || "Document not found"}</p>
          <Link
            href="/reception/referral"
            className="inline-block px-4 py-2 bg-slate-800 text-white rounded text-sm hover:bg-slate-900"
          >
            Return to Referral Hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white py-6 print:py-0 px-2 sm:px-4 print:px-0">
      {/* Top action toolbar (hidden when printing or saving as PDF) */}
      <div className="max-w-[210mm] mx-auto mb-4 bg-white p-3 rounded-lg shadow border border-slate-300 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Link
            href="/reception/referral"
            className="px-3 py-1.5 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
          >
            ← Referral Hub
          </Link>
          <Link
            href={`/patients/${data.patient.id}`}
            className="px-3 py-1.5 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
          >
            Patient File ({data.patient.mrNumber})
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold uppercase tracking-wider shadow flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* A4 Document View */}
      <ReferralDocumentView data={data} />
    </div>
  );
}
