"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HeartPulse,
  FileText,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Flame,
  ShieldAlert,
  Palette,
  Pill,
  Stethoscope,
  Plus,
  RefreshCw,
  Clock,
  UserCheck,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Lock,
} from "lucide-react";
import RichNoteEditor from "@/components/ui/RichNoteEditor";
import SafeHtmlContent from "@/components/ui/SafeHtmlContent";

interface VitalSign {
  id: string;
  systolicBP: number | null;
  diastolicBP: number | null;
  pulse: number | null;
  temperature: number | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  painScore: number | null;
  generalCondition: string | null;
  observations: string | null;
  encounterType: string | null;
  recordedByName: string;
  recordedAt: string;
}

interface NursingNote {
  id: string;
  department: string;
  observation: string;
  patientCondition: string;
  intervention: string | null;
  response: string | null;
  notes: string | null;
  recordedByName: string;
  recordedAt: string;
}

interface EmergencyTriage {
  id: string;
  chiefComplaint: string;
  priority: string;
  triageLevel?: string | null;
  targetTime?: string | null;
  admissionDateTime?: string | null;
  dischargeDateTime?: string | null;
  provisionalDiagnosis?: string | null;
  finalDiagnosis?: string | null;
  medicationSheet?: any;
  painScore: number | null;
  generalCondition: string | null;
  observations: string | null;
  systolicBP: number | null;
  diastolicBP: number | null;
  pulse: number | null;
  temperature: number | null;
  oxygenSaturation: number | null;
  triagedByName: string;
  triagedAt: string;
}

export interface ConsultationRecord {
  id: string;
  consultationNumber: string;
  consultationDate: string;
  presentingComplaints: string | null;
  provisionalDiagnosis: string | null;
  finalDiagnosis: string | null;
  medicalHistory: string | null;
  medicationHistory: string | null;
  physicalExamination: string | null;
  investigations: string | null;
  treatmentPlan: string | null;
  status: string;
  doctor?: {
    id?: string;
    firstName: string;
    lastName: string;
    specialization: string;
    roomNumber?: string | null;
  } | null;
}

export interface PrescriptionRecord {
  id: string;
  prescriptionNumber: string;
  diagnosis?: string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
  doctor?: {
    firstName: string;
    lastName: string;
    specialization: string;
  } | null;
  items: Array<{
    id: string;
    medicineName: string;
    dosage: string;
    frequency: string;
    route: string;
    duration: string;
    instructions?: string | null;
  }>;
}

export interface MedicationAdminRecord {
  id: string;
  medicineName: string;
  dosage: string;
  route: string;
  status: string;
  administeredAt: string;
  administeredByName: string;
  notes?: string | null;
}

export interface AdmissionRecord {
  id: string;
  admissionNumber: string;
  admissionDate: string;
  admissionTime?: string | null;
  dischargeDate?: string | null;
  dischargeTime?: string | null;
  status: string;
  medicationHistory?: string | null;
  dischargeMedications?: string | null;
  provisionalDiagnosis?: string | null;
  finalDiagnosis?: string | null;
  treatmentPlan?: string | null;
  investigations?: string | null;
  operation?: string | null;
  dischargeSummary?: string | null;
  dischargeInstructions?: string | null;
  doctor?: {
    firstName: string;
    lastName: string;
    specialization: string;
  } | null;
}

interface PatientData {
  id: string;
  patientNumber: string;
  mrNumber: string | null;
  status?: string | null;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  email: string | null;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  cnic: string | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string | null;
  vitalSigns: VitalSign[];
  nursingNotes: NursingNote[];
  emergencyTriages: EmergencyTriage[];
  appointments: Array<Record<string, unknown>>;
  consultations?: ConsultationRecord[];
  prescriptions?: PrescriptionRecord[];
  medicationAdministrations?: MedicationAdminRecord[];
  admissions?: AdmissionRecord[];
}

interface NursePatientClientProps {
  patient: PatientData;
  nurseDepartment: string | null;
}

export default function NursePatientClient({
  patient: initialPatient,
  nurseDepartment,
}: NursePatientClientProps) {
  const [patient, setPatient] = useState<PatientData>(initialPatient);
  const [activeTab, setActiveTab] = useState<"vitals" | "notes" | "triage" | "medications" | "doctorNotes">("vitals");

  // Vitals form state
  const [vitalsSubmitting, setVitalsSubmitting] = useState(false);
  const [vitalsSuccess, setVitalsSuccess] = useState<string | null>(null);
  const [vitalsError, setVitalsError] = useState<string | null>(null);

  const [systolicBP, setSystolicBP] = useState("");
  const [diastolicBP, setDiastolicBP] = useState("");
  const [pulse, setPulse] = useState("");
  const [temperature, setTemperature] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [oxygenSaturation, setOxygenSaturation] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [painScore, setPainScore] = useState<number | "">("");
  const [generalCondition, setGeneralCondition] = useState("Stable");
  const [observations, setObservations] = useState("");

  // Auto-calculated BMI display
  const weightNum = parseFloat(weight);
  const heightNum = parseFloat(height);
  let liveBmi: string | null = null;
  if (!isNaN(weightNum) && !isNaN(heightNum) && heightNum > 0 && weightNum > 0) {
    const hM = heightNum / 100;
    liveBmi = (weightNum / (hM * hM)).toFixed(2);
  }

  // Nursing notes form state
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  const [noteCondition, setNoteCondition] = useState("");
  const [noteObservation, setNoteObservation] = useState("");
  const [noteIntervention, setNoteIntervention] = useState("");
  const [noteResponse, setNoteResponse] = useState("");
  const [noteAdditional, setNoteAdditional] = useState("");

  // Calculate age
  const birthDate = new Date(patient.dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  const isDischarged =
    patient.status === "DISCHARGED" ||
    patient.status === "DECEASED" ||
    Boolean(
      patient.admissions?.[0]?.dischargeDate ||
      patient.admissions?.[0]?.dischargeTime ||
      patient.emergencyTriages?.[0]?.dischargeDateTime
    );

  const dischargeTimestamp =
    patient.admissions?.[0]?.dischargeDate ||
    patient.admissions?.[0]?.dischargeTime ||
    patient.emergencyTriages?.[0]?.dischargeDateTime ||
    null;

  const handleRecordVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDischarged) {
      setVitalsError("Patient file is locked and read-only post-discharge.");
      return;
    }
    setVitalsSubmitting(true);
    setVitalsError(null);
    setVitalsSuccess(null);

    try {
      const payload = {
        systolicBP: systolicBP ? parseInt(systolicBP, 10) : null,
        diastolicBP: diastolicBP ? parseInt(diastolicBP, 10) : null,
        pulse: pulse ? parseInt(pulse, 10) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        respiratoryRate: respiratoryRate ? parseInt(respiratoryRate, 10) : null,
        oxygenSaturation: oxygenSaturation ? parseInt(oxygenSaturation, 10) : null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        painScore: painScore !== "" ? Number(painScore) : null,
        generalCondition: generalCondition.trim() || null,
        observations: observations.trim() || null,
        encounterType: nurseDepartment || "OPD",
      };

      const res = await fetch(`/api/staff/patients/${patient.id}/vitals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record vital signs");
      }

      setVitalsSuccess("Vital signs recorded successfully and added to patient medical record.");
      // Prepend new vital to list
      setPatient((prev) => ({
        ...prev,
        vitalSigns: [data.data, ...prev.vitalSigns],
      }));

      // Reset form
      setSystolicBP("");
      setDiastolicBP("");
      setPulse("");
      setTemperature("");
      setRespiratoryRate("");
      setOxygenSaturation("");
      setWeight("");
      setHeight("");
      setPainScore("");
      setObservations("");
    } catch (err: unknown) {
      setVitalsError(err instanceof Error ? err.message : "Failed to save vitals");
    } finally {
      setVitalsSubmitting(false);
    }
  };

  const handleRecordNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDischarged) {
      setNoteError("Patient file is locked and read-only post-discharge.");
      return;
    }

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
        patientCondition: noteCondition.trim(),
        intervention: noteIntervention.trim() || null,
        response: noteResponse.trim() || null,
        notes: noteAdditional.trim() || null,
        department: nurseDepartment || "OPD",
      };

      const res = await fetch(`/api/staff/patients/${patient.id}/nursing-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save nursing note");
      }

      setNoteSuccess("Nursing note added successfully.");
      setPatient((prev) => ({
        ...prev,
        nursingNotes: [data.data, ...prev.nursingNotes],
      }));

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

  // ---------------------------------------------------------------------------
  // Medication State & Handlers
  // ---------------------------------------------------------------------------
  const activeAdmission = patient.admissions?.[0];
  const [medicationHistoryText, setMedicationHistoryText] = useState(
    activeAdmission?.medicationHistory || ""
  );
  const [savingHistory, setSavingHistory] = useState(false);
  const [historySuccess, setHistorySuccess] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // New Administered Medicine form state
  const [newMedicineName, setNewMedicineName] = useState("");
  const [newDosage, setNewDosage] = useState("");
  const [newRoute, setNewRoute] = useState("Oral");
  const [newFrequency, setNewFrequency] = useState("Once");
  const [newStatus, setNewStatus] = useState<"GIVEN" | "MISSED" | "REFUSED" | "HELD">("GIVEN");
  const [newMedNotes, setNewMedNotes] = useState("");
  const [administeringMed, setAdministeringMed] = useState(false);
  const [medSuccess, setMedSuccess] = useState<string | null>(null);
  const [medError, setMedError] = useState<string | null>(null);

  const handleSaveMedicationHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDischarged) {
      setHistoryError("Patient file is locked and read-only post-discharge.");
      return;
    }
    try {
      setSavingHistory(true);
      setHistorySuccess(null);
      setHistoryError(null);

      const res = await fetch(`/api/staff/patients/${patient.id}/medications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationHistory: medicationHistoryText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update medication history");

      setHistorySuccess("Medication history updated successfully");
      setTimeout(() => setHistorySuccess(null), 4000);
    } catch (err: any) {
      setHistoryError(err.message || "Failed to save medication history");
    } finally {
      setSavingHistory(false);
    }
  };

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDischarged) {
      setMedError("Patient file is locked and read-only post-discharge.");
      return;
    }
    if (!newMedicineName.trim()) {
      setMedError("Medicine name is required");
      return;
    }

    try {
      setAdministeringMed(true);
      setMedSuccess(null);
      setMedError(null);

      const res = await fetch(`/api/staff/patients/${patient.id}/medications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineName: newMedicineName.trim(),
          dosage: newDosage.trim() || "Standard Dose",
          route: newRoute,
          frequency: newFrequency,
          status: newStatus,
          notes: newMedNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record medication");

      if (data.data) {
        setPatient((prev) => ({
          ...prev,
          medicationAdministrations: [
            {
              ...data.data,
              administeredAt: new Date().toISOString(),
            },
            ...(prev.medicationAdministrations || []),
          ],
        }));
      }

      setMedSuccess(`Medication ${newMedicineName.trim()} (${newDosage || "Standard"}) recorded successfully`);
      setNewMedicineName("");
      setNewDosage("");
      setNewMedNotes("");
      setTimeout(() => setMedSuccess(null), 4000);
    } catch (err: any) {
      setMedError(err.message || "Failed to record medication");
    } finally {
      setAdministeringMed(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Doctor Notes State & Handlers
  // ---------------------------------------------------------------------------
  const [doctorPresentingComplaints, setDoctorPresentingComplaints] = useState("");
  const [doctorProvisionalDiagnosis, setDoctorProvisionalDiagnosis] = useState("");
  const [doctorFinalDiagnosis, setDoctorFinalDiagnosis] = useState("");
  const [doctorTreatmentPlan, setDoctorTreatmentPlan] = useState("");
  const [doctorInvestigations, setDoctorInvestigations] = useState("");
  const [doctorMedicalHistory, setDoctorMedicalHistory] = useState("");
  const [doctorPhysicalExam, setDoctorPhysicalExam] = useState("");
  const [savingDoctorNote, setSavingDoctorNote] = useState(false);
  const [doctorNoteSuccess, setDoctorNoteSuccess] = useState<string | null>(null);
  const [doctorNoteError, setDoctorNoteError] = useState<string | null>(null);

  const handleAddDoctorNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDischarged) {
      setDoctorNoteError("Patient file is locked and read-only post-discharge.");
      return;
    }
    if (!doctorProvisionalDiagnosis.trim() && !doctorTreatmentPlan.trim() && !doctorPresentingComplaints.trim()) {
      setDoctorNoteError("Please provide at least a complaint, provisional diagnosis, or treatment plan.");
      return;
    }

    try {
      setSavingDoctorNote(true);
      setDoctorNoteSuccess(null);
      setDoctorNoteError(null);

      const res = await fetch(`/api/staff/patients/${patient.id}/doctor-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presentingComplaints: doctorPresentingComplaints.trim() || undefined,
          provisionalDiagnosis: doctorProvisionalDiagnosis.trim() || undefined,
          finalDiagnosis: doctorFinalDiagnosis.trim() || undefined,
          treatmentPlan: doctorTreatmentPlan.trim() || undefined,
          investigations: doctorInvestigations.trim() || undefined,
          medicalHistory: doctorMedicalHistory.trim() || undefined,
          physicalExamination: doctorPhysicalExam.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save doctor clinical note");

      if (data.data) {
        setPatient((prev) => ({
          ...prev,
          consultations: [
            {
              ...data.data,
              consultationDate: new Date().toISOString(),
            },
            ...(prev.consultations || []),
          ],
        }));
      }

      setDoctorNoteSuccess("Doctor clinical note saved successfully.");
      setDoctorPresentingComplaints("");
      setDoctorProvisionalDiagnosis("");
      setDoctorFinalDiagnosis("");
      setDoctorTreatmentPlan("");
      setDoctorInvestigations("");
      setDoctorMedicalHistory("");
      setDoctorPhysicalExam("");
      setTimeout(() => setDoctorNoteSuccess(null), 4000);
    } catch (err: any) {
      setDoctorNoteError(err.message || "Failed to save doctor note");
    } finally {
      setSavingDoctorNote(false);
    }
  };

  const totalMedsCount =
    (patient.medicationAdministrations?.length || 0) +
    (patient.prescriptions?.reduce((acc, p) => acc + (p.items?.length || 0), 0) || 0);

  const totalDoctorNotesCount =
    (patient.consultations?.length || 0) + (patient.admissions?.length || 0);

  const latestVital = patient.vitalSigns[0];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href={nurseDepartment === "EMERGENCY" ? "/staff/emergency" : "/staff/opd"}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {nurseDepartment === "EMERGENCY" ? "Emergency Queue" : "OPD Queue"}
        </Link>
        <span className="text-xs text-slate-500 font-mono">
          MR#: <strong className="text-slate-800">{patient.mrNumber || patient.patientNumber}</strong>
        </span>
      </div>

      {/* Official Medical Record Security Lock Banner */}
      {isDischarged && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 shadow-sm flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-200/90 border border-amber-400 flex items-center justify-center text-amber-900 shrink-0 mt-0.5">
            <Lock className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-sm font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                Patient File Locked &amp; Archived (Read-Only Mode)
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 border border-amber-300">
                {patient.status === "DECEASED" ? "DECEASED" : "DISCHARGED"}
              </span>
              {dischargeTimestamp && (
                <span className="text-[11px] text-amber-800 font-mono font-medium">
                  Discharge Recorded: {new Date(dischargeTimestamp).toLocaleString()}
                </span>
              )}
            </div>
            <p className="text-xs text-amber-900/90 mt-1 font-medium leading-relaxed">
              This patient has been officially discharged from GHIAS Hospital. In accordance with clinical governance, medical-legal regulations, and hospital security policies, this chart is closed in <strong>read-only mode</strong>. No further vitals, clinical observations, medications, or doctor notes can be entered or modified.
            </p>
          </div>
        </div>
      )}

      {/* Patient Demographic Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Patient Workspace
              </span>
              <span className="text-xs font-mono text-slate-500">
                {patient.patientNumber}
              </span>
              {isDischarged ? (
                <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {patient.status || "DISCHARGED"} (READ-ONLY)
                </span>
              ) : (
                <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {patient.status || "ACTIVE"}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {age} yrs • {patient.gender} • Blood Group:{" "}
              <strong className="text-slate-800">
                {patient.bloodGroup ? patient.bloodGroup.replace("_", "") : "Not recorded"}
              </strong>
            </p>
          </div>

          <div className="text-right text-xs space-y-1">
            <div className="text-slate-600">
              Phone: <span className="font-semibold text-slate-800">{patient.phone}</span>
            </div>
            {patient.cnic && (
              <div className="text-slate-600 font-mono">
                CNIC: <span className="text-slate-800">{patient.cnic}</span>
              </div>
            )}
            <div className="text-slate-500">
              Emergency: {patient.emergencyContactName} ({patient.emergencyContactPhone})
            </div>
          </div>
        </div>

        {/* Clinical Alert Flags */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Allergies:
          </div>
          {patient.allergies.length > 0 ? (
            patient.allergies.map((a, i) => (
              <span
                key={i}
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200"
              >
                {a}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400 italic">No known allergies</span>
          )}

          <div className="ml-4 flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-500" />
            Chronic Conditions:
          </div>
          {patient.chronicConditions.length > 0 ? (
            patient.chronicConditions.map((c, i) => (
              <span
                key={i}
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
              >
                {c}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400 italic">None reported</span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("vitals")}
          className={`inline-flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "vitals"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          Vital Signs ({patient.vitalSigns.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`inline-flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "notes"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          Nursing Notes ({patient.nursingNotes.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("medications")}
          className={`inline-flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "medications"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Pill className="w-4 h-4 text-purple-600" />
          Medication History &amp; Medicine ({totalMedsCount})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("doctorNotes")}
          className={`inline-flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "doctorNotes"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Stethoscope className="w-4 h-4 text-blue-600" />
          Doctor Notes &amp; Consultations ({totalDoctorNotesCount})
        </button>

        {patient.emergencyTriages.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("triage")}
            className={`inline-flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === "triage"
                ? "border-rose-600 text-rose-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Flame className="w-4 h-4" />
            Emergency Triage ({patient.emergencyTriages.length})
          </button>
        )}
      </div>

      {/* Tab 1: Vital Signs Workspace */}
      {activeTab === "vitals" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Record Vitals Form (5 Cols) or Read-Only Notice */}
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs h-fit space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-teal-600" />
                {isDischarged ? "Vital Signs (Locked)" : "Record New Vitals"}
              </h2>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                isDischarged
                  ? "text-amber-800 bg-amber-50 border-amber-300"
                  : "text-teal-700 bg-teal-50 border-teal-200"
              }`}>
                {isDischarged ? "Read-Only" : `${nurseDepartment || "OPD"} Station`}
              </span>
            </div>

            {isDischarged ? (
              <div className="p-5 bg-amber-50/70 border border-amber-300/80 rounded-xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-950">Patient Discharged — Vitals Entry Disabled</h3>
                  <p className="text-xs text-amber-900/85 mt-1 leading-relaxed">
                    This patient file is archived and locked. Adding new vital signs or altering recorded observations is disabled for clinical security and regulatory compliance.
                  </p>
                </div>
                <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-[11px] text-amber-900 font-semibold">
                  <span>File Status: <strong>{patient.status || "DISCHARGED"}</strong></span>
                  <span>Recorded: <strong>{patient.vitalSigns.length} entries</strong></span>
                </div>
              </div>
            ) : (
              <>
                {vitalsSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{vitalsSuccess}</span>
                  </div>
                )}

                {vitalsError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{vitalsError}</span>
                  </div>
                )}

                <form onSubmit={handleRecordVitals} className="space-y-4">
              {/* Blood Pressure */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Systolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 120"
                    value={systolicBP}
                    onChange={(e) => setSystolicBP(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Diastolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 80"
                    value={diastolicBP}
                    onChange={(e) => setDiastolicBP(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Pulse & Temp */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pulse (bpm)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 72"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Temperature (°F)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 98.6"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* RR & SpO2 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Resp. Rate (/min)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 18"
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SpO2 (%)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 98"
                    value={oxygenSaturation}
                    onChange={(e) => setOxygenSaturation(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Weight, Height & Auto-BMI */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 70"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="e.g. 175"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500 font-medium">Calculated BMI:</span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded ${
                      liveBmi
                        ? "bg-teal-100 text-teal-800"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {liveBmi ? `${liveBmi} kg/m²` : "Auto-computed"}
                  </span>
                </div>
              </div>

              {/* Pain Score */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pain Score: <strong className="text-teal-700">{painScore !== "" ? `${painScore} / 10` : "Not assessed"}</strong>
                </label>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setPainScore(score)}
                      className={`flex-1 min-w-[28px] py-1 text-xs font-bold rounded border transition-colors ${
                        painScore === score
                          ? "bg-teal-600 text-white border-teal-600"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>

              {/* General Condition */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  General Condition
                </label>
                <input
                  type="text"
                  value={generalCondition}
                  onChange={(e) => setGeneralCondition(e.target.value)}
                  placeholder="e.g. Stable, Alert, In Pain, Drowsy..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              {/* Observations */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observations / Notes
                </label>
                <textarea
                  rows={2}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Clinical notes, preparation for doctor..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={vitalsSubmitting}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs disabled:opacity-50"
              >
                {vitalsSubmitting ? "Saving Vital Signs..." : "Save Vital Signs"}
              </button>
            </form>
          </>
        )}
      </div>

          {/* Historical Vitals Table (7 Cols) */}
          <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                Vital Signs History ({patient.vitalSigns.length})
              </h2>
              <span className="text-xs text-slate-400">Append-only clinical record</span>
            </div>

            {patient.vitalSigns.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <HeartPulse className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No vital signs recorded for this patient yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Latest Vitals Callout */}
                {latestVital && (
                  <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs text-teal-800 font-bold uppercase">
                      <span>Latest Recorded Vitals</span>
                      <span>{new Date(latestVital.recordedAt).toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                      <div className="bg-white p-2 rounded border border-teal-100">
                        <span className="text-[10px] uppercase text-slate-400 block">Blood Pressure</span>
                        <strong className="text-slate-900 text-sm">
                          {latestVital.systolicBP && latestVital.diastolicBP
                            ? `${latestVital.systolicBP}/${latestVital.diastolicBP}`
                            : "—"}
                        </strong>
                      </div>
                      <div className="bg-white p-2 rounded border border-teal-100">
                        <span className="text-[10px] uppercase text-slate-400 block">Pulse</span>
                        <strong className="text-slate-900 text-sm">
                          {latestVital.pulse ? `${latestVital.pulse} bpm` : "—"}
                        </strong>
                      </div>
                      <div className="bg-white p-2 rounded border border-teal-100">
                        <span className="text-[10px] uppercase text-slate-400 block">SpO2</span>
                        <strong className="text-slate-900 text-sm">
                          {latestVital.oxygenSaturation ? `${latestVital.oxygenSaturation}%` : "—"}
                        </strong>
                      </div>
                      <div className="bg-white p-2 rounded border border-teal-100">
                        <span className="text-[10px] uppercase text-slate-400 block">BMI</span>
                        <strong className="text-slate-900 text-sm">
                          {latestVital.bmi ? `${latestVital.bmi}` : "—"}
                        </strong>
                      </div>
                    </div>
                    <div className="text-[11px] text-teal-700">
                      Recorded by: {latestVital.recordedByName} ({latestVital.encounterType || "OPD"})
                    </div>
                  </div>
                )}

                {/* All Readings Table */}
                <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-bold uppercase sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Date / Time</th>
                        <th className="py-2.5 px-3">BP</th>
                        <th className="py-2.5 px-3">Pulse</th>
                        <th className="py-2.5 px-3">Temp</th>
                        <th className="py-2.5 px-3">SpO2</th>
                        <th className="py-2.5 px-3">BMI</th>
                        <th className="py-2.5 px-3">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
                      {patient.vitalSigns.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-sans text-slate-600">
                            {new Date(v.recordedAt).toLocaleString([], {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="py-2.5 px-3 font-semibold">
                            {v.systolicBP && v.diastolicBP ? `${v.systolicBP}/${v.diastolicBP}` : "—"}
                          </td>
                          <td className="py-2.5 px-3">{v.pulse ? `${v.pulse} bpm` : "—"}</td>
                          <td className="py-2.5 px-3">{v.temperature ? `${v.temperature}°F` : "—"}</td>
                          <td className="py-2.5 px-3">{v.oxygenSaturation ? `${v.oxygenSaturation}%` : "—"}</td>
                          <td className="py-2.5 px-3">{v.bmi ? `${v.bmi}` : "—"}</td>
                          <td className="py-2.5 px-3 font-sans text-slate-500">
                            {v.recordedByName}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Nursing Notes Workspace */}
      {activeTab === "notes" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Add Nursing Note Form (5 Cols) or Read-Only Notice */}
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs h-fit space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                {isDischarged ? "Nursing Notes (Locked)" : "Add Nursing Note"}
              </h2>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                isDischarged
                  ? "text-amber-800 bg-amber-50 border-amber-300"
                  : "text-teal-700 bg-teal-50 border-teal-200"
              }`}>
                {isDischarged ? "Read-Only" : `${nurseDepartment || "OPD"} Station`}
              </span>
            </div>

            {isDischarged ? (
              <div className="p-5 bg-amber-50/70 border border-amber-300/80 rounded-xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-950">Patient Discharged — Nursing Notes Closed</h3>
                  <p className="text-xs text-amber-900/85 mt-1 leading-relaxed">
                    Bedside observations and clinical nursing notes are sealed upon patient discharge. Review historical nursing records on the right.
                  </p>
                </div>
                <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-[11px] text-amber-900 font-semibold">
                  <span>File Status: <strong>{patient.status || "DISCHARGED"}</strong></span>
                  <span>Recorded: <strong>{patient.nursingNotes.length} notes</strong></span>
                </div>
              </div>
            ) : (
              <>
                {noteSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{noteSuccess}</span>
                  </div>
                )}

                {noteError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{noteError}</span>
                  </div>
                )}

                <form onSubmit={handleRecordNote} className="space-y-4">
              {/* Patient Condition with Quick Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patient Condition <span className="text-rose-600">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { label: "Stable", color: "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100" },
                    { label: "Alert & Oriented", color: "bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-100" },
                    { label: "Guarded / Fair", color: "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100" },
                    { label: "Severe Pain", color: "bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100" },
                    { label: "Critical", color: "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100" },
                    { label: "Post-Op Recovery", color: "bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setNoteCondition(preset.label)}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border transition-colors ${preset.color} ${
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
                  placeholder="e.g. Conscious, Oriented, Mild distress, Stable..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  required
                />
              </div>

              {/* Rich Clinical Observation with Color Toolbar */}
              <div>
                <RichNoteEditor
                  label="Clinical Observation & Patient Notes"
                  value={noteObservation}
                  onChange={setNoteObservation}
                  placeholder="Write clinical observations... You can highlight or color any word, line, or text with the color toolbar above."
                  minHeight="140px"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intervention (Optional)
                </label>
                <textarea
                  rows={2}
                  value={noteIntervention}
                  onChange={(e) => setNoteIntervention(e.target.value)}
                  placeholder="Nursing actions taken (e.g. Oxygen administered, IV fluid started, positioned upright)..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patient Response (Optional)
                </label>
                <input
                  type="text"
                  value={noteResponse}
                  onChange={(e) => setNoteResponse(e.target.value)}
                  placeholder="e.g. Patient reported relief, distress lessened, vitals normalized..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              {/* Rich Additional Notes / Handoff */}
              <div>
                <RichNoteEditor
                  label="Additional Notes / Handoff Details (Optional)"
                  value={noteAdditional}
                  onChange={setNoteAdditional}
                  placeholder="Optional handoff instructions or follow-up notes..."
                  minHeight="80px"
                />
              </div>

              <button
                type="submit"
                disabled={noteSubmitting}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Palette className="w-4 h-4" />
                {noteSubmitting ? "Saving Note..." : "Save Nursing Note"}
              </button>
            </form>
          </>
        )}
      </div>

          {/* Historical Nursing Notes List (7 Cols) */}
          <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                Nursing Notes History ({patient.nursingNotes.length})
              </h2>
              <span className="text-xs text-slate-400">Clinical Timeline &amp; Color Coded</span>
            </div>

            {patient.nursingNotes.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No nursing notes recorded for this patient yet.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
                {patient.nursingNotes.map((note) => {
                  const isCritical =
                    note.patientCondition?.toLowerCase().includes("critical") ||
                    note.patientCondition?.toLowerCase().includes("deteriorat");
                  const isStable =
                    note.patientCondition?.toLowerCase().includes("stable") ||
                    note.patientCondition?.toLowerCase().includes("alert");

                  return (
                    <div
                      key={note.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 hover:bg-slate-50 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {note.department}
                          </span>
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
                        <span className="text-slate-400 font-mono text-[11px]">
                          {new Date(note.recordedAt).toLocaleString()}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs font-semibold text-slate-700 block mb-0.5">
                          Observation:
                        </span>
                        <SafeHtmlContent
                          content={note.observation}
                          className="text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/80"
                        />
                      </div>

                      {note.intervention && (
                        <div>
                          <span className="text-xs font-semibold text-slate-700 block mb-0.5">
                            Intervention:
                          </span>
                          <SafeHtmlContent
                            content={note.intervention}
                            className="text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/80"
                          />
                        </div>
                      )}

                      {note.response && (
                        <div>
                          <span className="text-xs font-semibold text-slate-700">Response: </span>
                          <span className="text-xs text-slate-800 font-medium">{note.response}</span>
                        </div>
                      )}

                      {note.notes && (
                        <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-lg">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block mb-0.5">
                            Handoff / Additional Notes:
                          </span>
                          <SafeHtmlContent
                            content={note.notes}
                            className="text-xs text-amber-950"
                          />
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-400 flex items-center justify-between">
                        <span>Recorded by: <strong className="text-slate-700">{note.recordedByName}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Emergency Triage History */}
      {activeTab === "triage" && patient.emergencyTriages.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-600" />
              Emergency Triage History ({patient.emergencyTriages.length})
            </h2>
          </div>

          <div className="space-y-4">
            {patient.emergencyTriages.map((tr) => (
              <div
                key={tr.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                      tr.priority === "CRITICAL"
                        ? "bg-rose-100 text-rose-800 border-rose-300"
                        : tr.priority === "HIGH"
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : tr.priority === "URGENT"
                        ? "bg-blue-100 text-blue-800 border-blue-300"
                        : "bg-slate-100 text-slate-700 border-slate-300"
                    }`}
                  >
                    {tr.priority} Priority
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(tr.triagedAt).toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-700">Chief Complaint:</span>
                  <p className="text-sm text-slate-900 font-medium mt-0.5">{tr.chiefComplaint}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-400 block font-sans">BP</span>
                    <strong className="text-slate-800">
                      {tr.systolicBP && tr.diastolicBP ? `${tr.systolicBP}/${tr.diastolicBP}` : "—"}
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-400 block font-sans">Pulse</span>
                    <strong className="text-slate-800">{tr.pulse ? `${tr.pulse} bpm` : "—"}</strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-400 block font-sans">SpO2</span>
                    <strong className="text-slate-800">{tr.oxygenSaturation ? `${tr.oxygenSaturation}%` : "—"}</strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-400 block font-sans">Pain</span>
                    <strong className="text-slate-800">{tr.painScore ?? "—"}/10</strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 pt-1">
                  Triaged by: {tr.triagedByName}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Tab 4: Medication History & Medicine Administration       */}
      {/* ========================================================= */}
      {activeTab === "medications" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Tools (5 cols) OR Read-Only Lock Card */}
          <div className="lg:col-span-5 space-y-6">
            {isDischarged ? (
              <div className="bg-white p-6 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-amber-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-amber-950">Medication Records Locked</h2>
                      <p className="text-[11px] text-amber-800/80">Patient discharged — Read-only mode</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                    Read-Only
                  </span>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Pharmacy &amp; MAR Sealed</span>
                  </div>
                  <p className="text-amber-800/90 leading-relaxed">
                    Following patient discharge, recording new administered medications, altering dosages, or updating medication history is permanently locked for clinical security and regulatory governance.
                  </p>
                  <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-[11px] text-amber-900 font-semibold">
                    <span>Administered: <strong>{patient.medicationAdministrations?.length || 0} doses</strong></span>
                    <span>Prescriptions: <strong>{patient.prescriptions?.length || 0}</strong></span>
                  </div>
                </div>

                {medicationHistoryText ? (
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-purple-600" />
                      Archived Medication History:
                    </span>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200">
                      {medicationHistoryText}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-400 italic">
                    No prior medication history recorded.
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Box 1: Chronic / Background Medication History */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900">Patient Medication History</h2>
                        <p className="text-[11px] text-slate-500">Long-term therapies, past regimens &amp; drug history</p>
                      </div>
                    </div>
                  </div>

              {historySuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{historySuccess}</span>
                </div>
              )}
              {historyError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{historyError}</span>
                </div>
              )}

              <form onSubmit={handleSaveMedicationHistory} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Documented Medication History
                  </label>
                  <textarea
                    rows={4}
                    placeholder="e.g. Tab Metformin 500mg BD for Type 2 Diabetes x 5 years, Tab Losartan 50mg OD for Hypertension. No known adverse drug reactions."
                    value={medicationHistoryText}
                    onChange={(e) => setMedicationHistoryText(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="text-right">
                  <button
                    type="submit"
                    disabled={savingHistory}
                    className="inline-flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-2xs disabled:opacity-50"
                  >
                    {savingHistory ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Saving History...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        Update Medication History
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Box 2: Record New Administered / Prescribed Medicine */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <Pill className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Administer / Record Medicine</h2>
                    <p className="text-[11px] text-slate-500">Record medicine administration or bedside dose</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {nurseDepartment || "CLINICAL"}
                </span>
              </div>

              {medSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{medSuccess}</span>
                </div>
              )}
              {medError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{medError}</span>
                </div>
              )}

              <form onSubmit={handleAddMedicine} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Medicine Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ceftriaxone, Paracetamol, Tramadol, Omeprazole"
                    value={newMedicineName}
                    onChange={(e) => setNewMedicineName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Dosage
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1 g, 500 mg, 10 ml"
                      value={newDosage}
                      onChange={(e) => setNewDosage(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Route
                    </label>
                    <select
                      value={newRoute}
                      onChange={(e) => setNewRoute(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Oral">Oral (PO)</option>
                      <option value="IV">Intravenous (IV)</option>
                      <option value="IM">Intramuscular (IM)</option>
                      <option value="SC">Subcutaneous (SC)</option>
                      <option value="Inhalation">Inhalation / Nebulization</option>
                      <option value="Topical">Topical</option>
                      <option value="Rectal">Rectal</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Frequency
                    </label>
                    <select
                      value={newFrequency}
                      onChange={(e) => setNewFrequency(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="STAT">STAT (Immediate)</option>
                      <option value="Once">Once</option>
                      <option value="BD">BD (Twice daily)</option>
                      <option value="TDS">TDS (Thrice daily)</option>
                      <option value="QID">QID (4 times daily)</option>
                      <option value="PRN">PRN (As needed)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 font-bold"
                    >
                      <option value="GIVEN">GIVEN (Administered)</option>
                      <option value="HELD">HELD (Temporarily on hold)</option>
                      <option value="REFUSED">REFUSED (By patient)</option>
                      <option value="MISSED">MISSED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Administration Notes / Special Instructions
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Infused slowly over 30 mins in 100ml normal saline..."
                    value={newMedNotes}
                    onChange={(e) => setNewMedNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="text-right pt-1">
                  <button
                    type="submit"
                    disabled={administeringMed}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-2xs disabled:opacity-50"
                  >
                    {administeringMed ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Recording...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Record Medication Dose
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>

          {/* Right Column: Medication Logs & Prescriptions (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Administered Medications Log */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-emerald-600" />
                  Administered Medications Record (MAR)
                  {patient.medicationAdministrations && patient.medicationAdministrations.length > 0 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {patient.medicationAdministrations.length}
                    </span>
                  )}
                </h2>
              </div>

              {!patient.medicationAdministrations || patient.medicationAdministrations.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No administered medications logged yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Use the form on the left to record medications given to this patient.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600 border-collapse">
                    <thead className="bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Medicine &amp; Dose</th>
                        <th className="py-2.5 px-3">Route</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Administered By</th>
                        <th className="py-2.5 px-3">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {patient.medicationAdministrations.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/75">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{m.medicineName}</div>
                            <div className="text-[11px] text-slate-500">{m.dosage}</div>
                            {m.notes && <div className="text-[10px] text-slate-400 italic">{m.notes}</div>}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">{m.route}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                m.status === "GIVEN"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : m.status === "HELD"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            >
                              {m.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">{m.administeredByName}</td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                            {new Date(m.administeredAt).toLocaleDateString([], { month: "short", day: "numeric" })}{" "}
                            {new Date(m.administeredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Doctor Digital Prescriptions */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-purple-600" />
                  Prescriptions Issued by Physicians
                  {patient.prescriptions && patient.prescriptions.length > 0 && (
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      {patient.prescriptions.length}
                    </span>
                  )}
                </h2>
              </div>

              {!patient.prescriptions || patient.prescriptions.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">No outpatient or clinical prescriptions recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {patient.prescriptions.map((rx) => (
                    <div key={rx.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">{rx.prescriptionNumber}</span>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {rx.status}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(rx.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {rx.doctor && (
                        <div className="text-xs text-slate-600 font-medium">
                          Prescribed by: <strong className="text-slate-800">Dr. {rx.doctor.firstName} {rx.doctor.lastName}</strong> ({rx.doctor.specialization})
                        </div>
                      )}
                      {rx.diagnosis && (
                        <div className="text-xs text-rose-700">
                          <strong>Diagnosis:</strong> {rx.diagnosis}
                        </div>
                      )}

                      {/* Items */}
                      {rx.items && rx.items.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {rx.items.map((item, idx) => (
                            <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                              <div>
                                <span className="font-bold text-slate-900">{item.medicineName}</span>
                                <span className="text-slate-500 ml-1.5 font-medium">{item.dosage}</span>
                                <span className="text-slate-400 ml-1.5">• {item.route}</span>
                              </div>
                              <div className="text-slate-600 text-[11px] font-mono">
                                {item.frequency} {item.duration ? `x ${item.duration}` : ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Emergency Triage Medication Sheet (if any) */}
            {patient.emergencyTriages && patient.emergencyTriages.some((t) => t.medicationSheet && t.medicationSheet.length > 0) && (
              <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-rose-100 text-rose-800">
                  <Flame className="w-4 h-4 text-rose-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Emergency Triage Medications Sheet</h3>
                </div>
                {patient.emergencyTriages.map((tr) => (
                  tr.medicationSheet && tr.medicationSheet.length > 0 && (
                    <div key={tr.id} className="space-y-1.5">
                      <div className="text-[11px] text-slate-500 font-mono">
                        ER Triage Date: {new Date(tr.triagedAt).toLocaleString()} | Attendant: {tr.triagedByName}
                      </div>
                      <div className="space-y-1">
                        {tr.medicationSheet.map((item: any, i: number) => (
                          <div key={i} className="bg-rose-50/50 p-2 rounded-lg border border-rose-200 text-xs flex items-center justify-between">
                            <div>
                              <strong className="text-rose-950">{item.medicineName}</strong>
                              <span className="text-rose-700 ml-2">{item.dosage}</span>
                              <span className="text-slate-500 ml-2">• {item.route} ({item.frequency})</span>
                            </div>
                            <span className="text-[10px] font-bold uppercase text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                              {item.status || "GIVEN"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Tab 5: Doctor Clinical Notes & Consultations             */}
      {/* ========================================================= */}
      {activeTab === "doctorNotes" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Record New Doctor Note Form (5 cols) OR Read-Only Notice */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {isDischarged ? "Doctor Clinical Notes (Locked)" : "Record Doctor Clinical Note"}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {isDischarged ? "Consultation chart sealed on discharge" : "Document consultation, diagnosis, and treatment plan"}
                  </p>
                </div>
              </div>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                isDischarged
                  ? "text-amber-800 bg-amber-50 border-amber-300"
                  : "text-blue-700 bg-blue-50 border-blue-200"
              }`}>
                {isDischarged ? "Read-Only" : "Physician Desk"}
              </span>
            </div>

            {isDischarged ? (
              <div className="p-5 bg-amber-50/70 border border-amber-300/80 rounded-xl space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-950">Patient Discharged — Clinical File Finalized</h3>
                  <p className="text-xs text-amber-900/85 mt-1 leading-relaxed">
                    This patient's clinical encounter has ended. Doctor notes, diagnosis modifications, and treatment orders cannot be recorded after discharge.
                  </p>
                </div>
                <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-[11px] text-amber-900 font-semibold">
                  <span>File Status: <strong>{patient.status || "DISCHARGED"}</strong></span>
                  <span>Consultations: <strong>{patient.consultations?.length || 0}</strong></span>
                </div>
              </div>
            ) : (
              <>
                {doctorNoteSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{doctorNoteSuccess}</span>
                  </div>
                )}
                {doctorNoteError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{doctorNoteError}</span>
                  </div>
                )}

                <form onSubmit={handleAddDoctorNote} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Presenting Complaints &amp; Clinical History
                </label>
                <textarea
                  rows={2}
                  placeholder="Patient presented with complaints of..."
                  value={doctorPresentingComplaints}
                  onChange={(e) => setDoctorPresentingComplaints(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Provisional Diagnosis *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acute Appendicitis"
                    value={doctorProvisionalDiagnosis}
                    onChange={(e) => setDoctorProvisionalDiagnosis(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Final Clinical Diagnosis
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Suppurative Appendicitis"
                    value={doctorFinalDiagnosis}
                    onChange={(e) => setDoctorFinalDiagnosis(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Treatment &amp; Management Plan *
                </label>
                <textarea
                  rows={3}
                  placeholder="IV hydration, antibiotics, urgent surgical consult, bed rest..."
                  value={doctorTreatmentPlan}
                  onChange={(e) => setDoctorTreatmentPlan(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Investigations / Lab Tests Advised
                </label>
                <input
                  type="text"
                  placeholder="e.g. CBC, Serum Electrolytes, Ultrasound Abdomen, ECG"
                  value={doctorInvestigations}
                  onChange={(e) => setDoctorInvestigations(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Physical Examination Findings
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tenderness in RIF, Rebound positive, Chest clear..."
                  value={doctorPhysicalExam}
                  onChange={(e) => setDoctorPhysicalExam(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="text-right pt-2">
                <button
                  type="submit"
                  disabled={savingDoctorNote}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition shadow-2xs disabled:opacity-50"
                >
                  {savingDoctorNote ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving Note...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      Save Doctor Note
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

          {/* Right Column: Historical Doctor Notes & Inpatient Reviews (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Box 1: Clinical Consultations */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  Doctor Consultations &amp; Clinical Notes
                  {patient.consultations && patient.consultations.length > 0 && (
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      {patient.consultations.length}
                    </span>
                  )}
                </h2>
              </div>

              {!patient.consultations || patient.consultations.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Stethoscope className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No consultation notes recorded yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Doctors can record assessment notes using the form on the left.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {patient.consultations.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">{c.consultationNumber}</span>
                          {c.doctor && (
                            <span className="text-xs font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              Dr. {c.doctor.firstName} {c.doctor.lastName} ({c.doctor.specialization})
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(c.consultationDate).toLocaleString()}
                        </span>
                      </div>

                      {c.presentingComplaints && (
                        <div className="text-xs">
                          <span className="font-bold text-slate-700">Presenting Complaint: </span>
                          <span className="text-slate-800 font-medium">{c.presentingComplaints}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {c.provisionalDiagnosis && (
                          <div className="bg-rose-50 p-2 rounded-lg border border-rose-200 text-rose-900">
                            <span className="font-bold block text-[10px] uppercase text-rose-700">Provisional Diagnosis</span>
                            <span className="font-semibold">{c.provisionalDiagnosis}</span>
                          </div>
                        )}
                        {c.finalDiagnosis && (
                          <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-emerald-900">
                            <span className="font-bold block text-[10px] uppercase text-emerald-700">Final Diagnosis</span>
                            <span className="font-semibold">{c.finalDiagnosis}</span>
                          </div>
                        )}
                      </div>

                      {c.treatmentPlan && (
                        <div className="text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="font-bold text-blue-800 block text-[10px] uppercase mb-0.5">Management &amp; Treatment Plan</span>
                          <p className="text-slate-800 whitespace-pre-wrap">{c.treatmentPlan}</p>
                        </div>
                      )}

                      {c.investigations && (
                        <div className="text-xs text-slate-600">
                          <span className="font-bold text-slate-700">Investigations Advised: </span>
                          <span className="font-mono text-slate-800">{c.investigations}</span>
                        </div>
                      )}

                      {c.physicalExamination && (
                        <div className="text-xs text-slate-600">
                          <span className="font-bold text-slate-700">Physical Exam: </span>
                          <span>{c.physicalExamination}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Box 2: Inpatient Admission Clinical Summaries */}
            {patient.admissions && patient.admissions.length > 0 && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-600" />
                    Inpatient Admissions &amp; Discharge Summaries
                  </h2>
                </div>

                <div className="space-y-3">
                  {patient.admissions.map((adm) => (
                    <div key={adm.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{adm.admissionNumber}</span>
                          <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {adm.status}
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {new Date(adm.admissionDate).toLocaleDateString()}
                        </span>
                      </div>

                      {adm.doctor && (
                        <div className="text-slate-600">
                          Attending Physician: <strong>Dr. {adm.doctor.firstName} {adm.doctor.lastName}</strong> ({adm.doctor.specialization})
                        </div>
                      )}

                      {adm.provisionalDiagnosis && (
                        <div className="text-rose-800">
                          <strong>Diagnosis:</strong> {adm.provisionalDiagnosis}
                        </div>
                      )}

                      {adm.dischargeSummary && (
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="font-bold text-slate-700 block text-[10px] uppercase">Discharge Summary</span>
                          <p className="text-slate-800">{adm.dischargeSummary}</p>
                        </div>
                      )}

                      {adm.dischargeInstructions && (
                        <div className="text-slate-600">
                          <strong>Discharge Instructions:</strong> {adm.dischargeInstructions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
