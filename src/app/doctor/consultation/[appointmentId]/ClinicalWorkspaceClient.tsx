"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Stethoscope,
  Activity,
  FileText,
  Pill,
  Clock,
  History,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ArrowLeft,
  X,
  ExternalLink,
  ShieldCheck,
  Lock,
} from "lucide-react";

interface VitalSignItem {
  id: string;
  systolicBP: number | null;
  diastolicBP: number | null;
  pulse: number | null;
  temperature: string | number | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  weight: string | number | null;
  height: string | number | null;
  bmi: string | number | null;
  painScore: number | null;
  generalCondition: string | null;
  observations: string | null;
  recordedByName: string;
  recordedAt: string;
}

interface PrescriptionItemRow {
  medicineName: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  instructions?: string;
}

interface PastConsultationItem {
  id: string;
  consultationNumber: string;
  consultationDate: string;
  presentingComplaints: string | null;
  provisionalDiagnosis: string | null;
  finalDiagnosis: string | null;
  treatmentPlan: string | null;
  doctor: {
    firstName: string;
    lastName: string;
    specialization: string;
  };
}

interface PastPrescriptionItem {
  id: string;
  prescriptionNumber: string;
  createdAt: string;
  diagnosis: string | null;
  doctor: {
    firstName: string;
    lastName: string;
  };
  items: Array<{
    id: string;
    medicineName: string;
    dosage: string;
    frequency: string;
    route: string;
    duration: string;
    instructions: string | null;
  }>;
}

interface PatientData {
  id: string;
  patientNumber: string;
  mrNumber: string | null;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  bloodGroup: string;
  phone: string;
  allergies: string[];
  chronicConditions: string[];
  vitalSigns: VitalSignItem[];
  consultations: PastConsultationItem[];
  prescriptions: PastPrescriptionItem[];
}

interface AppointmentData {
  id: string;
  appointmentNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  reason: string;
  status: string;
  isEmergency: boolean;
}

interface ConsultationData {
  id: string;
  consultationNumber: string;
  status: string;
  presentingComplaints: string | null;
  medicalHistory: string | null;
  medicationHistory: string | null;
  familyHistory: string | null;
  physicalExamination: string | null;
  provisionalDiagnosis: string | null;
  finalDiagnosis: string | null;
  investigations: string | null;
  treatmentPlan: string | null;
  prescriptions?: Array<{
    id: string;
    prescriptionNumber: string;
    items: PrescriptionItemRow[];
  }>;
  vitalSigns?: VitalSignItem[];
}

interface Props {
  appointmentId: string;
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
    specialization: string;
  };
}

export default function ClinicalWorkspaceClient({ appointmentId, doctor }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [completing, setCompleting] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [consultation, setConsultation] = useState<ConsultationData | null>(null);

  // Active workspace tab: "assessment", "vitals", "prescription"
  const [activeTab, setActiveTab] = useState<"assessment" | "vitals" | "prescription">("assessment");

  // History Slide-over Modal
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyTab, setHistoryTab] = useState<"consultations" | "vitals" | "prescriptions">("consultations");

  // Confirmation Modal
  const [showCompleteConfirm, setShowCompleteConfirm] = useState<boolean>(false);

  // Assessment form state
  const [presentingComplaints, setPresentingComplaints] = useState<string>("");
  const [medicalHistory, setMedicalHistory] = useState<string>("");
  const [medicationHistory, setMedicationHistory] = useState<string>("");
  const [familyHistory, setFamilyHistory] = useState<string>("");
  const [physicalExamination, setPhysicalExamination] = useState<string>("");
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState<string>("");
  const [finalDiagnosis, setFinalDiagnosis] = useState<string>("");
  const [investigations, setInvestigations] = useState<string>("");
  const [treatmentPlan, setTreatmentPlan] = useState<string>("");
  const [recommendAdmission, setRecommendAdmission] = useState<boolean>(false);
  const [admissionReason, setAdmissionReason] = useState<string>("");

  // Prescription items state
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItemRow[]>([
    { medicineName: "", dosage: "", frequency: "Once daily", route: "Oral", duration: "5 days", instructions: "" },
  ]);

  // Vitals form state
  const [newVitals, setNewVitals] = useState({
    systolicBP: "",
    diastolicBP: "",
    pulse: "",
    temperature: "",
    respiratoryRate: "",
    oxygenSaturation: "",
    weight: "",
    height: "",
    painScore: "",
    generalCondition: "Stable",
    observations: "",
  });
  const [recordingVitals, setRecordingVitals] = useState<boolean>(false);
  const [vitalsMsg, setVitalsMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load complete consultation workspace data
  const loadWorkspace = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/doctor/consultations/${appointmentId}`);
      if (!res.ok) {
        throw new Error("Failed to load consultation data");
      }
      const data = await res.json();
      setAppointment(data.appointment);
      setPatient(data.patient);
      setConsultation(data.consultation);

      // Populate assessment state
      if (data.consultation) {
        setPresentingComplaints(data.consultation.presentingComplaints || data.appointment.reason || "");
        setMedicalHistory(data.consultation.medicalHistory || "");
        setMedicationHistory(data.consultation.medicationHistory || "");
        setFamilyHistory(data.consultation.familyHistory || "");
        setPhysicalExamination(data.consultation.physicalExamination || "");
        setProvisionalDiagnosis(data.consultation.provisionalDiagnosis || "");
        setFinalDiagnosis(data.consultation.finalDiagnosis || "");
        setInvestigations(data.consultation.investigations || "");
        setTreatmentPlan(data.consultation.treatmentPlan || "");

        // Populate prescription items if present
        if (data.consultation.prescriptions && data.consultation.prescriptions.length > 0) {
          const rx = data.consultation.prescriptions[0];
          if (rx.items && rx.items.length > 0) {
            setPrescriptionItems(
              rx.items.map((i: any) => ({
                medicineName: i.medicineName,
                dosage: i.dosage,
                frequency: i.frequency,
                route: i.route,
                duration: i.duration,
                instructions: i.instructions || "",
              }))
            );
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, [appointmentId]);

  // Calculate age helper
  const calculateAge = (dob: string) => {
    if (!dob) return "N/A";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} yrs`;
  };

  // Auto-calculated BMI for new vitals form
  const calculatedBMI = () => {
    const w = parseFloat(newVitals.weight);
    const h = parseFloat(newVitals.height);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      const heightInMeters = h / 100;
      return (w / (heightInMeters * heightInMeters)).toFixed(1);
    }
    return null;
  };

  // Handle Recording New Vitals
  const handleRecordVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setRecordingVitals(true);
    setVitalsMsg(null);

    try {
      const payload = {
        patientId: patient.id,
        consultationId: consultation?.id,
        systolicBP: newVitals.systolicBP ? parseInt(newVitals.systolicBP, 10) : null,
        diastolicBP: newVitals.diastolicBP ? parseInt(newVitals.diastolicBP, 10) : null,
        pulse: newVitals.pulse ? parseInt(newVitals.pulse, 10) : null,
        temperature: newVitals.temperature ? parseFloat(newVitals.temperature) : null,
        respiratoryRate: newVitals.respiratoryRate ? parseInt(newVitals.respiratoryRate, 10) : null,
        oxygenSaturation: newVitals.oxygenSaturation ? parseInt(newVitals.oxygenSaturation, 10) : null,
        weight: newVitals.weight ? parseFloat(newVitals.weight) : null,
        height: newVitals.height ? parseFloat(newVitals.height) : null,
        painScore: newVitals.painScore ? parseInt(newVitals.painScore, 10) : null,
        generalCondition: newVitals.generalCondition,
        observations: newVitals.observations,
      };

      const res = await fetch("/api/doctor/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setVitalsMsg({ type: "error", text: data.error || "Failed to record vitals" });
      } else {
        setVitalsMsg({ type: "success", text: "Vitals recorded and logged successfully!" });
        // Reset form
        setNewVitals({
          systolicBP: "",
          diastolicBP: "",
          pulse: "",
          temperature: "",
          respiratoryRate: "",
          oxygenSaturation: "",
          weight: "",
          height: "",
          painScore: "",
          generalCondition: "Stable",
          observations: "",
        });
        // Reload patient vitals history
        loadWorkspace();
      }
    } catch {
      setVitalsMsg({ type: "error", text: "Network error saving vital signs" });
    } finally {
      setRecordingVitals(false);
    }
  };

  // Prescription item row helpers
  const handleAddMedicineRow = () => {
    setPrescriptionItems([
      ...prescriptionItems,
      { medicineName: "", dosage: "", frequency: "Once daily", route: "Oral", duration: "5 days", instructions: "" },
    ]);
  };

  const handleRemoveMedicineRow = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };

  const handleMedicineChange = (index: number, field: keyof PrescriptionItemRow, value: string) => {
    const updated = [...prescriptionItems];
    updated[index][field] = value;
    setPrescriptionItems(updated);
  };

  // Save Progress (Draft)
  const handleSaveProgress = async () => {
    setSaving(true);
    setSaveSuccessMsg(null);
    try {
      const payload = {
        presentingComplaints,
        medicalHistory,
        medicationHistory,
        familyHistory,
        physicalExamination,
        provisionalDiagnosis,
        finalDiagnosis,
        investigations,
        treatmentPlan,
        prescriptionItems: prescriptionItems.filter((i) => i.medicineName.trim().length > 0),
      };

      const res = await fetch(`/api/doctor/consultations/${appointmentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save consultation draft");
      } else {
        setSaveSuccessMsg("Consultation draft saved successfully.");
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch {
      alert("Network error saving consultation draft");
    } finally {
      setSaving(false);
    }
  };

  // Complete Consultation
  const handleCompleteConsultation = async () => {
    setCompleting(true);
    try {
      const payload = {
        presentingComplaints,
        medicalHistory,
        medicationHistory,
        familyHistory,
        physicalExamination,
        provisionalDiagnosis,
        finalDiagnosis,
        investigations,
        treatmentPlan,
        recommendAdmission,
        admissionReason,
        prescriptionItems: prescriptionItems.filter((i) => i.medicineName.trim().length > 0),
      };

      const res = await fetch(`/api/doctor/consultations/${appointmentId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to complete consultation");
        setCompleting(false);
      } else {
        router.push("/doctor/queue?status=completed");
      }
    } catch {
      alert("Network error completing consultation");
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center text-sm text-slate-500">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading clinical consultation workspace...
      </div>
    );
  }

  if (!patient || !appointment) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-sm font-semibold text-slate-700">Unable to load patient record</p>
        <Link href="/doctor/queue" className="mt-3 inline-block text-xs font-bold text-teal-600">
          &larr; Return to Patient Queue
        </Link>
      </div>
    );
  }

  const isCompleted = consultation?.status === "COMPLETED";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header / Back Nav */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/doctor/queue"
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-teal-700 transition"
            title="Back to Queue"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-teal-700 uppercase tracking-wider">
              <span>Physician Consultation</span>
              <span>•</span>
              <span className="font-mono">{consultation?.consultationNumber}</span>
              <span>•</span>
              <span className="text-slate-500">Appt #{appointment.appointmentNumber}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
              Clinical Workspace
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCompleted ? (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200">
              <Lock className="w-3.5 h-3.5" />
              <span>Consultation Completed &amp; Locked</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSaveProgress}
                disabled={saving || completing}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs shadow-xs transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-slate-600" />
                <span>{saving ? "Saving Draft..." : "Save Progress"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCompleteConfirm(true)}
                disabled={saving || completing}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Consultation</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PATIENT DEMOGRAPHICS & CLINICAL BANNER                                     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-700 text-white font-bold text-xl flex items-center justify-center shrink-0 shadow-xs">
              {patient.firstName.charAt(0)}
              {patient.lastName.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  {patient.firstName} {patient.lastName}
                </h2>
                <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {patient.mrNumber || patient.patientNumber}
                </span>
                {appointment.isEmergency && (
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                    Emergency
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1">
                <span>Age: <strong className="text-slate-900">{calculateAge(patient.dateOfBirth)}</strong></span>
                <span>•</span>
                <span>Gender: <strong className="text-slate-900">{patient.gender}</strong></span>
                <span>•</span>
                <span>Blood: <strong className="text-slate-900">{patient.bloodGroup}</strong></span>
                <span>•</span>
                <span>Phone: <strong className="text-slate-900">{patient.phone}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs border border-teal-200 transition"
            >
              <History className="w-3.5 h-3.5 text-teal-700" />
              <span>View Full History ({patient.consultations.length} Consults)</span>
            </button>

            <Link
              href={`/patients/${patient.id}`}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Full Patient EMR Profile"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Clinical Alert Tags */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-rose-800 uppercase tracking-wider text-[11px] shrink-0">
              Allergies:
            </span>
            {patient.allergies && patient.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {patient.allergies.map((all, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200"
                  >
                    {all}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-400 italic">No documented drug or food allergies</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-800 uppercase tracking-wider text-[11px] shrink-0">
              Chronic:
            </span>
            {patient.chronicConditions && patient.chronicConditions.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {patient.chronicConditions.map((cond, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200"
                  >
                    {cond}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-400 italic">No active chronic conditions noted</span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CLINICAL NAVIGATION TABS                                                  */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("assessment")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === "assessment"
              ? "bg-teal-600 text-white shadow-xs"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Clinical Assessment &amp; Diagnosis</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("vitals")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === "vitals"
              ? "bg-teal-600 text-white shadow-xs"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Vital Signs ({patient.vitalSigns.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("prescription")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
            activeTab === "prescription"
              ? "bg-teal-600 text-white shadow-xs"
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Digital Prescription ({prescriptionItems.filter((i) => i.medicineName).length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CLINICAL ASSESSMENT & DIAGNOSIS                                    */}
      {/* ========================================================================= */}
      {activeTab === "assessment" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Clinical Evaluation</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Document patient symptoms, clinical history, examination, diagnosis, and plan
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Presenting Complaints */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Presenting Complaints / Chief Complaint *
              </label>
              <textarea
                rows={3}
                disabled={isCompleted}
                value={presentingComplaints}
                onChange={(e) => setPresentingComplaints(e.target.value)}
                placeholder="Describe current symptoms, duration, severity, and onset..."
                className="w-full text-xs text-black border border-slate-300 rounded-lg p-3 focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
              />
            </div>

            {/* Medical History */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Past Medical / Surgical History
              </label>
              <textarea
                rows={3}
                disabled={isCompleted}
                value={medicalHistory}
                onChange={(e) => setMedicalHistory(e.target.value)}
                placeholder="Previous hospitalizations, major surgeries, chronic illnesses..."
                className="w-full text-xs text-black border border-slate-300 rounded-lg p-3 focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
              />
            </div>

            {/* Medication History */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Current Medication History
              </label>
              <textarea
                rows={3}
                disabled={isCompleted}
                value={medicationHistory}
                onChange={(e) => setMedicationHistory(e.target.value)}
                placeholder="Ongoing prescription drugs, OTC medications, adherence..."
                className="w-full text-xs text-black border border-slate-300 rounded-lg p-3 focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
              />
            </div>

            {/* Family History */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Family Medical History
              </label>
              <textarea
                rows={3}
                disabled={isCompleted}
                value={familyHistory}
                onChange={(e) => setFamilyHistory(e.target.value)}
                placeholder="Hereditary conditions, diabetes, cardiac disorders, asthma..."
                className="w-full text-xs text-black border border-slate-300 rounded-lg p-3 focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
              />
            </div>

            {/* Physical Examination */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Physical Examination &amp; Systemic Findings
              </label>
              <textarea
                rows={3}
                disabled={isCompleted}
                value={physicalExamination}
                onChange={(e) => setPhysicalExamination(e.target.value)}
                placeholder="Chest, CVS, Abdomen, CNS, Ent, Skin findings..."
                className="w-full text-xs text-black border border-slate-300 rounded-lg p-3 focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
              />
            </div>

            {/* Provisional Diagnosis */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Provisional Diagnosis
              </label>
              <input
                type="text"
                disabled={isCompleted}
                value={provisionalDiagnosis}
                onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                placeholder="e.g. Acute Bronchitis, Enteric Fever..."
                className="w-full text-xs text-black border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
              />
            </div>

            {/* Final Diagnosis */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Final Diagnosis *
              </label>
              <input
                type="text"
                disabled={isCompleted}
                value={finalDiagnosis}
                onChange={(e) => setFinalDiagnosis(e.target.value)}
                placeholder="Confirmed clinical diagnosis..."
                className="w-full text-xs text-black border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none font-semibold disabled:bg-slate-50"
              />
            </div>

            {/* Investigations */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Recommended Investigations / Laboratory Orders
              </label>
              <textarea
                rows={3}
                disabled={isCompleted}
                value={investigations}
                onChange={(e) => setInvestigations(e.target.value)}
                placeholder="e.g. CBC, ESR, Chest X-Ray PA, Serum Creatinine..."
                className="w-full text-xs text-black border border-slate-300 rounded-lg p-3 focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
              />
            </div>

            {/* Treatment Plan */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Therapeutic &amp; Treatment Plan
              </label>
              <textarea
                rows={3}
                disabled={isCompleted}
                value={treatmentPlan}
                onChange={(e) => setTreatmentPlan(e.target.value)}
                placeholder="Dietary instructions, lifestyle advice, rest, follow-up..."
                className="w-full text-xs text-black border border-slate-300 rounded-lg p-3 focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
              />
            </div>

            {/* Inpatient Admission Recommendation Card */}
            <div className={`p-4 rounded-xl border transition ${
              recommendAdmission
                ? "bg-amber-50/60 border-amber-300 ring-2 ring-amber-400/20"
                : "bg-slate-50 border-slate-200"
            }`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isCompleted}
                  checked={recommendAdmission}
                  onChange={(e) => setRecommendAdmission(e.target.checked)}
                  className="w-4 h-4 accent-amber-600 rounded"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Recommend Inpatient Hospital Admission
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Signals frontdesk reception to initiate inpatient bed assignment and consent procedures.
                  </span>
                </div>
              </label>

              {recommendAdmission && (
                <div className="mt-3 pt-3 border-t border-amber-200/80 space-y-2">
                  <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Admission Clinical Indication &amp; Priority Notes
                  </label>
                  <input
                    type="text"
                    disabled={isCompleted}
                    value={admissionReason}
                    onChange={(e) => setAdmissionReason(e.target.value)}
                    placeholder="e.g. Acute exacerbation, Emergency surgical evaluation, IV hydration & observation..."
                    className="w-full text-xs text-black border border-amber-300 bg-white rounded-lg px-3 py-2 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VITAL SIGNS                                                        */}
      {/* ========================================================================= */}
      {activeTab === "vitals" && (
        <div className="space-y-6">
          {/* New Vitals Recording Form */}
          {!isCompleted && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Record New Vital Signs</h3>
                  <p className="text-xs text-slate-500">
                    Logged as Physician encounter • Automatic BMI calculation
                  </p>
                </div>
                {calculatedBMI() && (
                  <div className="bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-lg text-xs font-bold">
                    Calculated BMI: {calculatedBMI()} kg/m²
                  </div>
                )}
              </div>

              {vitalsMsg && (
                <div
                  className={`p-3 rounded-lg text-xs font-semibold ${
                    vitalsMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {vitalsMsg.text}
                </div>
              )}

              <form onSubmit={handleRecordVitals} className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* BP */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Systolic BP (mmHg)
                    </label>
                    <input
                      type="number"
                      placeholder="120"
                      value={newVitals.systolicBP}
                      onChange={(e) => setNewVitals({ ...newVitals, systolicBP: e.target.value })}
                      className="w-full text-xs text-black border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Diastolic BP (mmHg)
                    </label>
                    <input
                      type="number"
                      placeholder="80"
                      value={newVitals.diastolicBP}
                      onChange={(e) => setNewVitals({ ...newVitals, diastolicBP: e.target.value })}
                      className="w-full text-xs text-black border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  {/* Pulse */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Pulse (bpm)
                    </label>
                    <input
                      type="number"
                      placeholder="72"
                      value={newVitals.pulse}
                      onChange={(e) => setNewVitals({ ...newVitals, pulse: e.target.value })}
                      className="w-full text-xs text-black border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  {/* Temp */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Temp (°F)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="98.6"
                      value={newVitals.temperature}
                      onChange={(e) => setNewVitals({ ...newVitals, temperature: e.target.value })}
                      className="w-full text-xs text-black border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  {/* SpO2 */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      SpO2 (%)
                    </label>
                    <input
                      type="number"
                      placeholder="98"
                      value={newVitals.oxygenSaturation}
                      onChange={(e) => setNewVitals({ ...newVitals, oxygenSaturation: e.target.value })}
                      className="w-full text-xs text-black border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  {/* RR */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Resp. Rate (/min)
                    </label>
                    <input
                      type="number"
                      placeholder="18"
                      value={newVitals.respiratoryRate}
                      onChange={(e) => setNewVitals({ ...newVitals, respiratoryRate: e.target.value })}
                      className="w-full text-xs text-black border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  {/* Height */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="175"
                      value={newVitals.height}
                      onChange={(e) => setNewVitals({ ...newVitals, height: e.target.value })}
                      className="w-full text-xs text-black border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  {/* Weight */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="70"
                      value={newVitals.weight}
                      onChange={(e) => setNewVitals({ ...newVitals, weight: e.target.value })}
                      className="w-full text-xs text-black border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Pain Score (0-10)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      placeholder="0"
                      value={newVitals.painScore}
                      onChange={(e) => setNewVitals({ ...newVitals, painScore: e.target.value })}
                      className="w-full text-xs text-black border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      General Condition
                    </label>
                    <select
                      value={newVitals.generalCondition}
                      onChange={(e) => setNewVitals({ ...newVitals, generalCondition: e.target.value })}
                      className="w-full text-xs text-black bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    >
                      <option value="Stable">Stable</option>
                      <option value="Distressed">Distressed</option>
                      <option value="Febrile">Febrile</option>
                      <option value="Toxic">Toxic</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Observations
                    </label>
                    <input
                      type="text"
                      placeholder="Notes..."
                      value={newVitals.observations}
                      onChange={(e) => setNewVitals({ ...newVitals, observations: e.target.value })}
                      className="w-full text-xs text-black border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={recordingVitals}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>{recordingVitals ? "Saving..." : "Save Vital Signs"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Historical Vitals Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Patient Vital Signs Record ({patient.vitalSigns.length})
              </h4>
            </div>

            {patient.vitalSigns.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No historical vital signs recorded for this patient yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Date &amp; Time</th>
                      <th className="py-2.5 px-3">BP (mmHg)</th>
                      <th className="py-2.5 px-3">Pulse</th>
                      <th className="py-2.5 px-3">Temp</th>
                      <th className="py-2.5 px-3">SpO2</th>
                      <th className="py-2.5 px-3">Weight / Height</th>
                      <th className="py-2.5 px-3">BMI</th>
                      <th className="py-2.5 px-3">Condition</th>
                      <th className="py-2.5 px-3">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {patient.vitalSigns.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {new Date(v.recordedAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {v.systolicBP && v.diastolicBP ? `${v.systolicBP}/${v.diastolicBP}` : "—"}
                        </td>
                        <td className="py-2.5 px-3">{v.pulse ? `${v.pulse} bpm` : "—"}</td>
                        <td className="py-2.5 px-3">{v.temperature ? `${v.temperature}°` : "—"}</td>
                        <td className="py-2.5 px-3 font-semibold text-teal-800">
                          {v.oxygenSaturation ? `${v.oxygenSaturation}%` : "—"}
                        </td>
                        <td className="py-2.5 px-3">
                          {v.weight ? `${v.weight} kg` : "—"} {v.height ? `/ ${v.height} cm` : ""}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-700">
                          {v.bmi ? `${v.bmi}` : "—"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {v.generalCondition || "Stable"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 truncate max-w-[120px]">
                          {v.recordedByName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DIGITAL PRESCRIPTION BUILDER                                       */}
      {/* ========================================================================= */}
      {activeTab === "prescription" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Prescription Builder</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate official prescription items for outpatient pharmacy dispensing
              </p>
            </div>
            {!isCompleted && (
              <button
                type="button"
                onClick={handleAddMedicineRow}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs border border-teal-200 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Medicine</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {prescriptionItems.map((item, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-800">
                    #{index + 1} Medication Item
                  </span>
                  {!isCompleted && prescriptionItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMedicineRow(index)}
                      className="text-rose-600 hover:text-rose-800 p-1"
                      title="Remove Medication"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                  {/* Medicine Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Medicine Name *
                    </label>
                    <input
                      type="text"
                      disabled={isCompleted}
                      placeholder="e.g. Paracetamol, Amoxicillin..."
                      value={item.medicineName}
                      onChange={(e) => handleMedicineChange(index, "medicineName", e.target.value)}
                      className="w-full text-xs text-black border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50 font-semibold"
                    />
                  </div>

                  {/* Dosage */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Dosage
                    </label>
                    <input
                      type="text"
                      disabled={isCompleted}
                      placeholder="500 mg, 10 ml..."
                      value={item.dosage}
                      onChange={(e) => handleMedicineChange(index, "dosage", e.target.value)}
                      className="w-full text-xs text-black border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
                    />
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Frequency
                    </label>
                    <select
                      disabled={isCompleted}
                      value={item.frequency}
                      onChange={(e) => handleMedicineChange(index, "frequency", e.target.value)}
                      className="w-full text-xs text-black bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
                    >
                      <option value="Once daily (OD)">Once daily (OD)</option>
                      <option value="Twice daily (BD)">Twice daily (BD)</option>
                      <option value="3 times daily (TDS)">3 times daily (TDS)</option>
                      <option value="4 times daily (QDS)">4 times daily (QDS)</option>
                      <option value="Every 8 hours">Every 8 hours</option>
                      <option value="As needed (PRN)">As needed (PRN)</option>
                      <option value="At bedtime">At bedtime</option>
                    </select>
                  </div>

                  {/* Route */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Route
                    </label>
                    <select
                      disabled={isCompleted}
                      value={item.route}
                      onChange={(e) => handleMedicineChange(index, "route", e.target.value)}
                      className="w-full text-xs text-black bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
                    >
                      <option value="Oral">Oral</option>
                      <option value="IV">Intravenous (IV)</option>
                      <option value="IM">Intramuscular (IM)</option>
                      <option value="Sublingual">Sublingual</option>
                      <option value="Topical">Topical</option>
                      <option value="Inhalation">Inhalation</option>
                      <option value="Eye Drops">Eye Drops</option>
                    </select>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Duration
                    </label>
                    <input
                      type="text"
                      disabled={isCompleted}
                      placeholder="5 days, 2 weeks..."
                      value={item.duration}
                      onChange={(e) => handleMedicineChange(index, "duration", e.target.value)}
                      className="w-full text-xs text-black border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
                    />
                  </div>

                  {/* Instructions */}
                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      disabled={isCompleted}
                      placeholder="Special instructions: After meals, with plenty of water, avoid dairy..."
                      value={item.instructions || ""}
                      onChange={(e) => handleMedicineChange(index, "instructions", e.target.value)}
                      className="w-full text-xs text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-teal-500 focus:outline-none disabled:bg-slate-50"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!isCompleted && (
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleAddMedicineRow}
                className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Another Medicine</span>
              </button>

              <button
                type="button"
                onClick={handleSaveProgress}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
              >
                <Save className="w-3.5 h-3.5 text-slate-600" />
                <span>Save Prescription Draft</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* HISTORY MODAL SLIDE-OVER                                                  */}
      {/* ========================================================================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {patient.firstName} {patient.lastName} — Medical History
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {patient.mrNumber || patient.patientNumber} • {patient.gender} • {calculateAge(patient.dateOfBirth)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* History Tabs */}
            <div className="px-5 pt-3 border-b border-slate-200 flex items-center gap-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setHistoryTab("consultations")}
                className={`pb-2.5 transition border-b-2 ${
                  historyTab === "consultations"
                    ? "border-teal-600 text-teal-800"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Past Consultations ({patient.consultations.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab("vitals")}
                className={`pb-2.5 transition border-b-2 ${
                  historyTab === "vitals"
                    ? "border-teal-600 text-teal-800"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Vitals History ({patient.vitalSigns.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab("prescriptions")}
                className={`pb-2.5 transition border-b-2 ${
                  historyTab === "prescriptions"
                    ? "border-teal-600 text-teal-800"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Prescriptions ({patient.prescriptions.length})
              </button>
            </div>

            {/* History Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {/* Consultations Tab */}
              {historyTab === "consultations" && (
                <div className="space-y-3">
                  {patient.consultations.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-8">
                      No previous clinical consultations recorded.
                    </p>
                  ) : (
                    patient.consultations.map((cns) => (
                      <div
                        key={cns.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-teal-800">
                            {cns.consultationNumber}
                          </span>
                          <span className="text-slate-500">
                            {new Date(cns.consultationDate).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-700">
                          <strong>Clinician:</strong> Dr. {cns.doctor.firstName} {cns.doctor.lastName} ({cns.doctor.specialization})
                        </p>
                        {cns.finalDiagnosis && (
                          <p className="text-slate-800">
                            <strong>Diagnosis:</strong> {cns.finalDiagnosis}
                          </p>
                        )}
                        {cns.presentingComplaints && (
                          <p className="text-slate-600">
                            <strong>Complaints:</strong> {cns.presentingComplaints}
                          </p>
                        )}
                        {cns.treatmentPlan && (
                          <p className="text-slate-600">
                            <strong>Plan:</strong> {cns.treatmentPlan}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Vitals Tab */}
              {historyTab === "vitals" && (
                <div className="space-y-2">
                  {patient.vitalSigns.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-8">
                      No vital signs history available.
                    </p>
                  ) : (
                    patient.vitalSigns.map((v) => (
                      <div
                        key={v.id}
                        className="p-3 rounded-lg border border-slate-200 bg-slate-50/40 text-xs flex items-center justify-between gap-4"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 block">
                            BP: {v.systolicBP && v.diastolicBP ? `${v.systolicBP}/${v.diastolicBP}` : "—"} | Pulse: {v.pulse || "—"} bpm | Temp: {v.temperature ? `${v.temperature}°` : "—"}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            SpO2: {v.oxygenSaturation ? `${v.oxygenSaturation}%` : "—"} • BMI: {v.bmi || "—"} • Condition: {v.generalCondition || "Stable"}
                          </span>
                        </div>
                        <div className="text-right text-[11px] text-slate-500">
                          {new Date(v.recordedAt).toLocaleDateString()}
                          <span className="block text-[10px] text-slate-400">{v.recordedByName}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Prescriptions Tab */}
              {historyTab === "prescriptions" && (
                <div className="space-y-3">
                  {patient.prescriptions.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-8">
                      No historical prescriptions issued for this patient.
                    </p>
                  ) : (
                    patient.prescriptions.map((rx) => (
                      <div
                        key={rx.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-teal-800">
                            {rx.prescriptionNumber}
                          </span>
                          <span className="text-slate-500">
                            {new Date(rx.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-700">
                          <strong>Prescribed by:</strong> Dr. {rx.doctor.firstName} {rx.doctor.lastName}
                        </p>
                        {rx.diagnosis && (
                          <p className="text-slate-800">
                            <strong>Diagnosis:</strong> {rx.diagnosis}
                          </p>
                        )}
                        <div className="pt-1">
                          <span className="font-semibold text-slate-700 block mb-1">Medicines:</span>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
                            {rx.items.map((it) => (
                              <li key={it.id}>
                                <strong>{it.medicineName}</strong> {it.dosage} • {it.frequency} • {it.duration}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION MODAL: COMPLETE CONSULTATION                                 */}
      {/* ========================================================================= */}
      {showCompleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-teal-800">
              <ShieldCheck className="w-6 h-6 text-teal-600" />
              <h3 className="text-base font-bold text-slate-900">
                Complete Clinical Consultation?
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to conclude the clinical encounter for{" "}
              <strong>
                {patient.firstName} {patient.lastName}
              </strong>
              . This will:
            </p>

            <ul className="text-xs text-slate-600 list-disc list-inside space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <li>Save final diagnosis and clinical assessment notes.</li>
              <li>Issue and lock digital prescription with medication items.</li>
              <li>Mark Outpatient Appointment #{appointment.appointmentNumber} as <strong>COMPLETED</strong>.</li>
              <li>Record timestamped Patient Timeline Events.</li>
            </ul>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCompleteConfirm(false)}
                disabled={completing}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteConsultation}
                disabled={completing}
                className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
              >
                {completing ? "Completing Encounter..." : "Confirm & Complete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
