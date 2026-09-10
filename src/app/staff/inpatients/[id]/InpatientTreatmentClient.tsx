"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pill,
  ArrowLeft,
  Activity,
  ClipboardList,
  FileText,
  Bed,
  Calendar,
  AlertTriangle,
  Stethoscope,
  HeartPulse,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Plus,
  Minus,
  Palette,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import MedicationSheet, { MedicationAdminItem, PrescriptionGroup } from "@/components/inpatient/MedicationSheet";
import SafeHtmlContent from "@/components/ui/SafeHtmlContent";
import RichNoteEditor from "@/components/ui/RichNoteEditor";

interface InpatientTreatmentProps {
  admission: {
    id: string;
    admissionNumber: string;
    admissionDate: string;
    admissionTime: string | null;
    admissionSource: string;
    roomBedNo: string;
    status: string;
    presentingComplaints: string | null;
    medicationHistory: string | null;
    familyHistory: string | null;
    allergies: string[];
    generalExamination: string | null;
    pulse: number | null;
    temperature: number | null;
    systolicBP: number | null;
    diastolicBP: number | null;
    respiratoryRate?: number | null;
    weight: number | null;
    height: number | null;
    provisionalDiagnosis: string | null;
    investigations: string | null;
    finalDiagnosis: string | null;
    nutritionalStatus: string | null;
    advisedDiet: string | null;
    treatmentPlan: string | null;
    operation: string | null;
    doctorName?: string | null;
    patient: {
      id: string;
      patientNumber: string;
      mrNumber: string | null;
      firstName: string;
      lastName: string;
      gender: string;
      dateOfBirth: string;
      phone: string;
      bloodGroup: string;
      allergies: string[];
      chronicConditions: string[];
      emergencyContactName: string;
      emergencyContactPhone: string;
      emergencyContactRelation: string | null;
    };
    doctor: {
      id: string;
      firstName: string;
      lastName: string;
      specialization: string;
      department?: { name: string } | null;
    } | null;
    vitalSigns: Array<{
      id: string;
      systolicBP: number | null;
      diastolicBP: number | null;
      pulse: number | null;
      temperature: number | null;
      oxygenSaturation: number | null;
      respiratoryRate: number | null;
      recordedByName: string;
      recordedAt: string;
    }>;
    nursingNotes: Array<{
      id: string;
      observation: string;
      patientCondition: string;
      intervention: string | null;
      response: string | null;
      notes?: string | null;
      recordedByName: string;
      recordedAt: string;
    }>;
    medicationAdministrations: MedicationAdminItem[];
    prescriptions: PrescriptionGroup[];
  };
  currentUserRole: string;
}

export default function InpatientTreatmentClient({
  admission,
  currentUserRole,
}: InpatientTreatmentProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "procedure" | "medications" | "overview" | "vitals" | "notes" | "prescriptions"
  >("procedure");

  // Ward Nursing Notes State
  const [nursingNotes, setNursingNotes] = useState(admission.nursingNotes);
  const [showAddNote, setShowAddNote] = useState(true);
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  const [noteCondition, setNoteCondition] = useState("");
  const [noteObservation, setNoteObservation] = useState("");
  const [noteIntervention, setNoteIntervention] = useState("");
  const [noteResponse, setNoteResponse] = useState("");
  const [noteAdditional, setNoteAdditional] = useState("");

  const handleRecordWardNote = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanObs = noteObservation.replace(/<[^>]*>/g, "").trim();
    if (!cleanObs && !noteObservation.includes("<span")) {
      setNoteError("Please enter clinical observations before saving.");
      return;
    }

    setNoteSubmitting(true);
    setNoteError(null);
    setNoteSuccess(null);

    try {
      const payload = {
        observation: noteObservation.trim(),
        patientCondition: noteCondition.trim() || "Stable",
        intervention: noteIntervention.trim() || null,
        response: noteResponse.trim() || null,
        notes: noteAdditional.trim() || null,
        department: "INPATIENT",
        admissionId: admission.id,
      };

      const res = await fetch(`/api/staff/patients/${admission.patient.id}/nursing-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save nursing note");
      }

      setNoteSuccess("Ward nursing note recorded successfully.");
      setNursingNotes((prev) => [data.data, ...prev]);

      // Reset form
      setNoteCondition("");
      setNoteObservation("");
      setNoteIntervention("");
      setNoteResponse("");
      setNoteAdditional("");
    } catch (err: unknown) {
      setNoteError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setNoteSubmitting(false);
    }
  };

  // Nurse Clinical Assessment & Procedure State
  const [presentingComplaints, setPresentingComplaints] = useState(admission.presentingComplaints || "");
  const [medicationHistory, setMedicationHistory] = useState(admission.medicationHistory || "");
  const [familyHistory, setFamilyHistory] = useState(admission.familyHistory || "");
  const [allergiesText, setAllergiesText] = useState(
    admission.allergies && admission.allergies.length > 0
      ? admission.allergies.join(", ")
      : (admission.patient.allergies?.join(", ") || "")
  );

  // Vitals
  const latestVital = admission.vitalSigns?.[0];
  const [pulse, setPulse] = useState(
    admission.pulse ? String(admission.pulse) : (latestVital?.pulse ? String(latestVital.pulse) : "")
  );
  const [temperature, setTemperature] = useState(
    admission.temperature ? String(admission.temperature) : (latestVital?.temperature ? String(latestVital.temperature) : "")
  );
  const [systolicBP, setSystolicBP] = useState(
    admission.systolicBP ? String(admission.systolicBP) : (latestVital?.systolicBP ? String(latestVital.systolicBP) : "")
  );
  const [diastolicBP, setDiastolicBP] = useState(
    admission.diastolicBP ? String(admission.diastolicBP) : (latestVital?.diastolicBP ? String(latestVital.diastolicBP) : "")
  );
  const [respiratoryRate, setRespiratoryRate] = useState(
    admission.respiratoryRate ? String(admission.respiratoryRate) : (latestVital?.respiratoryRate ? String(latestVital.respiratoryRate) : "")
  );
  const [generalExamination, setGeneralExamination] = useState(admission.generalExamination || "");

  // Diagnoses & Investigation
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState(admission.provisionalDiagnosis || "");
  const [investigations, setInvestigations] = useState(admission.investigations || "");
  const [finalDiagnosis, setFinalDiagnosis] = useState(admission.finalDiagnosis || "");
  const [operation, setOperation] = useState(admission.operation || "");

  // Nutrition & Treatment
  const [nutritionalStatus, setNutritionalStatus] = useState(admission.nutritionalStatus || "Normal");
  const [weight, setWeight] = useState(admission.weight ? String(admission.weight) : "");
  const [height, setHeight] = useState(admission.height ? String(admission.height) : "");
  const [advisedDiet, setAdvisedDiet] = useState(admission.advisedDiet || "");
  const [treatmentPlan, setTreatmentPlan] = useState(admission.treatmentPlan || "");

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveProcedure = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const parsedAllergies = allergiesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        presentingComplaints: presentingComplaints.trim() || null,
        medicationHistory: medicationHistory.trim() || null,
        familyHistory: familyHistory.trim() || null,
        allergies: parsedAllergies,
        pulse: pulse ? parseInt(pulse, 10) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        systolicBP: systolicBP ? parseInt(systolicBP, 10) : null,
        diastolicBP: diastolicBP ? parseInt(diastolicBP, 10) : null,
        respiratoryRate: respiratoryRate ? parseInt(respiratoryRate, 10) : null,
        generalExamination: generalExamination.trim() || null,
        provisionalDiagnosis: provisionalDiagnosis.trim() || null,
        investigations: investigations.trim() || null,
        finalDiagnosis: finalDiagnosis.trim() || null,
        operation: operation.trim() || null,
        nutritionalStatus: nutritionalStatus.trim() || null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        advisedDiet: advisedDiet.trim() || null,
        treatmentPlan: treatmentPlan.trim() || null,
      };

      const res = await fetch(`/api/admissions/${admission.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save clinical procedure");
      }

      setSaveSuccess(true);
      router.refresh();
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const birthDate = new Date(admission.patient.dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/staff/inpatients"
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition"
            title="Back to Inpatient Ward"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Inpatient Treatment
              </span>
              <span>•</span>
              <StatusBadge status={admission.status} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
              {admission.patient.firstName} {admission.patient.lastName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/patients/${admission.patient.id}/history`}
            target="_blank"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-teal-600" />
            <span>Complete Patient History</span>
          </Link>
        </div>
      </div>

      {/* Patient & Admission Clinical Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Patient MR#</span>
            <span className="font-mono font-bold text-teal-700 text-sm">
              {admission.patient.mrNumber || admission.patient.patientNumber}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Admission #</span>
            <span className="font-mono font-semibold text-slate-900 text-sm">
              {admission.admissionNumber}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Room / Bed</span>
            <span className="font-bold text-rose-700 text-sm flex items-center gap-1">
              <Bed className="w-3.5 h-3.5" />
              {admission.roomBedNo}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Attending Doctor</span>
            <span className="font-semibold text-slate-800 text-sm">
              {admission.doctorName || (admission.doctor ? `Dr. ${admission.doctor.firstName} ${admission.doctor.lastName}` : "Unassigned")}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Demographics</span>
            <span className="text-slate-700 text-xs">
              {age} yrs • {admission.patient.gender} • <span className="font-semibold">{admission.patient.bloodGroup?.replace("_", "")}</span>
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Admitted Date</span>
            <span className="font-mono text-slate-700 text-xs">
              {new Date(admission.admissionDate).toLocaleDateString("en-GB")}
            </span>
          </div>
        </div>

        {/* Allergy Alert Banner if allergies exist */}
        {admission.patient.allergies && admission.patient.allergies.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-rose-700 font-semibold bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Documented Allergies: {admission.patient.allergies.join(", ")}</span>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto pb-px">
        {[
          { key: "procedure", label: "Nurse Clinical Assessment & Procedure", icon: Stethoscope },
          { key: "medications", label: `Medication Sheet (${admission.medicationAdministrations.length})`, icon: Pill },
          { key: "overview", label: "Overview & Summary", icon: FileText },
          { key: "vitals", label: `Vitals History (${admission.vitalSigns.length})`, icon: Activity },
          { key: "notes", label: `Nursing Notes (${nursingNotes.length})`, icon: ClipboardList },
          { key: "prescriptions", label: `Doctor Orders (${admission.prescriptions.length})`, icon: Calendar },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? "border-teal-600 text-teal-700 bg-teal-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-teal-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Nurse Clinical Procedure & Assessment Form */}
      {activeTab === "procedure" && (
        <form onSubmit={handleSaveProcedure} className="space-y-6 animate-in fade-in">
          {saveSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-bold">
                  Clinical Assessment &amp; Nurse Procedure saved successfully! Timeline and vitals have been updated.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("medications")}
                className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold text-xs transition"
              >
                Go to Medication Sheet &rarr;
              </button>
            </div>
          )}

          {saveError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span className="font-semibold">{saveError}</span>
            </div>
          )}

          {/* Top Banner */}
          <div className="bg-gradient-to-r from-teal-700 to-teal-800 text-white p-5 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-teal-200 text-xs font-bold uppercase tracking-wider mb-1">
                <Stethoscope className="w-4 h-4" />
                <span>Inpatient Nursing Procedure</span>
              </div>
              <h2 className="text-xl font-bold">
                Clinical Assessment &amp; Nursing Workup
              </h2>
              <p className="text-xs text-teal-100 mt-0.5">
                Complete clinical intake assessment for {admission.patient.firstName} {admission.patient.lastName} ({admission.roomBedNo}).
              </p>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-white text-teal-800 hover:bg-teal-50 font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-700" />
                  <span>Saving Workup...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-teal-700" />
                  <span>Save Clinical Procedure</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Presenting Complaints & Clinical History */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  1. Clinical Complaints &amp; History
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Presenting Complaints
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Chief complaints with duration (e.g. Pain in right lower abdomen for 2 days, fever, vomiting...)"
                    value={presentingComplaints}
                    onChange={(e) => setPresentingComplaints(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Medical History / Medication History
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Past medical illnesses, previous surgeries, current medications..."
                    value={medicationHistory}
                    onChange={(e) => setMedicationHistory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Family History
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Familial illnesses (Diabetes, Hypertension, Heart disease, etc.)"
                    value={familyHistory}
                    onChange={(e) => setFamilyHistory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Allergies (Drugs, Foods, Substances)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Penicillin, NSAIDs, Sulfa (separate by commas)"
                    value={allergiesText}
                    onChange={(e) => setAllergiesText(e.target.value)}
                    className="w-full px-3 py-2 border border-rose-300 bg-rose-50/20 text-rose-900 font-semibold rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Saves directly to patient allergy profile and alerts all staff on MAR.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Baseline Vitals & General Physical Examination */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  2. Baseline Vitals &amp; Physical Examination
                </h3>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Pulse (bpm)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 78"
                      value={pulse}
                      onChange={(e) => setPulse(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Temp (°F)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 98.6"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      BP (Systolic / Diastolic)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        placeholder="120"
                        value={systolicBP}
                        onChange={(e) => setSystolicBP(e.target.value)}
                        className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-center focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                      <span className="text-slate-400 font-bold">/</span>
                      <input
                        type="number"
                        placeholder="80"
                        value={diastolicBP}
                        onChange={(e) => setDiastolicBP(e.target.value)}
                        className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-center focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                      <span className="text-[11px] text-slate-500 font-semibold">mmHg</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    R/R (Respiratory Rate /min)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 18"
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(e.target.value)}
                    className="w-48 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    General Physical Examination
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Consciousness, orientation, pallor, cyanosis, jaundice, edema, chest auscultation, abdomen palpation..."
                    value={generalExamination}
                    onChange={(e) => setGeneralExamination(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Clinical Diagnosis & Investigation */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  3. Diagnosis &amp; Investigation
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Provisional Diagnosis
                  </label>
                  <input
                    type="text"
                    placeholder="Working clinical diagnosis"
                    value={provisionalDiagnosis}
                    onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Investigation
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Required laboratory tests, ultrasound, imaging, ECG or results available..."
                    value={investigations}
                    onChange={(e) => setInvestigations(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Final Diagnosis
                  </label>
                  <input
                    type="text"
                    placeholder="Confirmed final diagnosis"
                    value={finalDiagnosis}
                    onChange={(e) => setFinalDiagnosis(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-emerald-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Operation / Surgical Procedure (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Laparoscopic Cholecystectomy, Appendectomy"
                    value={operation}
                    onChange={(e) => setOperation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Card 4: Nutritional Status, Anthropometry & Treatment Plan */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  4. Nutrition &amp; Treatment Plan
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Nutritional Status
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Normal, Adequate, Malnourished"
                      value={nutritionalStatus}
                      onChange={(e) => setNutritionalStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Weight (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="kg"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">kg</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Height (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="cm"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">cm</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Advised Diet
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Soft Diet, Diabetic, Low Salt, NPO, Normal Diet"
                    value={advisedDiet}
                    onChange={(e) => setAdvisedDiet(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Inpatient Treatment Plan
                  </label>
                  <textarea
                    rows={3}
                    placeholder="IV lines, hydration protocols, antibiotics, nursing instructions, monitoring intervals..."
                    value={treatmentPlan}
                    onChange={(e) => setTreatmentPlan(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <span className="text-xs text-slate-500">
              * Vitals logged here will automatically create timestamped Inpatient Vital records in the chart.
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("medications")}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-lg transition"
              >
                Go to MAR
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Clinical Procedure &amp; Assessment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB CONTENT: Medication Sheet */}
      {activeTab === "medications" && (
        <MedicationSheet
          admissionId={admission.id}
          admissionNumber={admission.admissionNumber}
          patientId={admission.patient.id}
          patientName={`${admission.patient.firstName} ${admission.patient.lastName}`}
          mrNumber={admission.patient.mrNumber}
          roomBedNo={admission.roomBedNo}
          initialMedications={admission.medicationAdministrations}
          prescriptions={admission.prescriptions}
          readOnly={currentUserRole === "RECEPTIONIST"}
        />
      )}

      {/* TAB CONTENT: Overview */}
      {activeTab === "overview" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Presenting Complaints
                </h3>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {admission.presentingComplaints || "No complaints recorded."}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Provisional Diagnosis
                </h3>
                <p className="text-slate-900 font-semibold bg-teal-50/50 p-3 rounded-lg border border-teal-200">
                  {admission.provisionalDiagnosis || "Pending diagnosis"}
                </p>
              </div>

              {admission.finalDiagnosis && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Final Diagnosis
                  </h3>
                  <p className="text-slate-900 font-semibold bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                    {admission.finalDiagnosis}
                  </p>
                </div>
              )}

              {admission.operation && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">
                    Planned / Performed Operation
                  </h3>
                  <p className="text-purple-900 font-bold bg-purple-50 p-3 rounded-lg border border-purple-200">
                    {admission.operation}
                  </p>
                </div>
              )}

              {admission.generalExamination && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    General Physical Examination
                  </h3>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                    {admission.generalExamination}
                  </p>
                </div>
              )}

              {admission.investigations && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Investigations / Lab Workup
                  </h3>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                    {admission.investigations}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Inpatient Treatment Plan
                </h3>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                  {admission.treatmentPlan || "No specific treatment plan noted."}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Advised Diet &amp; Nutritional Status
                </h3>
                <div className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                  <p><strong className="text-slate-900">Diet:</strong> {admission.advisedDiet || "Standard Hospital Diet"}</p>
                  <p><strong className="text-slate-900">Nutrition:</strong> {admission.nutritionalStatus || "Normal"}</p>
                  {(admission.weight || admission.height) && (
                    <p className="text-slate-500 text-[11px] font-mono">
                      {admission.weight ? `Weight: ${admission.weight} kg` : ""} {admission.height ? `• Height: ${admission.height} cm` : ""}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Medication History Prior to Admission
                </h3>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {admission.medicationHistory || "None reported."}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Emergency Contact
                </h3>
                <div className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="font-semibold">{admission.patient.emergencyContactName}</p>
                  <p className="text-slate-500">{admission.patient.emergencyContactPhone} ({admission.patient.emergencyContactRelation || "Relative"})</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Vitals */}
      {activeTab === "vitals" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              <span>Vital Signs Recorded During Admission</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {admission.vitalSigns.length} record(s)
            </span>
          </div>

          {admission.vitalSigns.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-8 text-center">
              No vital signs recorded for this admission yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <th className="px-4 py-2.5">Date &amp; Time</th>
                    <th className="px-4 py-2.5">Blood Pressure</th>
                    <th className="px-4 py-2.5">Pulse</th>
                    <th className="px-4 py-2.5">Temp</th>
                    <th className="px-4 py-2.5">SpO2</th>
                    <th className="px-4 py-2.5">Resp Rate</th>
                    <th className="px-4 py-2.5">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {admission.vitalSigns.map((v) => (
                    <tr key={v.id}>
                      <td className="px-4 py-2.5 font-mono text-slate-600">
                        {new Date(v.recordedAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-slate-900">
                        {v.systolicBP && v.diastolicBP ? `${v.systolicBP}/${v.diastolicBP} mmHg` : "—"}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">
                        {v.pulse ? `${v.pulse} bpm` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {v.temperature ? `${v.temperature}°F` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {v.oxygenSaturation ? `${v.oxygenSaturation}%` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {v.respiratoryRate ? `${v.respiratoryRate} /min` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {v.recordedByName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Nursing Notes */}
      {activeTab === "notes" && (
        <div className="space-y-6">
          {/* Header Card & Add Note Toggle */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Inpatient Ward
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {admission.roomBedNo}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base mt-1 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-teal-600" />
                  <span>Ward Nursing Notes &amp; Observations</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record shift observations, vital signs assessment, nurse interventions, and handoffs with rich text and color styling.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  {nursingNotes.length} note(s) logged
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddNote(!showAddNote)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition shadow-xs ${
                    showAddNote
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                      : "bg-teal-600 text-white hover:bg-teal-700 shadow-teal-700/10"
                  }`}
                >
                  {showAddNote ? (
                    <>
                      <Minus className="w-4 h-4" />
                      <span>Hide Note Form</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Add Nursing Note</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Add Nursing Note Form (Collapsible / Default Open) */}
          {showAddNote && (
            <div className="bg-white border border-teal-200/80 rounded-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-teal-600" />
                  <span>New Ward Nursing Note</span>
                </h4>
                <span className="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-medium">
                  Linked to Admission #{admission.admissionNumber}
                </span>
              </div>

              {noteSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{noteSuccess}</span>
                </div>
              )}

              {noteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{noteError}</span>
                </div>
              )}

              <form onSubmit={handleRecordWardNote} className="space-y-4">
                {/* Patient Condition with Quick Presets */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Patient Condition <span className="text-rose-600">*</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      { label: "Stable", color: "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100" },
                      { label: "Alert & Oriented", color: "bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-100" },
                      { label: "Post-Op Recovery", color: "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100" },
                      { label: "Guarded / Fair", color: "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100" },
                      { label: "Severe Pain", color: "bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100" },
                      { label: "Critical", color: "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100" },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setNoteCondition(preset.label)}
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border transition-colors ${preset.color} ${
                          noteCondition === preset.label ? "ring-2 ring-teal-500 font-bold" : ""
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={noteCondition}
                    onChange={(e) => setNoteCondition(e.target.value)}
                    placeholder="e.g. Stable, Post-Op day 1, Resting comfortably..."
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Clinical Observation with Color Toolbar */}
                <div>
                  <RichNoteEditor
                    label="Ward Clinical Observation & Notes"
                    value={noteObservation}
                    onChange={setNoteObservation}
                    placeholder="Write detailed inpatient observation... Select text to apply text color or highlight (Red for critical, Green for normal, Blue for meds, etc.)."
                    minHeight="140px"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Intervention Taken (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={noteIntervention}
                      onChange={(e) => setNoteIntervention(e.target.value)}
                      placeholder="e.g. IV fluids infused, wound dressing changed, nebulization given..."
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Patient Response (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={noteResponse}
                      onChange={(e) => setNoteResponse(e.target.value)}
                      placeholder="e.g. Patient expressed comfort, pain score reduced from 7 to 2..."
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Additional Notes / Handoff */}
                <div>
                  <RichNoteEditor
                    label="Next Shift Handoff / Special Instructions (Optional)"
                    value={noteAdditional}
                    onChange={setNoteAdditional}
                    placeholder="Instructions for incoming nursing shift, doctor call reminders, or monitoring schedule..."
                    minHeight="80px"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNoteCondition("");
                      setNoteObservation("");
                      setNoteIntervention("");
                      setNoteResponse("");
                      setNoteAdditional("");
                      setShowAddNote(false);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={noteSubmitting}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center gap-2"
                  >
                    {noteSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving Note...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Save Ward Note</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Historical Nursing Notes List */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-600" />
                <span>Admission Notes History ({nursingNotes.length})</span>
              </h4>
              <span className="text-xs text-slate-400">Chronological Record</span>
            </div>

            {nursingNotes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <ClipboardList className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm">No nursing notes recorded for this admission yet.</p>
                {!showAddNote && (
                  <button
                    type="button"
                    onClick={() => setShowAddNote(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Nursing Note</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {nursingNotes.map((note) => {
                  const isCritical =
                    note.patientCondition?.toLowerCase().includes("critical") ||
                    note.patientCondition?.toLowerCase().includes("deteriorat");
                  const isStable =
                    note.patientCondition?.toLowerCase().includes("stable") ||
                    note.patientCondition?.toLowerCase().includes("alert");

                  return (
                    <div
                      key={note.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2.5 hover:bg-slate-100/60 transition shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                              isCritical
                                ? "bg-rose-100 text-rose-800 border-rose-200"
                                : isStable
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : "bg-amber-100 text-amber-800 border-amber-200"
                            }`}
                          >
                            {note.patientCondition}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">
                          {new Date(note.recordedAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                          Clinical Observation:
                        </span>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-slate-800">
                          <SafeHtmlContent content={note.observation} />
                        </div>
                      </div>

                      {note.intervention && (
                        <div className="text-slate-700 text-[11px]">
                          <span className="font-semibold text-slate-600 block mb-0.5">
                            Intervention:
                          </span>
                          <div className="bg-white p-2 rounded border border-slate-200/60">
                            <SafeHtmlContent content={note.intervention} />
                          </div>
                        </div>
                      )}

                      {note.response && (
                        <p className="text-slate-600 text-[11px]">
                          <span className="font-semibold text-slate-700">Patient Response:</span>{" "}
                          {note.response}
                        </p>
                      )}

                      {note.notes && (
                        <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-lg text-[11px]">
                          <span className="font-bold text-amber-900 block mb-0.5">
                            Shift Handoff / Special Notes:
                          </span>
                          <SafeHtmlContent content={note.notes} className="text-amber-950" />
                        </div>
                      )}

                      <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                        Recorded by Nurse: <strong className="text-slate-700 font-medium">{note.recordedByName}</strong>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Prescriptions */}
      {activeTab === "prescriptions" && (
        <div className="space-y-4">
          {admission.prescriptions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
              <Stethoscope className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">No doctor prescriptions issued yet.</p>
              <p className="text-xs text-slate-400 mt-1">Prescriptions issued by attending doctors will appear here.</p>
            </div>
          ) : (
            admission.prescriptions.map((rx) => (
              <div key={rx.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <span className="font-mono font-bold text-teal-700 text-sm">{rx.prescriptionNumber}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Doctor: {rx.doctor ? `Dr. ${rx.doctor.firstName} ${rx.doctor.lastName} (${rx.doctor.specialization})` : "Attending Clinician"}
                    </p>
                  </div>
                  <span className="font-mono text-slate-400 text-[11px]">
                    {new Date(rx.createdAt).toLocaleDateString("en-GB")}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600">
                        <th className="px-3 py-2">Medicine</th>
                        <th className="px-3 py-2">Dosage</th>
                        <th className="px-3 py-2">Route</th>
                        <th className="px-3 py-2">Frequency</th>
                        <th className="px-3 py-2">Duration</th>
                        <th className="px-3 py-2">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rx.items.map((it) => (
                        <tr key={it.id}>
                          <td className="px-3 py-2 font-bold text-slate-900">{it.medicineName}</td>
                          <td className="px-3 py-2 font-semibold text-slate-700">{it.dosage}</td>
                          <td className="px-3 py-2 text-slate-600">{it.route}</td>
                          <td className="px-3 py-2 text-slate-600">{it.frequency}</td>
                          <td className="px-3 py-2 text-slate-600">{it.duration}</td>
                          <td className="px-3 py-2 text-slate-500">{it.instructions || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
