"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Stethoscope,
  Plus,
  Trash2,
  Eye,
  Save,
  AlertCircle,
} from "lucide-react";
import ReferralDocumentView, {
  ReferralDocumentData,
  ReferralMedicineItem,
} from "@/components/referral/ReferralDocumentView";

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
  presentingComplaints?: string | null;
  generalExamination?: string | null;
  investigations?: string | null;
  doctorId?: string | null;
  doctor?: {
    id: string;
    fullName: string;
    specialization: string;
  } | null;
  prescriptions?: Array<{
    items: Array<{
      medicineName: string;
      dosage: string;
      route: string;
      frequency: string;
      duration: string;
      instructions?: string | null;
    }>;
  }>;
}

interface ReferralFormClientProps {
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

export default function ReferralFormClient({
  patient,
  admissions,
  doctors,
  userRole,
}: ReferralFormClientProps) {
  const router = useRouter();

  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string>(
    admissions[0]?.id || ""
  );

  const selectedAdmission = admissions.find((a) => a.id === selectedAdmissionId) || null;

  const getInitialTreatments = (adm: AdmissionOption | null): ReferralMedicineItem[] => {
    if (adm?.prescriptions && adm.prescriptions.length > 0) {
      const rx = adm.prescriptions[0];
      if (rx.items.length > 0) {
        return rx.items.map((it, idx) => ({
          srNo: idx + 1,
          medicine: it.medicineName,
          dose: it.dosage,
          route: it.route || "IV / Oral",
          frequency: it.frequency,
          timing: it.instructions || "STAT / Routine",
          duration: it.duration || "During stay",
        }));
      }
    }
    return [
      {
        srNo: 1,
        medicine: "Inj. Ceftriaxone",
        dose: "1g",
        route: "IV",
        frequency: "BD",
        timing: "Given",
        duration: "In Hospital",
      },
      {
        srNo: 2,
        medicine: "I/V Infusion Normal Saline",
        dose: "1000 ml",
        route: "IV",
        frequency: "STAT",
        timing: "Slow IV",
        duration: "Continuous",
      },
    ];
  };

  const [presentingComplaints, setPresentingComplaints] = useState(
    selectedAdmission?.presentingComplaints || ""
  );
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState(
    selectedAdmission?.provisionalDiagnosis || ""
  );
  const [historyAndExamination, setHistoryAndExamination] = useState(
    selectedAdmission?.generalExamination ||
      "Patient examined in emergency/ward. Vitals monitored, initial resuscitation provided."
  );
  const [investigations, setInvestigations] = useState(
    selectedAdmission?.investigations ||
      "Routine laboratory and urgent baseline investigations performed."
  );
  const [finalDiagnosis, setFinalDiagnosis] = useState(
    selectedAdmission?.provisionalDiagnosis || ""
  );
  const [procedureDone, setProcedureDone] = useState(
    "Primary emergency resuscitation, airway stabilization & IV access established."
  );
  const [conditionAtReferral, setConditionAtReferral] = useState<
    "Satisfactory" | "Fair" | "Poor"
  >("Fair");
  const [referralNotes, setReferralNotes] = useState(
    "Patient is being referred with attendants after thorough clinical stabilization and counseling."
  );
  const [treatmentGiven, setTreatmentGiven] = useState<ReferralMedicineItem[]>(
    getInitialTreatments(selectedAdmission)
  );

  const [hospitalReferredTo, setHospitalReferredTo] = useState(
    "Tertiary Care / Teaching Hospital"
  );
  const [reasonOfReferral, setReasonOfReferral] = useState(
    "For further specialized tertiary evaluation, intensive care management, and advanced diagnostic facilities."
  );
  const [doctorId, setDoctorId] = useState<string>(
    selectedAdmission?.doctorId || doctors[0]?.id || ""
  );

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdmissionChange = (admId: string) => {
    setSelectedAdmissionId(admId);
    const adm = admissions.find((a) => a.id === admId);
    if (adm) {
      if (adm.presentingComplaints) setPresentingComplaints(adm.presentingComplaints);
      if (adm.provisionalDiagnosis) {
        setProvisionalDiagnosis(adm.provisionalDiagnosis);
        if (!finalDiagnosis) setFinalDiagnosis(adm.provisionalDiagnosis);
      }
      if (adm.generalExamination) setHistoryAndExamination(adm.generalExamination);
      if (adm.investigations) setInvestigations(adm.investigations);
      if (adm.doctorId) setDoctorId(adm.doctorId);
      setTreatmentGiven(getInitialTreatments(adm));
    }
  };

  const handleAddTreatmentRow = () => {
    setTreatmentGiven([
      ...treatmentGiven,
      {
        srNo: treatmentGiven.length + 1,
        medicine: "",
        dose: "",
        route: "IV",
        frequency: "OD",
        timing: "STAT",
        duration: "In Hospital",
      },
    ]);
  };

  const handleUpdateTreatmentRow = (
    index: number,
    field: keyof ReferralMedicineItem,
    value: string | number
  ) => {
    const updated = [...treatmentGiven];
    updated[index] = { ...updated[index], [field]: value };
    setTreatmentGiven(updated);
  };

  const handleRemoveTreatmentRow = (index: number) => {
    const updated = treatmentGiven
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, srNo: i + 1 }));
    setTreatmentGiven(updated);
  };

  const selectedDoctor = doctors.find((d) => d.id === doctorId) || null;

  const birthDate = patient.dateOfBirth ? new Date(patient.dateOfBirth) : null;
  const ageYears = birthDate ? Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : "—";

  const previewData: ReferralDocumentData = {
    hospitalName: "GIAS HOSPITAL PHALIA",
    regNumber: "R-59488",
    title: "REFERRAL FORM (File Record Copy)",
    referralNumber: "REF-PREVIEW",
    referralDate: new Date().toISOString(),
    referralTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    hospitalReferredTo,
    reasonOfReferral,
    presentingComplaints,
    provisionalDiagnosis,
    historyAndExamination,
    investigations,
    finalDiagnosis,
    procedureDone,
    conditionAtReferral,
    referralNotes,
    treatmentGiven,
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
      if (!hospitalReferredTo.trim()) {
        throw new Error("Please specify the receiving hospital name.");
      }
      if (!reasonOfReferral.trim()) {
        throw new Error("Please provide reason for referral.");
      }

      const payload = {
        patientId: patient.id,
        admissionId: selectedAdmissionId || null,
        doctorId: doctorId || null,
        referralDate: new Date().toISOString().split("T")[0],
        referralTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        hospitalReferredTo,
        reasonOfReferral,
        presentingComplaints,
        provisionalDiagnosis,
        historyAndExamination,
        investigations,
        finalDiagnosis,
        procedureDone,
        conditionAtReferral,
        referralNotes,
        treatmentGiven,
      };

      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to issue referral form");
      }

      const result = await res.json();
      router.push(`/reception/referral/${result.referral.id}/print`);
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
            <div className="w-12 h-12 rounded-xl bg-teal-800 text-white font-bold flex items-center justify-center text-base shadow-xs">
              {patient.firstName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{patient.fullName}</h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
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
                onChange={(e) => handleAdmissionChange(e.target.value)}
                className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-700"
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
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Referral Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-teal-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Referral Destination &amp; Primary Cause
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Name of Hospital to be Referred <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={hospitalReferredTo}
                onChange={(e) => setHospitalReferredTo(e.target.value)}
                placeholder="e.g. DHQ Hospital Mandi Bahauddin / Aziz Bhatti Shaheed Hospital Gujrat"
                className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Condition at Time of Referral <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["Satisfactory", "Fair", "Poor"] as const).map((cond) => (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => setConditionAtReferral(cond)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition ${
                      conditionAtReferral === cond
                        ? cond === "Satisfactory"
                          ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20"
                          : cond === "Fair"
                          ? "bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20"
                          : "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {cond}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Reason of Referral <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={reasonOfReferral}
                onChange={(e) => setReasonOfReferral(e.target.value)}
                placeholder="Detailed reason for referral (e.g. specialized ICU care, neurosurgery consult, dialysis availability)..."
                className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-700"
              />
            </div>
          </div>
        </div>

        {/* Clinical Assessment */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Stethoscope className="w-4 h-4 text-teal-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Clinical Assessment &amp; History
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Presenting Complaint
              </label>
              <textarea
                rows={2}
                value={presentingComplaints}
                onChange={(e) => setPresentingComplaints(e.target.value)}
                placeholder="Chief complaints on arrival..."
                className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Provisional / Confirmed Diagnosis
              </label>
              <textarea
                rows={2}
                value={finalDiagnosis}
                onChange={(e) => setFinalDiagnosis(e.target.value)}
                placeholder="Clinical diagnosis at time of referral..."
                className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Brief History &amp; Examination
              </label>
              <textarea
                rows={3}
                value={historyAndExamination}
                onChange={(e) => setHistoryAndExamination(e.target.value)}
                placeholder="Key examination findings, vitals, neurological / physical status..."
                className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Investigations (Significant Results)
              </label>
              <textarea
                rows={3}
                value={investigations}
                onChange={(e) => setInvestigations(e.target.value)}
                placeholder="CBC, Blood Sugar, Ultrasound, ECG, X-Ray, etc..."
                className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Procedure Done (If Any)
              </label>
              <input
                type="text"
                value={procedureDone}
                onChange={(e) => setProcedureDone(e.target.value)}
                placeholder="e.g. IV Cannulation, Foley Catheterization, Wound Dressing, etc."
                className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-700"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Attending / Referring Doctor <span className="text-rose-500">*</span>
              </label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-700 font-semibold"
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
                Referral Notes / Instructions for Transport &amp; Family
              </label>
              <textarea
                rows={2}
                value={referralNotes}
                onChange={(e) => setReferralNotes(e.target.value)}
                placeholder="Instructions during transport, oxygen support, ambulance assistance notes..."
                className="w-full text-xs p-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-700"
              />
            </div>
          </div>
        </div>

        {/* Treatment Given Multi-Row Table */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Treatment Given (Hospital Stay / Emergency Resuscitation)
              </h3>
              <p className="text-[11px] text-slate-500">
                Itemized medicine list administered prior to transfer
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddTreatmentRow}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Medicine</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">Sr</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Medicine / Drug Name</th>
                  <th className="py-2.5 px-3 w-28">Strength / Dose</th>
                  <th className="py-2.5 px-3 w-24">Route</th>
                  <th className="py-2.5 px-3 w-24">Frequency</th>
                  <th className="py-2.5 px-3 w-28">Timing</th>
                  <th className="py-2.5 px-3 w-28">Duration</th>
                  <th className="py-2.5 px-2 w-10 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {treatmentGiven.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 text-center font-bold text-slate-600">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="e.g. Inj. Rocephin"
                        value={item.medicine}
                        onChange={(e) =>
                          handleUpdateTreatmentRow(idx, "medicine", e.target.value)
                        }
                        className="w-full text-xs p-1.5 border border-slate-200 rounded focus:border-teal-700 font-medium"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="1g / 500mg"
                        value={item.dose}
                        onChange={(e) =>
                          handleUpdateTreatmentRow(idx, "dose", e.target.value)
                        }
                        className="w-full text-xs p-1.5 border border-slate-200 rounded focus:border-teal-700"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={item.route}
                        onChange={(e) =>
                          handleUpdateTreatmentRow(idx, "route", e.target.value)
                        }
                        className="w-full text-xs p-1.5 border border-slate-200 rounded focus:border-teal-700"
                      >
                        <option value="IV">IV</option>
                        <option value="IM">IM</option>
                        <option value="Oral">Oral</option>
                        <option value="Subcutaneous">SC</option>
                        <option value="Inhalation">Inhalation</option>
                        <option value="Topical">Topical</option>
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="BD / TDS / STAT"
                        value={item.frequency}
                        onChange={(e) =>
                          handleUpdateTreatmentRow(idx, "frequency", e.target.value)
                        }
                        className="w-full text-xs p-1.5 border border-slate-200 rounded focus:border-teal-700"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="Given / Before meals"
                        value={item.timing || ""}
                        onChange={(e) =>
                          handleUpdateTreatmentRow(idx, "timing", e.target.value)
                        }
                        className="w-full text-xs p-1.5 border border-slate-200 rounded focus:border-teal-700"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        placeholder="In Hospital"
                        value={item.duration || ""}
                        onChange={(e) =>
                          handleUpdateTreatmentRow(idx, "duration", e.target.value)
                        }
                        className="w-full text-xs p-1.5 border border-slate-200 rounded focus:border-teal-700"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveTreatmentRow(idx)}
                        disabled={treatmentGiven.length === 1}
                        className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                        title="Remove row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? "Generating Referral..." : "Issue & Print Referral Form"}</span>
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
                Live A4 Document Preview: REFERRAL FORM
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
                <ReferralDocumentView data={previewData} />
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
                className="px-5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Confirm &amp; Generate Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
