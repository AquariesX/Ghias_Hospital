"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DeathCertificateDocumentView, { DeathCertificateData } from "@/components/death-certificate/DeathCertificateDocumentView";

export default function DeathCertificatePrintClient({ certificateId }: { certificateId: string }) {
  const [data, setData] = useState<DeathCertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/death-certificates/${certificateId}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to load death certificate record");
        }
        const json = await res.json();
        const cert = json.certificate;

        // Calculate age
        const birthDate = cert.patient?.dateOfBirth ? new Date(cert.patient.dateOfBirth) : null;
        let ageYears: number | string = "—";
        if (birthDate) {
          const diffMs = Date.now() - birthDate.getTime();
          ageYears = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
        }

        const docData: DeathCertificateData = {
          hospitalName: "GIAS HOSPITAL PHALIA",
          regNumber: "R-59488",
          title: "DEATH CERTIFICATE",
          certificateNumber: cert.certificateNumber,
          dateOfDeath: cert.dateOfDeath,
          timeOfDeath: cert.timeOfDeath,
          causeOfDeath: cert.causeOfDeath,
          diagnosis: cert.diagnosis,
          bodyReceivedBy: cert.bodyReceivedBy,
          receivedByRelation: cert.receivedByRelation,
          receivedByCnic: cert.receivedByCnic,
          receivedByPhone: cert.receivedByPhone,
          notes: cert.notes,
          patient: {
            id: cert.patient?.id,
            patientNumber: cert.patient?.patientNumber,
            mrNumber: cert.patient?.mrNumber || cert.patient?.patientNumber,
            fullName: `${cert.patient?.firstName || ""} ${cert.patient?.lastName || ""}`.trim(),
            gender: cert.patient?.gender,
            ageYears,
            phone: cert.patient?.phone,
            cnic: cert.patient?.cnic,
            relationType: cert.patient?.relationType,
            relatedPersonName: cert.patient?.relatedPersonName,
            address: cert.patient?.address,
          },
          admission: cert.admission
            ? {
                id: cert.admission.id,
                admissionNumber: cert.admission.admissionNumber,
                admissionDate: cert.admission.admissionDate,
                admissionTime: cert.admission.admissionTime,
                roomBedNo: cert.admission.roomBedNo,
              }
            : null,
          doctor: cert.doctor
            ? {
                id: cert.doctor.id,
                fullName: `Dr. ${cert.doctor.firstName} ${cert.doctor.lastName}`.trim(),
                specialization: cert.doctor.specialization,
                departmentName: cert.doctor.department?.name,
              }
            : cert.doctorName
            ? { fullName: cert.doctorName }
            : null,
        };

        setData(docData);
      } catch (e: any) {
        setError(e.message || "Failed to load death certificate");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [certificateId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 print:bg-white text-slate-700">
        <div className="text-center p-8 bg-white rounded-xl shadow-md border border-slate-200">
          <div className="animate-spin h-8 w-8 border-4 border-slate-800 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="font-medium">Loading Death Certificate for Printing...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-xl shadow border border-red-200 text-center">
          <p className="text-rose-600 font-semibold mb-2">Error Loading Certificate</p>
          <p className="text-sm text-slate-600 mb-4">{error || "Document not found"}</p>
          <Link
            href="/reception/death-certificate"
            className="inline-block px-4 py-2 bg-slate-800 text-white rounded text-sm hover:bg-slate-900"
          >
            Return to Death Certificate Hub
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
            href="/reception/death-certificate"
            className="px-3 py-1.5 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
          >
            ← Death Certificate Hub
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
            className="px-4 py-2 rounded-md bg-slate-800 hover:bg-black text-white text-xs font-bold uppercase tracking-wider shadow flex items-center gap-1.5 cursor-pointer"
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
      <DeathCertificateDocumentView data={data} />
    </div>
  );
}
