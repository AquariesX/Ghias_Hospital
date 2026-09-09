"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  HeartPulse,
  Activity,
  Pill,
  BedDouble,
  ClipboardList,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  Edit,
  Trash2,
  AlertCircle,
  ArrowLeft,
  Stethoscope,
  RotateCw,
  Info,
  ShieldAlert,
  FileText,
} from "lucide-react";

interface PatientData {
  id: string;
  mrNumber: string | null;
  patientNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  email: string | null;
  address: string | null;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  status: string;
  cnic: string | null;
  maritalStatus: string | null;
  relationType: string | null;
  relatedPersonName: string | null;
  landline: string | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    appointments: number;
    consultations: number;
    prescriptions: number;
    admissions: number;
    vitalSigns: number;
    nursingNotes: number;
    emergencyTriages: number;
    timelineEvents: number;
  };
}

interface HistoryData {
  appointments: Array<{
    id: string;
    appointmentNumber: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentType: string;
    consultationFee: number | string;
    reason: string;
    status: string;
    notes?: string | null;
    isEmergency?: boolean;
    doctor?: {
      firstName: string;
      lastName: string;
      doctorNumber: string;
      specialization: string;
    };
    department?: {
      name: string;
      code: string;
    };
  }>;
  consultations: Array<{
    id: string;
    consultationNumber: string;
    consultationDate: string;
    status: string;
    presentingComplaints?: string | null;
    medicalHistory?: string | null;
    medicationHistory?: string | null;
    physicalExamination?: string | null;
    provisionalDiagnosis?: string | null;
    finalDiagnosis?: string | null;
    investigations?: string | null;
    treatmentPlan?: string | null;
    doctor?: {
      firstName: string;
      lastName: string;
      doctorNumber: string;
      specialization: string;
    };
  }>;
  prescriptions: Array<{
    id: string;
    prescriptionNumber: string;
    createdAt: string;
    diagnosis?: string | null;
    notes?: string | null;
    status: string;
    doctor?: {
      firstName: string;
      lastName: string;
      doctorNumber: string;
      specialization: string;
    };
    items: Array<{
      id: string;
      medicineName: string;
      dosage: string;
      frequency: string;
      route: string;
      duration: string;
      instructions?: string | null;
    }>;
  }>;
  admissions: Array<{
    id: string;
    admissionNumber: string;
    admissionDate: string;
    admissionTime?: string | null;
    admissionSource: string;
    roomBedNo?: string | null;
    presentingComplaints?: string | null;
    finalDiagnosis?: string | null;
    operation?: string | null;
    outcome?: string | null;
    dischargeCondition?: string | null;
    isLama?: boolean;
    dischargeMedications?: string | null;
    status: string;
    dischargeDate?: string | null;
    dischargeSummary?: string | null;
    doctor?: {
      firstName: string;
      lastName: string;
      doctorNumber: string;
      specialization: string;
    };
  }>;
  vitalSigns: Array<{
    id: string;
    recordedAt: string;
    recordedByName: string;
    recordedByRole: string;
    encounterType?: string | null;
    systolicBP?: number | null;
    diastolicBP?: number | null;
    pulse?: number | null;
    temperature?: number | string | null;
    respiratoryRate?: number | null;
    oxygenSaturation?: number | null;
    weight?: number | string | null;
    height?: number | string | null;
    bmi?: number | string | null;
    painScore?: number | null;
    generalCondition?: string | null;
    observations?: string | null;
  }>;
  nursingNotes: Array<{
    id: string;
    recordedAt: string;
    recordedByName: string;
    department: string;
    observation: string;
    patientCondition: string;
    intervention?: string | null;
    response?: string | null;
  }>;
  timelineEvents: Array<{
    id: string;
    timestamp: string;
    title: string;
    eventType: string;
    description?: string | null;
    performerName?: string | null;
    performerRole?: string | null;
  }>;
}

interface PatientProfileClientProps {
  patient: PatientData;
  initialHistory: HistoryData;
  canEdit: boolean;
}

type TabKey =
  | "overview"
  | "demographics"
  | "appointments"
  | "consultations"
  | "prescriptions"
  | "admissions"
  | "vitals"
  | "nursing"
  | "timeline";

function calculateAge(dobString: string): string {
  if (!dobString) return "N/A";
  const dob = new Date(dobString);
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    years--;
  }
  return `${years} yrs`;
}

function formatBloodGroup(bg: string): string {
  const map: Record<string, string> = {
    A_POSITIVE: "A+",
    A_NEGATIVE: "A-",
    B_POSITIVE: "B+",
    B_NEGATIVE: "B-",
    AB_POSITIVE: "AB+",
    AB_NEGATIVE: "AB-",
    O_POSITIVE: "O+",
    O_NEGATIVE: "O-",
  };
  return map[bg] || bg;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function PatientProfileClient({
  patient,
  initialHistory,
  canEdit,
}: PatientProfileClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [history, setHistory] = useState<HistoryData>(initialHistory);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeletePatient = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/patients/${patient.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete patient record");
      }
      router.push("/patients");
      router.refresh();
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete patient");
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/patients/${patient.id}/history`);
      const data = await res.json();
      if (res.ok && data.success) {
        setHistory(data.data);
      }
    } catch (err) {
      console.error("Failed to refresh history", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const latestVital = history.vitalSigns[0] || null;

  const tabs: { key: TabKey; label: string; count?: number; icon: React.ElementType }[] = [
    { key: "overview", label: "Overview", icon: Activity },
    { key: "demographics", label: "Demographics", icon: User },
    { key: "appointments", label: "Appointments", count: history.appointments.length, icon: Calendar },
    { key: "consultations", label: "Consultations", count: history.consultations.length, icon: Stethoscope },
    { key: "prescriptions", label: "Prescriptions", count: history.prescriptions.length, icon: Pill },
    { key: "admissions", label: "Admissions", count: history.admissions.length, icon: BedDouble },
    { key: "vitals", label: "Vital Signs", count: history.vitalSigns.length, icon: HeartPulse },
    { key: "nursing", label: "Nursing Notes", count: history.nursingNotes.length, icon: ClipboardList },
    { key: "timeline", label: "Timeline", count: history.timelineEvents.length, icon: Clock },
  ];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Navigation Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/patients"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            Back to Directory
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-medium text-slate-500">Patient Record</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            title="Refresh clinical streams"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-teal-600" : "text-slate-500"}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {canEdit && (
            <div className="flex items-center gap-2">
              <Link
                href={`/patients/${patient.id}/edit`}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition shadow-sm"
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </Link>
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setIsDeleteModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-sm font-medium transition shadow-sm"
                title="Delete Patient Record"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hero Patient Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 p-6 text-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-2xl font-bold text-white shadow-inner">
                  {patient.firstName[0]}
                  {patient.lastName[0]}
                </div>
                <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md text-xs font-bold bg-rose-500 text-white shadow">
                  {formatBloodGroup(patient.bloodGroup)}
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    {patient.firstName} {patient.lastName}
                  </h1>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      patient.status === "ACTIVE"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : patient.status === "CRITICAL"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-slate-500/20 text-slate-300 border border-slate-500/40"
                    }`}
                  >
                    {patient.status}
                  </span>

                  {/* If patient has an active admission show ADMITTED badge; if recently discharged show DISCHARGED badge */}
                  {history.admissions.length > 0 && (
                    history.admissions.some((adm) => adm.status !== "DISCHARGED" && adm.status !== "CANCELLED") ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/30 text-rose-200 border border-rose-400/50">
                        Inpatient (Admitted)
                      </span>
                    ) : history.admissions[0].status === "DISCHARGED" ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/50">
                        Discharged
                      </span>
                    ) : null
                  )}
                </div>

                <p className="text-teal-100 text-sm mt-1 flex flex-wrap items-center gap-3">
                  <span>{patient.gender}</span>
                  <span>•</span>
                  <span>{calculateAge(patient.dateOfBirth)}</span>
                  <span>•</span>
                  <span>DOB: {formatDate(patient.dateOfBirth)}</span>
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur text-xs font-mono text-teal-50 border border-white/15">
                    <span>Patient #:</span>
                    <span className="font-bold">{patient.patientNumber}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(patient.patientNumber, "patientNumber")}
                      className="p-0.5 hover:text-white transition ml-1"
                      title="Copy Patient #"
                    >
                      {copiedField === "patientNumber" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {patient.mrNumber && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur text-xs font-mono text-teal-50 border border-white/15">
                      <span>MR #:</span>
                      <span className="font-bold">{patient.mrNumber}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(patient.mrNumber || "", "mrNumber")}
                        className="p-0.5 hover:text-white transition ml-1"
                        title="Copy MR #"
                      >
                        {copiedField === "mrNumber" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {patient.cnic && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur text-xs font-mono text-teal-50 border border-white/15">
                      <span>CNIC:</span>
                      <span>{patient.cnic}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(patient.cnic || "", "cnic")}
                        className="p-0.5 hover:text-white transition ml-1"
                        title="Copy CNIC"
                      >
                        {copiedField === "cnic" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Contact Header Pills */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 bg-black/20 p-3.5 rounded-xl border border-white/10 text-xs text-teal-100 min-w-[240px]">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-teal-300 shrink-0" />
                <span className="font-medium text-white">{patient.phone}</span>
              </div>
              {patient.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-teal-300 shrink-0" />
                  <span className="truncate max-w-[200px] text-white">{patient.email}</span>
                </div>
              )}
              {patient.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-teal-300 shrink-0" />
                  <span className="truncate max-w-[200px] text-white">{patient.address}</span>
                </div>
              )}
              <div className="pt-1.5 border-t border-white/10 text-[11px] text-teal-200 flex items-center justify-between">
                <span>Registered: {formatDate(patient.createdAt)}</span>
              </div>
              <div className="flex flex-col gap-1.5 mt-1">
                {history.admissions.some((adm) => adm.status !== "DISCHARGED" && adm.status !== "CANCELLED") && (
                  <Link
                    href={`/reception/patients/${patient.id}/discharge`}
                    className="inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition"
                  >
                    <BedDouble className="w-3.5 h-3.5" />
                    <span>Discharge Form</span>
                  </Link>
                )}
                <Link
                  href={`/appointments/new?patientId=${patient.id}`}
                  className="inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white text-teal-900 font-bold text-xs shadow-sm hover:bg-teal-50 transition"
                >
                  <Calendar className="w-3.5 h-3.5 text-teal-700" />
                  <span>Book Appointment</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center overflow-x-auto border-b border-slate-200 px-4 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition -mb-px ${
                  isActive
                    ? "border-teal-600 text-teal-700 bg-teal-50/50"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-teal-600" : "text-slate-400"}`} />
                <span>{tab.label}</span>
                {typeof tab.count === "number" && (
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      isActive ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Appointments</span>
                <Calendar className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{history.appointments.length}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Consultations</span>
                <Stethoscope className="w-4 h-4 text-teal-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{history.consultations.length}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Prescriptions</span>
                <Pill className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{history.prescriptions.length}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admissions</span>
                <BedDouble className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{history.admissions.length}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vitals Logged</span>
                <HeartPulse className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{history.vitalSigns.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Latest Vitals & Alerts */}
            <div className="lg:col-span-2 space-y-6">
              {/* Latest Vital Signs Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="w-5 h-5 text-rose-600" />
                    <h2 className="text-base font-bold text-slate-900">Latest Vital Signs</h2>
                  </div>
                  {latestVital && (
                    <span className="text-xs text-slate-500 font-medium">
                      Recorded: {formatDateTime(latestVital.recordedAt)} by {latestVital.recordedByName}
                    </span>
                  )}
                </div>

                {latestVital ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 font-medium">Blood Pressure</span>
                      <p className="text-lg font-bold text-slate-900 mt-1">
                        {latestVital.systolicBP && latestVital.diastolicBP
                          ? `${latestVital.systolicBP}/${latestVital.diastolicBP}`
                          : "—"}
                        <span className="text-xs font-normal text-slate-500 ml-1">mmHg</span>
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 font-medium">Pulse Rate</span>
                      <p className="text-lg font-bold text-slate-900 mt-1">
                        {latestVital.pulse || "—"}
                        <span className="text-xs font-normal text-slate-500 ml-1">bpm</span>
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 font-medium">Temperature</span>
                      <p className="text-lg font-bold text-slate-900 mt-1">
                        {latestVital.temperature || "—"}
                        <span className="text-xs font-normal text-slate-500 ml-1">°F</span>
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 font-medium">SpO2</span>
                      <p className="text-lg font-bold text-slate-900 mt-1">
                        {latestVital.oxygenSaturation || "—"}
                        <span className="text-xs font-normal text-slate-500 ml-1">%</span>
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 font-medium">Weight</span>
                      <p className="text-lg font-bold text-slate-900 mt-1">
                        {latestVital.weight || "—"}
                        <span className="text-xs font-normal text-slate-500 ml-1">kg</span>
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 font-medium">Height</span>
                      <p className="text-lg font-bold text-slate-900 mt-1">
                        {latestVital.height || "—"}
                        <span className="text-xs font-normal text-slate-500 ml-1">cm</span>
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 font-medium">BMI</span>
                      <p className="text-lg font-bold text-slate-900 mt-1">
                        {latestVital.bmi || "—"}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 font-medium">Condition</span>
                      <p className="text-sm font-bold text-emerald-700 mt-1">
                        {latestVital.generalCondition || "Stable"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    No vital signs recorded yet for this patient.
                  </div>
                )}
              </div>

              {/* Medical Alerts: Allergies & Chronic Conditions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-rose-50/50 rounded-xl border border-rose-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-sm mb-3">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Known Allergies</span>
                  </div>
                  {patient.allergies && patient.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {patient.allergies.map((allergy, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300"
                        >
                          {allergy}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-rose-600/80 italic">No known drug/food allergies recorded.</p>
                  )}
                </div>

                <div className="bg-blue-50/50 rounded-xl border border-blue-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-blue-800 font-bold text-sm mb-3">
                    <ShieldAlert className="w-4 h-4 text-blue-600" />
                    <span>Chronic Conditions</span>
                  </div>
                  {patient.chronicConditions && patient.chronicConditions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {patient.chronicConditions.map((cond, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300"
                        >
                          {cond}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-blue-600/80 italic">No chronic medical conditions listed.</p>
                  )}
                </div>
              </div>

              {/* Recent Activity Timeline Preview */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-teal-600" />
                    <h2 className="text-base font-bold text-slate-900">Recent Activity Feed</h2>
                  </div>
                  <button
                    onClick={() => setActiveTab("timeline")}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-700"
                  >
                    View All Timeline ({history.timelineEvents.length}) &rarr;
                  </button>
                </div>

                {history.timelineEvents.length > 0 ? (
                  <div className="space-y-4">
                    {history.timelineEvents.slice(0, 4).map((evt) => (
                      <div key={evt.id} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-teal-500 mt-2 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800">{evt.title}</span>
                            <span className="text-xs text-slate-400">{formatDateTime(evt.timestamp)}</span>
                          </div>
                          {evt.description && <p className="text-xs text-slate-600 mt-0.5">{evt.description}</p>}
                          {evt.performerName && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              By {evt.performerName} {evt.performerRole ? `(${evt.performerRole})` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No recent timeline events.</p>
                )}
              </div>
            </div>

            {/* Right Col: Emergency Contact & Quick Details */}
            <div className="space-y-6">
              {/* Emergency Contact Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-4 pb-3 border-b border-slate-100">
                  <Phone className="w-4 h-4 text-rose-600" />
                  <span>Emergency Contact</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Contact Person</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{patient.emergencyContactName}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Relationship</span>
                    <p className="font-medium text-slate-700 mt-0.5">
                      {patient.emergencyContactRelation || "Not specified"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Emergency Phone</span>
                    <p className="font-bold text-rose-600 mt-0.5 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5" />
                      {patient.emergencyContactPhone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Patient Quick Facts */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-4 pb-3 border-b border-slate-100">
                  <Info className="w-4 h-4 text-teal-600" />
                  <span>Record Metadata</span>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Marital Status</span>
                    <span className="font-medium text-slate-800">{patient.maritalStatus || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Guardian Relation</span>
                    <span className="font-medium text-slate-800">
                      {patient.relationType ? `${patient.relationType}: ${patient.relatedPersonName || "—"}` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Landline Phone</span>
                    <span className="font-medium text-slate-800">{patient.landline || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Last Modified</span>
                    <span className="font-medium text-slate-800">{formatDateTime(patient.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: DEMOGRAPHICS */}
      {activeTab === "demographics" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Personal Information & Demographics</h2>
              <p className="text-xs text-slate-500 mt-0.5">Verified hospital registry record</p>
            </div>
            {canEdit && (
              <Link
                href={`/patients/${patient.id}/edit`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Info
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</span>
              <p className="text-slate-900 font-bold mt-1">
                {patient.firstName} {patient.lastName}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient Number</span>
              <p className="text-slate-900 font-mono font-bold mt-1">{patient.patientNumber}</p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">MR Number</span>
              <p className="text-slate-900 font-mono font-bold mt-1">{patient.mrNumber || "—"}</p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CNIC / Identification</span>
              <p className="text-slate-900 font-mono mt-1">{patient.cnic || "Not registered"}</p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gender</span>
              <p className="text-slate-900 font-medium mt-1">{patient.gender}</p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Date of Birth & Age</span>
              <p className="text-slate-900 font-medium mt-1">
                {formatDate(patient.dateOfBirth)} ({calculateAge(patient.dateOfBirth)})
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Blood Group</span>
              <p className="text-slate-900 font-bold mt-1">{formatBloodGroup(patient.bloodGroup)}</p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Marital Status</span>
              <p className="text-slate-900 font-medium mt-1">{patient.maritalStatus || "—"}</p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Guardian / Kin</span>
              <p className="text-slate-900 font-medium mt-1">
                {patient.relationType ? `${patient.relationType}: ${patient.relatedPersonName}` : "—"}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Primary Mobile</span>
              <p className="text-slate-900 font-medium mt-1">{patient.phone}</p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Landline</span>
              <p className="text-slate-900 font-medium mt-1">{patient.landline || "—"}</p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</span>
              <p className="text-slate-900 font-medium mt-1">{patient.email || "—"}</p>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Residential Address</span>
              <p className="text-slate-900 font-medium mt-1">{patient.address || "No address provided"}</p>
            </div>

            <div className="md:col-span-2 lg:col-span-3 pt-4 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Emergency Contact Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-500">Contact Person</span>
                  <p className="font-semibold text-slate-900 mt-1">{patient.emergencyContactName}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-500">Relation</span>
                  <p className="font-medium text-slate-800 mt-1">{patient.emergencyContactRelation || "—"}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-500">Phone Number</span>
                  <p className="font-bold text-rose-600 mt-1">{patient.emergencyContactPhone}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: APPOINTMENTS */}
      {activeTab === "appointments" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Appointments History</h2>
            <span className="text-xs font-medium text-slate-500">
              Total: {history.appointments.length} appointments
            </span>
          </div>

          {history.appointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Appointment #</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Doctor & Dept</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Fee (PKR)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.appointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-teal-800 whitespace-nowrap">
                        <Link href={`/appointments/${apt.id}`} className="hover:underline">
                          {apt.appointmentNumber}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">
                        <div>{formatDate(apt.appointmentDate)}</div>
                        <div className="text-xs text-slate-400">{apt.appointmentTime}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {apt.doctor ? (
                          <div>
                            <span className="font-medium text-slate-800">
                              Dr. {apt.doctor.firstName} {apt.doctor.lastName}
                            </span>
                            <span className="block text-xs text-slate-400">{apt.department?.name || "General"}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                          {apt.appointmentType}
                        </span>
                        {apt.isEmergency && (
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                            EMERGENCY
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                        Rs. {Number(apt.consultationFee).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            apt.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : apt.status === "SCHEDULED"
                              ? "bg-blue-100 text-blue-800"
                              : apt.status === "CANCELLED"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {apt.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {apt.reason}
                        {apt.notes && <span className="block text-slate-400 mt-0.5">Note: {apt.notes}</span>}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/appointments/${apt.id}`}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                        >
                          View Slip
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-sm">
              No appointments on record for this patient.
            </div>
          )}
        </div>
      )}

      {/* Tab 4: CONSULTATIONS */}
      {activeTab === "consultations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Clinical Consultations</h2>
            <span className="text-xs font-medium text-slate-500">
              Total: {history.consultations.length} records
            </span>
          </div>

          {history.consultations.length > 0 ? (
            history.consultations.map((cns) => (
              <div key={cns.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-teal-700">{cns.consultationNumber}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500">{formatDateTime(cns.consultationDate)}</span>
                  </div>
                  {cns.doctor && (
                    <div className="text-sm font-medium text-slate-800">
                      Attending: <span className="text-teal-700">Dr. {cns.doctor.firstName} {cns.doctor.lastName}</span>{" "}
                      <span className="text-xs text-slate-400">({cns.doctor.specialization})</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {cns.presentingComplaints && (
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chief Complaints</span>
                      <p className="text-slate-800 mt-1 whitespace-pre-wrap">{cns.presentingComplaints}</p>
                    </div>
                  )}

                  {cns.physicalExamination && (
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Physical Examination</span>
                      <p className="text-slate-800 mt-1 whitespace-pre-wrap">{cns.physicalExamination}</p>
                    </div>
                  )}

                  {cns.finalDiagnosis && (
                    <div className="bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-100">
                      <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Final Diagnosis</span>
                      <p className="text-slate-900 font-bold mt-1">{cns.finalDiagnosis}</p>
                    </div>
                  )}

                  {cns.treatmentPlan && (
                    <div className="bg-blue-50/50 p-3.5 rounded-lg border border-blue-100">
                      <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Treatment Plan</span>
                      <p className="text-slate-800 mt-1 whitespace-pre-wrap">{cns.treatmentPlan}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm shadow-sm">
              No clinical consultations recorded yet.
            </div>
          )}
        </div>
      )}

      {/* Tab 5: PRESCRIPTIONS */}
      {activeTab === "prescriptions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Prescription Records</h2>
            <span className="text-xs font-medium text-slate-500">
              Total: {history.prescriptions.length} prescriptions
            </span>
          </div>

          {history.prescriptions.length > 0 ? (
            history.prescriptions.map((rx) => (
              <div key={rx.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-purple-700">{rx.prescriptionNumber}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">{formatDate(rx.createdAt)}</span>
                  </div>
                  {rx.doctor && (
                    <span className="text-xs font-medium text-slate-700">
                      Prescribed by Dr. {rx.doctor.firstName} {rx.doctor.lastName}
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {rx.diagnosis && (
                    <p className="text-xs text-slate-600 font-medium">
                      Diagnosis: <span className="text-slate-900 font-semibold">{rx.diagnosis}</span>
                    </p>
                  )}

                  {rx.items && rx.items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/60 text-slate-600 uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="py-2 px-3">Medicine</th>
                            <th className="py-2 px-3">Dosage</th>
                            <th className="py-2 px-3">Frequency</th>
                            <th className="py-2 px-3">Route</th>
                            <th className="py-2 px-3">Duration</th>
                            <th className="py-2 px-3">Instructions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rx.items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-semibold text-slate-800">{item.medicineName}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-700">{item.dosage}</td>
                              <td className="py-2.5 px-3 text-slate-600">{item.frequency}</td>
                              <td className="py-2.5 px-3 text-slate-600">{item.route}</td>
                              <td className="py-2.5 px-3 text-slate-600">{item.duration}</td>
                              <td className="py-2.5 px-3 text-slate-500">{item.instructions || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No medication items listed in this prescription.</p>
                  )}

                  {rx.notes && (
                    <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                      Notes: {rx.notes}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm shadow-sm">
              No prescriptions issued for this patient.
            </div>
          )}
        </div>
      )}

      {/* Tab 6: ADMISSIONS */}
      {activeTab === "admissions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Inpatient & Emergency Admissions</h2>
            <span className="text-xs font-medium text-slate-500">
              Total: {history.admissions.length} admissions
            </span>
          </div>

          {history.admissions.length > 0 ? (
            history.admissions.map((adm) => (
              <div key={adm.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-amber-700">{adm.admissionNumber}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      Source: {adm.admissionSource}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        adm.status === "ADMITTED"
                          ? "bg-rose-100 text-rose-800"
                          : adm.status === "DISCHARGED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {adm.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Admitted: {formatDate(adm.admissionDate)} {adm.admissionTime || ""}
                    {adm.dischargeDate && <span> • Discharged: {formatDate(adm.dischargeDate)}</span>}
                  </div>
                </div>

                {/* Clinical Details Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Room / Bed</span>
                    <p className="font-semibold text-slate-900 mt-0.5">{adm.roomBedNo || "Not assigned"}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attending Doctor</span>
                    <p className="font-medium text-slate-800 mt-0.5">
                      {adm.doctor ? `Dr. ${adm.doctor.firstName} ${adm.doctor.lastName}` : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Final Diagnosis</span>
                    <p className="font-medium text-slate-800 mt-0.5">{adm.finalDiagnosis || "Under investigation"}</p>
                  </div>
                </div>

                {/* Additional Clinical Info if available */}
                {(adm.operation || adm.outcome || adm.dischargeCondition) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 text-xs">
                    {adm.operation && (
                      <div>
                        <span className="text-slate-500 font-medium">Procedure:</span>
                        <p className="font-semibold text-slate-800 mt-0.5">{adm.operation}</p>
                      </div>
                    )}
                    {adm.outcome && (
                      <div>
                        <span className="text-slate-500 font-medium">Outcome:</span>
                        <p className="font-semibold text-slate-800 mt-0.5">{adm.outcome}</p>
                      </div>
                    )}
                    {adm.dischargeCondition && (
                      <div>
                        <span className="text-slate-500 font-medium">Discharge Condition:</span>
                        <p className="font-semibold text-teal-800 mt-0.5">{adm.dischargeCondition}</p>
                      </div>
                    )}
                  </div>
                )}

                {adm.dischargeSummary && (
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                    <span className="font-semibold text-slate-700">Discharge Summary:</span>
                    <p className="text-slate-600 mt-1">{adm.dischargeSummary}</p>
                  </div>
                )}

                {/* Actions per Admission */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  {adm.status !== "DISCHARGED" && adm.status !== "CANCELLED" ? (
                    <Link
                      href={`/reception/patients/${patient.id}/discharge`}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition inline-flex items-center gap-1.5"
                    >
                      <BedDouble className="w-3.5 h-3.5" />
                      <span>Prepare Discharge Form</span>
                    </Link>
                  ) : (
                    <Link
                      href={`/reception/discharge/${adm.id}/print`}
                      target="_blank"
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition inline-flex items-center gap-1.5 border border-slate-300"
                    >
                      <FileText className="w-3.5 h-3.5 text-teal-700" />
                      <span>Print Discharge Form</span>
                    </Link>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm shadow-sm">
              No hospital admissions on record for this patient.
            </div>
          )}
        </div>
      )}

      {/* Tab 7: VITALS */}
      {activeTab === "vitals" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Historical Vital Signs Log</h2>
            <span className="text-xs font-medium text-slate-500">
              Total: {history.vitalSigns.length} records
            </span>
          </div>

          {history.vitalSigns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">BP (mmHg)</th>
                    <th className="py-3 px-4">Pulse (bpm)</th>
                    <th className="py-3 px-4">Temp (°F)</th>
                    <th className="py-3 px-4">SpO2 (%)</th>
                    <th className="py-3 px-4">Weight/BMI</th>
                    <th className="py-3 px-4">Condition</th>
                    <th className="py-3 px-4">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.vitalSigns.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-700">
                        {formatDateTime(v.recordedAt)}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">
                        {v.systolicBP && v.diastolicBP ? `${v.systolicBP}/${v.diastolicBP}` : "—"}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">{v.pulse || "—"}</td>
                      <td className="py-3 px-4 text-slate-800">{v.temperature ? `${v.temperature}°F` : "—"}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {v.oxygenSaturation ? `${v.oxygenSaturation}%` : "—"}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700">
                        {v.weight ? `${v.weight} kg` : "—"}{" "}
                        {v.bmi ? <span className="text-slate-400">({v.bmi})</span> : ""}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {v.generalCondition || "Stable"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {v.recordedByName} <span className="text-slate-400">({v.recordedByRole})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-sm">
              No vital signs recorded for this patient yet.
            </div>
          )}
        </div>
      )}

      {/* Tab 8: NURSING NOTES */}
      {activeTab === "nursing" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Clinical Nursing Notes</h2>
            <span className="text-xs font-medium text-slate-500">
              Total: {history.nursingNotes.length} notes
            </span>
          </div>

          {history.nursingNotes.length > 0 ? (
            history.nursingNotes.map((note) => (
              <div key={note.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 text-sm">Nurse: {note.recordedByName}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      Dept: {note.department}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{formatDateTime(note.recordedAt)}</span>
                </div>

                <div className="text-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clinical Observation</span>
                  <p className="text-slate-800 mt-1 whitespace-pre-wrap">{note.observation}</p>
                </div>

                {note.patientCondition && (
                  <div className="text-sm">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Condition</span>
                    <p className="text-slate-800 mt-0.5">{note.patientCondition}</p>
                  </div>
                )}

                {note.intervention && (
                  <div className="text-sm bg-teal-50/50 p-3 rounded-lg border border-teal-100">
                    <span className="text-xs font-semibold text-teal-800 uppercase tracking-wider">Intervention / Response</span>
                    <p className="text-teal-900 mt-0.5">{note.intervention}</p>
                    {note.response && <p className="text-teal-700 text-xs mt-1">Response: {note.response}</p>}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm shadow-sm">
              No nursing observations or shift notes on record.
            </div>
          )}
        </div>
      )}

      {/* Tab 9: TIMELINE */}
      {activeTab === "timeline" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
            <h2 className="text-base font-bold text-slate-900">Longitudinal Patient Timeline</h2>
            <span className="text-xs font-medium text-slate-500">
              Total: {history.timelineEvents.length} chronological events
            </span>
          </div>

          {history.timelineEvents.length > 0 ? (
            <div className="relative pl-6 space-y-6 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-[2px] before:bg-slate-200">
              {history.timelineEvents.map((evt) => (
                <div key={evt.id} className="relative group">
                  <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-teal-600 shadow-sm group-hover:scale-125 transition" />
                  <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h3 className="text-sm font-bold text-slate-900">{evt.title}</h3>
                      <span className="text-xs text-slate-400 font-mono">{formatDateTime(evt.timestamp)}</span>
                    </div>

                    {evt.description && <p className="text-xs text-slate-600 mt-1">{evt.description}</p>}

                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-400">
                      <span className="font-mono uppercase px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600">
                        {evt.eventType}
                      </span>
                      {evt.performerName && (
                        <span>
                          By {evt.performerName} {evt.performerRole ? `(${evt.performerRole})` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-sm">
              No timeline events recorded yet.
            </div>
          )}
        </div>
      )}

      {/* Delete Patient Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs text-left">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-full bg-rose-50 border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Patient Record</h3>
                <p className="text-xs text-slate-500">Permanent and irreversible action</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete patient{" "}
              <strong className="text-slate-900">
                {patient.firstName} {patient.lastName} ({patient.mrNumber || patient.patientNumber})
              </strong>
              ?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs space-y-1">
              <p className="font-semibold">This will cascade delete all linked records:</p>
              <ul className="list-disc list-inside text-[11px] text-amber-700">
                <li>Appointments ({history.appointments.length})</li>
                <li>Vital Signs ({history.vitalSigns.length})</li>
                <li>Consultations ({history.consultations.length})</li>
                <li>Prescriptions ({history.prescriptions.length})</li>
                <li>Admissions ({history.admissions.length})</li>
                <li>Nursing Notes ({history.nursingNotes.length})</li>
                <li>Emergency Triage ({patient._count?.emergencyTriages ?? 0})</li>
              </ul>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePatient}
                disabled={isDeleting}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
