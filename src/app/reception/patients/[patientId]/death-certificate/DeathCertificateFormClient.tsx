"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  AlertTriangle,
  Eye,
  Save,
  Stethoscope,
  HeartCrack,
} from "lucide-react";
import DeathCertificateDocumentView, {
  DeathCertificateData,
} from "@/components/death-certificate/DeathCertificateDocumentView";

interface DoctorOption {
  id: string;
  fullName: string;
  specialization: string;
  departmentName?: string | null;
}

interface AdmissionOption {
  id: string;
  admissionNumber: string;
  admissionDate: string;
  admissionTime?: string | null;
  status: string;
  roomBedNo?: string | null;
  provisionalDiagnosis?: string | null;
  finalDiagnosis?: string | null;
  doctorId?: string | null;
  doctor?: {
    id: string;
    fullName: string;
    specialization: string;
  } | null;
}

interface DeathCertificateFormClientProps {
  patient: {
    id: string;
    mrNumber: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
    fullName: string;
    gender: string;
    dateOfBirth: string;
    phone: string;
    cnic?: string | null;
    relationType?: string | null;
    relatedPersonName?: string | null;
    address?: string | null;
  };
  admissions: AdmissionOption[];
  doctors: DoctorOption[];
  userRole: string;
}

export default function DeathCertificateFormClient({
  patient,
  admissions,
  doctors,
  userRole,
}: DeathCertificateFormClientProps) {
  const router = useRouter();

  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string>(
    admissions[0]?.id || ""
  );

  const selectedAdmission = admissions.find((a) => a.id === selectedAdmissionId) || null;

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().slice(0, 5);

  const [dateOfDeath, setDateOfDeath] = useState(todayStr);
  const [timeOfDeath, setTimeOfDeath] = useState(timeStr);

  const [causeOfDeath, setCauseOfDeath] = useState(
    "Cardiopulmonary Arrest due to Severe Septic Shock"
  );
  const [diagnosis, setDiagnosis] = useState(
    selectedAdmission?.finalDiagnosis ||
      selectedAdmission?.provisionalDiagnosis ||
      "Type 2 Diabetes Mellitus, Essential Hypertension"
  );
  const [notes, setNotes] = useState(
    "CPR performed as per ACLS protocol. No spontaneous rhythm restored. Bilateral fixed dilated pupils. Declared clinically deceased."
  );

  const [bodyReceivedBy, setBodyReceivedBy] = useState(
    patient.relatedPersonName || ""
  );
  const [receivedByRelation, setReceivedByRelation] = useState(
    patient.relationType || "Brother"
  );
  const [receivedByCnic, setReceivedByCnic] = useState(
    patient.cnic || ""
  );
  const [receivedByPhone, setReceivedByPhone] = useState(
    patient.phone || ""
  );

  const [doctorId, setDoctorId] = useState<string>(
    selectedAdmission?.doctorId || doctors[0]?.id || ""
  );

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedDoctor = doctors.find((d) => d.id === doctorId) || null;

  const birthDate = patient.dateOfBirth ? new Date(patient.dateOfBirth) : null;
  const ageYears = birthDate ? Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : "—";

  const previewData: DeathCertificateData = {
    hospitalName: "GIAS HOSPITAL PHALIA",
    regNumber: "R-59488",
    title: "DEATH CERTIFICATE",
    certificateNumber: "DC-PREVIEW",
    dateOfDeath: new Date(dateOfDeath).toISOString(),
    timeOfDeath,
    causeOfDeath,
    diagnosis,
    bodyReceivedBy,
    receivedByRelation,
    receivedByCnic,
    receivedByPhone,
    notes,
    patient: {
      id: patient.id,
      patientNumber: patient.patientNumber,
      mrNumber: patient.mrNumber || patient.patientNumber,
      fullName: patient.fullName,
      gender: patient.gender,
      ageYears,
      phone: patient.phone,
      cnic: patient.cnic,
      relationType: patient.relationType,
      relatedPersonName: patient.relatedPersonName,
      address: patient.address,
    },
    admission: selectedAdmission
      ? {
          id: selectedAdmission.id,
          admissionNumber: selectedAdmission.admissionNumber,
          admissionDate: selectedAdmission.admissionDate,
          roomBedNo: selectedAdmission.roomBedNo,
        }
      : null,
    doctor: selectedDoctor
      ? {
          id: selectedDoctor.id,
          fullName: selectedDoctor.fullName,
          specialization: selectedDoctor.specialization,
          departmentName: selectedDoctor.departmentName,
        }
      : null,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (!causeOfDeath.trim()) {
        throw new Error("Please specify the cause of death.");
      }
      if (!bodyReceivedBy.trim()) {
        throw new Error("Please enter the name of the person receiving the dead body.");
      }
      if (!receivedByRelation.trim()) {
        throw new Error("Please enter the relation of the receiver to the deceased.");
      }

      const payload = {
        patientId: patient.id,
        admissionId: selectedAdmissionId || null,
        doctorId: doctorId || null,
        dateOfDeath: new Date(dateOfDeath).toISOString(),
        timeOfDeath,
        causeOfDeath,
        diagnosis,
        bodyReceivedBy,
        receivedByRelation,
        receivedByCnic,
        receivedByPhone,
        notes,
      };

      const res = await fetch("/api/death-certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to issue death certificate");
      }

      const result = await res.json();
      router.push(`/reception/death-certificate/${result.certificate.id}/print`);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Patient Summary Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-base shadow-xs">
              <HeartCrack className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{patient.fullName}</h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                  MR: {patient.mrNumber || patient.patientNumber}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {patient.gender}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {patient.relationType && patient.relatedPersonName ? (
                  <span className="mr-3">
                    {patient.relationType}: {patient.relatedPersonName}
                  </span>
                ) : null}
                {patient.phone ? <span className="mr-3">Phone: {patient.phone}</span> : null}
                {patient.cnic ? <span>CNIC: {patient.cnic}</span> : null}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 min-w-[260px]">
            <label className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider mb-1">
              Associated Inpatient Admission
            </label>
            {admissions.length > 0 ? (
              <select
                value={selectedAdmissionId}
                onChange={(e) => setSelectedAdmissionId(e.target.value)}
                className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-slate-500/20 focus:border-slate-700"
              >
                {admissions.map((adm) => (
                  <option key={adm.id} value={adm.id}>
                    #{adm.admissionNumber} ({new Date(adm.admissionDate).toLocaleDateString()}) - Bed:{" "}
                    {adm.roomBedNo || "None"} [{adm.status}]
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-slate-400 italic">
                Outpatient / Direct Emergency (No Inpatient Admission)
              </span>
            )}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Death Certificate Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Stethoscope className="w-4 h-4 text-slate-800" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Clinical Confirmation &amp; Cause of Death
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Date of Death <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dateOfDeath}
                onChange={(e) => setDateOfDeath(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Time of Death <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={timeOfDeath}
                onChange={(e) => setTimeOfDeath(e.target.value)}
                placeholder="e.g. 14:30 or 02:30 PM"
                className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-700 font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Immediate Cause of Death <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={causeOfDeath}
                onChange={(e) => setCauseOfDeath(e.target.value)}
                placeholder="e.g. Cardiopulmonary Arrest / Severe Respiratory Failure / Multi-Organ Failure"
                className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-700 font-medium"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Clinical Diagnosis / Underlying Conditions
              </label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Chronic Kidney Disease, Hypertension, Septicemia"
                className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-700"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Attending / Certifying Doctor <span className="text-rose-500">*</span>
              </label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-700 font-semibold"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.specialization})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Clinical Examination &amp; Resuscitation Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Brief clinical notes on time of cessation of vital signs, absence of pulse/respiration..."
                className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-700"
              />
            </div>
          </div>
        </div>

        {/* Dead Body Handover Details */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-4 h-4 text-slate-800" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Dead Body Handover &amp; Custody Information
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Dead Body Received By (Full Name) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={bodyReceivedBy}
                onChange={(e) => setBodyReceivedBy(e.target.value)}
                placeholder="Full name of family member / attendant"
                className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Relation to Deceased <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={receivedByRelation}
                onChange={(e) => setReceivedByRelation(e.target.value)}
                placeholder="e.g. Son, Daughter, Father, Brother, Spouse"
                className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Receiver CNIC No.
              </label>
              <input
                type="text"
                value={receivedByCnic}
                onChange={(e) => setReceivedByCnic(e.target.value)}
                placeholder="e.g. 34401-XXXXXXX-X"
                className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Receiver Contact / Phone No.
              </label>
              <input
                type="text"
                value={receivedByPhone}
                onChange={(e) => setReceivedByPhone(e.target.value)}
                placeholder="e.g. 0300-XXXXXXX"
                className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-700 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <Link
            href={`/patients/${patient.id}`}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-4 py-2.5 rounded-xl transition"
          >
            ← Cancel &amp; Return to Patient File
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 shadow-2xs transition"
            >
              <Eye className="w-4 h-4" />
              <span>Live A4 Preview</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? "Generating Certificate..." : "Issue & Print Death Certificate"}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Live A4 Modal Preview */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-100 rounded-2xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden border border-slate-300">
            <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Live A4 Document Preview: DEATH CERTIFICATE
              </span>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-xs font-bold px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
              >
                Close Preview (✕)
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 flex justify-center bg-slate-200">
              <div className="scale-90 origin-top">
                <DeathCertificateDocumentView data={previewData} />
              </div>
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
              >
                Back to Form
              </button>
              <button
                type="button"
                onClick={(e) => {
                  setShowPreviewModal(false);
                  handleSubmit(e);
                }}
                disabled={isSubmitting}
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow transition"
              >
                Confirm &amp; Generate Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
