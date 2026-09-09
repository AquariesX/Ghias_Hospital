"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  BedDouble,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Printer,
  FileText,
  Eye,
  Save,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Clock,
  Pill,
} from "lucide-react";
import DischargeDocumentView, {
  DischargeDocumentData,
  DischargeMedicationItem,
} from "@/components/discharge/DischargeDocumentView";

interface DoctorOption {
  id: string;
  fullName: string;
  specialization: string;
  departmentName?: string | null;
  roomNumber?: string | null;
}

interface DischargeFormClientProps {
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
  admission: {
    id: string;
    admissionNumber: string;
    admissionDate: string;
    admissionTime?: string | null;
    admissionSource: string;
    roomBedNo?: string | null;
    status: string;
    presentingComplaints?: string | null;
    generalExamination?: string | null;
    investigations?: string | null;
    provisionalDiagnosis?: string | null;
    finalDiagnosis?: string | null;
    operation?: string | null;
    outcome?: string | null;
    dischargeCondition?: string | null;
    dischargeAdvisedByDoctor?: boolean;
    isLama?: boolean;
    dischargeSummary?: string | null;
    dischargeInstructions?: string | null;
    dischargeMedications?: string | null;
    followUpInstructions?: string | null;
    followUpDate?: string | null;
    doctorId?: string | null;
    doctor?: {
      id: string;
      fullName: string;
      specialization: string;
      departmentName?: string | null;
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
  };
  doctors: DoctorOption[];
  userRole: string;
}

export default function DischargeFormClient({
  patient,
  admission,
  doctors,
  userRole,
}: DischargeFormClientProps) {
  const router = useRouter();

  // Initial medications: check if previously saved as JSON, else use prescription items or default empty row
  let initialMeds: DischargeMedicationItem[] = [];
  if (admission.dischargeMedications) {
    try {
      const parsed = JSON.parse(admission.dischargeMedications);
      if (Array.isArray(parsed) && parsed.length > 0) {
        initialMeds = parsed;
      }
    } catch {
      // not json
    }
  }

  if (initialMeds.length === 0 && admission.prescriptions && admission.prescriptions.length > 0) {
    const rx = admission.prescriptions[0];
    initialMeds = rx.items.map((it, idx) => ({
      srNo: idx + 1,
      medicineName: it.medicineName,
      dosage: it.dosage,
      route: it.route || "Oral",
      frequency: it.frequency,
      timing: it.instructions || "After meals",
      duration: it.duration,
      instructions: it.instructions || "",
    }));
  }

  if (initialMeds.length === 0) {
    initialMeds = [
      {
        srNo: 1,
        medicineName: "Tab. Paracetamol",
        dosage: "500 mg",
        route: "Oral",
        frequency: "TDS",
        timing: "After meals",
        duration: "5 days",
        instructions: "For mild fever or pain",
      },
    ];
  }

  // State
  const [presentingComplaints, setPresentingComplaints] = useState(
    admission.presentingComplaints || ""
  );
  const [briefHistory, setBriefHistory] = useState(
    admission.generalExamination || "General physical and clinical examination performed. Vital signs stable."
  );
  const [investigations, setInvestigations] = useState(
    admission.investigations || "Routine hematology and biochemistry within acceptable limits."
  );
  const [finalDiagnosis, setFinalDiagnosis] = useState(
    admission.finalDiagnosis || admission.provisionalDiagnosis || ""
  );
  const [procedureDone, setProcedureDone] = useState(
    admission.operation || "Conservative medical management"
  );
  const [outcome, setOutcome] = useState(
    admission.outcome || "Improved, stable, and fit for outpatient discharge."
  );

  // Discharge notes & conditions
  const [dischargeAdvisedByDoctor, setDischargeAdvisedByDoctor] = useState(
    admission.dischargeAdvisedByDoctor !== false
  );
  const [isLama, setIsLama] = useState(admission.isLama || false);
  const [dischargeCondition, setDischargeCondition] = useState<"Satisfactory" | "Fair" | "Poor">(
    (admission.dischargeCondition as any) || "Satisfactory"
  );
  const [dischargeDate, setDischargeDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dischargeTime, setDischargeTime] = useState(
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  );

  // Attending Doctor
  const [selectedDoctorId, setSelectedDoctorId] = useState(
    admission.doctorId || (doctors.length > 0 ? doctors[0].id : "")
  );

  // Discharge Medications list
  const [medications, setMedications] = useState<DischargeMedicationItem[]>(initialMeds);

  // Discharge Instructions
  const [dischargeInstructions, setDischargeInstructions] = useState(
    admission.dischargeInstructions ||
      "1. Take all prescribed medicines strictly as scheduled.\n2. Maintain proper rest, balanced hydration, and soft diet.\n3. Avoid heavy physical lifting for 7 days.\n4. Seek immediate medical attention at GHIAS Hospital if fever > 101°F, bleeding, severe vomiting, or sudden shortness of breath occurs."
  );

  // Follow-up
  const [followUpDate, setFollowUpDate] = useState(admission.followUpDate || "");
  const [followUpInstructions, setFollowUpInstructions] = useState(
    admission.followUpInstructions || "Follow-up at OPD in 7 days for clinical review."
  );

  // UI state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [completedDischarge, setCompletedDischarge] = useState<boolean>(
    admission.status === "DISCHARGED"
  );

  // Age calculation
  const dob = new Date(patient.dateOfBirth);
  const ageYears = new Date().getFullYear() - dob.getFullYear();

  // Selected doctor object
  const activeDoctor = doctors.find((d) => d.id === selectedDoctorId) || {
    fullName: admission.doctor?.fullName || "Dr. Attending Physician",
    specialization: admission.doctor?.specialization || "General Medicine",
    departmentName: admission.doctor?.departmentName || null,
  };

  // Medication handlers
  const handleAddMedication = () => {
    setMedications((prev) => [
      ...prev,
      {
        srNo: prev.length + 1,
        medicineName: "",
        dosage: "",
        route: "Oral",
        frequency: "OD",
        timing: "After meals",
        duration: "5 days",
        instructions: "",
      },
    ]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((m, idx) => ({ ...m, srNo: idx + 1 }));
    });
  };

  const handleMedicationChange = (
    index: number,
    field: keyof DischargeMedicationItem,
    value: string
  ) => {
    setMedications((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Compile document data for preview/print
  const previewDocumentData: DischargeDocumentData = {
    hospitalName: "GIAS HOSPITAL PHALIA",
    regNumber: "REG NO. R-59488",
    title: "DISCHARGE FORM (Patient Copy)",
    generatedAt: new Date().toISOString(),
    patient: {
      id: patient.id,
      patientNumber: patient.patientNumber,
      mrNumber: patient.mrNumber,
      fullName: patient.fullName,
      firstName: patient.firstName,
      lastName: patient.lastName,
      gender: patient.gender,
      ageYears,
      dateOfBirth: patient.dateOfBirth,
      phone: patient.phone,
      cnic: patient.cnic,
      relationType: patient.relationType,
      relatedPersonName: patient.relatedPersonName,
      address: patient.address,
    },
    admission: {
      id: admission.id,
      admissionNumber: admission.admissionNumber,
      admissionDate: admission.admissionDate,
      admissionTime: admission.admissionTime,
      dischargeDate,
      dischargeTime,
      roomBedNo: admission.roomBedNo,
      admissionSource: admission.admissionSource,
      status: completedDischarge ? "DISCHARGED" : "ADMITTED",
      presentingComplaints,
      generalExamination: briefHistory,
      investigations,
      provisionalDiagnosis: admission.provisionalDiagnosis,
      finalDiagnosis,
      operation: procedureDone,
      outcome,
      dischargeCondition,
      dischargeAdvisedByDoctor,
      isLama,
      dischargeSummary: outcome,
      dischargeInstructions,
      followUpInstructions,
      followUpDate: followUpDate || null,
    },
    medications: medications.filter((m) => m.medicineName.trim().length > 0),
    doctor: {
      fullName: activeDoctor.fullName,
      specialization: activeDoctor.specialization,
      departmentName: activeDoctor.departmentName,
    },
  };

  // Save changes (Draft or Final)
  const handleSubmit = async (isDraft: boolean) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      // Form validation
      if (!finalDiagnosis.trim() && !isDraft) {
        throw new Error("Final diagnosis is required before completing discharge.");
      }

      const payload = {
        isDraft,
        presentingComplaints: presentingComplaints.trim(),
        generalExamination: briefHistory.trim(),
        investigations: investigations.trim(),
        finalDiagnosis: finalDiagnosis.trim(),
        operation: procedureDone.trim(),
        outcome: outcome.trim(),
        dischargeCondition,
        dischargeAdvisedByDoctor,
        isLama,
        dischargeSummary: outcome.trim(),
        dischargeInstructions: dischargeInstructions.trim(),
        dischargeDate,
        dischargeTime,
        medications: medications.filter((m) => m.medicineName.trim().length > 0),
        followUpDate: followUpDate || null,
        followUpInstructions: followUpInstructions.trim() || null,
        attendingDoctorId: selectedDoctorId || null,
      };

      const res = await fetch(`/api/admissions/${admission.id}/discharge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to process discharge request.");
      }

      // Store in session storage for immediate print preview accuracy
      try {
        sessionStorage.setItem(
          `ghias_discharge_fields_${admission.id}`,
          JSON.stringify({
            admission: {
              dischargeDate,
              dischargeTime,
              presentingComplaints,
              generalExamination: briefHistory,
              investigations,
              finalDiagnosis,
              operation: procedureDone,
              outcome,
              dischargeCondition,
              dischargeAdvisedByDoctor,
              isLama,
              dischargeInstructions,
              followUpInstructions,
              followUpDate,
            },
            medications: payload.medications,
          })
        );
      } catch (e) {
        // ignore
      }

      if (isDraft) {
        setSuccessMessage("Discharge form draft saved successfully!");
      } else {
        setCompletedDischarge(true);
        setSuccessMessage("Patient officially discharged! Admission marked as DISCHARGED.");
      }

      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintDocument = async () => {
    // Automatically finalize discharge and set status to DISCHARGED if not already discharged
    if (!completedDischarge) {
      setIsSubmitting(true);
      setErrorMessage(null);
      try {
        const payload = {
          isDraft: false,
          presentingComplaints: presentingComplaints.trim(),
          generalExamination: briefHistory.trim(),
          investigations: investigations.trim(),
          finalDiagnosis: finalDiagnosis.trim() || "Inpatient Clinical Management",
          operation: procedureDone.trim(),
          outcome: outcome.trim(),
          dischargeCondition,
          dischargeAdvisedByDoctor,
          isLama,
          dischargeSummary: outcome.trim() || "Patient completed inpatient medical treatment.",
          dischargeInstructions: dischargeInstructions.trim(),
          dischargeDate,
          dischargeTime,
          medications: medications.filter((m) => m.medicineName.trim().length > 0),
          followUpDate: followUpDate || null,
          followUpInstructions: followUpInstructions.trim() || null,
          attendingDoctorId: selectedDoctorId || null,
        };

        const res = await fetch(`/api/admissions/${admission.id}/discharge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to finalize discharge.");
        }

        setCompletedDischarge(true);
        setSuccessMessage("Discharge generated! Patient admission status set to DISCHARGED.");
        router.refresh();
      } catch (err: any) {
        console.error("Discharge finalize error:", err);
        setErrorMessage(err.message || "Failed to set status to Discharged.");
        setIsSubmitting(false);
        return;
      } finally {
        setIsSubmitting(false);
      }
    }

    // Save state to session storage then open print page
    try {
      sessionStorage.setItem(
        `ghias_discharge_fields_${admission.id}`,
        JSON.stringify({
          admission: {
            dischargeDate,
            dischargeTime,
            presentingComplaints,
            generalExamination: briefHistory,
            investigations,
            finalDiagnosis: finalDiagnosis || "Inpatient Clinical Management",
            operation: procedureDone,
            outcome,
            dischargeCondition,
            dischargeAdvisedByDoctor,
            isLama,
            dischargeInstructions,
            followUpInstructions,
            followUpDate,
            status: "DISCHARGED",
          },
          medications: medications.filter((m) => m.medicineName.trim().length > 0),
        })
      );
    } catch (e) {}

    window.open(`/reception/discharge/${admission.id}/print`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* TOP PATIENT & ADMISSION SUMMARY CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">{patient.fullName}</span>
                <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {patient.mrNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {patient.gender} • {ageYears} Y • Phone: {patient.phone} • CNIC: {patient.cnic || "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Admission #
              </span>
              <span className="font-mono font-bold text-slate-900">{admission.admissionNumber}</span>
            </div>
            <div className="h-7 w-px bg-slate-200"></div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Room / Bed
              </span>
              <span className="font-bold text-teal-900 font-mono">
                {admission.roomBedNo || "Not Assigned"}
              </span>
            </div>
            <div className="h-7 w-px bg-slate-200"></div>
            <div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  completedDischarge
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {completedDischarge ? "DISCHARGED" : admission.status}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Demographic Fields */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">S/O, D/O, W/O</span>
            <span className="font-medium text-slate-800">
              {patient.relatedPersonName
                ? `${patient.relationType ? `${patient.relationType}: ` : ""}${patient.relatedPersonName}`
                : "—"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Admitted On</span>
            <span className="font-medium text-slate-800 font-mono">
              {new Date(admission.admissionDate).toLocaleDateString()} {admission.admissionTime || ""}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Source</span>
            <span className="font-medium text-slate-800">{admission.admissionSource}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Attending Doctor</span>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="mt-0.5 text-xs font-semibold text-slate-900 border border-slate-300 rounded-lg px-2 py-1 bg-white focus:outline-hidden focus:ring-1 focus:ring-teal-600"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName} ({d.specialization})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* MAIN DISCHARGE FORM SECTIONS */}
      <div className="space-y-6">
        {/* SECTION 1: CLINICAL SUMMARY */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-teal-800" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Clinical Summary &amp; Diagnosis
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            {/* Presenting Complaint */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Presenting Complaint
              </label>
              <input
                type="text"
                placeholder="e.g. Acute abdominal pain, high grade fever for 2 days"
                value={presentingComplaints}
                onChange={(e) => setPresentingComplaints(e.target.value)}
                className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-700 bg-white"
              />
            </div>

            {/* Brief History & Examination */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Brief History &amp; Examination
              </label>
              <textarea
                rows={3}
                placeholder="Clinical presentation, general physical examination, vitals course..."
                value={briefHistory}
                onChange={(e) => setBriefHistory(e.target.value)}
                className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-700 bg-white"
              />
            </div>

            {/* Diagnostic Investigations */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Diagnostic Investigations Significant Results
              </label>
              <textarea
                rows={2}
                placeholder="Ultrasound, CBC, X-Ray, ECG, Pathology findings..."
                value={investigations}
                onChange={(e) => setInvestigations(e.target.value)}
                className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-700 bg-white"
              />
            </div>

            {/* Diagnosis & Procedure */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Diagnosis *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acute Appendicitis / Enteric Fever"
                  value={finalDiagnosis}
                  onChange={(e) => setFinalDiagnosis(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-700 bg-white font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Procedure Done
                </label>
                <input
                  type="text"
                  placeholder="e.g. Appendectomy / Conservative Medical Management"
                  value={procedureDone}
                  onChange={(e) => setProcedureDone(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-700 bg-white font-semibold"
                />
              </div>
            </div>

            {/* Outcome */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Outcome of Treatment / Procedure
              </label>
              <input
                type="text"
                placeholder="e.g. Patient stabilized, pain relieved, wounds healthy, discharged"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-700 bg-white"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: DISCHARGE NOTES & CONDITIONS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-4 h-4 text-teal-800" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. Discharge Notes &amp; Status
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Advice Checkboxes */}
            <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dischargeAdvisedByDoctor}
                  onChange={(e) => {
                    setDischargeAdvisedByDoctor(e.target.checked);
                    if (e.target.checked) setIsLama(false);
                  }}
                  className="w-4 h-4 text-teal-700 rounded border-slate-300 focus:ring-teal-500"
                />
                <span className="font-bold text-slate-800">Discharge advised by Doctor</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLama}
                  onChange={(e) => {
                    setIsLama(e.target.checked);
                    if (e.target.checked) setDischargeAdvisedByDoctor(false);
                  }}
                  className="w-4 h-4 text-rose-700 rounded border-slate-300 focus:ring-rose-500"
                />
                <div>
                  <span className="font-bold text-rose-900 block">LAMA</span>
                  <span className="text-[11px] text-slate-500">Leave Against Medical Advice</span>
                </div>
              </label>
            </div>

            {/* Condition on Discharge */}
            <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">
                Condition on Discharge *
              </label>
              <div className="flex items-center gap-5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dischargeCondition"
                    value="Satisfactory"
                    checked={dischargeCondition === "Satisfactory"}
                    onChange={() => setDischargeCondition("Satisfactory")}
                    className="w-4 h-4 text-teal-700 focus:ring-teal-500"
                  />
                  <span className="font-semibold text-slate-800">Satisfactory</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dischargeCondition"
                    value="Fair"
                    checked={dischargeCondition === "Fair"}
                    onChange={() => setDischargeCondition("Fair")}
                    className="w-4 h-4 text-amber-700 focus:ring-amber-500"
                  />
                  <span className="font-semibold text-slate-800">Fair</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dischargeCondition"
                    value="Poor"
                    checked={dischargeCondition === "Poor"}
                    onChange={() => setDischargeCondition("Poor")}
                    className="w-4 h-4 text-rose-700 focus:ring-rose-500"
                  />
                  <span className="font-semibold text-slate-800">Poor</span>
                </label>
              </div>

              {/* Date of Discharge */}
              <div className="pt-2 border-t border-slate-200 flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Date of Discharge
                  </label>
                  <input
                    type="date"
                    value={dischargeDate}
                    onChange={(e) => setDischargeDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-1.5 bg-white font-mono"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Time of Discharge
                  </label>
                  <input
                    type="text"
                    value={dischargeTime}
                    onChange={(e) => setDischargeTime(e.target.value)}
                    placeholder="e.g. 11:30 AM"
                    className="w-full text-xs border border-slate-300 rounded-lg p-1.5 bg-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: DISCHARGE MEDICATIONS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-teal-800" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. Medication Given on Discharge
              </h2>
            </div>

            <button
              type="button"
              onClick={handleAddMedication}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-xl transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Medicine</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-2 w-10 text-center">Sr.</th>
                  <th className="py-2.5 px-2 min-w-[180px]">Medicine *</th>
                  <th className="py-2.5 px-2 min-w-[120px]">Strength / Dose</th>
                  <th className="py-2.5 px-2 min-w-[100px]">Route</th>
                  <th className="py-2.5 px-2 min-w-[100px]">Frequency</th>
                  <th className="py-2.5 px-2 min-w-[110px]">Timing</th>
                  <th className="py-2.5 px-2 min-w-[100px]">Duration</th>
                  <th className="py-2.5 px-2 w-10 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medications.map((med, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="py-2 px-2 text-center font-mono font-bold text-slate-500">
                      {index + 1}
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        placeholder="e.g. Tab. Cefixime"
                        value={med.medicineName}
                        onChange={(e) => handleMedicationChange(index, "medicineName", e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs font-semibold text-slate-900 bg-white"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        placeholder="e.g. 400 mg"
                        value={med.dosage}
                        onChange={(e) => handleMedicationChange(index, "dosage", e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={med.route}
                        onChange={(e) => handleMedicationChange(index, "route", e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white font-medium"
                      >
                        <option value="Oral">Oral</option>
                        <option value="IV">IV</option>
                        <option value="IM">IM</option>
                        <option value="Topical">Topical</option>
                        <option value="Inhalation">Inhalation</option>
                        <option value="Sublingual">Sublingual</option>
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        placeholder="e.g. BD (Twice daily)"
                        value={med.frequency}
                        onChange={(e) => handleMedicationChange(index, "frequency", e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        placeholder="e.g. After meals"
                        value={med.timing || ""}
                        onChange={(e) => handleMedicationChange(index, "timing", e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        placeholder="e.g. 5 days"
                        value={med.duration}
                        onChange={(e) => handleMedicationChange(index, "duration", e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-1.5 text-xs bg-white font-mono"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveMedication(index)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                        title="Remove Medicine"
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

        {/* SECTION 4: DISCHARGE INSTRUCTIONS & FOLLOW-UP */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calendar className="w-4 h-4 text-teal-800" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              4. Discharge Instructions &amp; Follow-up
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Discharge Instructions / Care Advice
              </label>
              <textarea
                rows={4}
                value={dischargeInstructions}
                onChange={(e) => setDischargeInstructions(e.target.value)}
                placeholder="Wound care, activity restrictions, warning signs, dietary advice..."
                className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-700 bg-white leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl p-2.5 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Follow-up Instructions / Department
                </label>
                <input
                  type="text"
                  placeholder="e.g. Review with Dr. in OPD after 1 week with CBC report"
                  value={followUpInstructions}
                  onChange={(e) => setFollowUpInstructions(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ACTION CONTROLS BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-4 py-2.5 rounded-xl transition"
            >
              <Eye className="w-4 h-4 text-slate-600" />
              <span>Preview Document</span>
            </button>

            <button
              type="button"
              onClick={handlePrintDocument}
              className="inline-flex items-center gap-2 text-xs font-bold text-teal-800 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-4 py-2.5 rounded-xl transition"
            >
              <Printer className="w-4 h-4 text-teal-800" />
              <span>Print / Save PDF</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 px-4 py-2.5 rounded-xl transition disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-slate-500" />
              <span>{isSubmitting ? "Saving..." : "Save Draft"}</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting || completedDischarge}
              onClick={() => handleSubmit(false)}
              className={`inline-flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50 ${
                completedDischarge
                  ? "bg-emerald-700 text-white"
                  : "bg-rose-700 hover:bg-rose-800 text-white"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{completedDischarge ? "Patient Discharged" : "Generate & Finalize Discharge"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* FULL A4 DOCUMENT PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-teal-800" />
                <span className="text-xs font-bold text-slate-900 uppercase">
                  Discharge Form Preview (A4 Patient Copy)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintDocument}
                  className="px-3 py-1.5 text-xs font-bold bg-teal-800 hover:bg-teal-900 text-white rounded-lg inline-flex items-center gap-1.5 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto bg-slate-100">
              <DischargeDocumentView data={previewDocumentData} showWatermark={!completedDischarge} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
