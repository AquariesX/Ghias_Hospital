"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Clock,
  Activity,
  CheckCircle,
  AlertTriangle,
  HeartPulse,
  ArrowRight,
  Stethoscope,
  ChevronRight,
  Flame,
  BedDouble,
  ClipboardList,
  Sparkles,
  Plus,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Pill,
  FileText,
  AlertCircle,
  RefreshCw,
  X,
  Printer,
  ExternalLink,
} from "lucide-react";
import VerbalOrdersPolicyView from "@/components/inpatient/VerbalOrdersPolicyView";
import { parseDoctorOrderNotes } from "@/components/inpatient/DoctorOrdersSection";
import EmergencyDischargeDocument, {
  DischargeMedicationItem,
} from "@/components/emergency/EmergencyDischargeDocument";

function formatTimeAMPM(isoDate: string | Date | undefined | null): string {
  if (!isoDate) return "";
  try {
    const d = new Date(isoDate);
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
  } catch {
    return "";
  }
}

export interface AdmittedInpatientItem {
  id: string;
  admissionNumber: string;
  roomBedNo: string | null;
  admissionSource: string;
  admissionDate: Date | string;
  admissionTime: string | null;
  status: string;
  provisionalDiagnosis?: string | null;
  operation?: string | null;
  doctor?: {
    id?: string;
    firstName: string;
    lastName: string;
    specialization: string;
  } | null;
  doctorName?: string | null;
  patient: {
    id: string;
    patientNumber: string;
    mrNumber: string | null;
    firstName: string;
    lastName: string;
    gender: string;
    bloodGroup: string;
    allergies?: string[];
  };
}

export interface VerbalOrderItem {
  id: string;
  prescriptionNumber: string;
  createdAt: string;
  notes?: string | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    mrNumber: string | null;
    patientNumber: string;
    gender?: string;
    phone?: string;
  };
  doctor?: {
    id?: string;
    firstName: string;
    lastName: string;
    specialization: string;
  } | null;
  admission?: {
    id: string;
    admissionNumber: string;
    roomBedNo: string | null;
    status: string;
  } | null;
  items?: Array<{
    id: string;
    medicineName: string;
    dosage: string;
    frequency: string;
    route: string;
  }>;
}

interface NurseDashboardViewProps {
  nurseName: string;
  department: "OPD" | "EMERGENCY" | "IPD" | null;
  role: string;
  shift: string | null;
  admittedInpatients?: AdmittedInpatientItem[];
  verbalOrders?: VerbalOrderItem[];
  ipdMetrics?: {
    totalInpatients: number;
    admittedToday: number;
    underTreatment: number;
    dischargePending: number;
    availableBeds?: number;
  };
  opdMetrics?: {
    totalPatients: number;
    waiting: number;
    inConsultation: number;
    completed: number;
  };
  erMetrics?: {
    totalCases: number;
    critical: number;
    high: number;
    urgent: number;
    normal: number;
  };
  queue: Array<{
    id: string;
    triageId?: string | null;
    admissionId?: string | null;
    dischargeDateTime?: string | null;
    triageLevel?: string | null;
    isAdmission?: boolean;
    roomBedNo?: string | null;
    patient: {
      id: string;
      patientNumber: string;
      mrNumber: string | null;
      firstName: string;
      lastName: string;
      gender: string;
      dateOfBirth: Date | string;
      phone: string;
      bloodGroup: string;
      allergies: string[];
      vitalSigns?: Array<{
        systolicBP: number | null;
        diastolicBP: number | null;
        pulse: number | null;
        temperature: any;
        oxygenSaturation: number | null;
        recordedAt: Date | string;
      }>;
    };
    doctor?: {
      firstName: string;
      lastName: string;
      specialization: string;
      roomNumber: string | null;
    } | null;
    department?: {
      name: string;
    } | null;
    appointmentTime?: string;
    status?: string;
    priority?: string;
    chiefComplaint?: string;
    triagedAt?: Date | string;
  }>;
}

function getDischargePrintDataFromItem(item: any) {
  const p = item.patient || {};
  return {
    patient: {
      id: p.id,
      mrNumber: p.mrNumber,
      patientNumber: p.patientNumber,
      firstName: p.firstName,
      lastName: p.lastName,
      gender: p.gender,
      dateOfBirth: p.dateOfBirth ? String(p.dateOfBirth) : undefined,
      phone: p.phone,
      cnic: p.cnic,
      relationType: p.relationType,
      relatedPersonName: p.relatedPersonName,
      address: p.address,
    },
    triage: {
      id: item.triageId || item.id,
      admissionDateTime: item.admissionDateTime || item.triagedAt,
      triagedAt: item.triagedAt ? String(item.triagedAt) : undefined,
      triagedByName: item.triagedByName || "Triage Officer",
      systolicBP: item.vitalSigns?.[0]?.systolicBP || null,
      diastolicBP: item.vitalSigns?.[0]?.diastolicBP || null,
      pulse: item.vitalSigns?.[0]?.pulse || null,
      temperature: item.vitalSigns?.[0]?.temperature || null,
      weight: item.vitalSigns?.[0]?.weight || null,
      oxygenSaturation: item.vitalSigns?.[0]?.oxygenSaturation || null,
      chiefComplaint: item.chiefComplaint,
      finalDiagnosis: item.finalDiagnosis || item.admission?.finalDiagnosis,
    },
    discharge: {
      dischargeDateTime: item.dischargeDateTime || item.admission?.dischargeDate,
      dischargeCondition: item.admission?.dischargeCondition || "Satisfactory / Discharged Home",
      dischargeSummary: item.admission?.dischargeSummary,
      dischargeInstructions: item.admission?.dischargeInstructions,
      dischargeMedications: item.admission?.dischargeMedications,
      outcome: item.admission?.outcome || item.admission?.dischargeCondition,
    },
  };
}

export default function NurseDashboardView({
  nurseName,
  department,
  role,
  shift,
  admittedInpatients,
  verbalOrders = [],
  ipdMetrics,
  opdMetrics,
  erMetrics,
  queue,
}: NurseDashboardViewProps) {
  const router = useRouter();
  const [localQueue, setLocalQueue] = useState(queue);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isVerbalOrdersExpanded, setIsVerbalOrdersExpanded] = useState(true);
  const [dischargeModalOpen, setDischargeModalOpen] = useState(false);
  const [itemToDischarge, setItemToDischarge] = useState<any | null>(null);
  const [dischargeTab, setDischargeTab] = useState<"OUTCOME" | "MEDICATIONS">("OUTCOME");
  const [dischargeDateTime, setDischargeDateTime] = useState("");
  const [dischargeCondition, setDischargeCondition] = useState("Satisfactory / Discharged Home");
  const [dischargeSummary, setDischargeSummary] = useState("");
  const [dischargeInstructions, setDischargeInstructions] = useState("");
  const [dischargeMedications, setDischargeMedications] = useState("");
  const [dischargeFinalDiagnosis, setDischargeFinalDiagnosis] = useState("");
  const [dischargeMedList, setDischargeMedList] = useState<DischargeMedicationItem[]>([]);
  const [discharging, setDischarging] = useState(false);
  const [dischargeError, setDischargeError] = useState<string | null>(null);

  // Discharge Print Form Modal state
  const [dischargePrintModalOpen, setDischargePrintModalOpen] = useState(false);
  const [recordToPrintDischarge, setRecordToPrintDischarge] = useState<any | null>(null);

  const isEmergency = department === "EMERGENCY";

  const addDischargeMedRow = (prefill?: Partial<DischargeMedicationItem>) => {
    setDischargeMedList((prev) => [
      ...prev,
      {
        id: `dmed-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        medicineName: prefill?.medicineName || "",
        dosage: prefill?.dosage || "1 Tab",
        route: prefill?.route || "Oral",
        frequency: prefill?.frequency || "TDS",
        timing: prefill?.timing || "After meals",
        duration: prefill?.duration || "5 days",
        instructions: prefill?.instructions || "",
      },
    ]);
  };

  const removeDischargeMedRow = (index: number) => {
    setDischargeMedList((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.length === 0
        ? [
            {
              id: `dmed-${Date.now()}`,
              medicineName: "",
              dosage: "1 Tab",
              route: "Oral",
              frequency: "TDS",
              timing: "After meals",
              duration: "5 days",
              instructions: "",
            },
          ]
        : filtered;
    });
  };

  const updateDischargeMedRow = (index: number, field: keyof DischargeMedicationItem, val: string) => {
    setDischargeMedList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleOpenDischarge = (item: any) => {
    setItemToDischarge(item);
    setDischargeTab("OUTCOME");
    setDischargeDateTime(new Date().toISOString().slice(0, 16));
    setDischargeCondition(item.admission?.dischargeCondition || "Satisfactory / Discharged Home");
    setDischargeFinalDiagnosis(item.admission?.finalDiagnosis || item.finalDiagnosis || "");
    setDischargeSummary(item.admission?.dischargeSummary || "");
    setDischargeInstructions(
      item.admission?.dischargeInstructions ||
        "Take prescribed medications on time. Maintain adequate hydration and rest. Return immediately to Emergency if symptoms recur."
    );

    let initialMeds: DischargeMedicationItem[] = [];
    if (item.admission?.dischargeMedications) {
      try {
        const parsed = JSON.parse(item.admission.dischargeMedications);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialMeds = parsed;
        } else {
          setDischargeMedications(item.admission.dischargeMedications);
        }
      } catch {
        setDischargeMedications(item.admission.dischargeMedications);
      }
    }

    if (initialMeds.length === 0) {
      initialMeds = [
        {
          id: `dmed-${Date.now()}-1`,
          medicineName: "Tab Panadol 500mg",
          dosage: "500 mg",
          route: "Oral",
          frequency: "TDS",
          timing: "After meals",
          duration: "5 days",
          instructions: "For mild pain or fever",
        },
      ];
    }
    setDischargeMedList(initialMeds);
    setDischargeError(null);
    setDischargeModalOpen(true);
  };

  const handleOpenDischargePrint = (item: any) => {
    setRecordToPrintDischarge(item);
    setDischargePrintModalOpen(true);
  };

  const handleConfirmDischarge = async (e?: React.FormEvent, shouldPrint: boolean = false) => {
    if (e) e.preventDefault();
    if (!itemToDischarge) return;
    try {
      setDischarging(true);
      setDischargeError(null);

      const validMeds = dischargeMedList.filter((m) => m.medicineName.trim().length > 0);
      const serializedMedications =
        validMeds.length > 0
          ? JSON.stringify(validMeds)
          : dischargeMedications.trim() || undefined;

      const effectiveDischargeTime = dischargeDateTime || new Date().toISOString();

      const res = await fetch("/api/staff/emergency/discharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triageId: itemToDischarge.triageId || itemToDischarge.id,
          admissionId: itemToDischarge.admissionId,
          dischargeDateTime: effectiveDischargeTime,
          dischargeCondition,
          dischargeSummary: dischargeSummary.trim() || undefined,
          dischargeInstructions: dischargeInstructions.trim() || undefined,
          dischargeMedications: serializedMedications,
          finalDiagnosis: dischargeFinalDiagnosis.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to discharge emergency patient");
      }

      const updatedItem = {
        ...itemToDischarge,
        dischargeDateTime: effectiveDischargeTime,
        admission: itemToDischarge.admission
          ? {
              ...itemToDischarge.admission,
              dischargeDate: effectiveDischargeTime,
              dischargeCondition,
              dischargeSummary: dischargeSummary.trim(),
              dischargeInstructions: dischargeInstructions.trim(),
              dischargeMedications: serializedMedications || null,
              finalDiagnosis: dischargeFinalDiagnosis.trim(),
              outcome: dischargeCondition,
            }
          : null,
      };

      setLocalQueue((prev) =>
        prev.map((q) =>
          q.id === itemToDischarge.id
            ? { ...q, dischargeDateTime: effectiveDischargeTime }
            : q
        )
      );
      setDischargeModalOpen(false);
      setItemToDischarge(null);
      router.refresh();

      if (shouldPrint) {
        setRecordToPrintDischarge(updatedItem);
        setDischargePrintModalOpen(true);
      }
    } catch (err: any) {
      setDischargeError(err.message || "Failed to discharge emergency patient");
    } finally {
      setDischarging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isEmergency ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                }`}
              />
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  isEmergency
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-teal-50 text-teal-700 border border-teal-200"
                }`}
              >
                {isEmergency ? "Emergency Nursing Station" : department === "IPD" ? "IPD Inpatient Station" : "OPD Nursing Station"}
              </span>
              {shift && (
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Shift: {shift}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Welcome, {nurseName}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Department:{" "}
              <span className="font-semibold text-slate-800">
                {department ? (isEmergency ? "Emergency / Triage" : department === "IPD" ? "Inpatient (IPD Wards)" : "Outpatient (OPD)") : "Clinical General"}
              </span>{" "}
              | Role: <span className="font-medium text-slate-700">{role.replace(/_/g, " ")}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isEmergency ? (
              <Link
                href="/staff/emergency"
                className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-xs"
              >
                <Flame className="w-4 h-4" />
                Emergency Queue &amp; Triage
              </Link>
            ) : department === "IPD" ? (
              <>
                <Link
                  href="/staff/inpatients"
                  className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-xs"
                >
                  <BedDouble className="w-4 h-4" />
                  Inpatient Wards &amp; Beds
                </Link>
                <Link
                  href="/admissions"
                  className="inline-flex items-center gap-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  Admit Patient
                </Link>
              </>
            ) : (
              <Link
                href="/staff/opd"
                className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-xs"
              >
                <Stethoscope className="w-4 h-4" />
                Open OPD Queue
              </Link>
            )}
            <Link
              href="/staff/patients"
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-xs"
            >
              <Users className="w-4 h-4 text-slate-500" />
              Patient Directory
            </Link>
            <button
              type="button"
              onClick={() => setIsPolicyModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold px-3 py-2 rounded-lg text-sm transition-colors shadow-2xs"
              title="View SOPs on Verbal Orders (زبانی احکامات پر پالیسی)"
            >
              <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Verbal Orders SOP</span>
            </button>
          </div>
        </div>
      </div>

      {/* Today's Overview Cards */}
      {isEmergency && erMetrics ? (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Emergency Cases &amp; Triage Priority
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase">Total ER Cases</span>
                <HeartPulse className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{erMetrics.totalCases}</p>
            </div>

            <div className="bg-rose-50 p-4 sm:p-5 rounded-xl border border-rose-200 shadow-xs">
              <div className="flex items-center justify-between text-rose-700 mb-1">
                <span className="text-xs font-bold uppercase">Critical</span>
                <Flame className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-rose-800">{erMetrics.critical}</p>
            </div>

            <div className="bg-amber-50 p-4 sm:p-5 rounded-xl border border-amber-200 shadow-xs">
              <div className="flex items-center justify-between text-amber-700 mb-1">
                <span className="text-xs font-bold uppercase">High</span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-amber-800">{erMetrics.high}</p>
            </div>

            <div className="bg-blue-50 p-4 sm:p-5 rounded-xl border border-blue-200 shadow-xs">
              <div className="flex items-center justify-between text-blue-700 mb-1">
                <span className="text-xs font-bold uppercase">Urgent</span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-800">{erMetrics.urgent}</p>
            </div>

            <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-700 mb-1">
                <span className="text-xs font-bold uppercase">Normal</span>
                <CheckCircle className="w-4 h-4 text-slate-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800">{erMetrics.normal}</p>
            </div>
          </div>
        </div>
      ) : department === "IPD" && ipdMetrics ? (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Inpatient Wards &amp; Bed Occupancy
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase">Total Inpatients</span>
                <BedDouble className="w-4 h-4 text-teal-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{ipdMetrics.totalInpatients}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Active in IPD</p>
            </div>

            <div className="bg-blue-50 p-4 sm:p-5 rounded-xl border border-blue-200 shadow-xs">
              <div className="flex items-center justify-between text-blue-700 mb-1">
                <span className="text-xs font-bold uppercase">Admitted Today</span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-800">{ipdMetrics.admittedToday}</p>
              <p className="text-[11px] text-blue-600 mt-0.5">New arrivals</p>
            </div>

            <div className="bg-amber-50 p-4 sm:p-5 rounded-xl border border-amber-200 shadow-xs">
              <div className="flex items-center justify-between text-amber-700 mb-1">
                <span className="text-xs font-bold uppercase">In Treatment</span>
                <Activity className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-amber-800">{ipdMetrics.underTreatment}</p>
              <p className="text-[11px] text-amber-600 mt-0.5">Active therapy</p>
            </div>

            <div className="bg-emerald-50 p-4 sm:p-5 rounded-xl border border-emerald-200 shadow-xs">
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <span className="text-xs font-bold uppercase">Discharge Pending</span>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-800">{ipdMetrics.dischargePending}</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">Ready for release</p>
            </div>

            <div className="bg-purple-50 p-4 sm:p-5 rounded-xl border border-purple-200 shadow-xs">
              <div className="flex items-center justify-between text-purple-700 mb-1">
                <span className="text-xs font-bold uppercase">Available Beds</span>
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-purple-800">{ipdMetrics.availableBeds ?? 0}</p>
              <p className="text-[11px] text-purple-600 mt-0.5">Free in wards</p>
            </div>
          </div>
        </div>
      ) : opdMetrics ? (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Today&apos;s OPD Overview
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase">Total Patients</span>
                <Users className="w-4 h-4 text-teal-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{opdMetrics.totalPatients}</p>
            </div>

            <div className="bg-amber-50 p-4 sm:p-5 rounded-xl border border-amber-200 shadow-xs">
              <div className="flex items-center justify-between text-amber-700 mb-1">
                <span className="text-xs font-bold uppercase">Waiting</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-amber-800">{opdMetrics.waiting}</p>
            </div>

            <div className="bg-blue-50 p-4 sm:p-5 rounded-xl border border-blue-200 shadow-xs">
              <div className="flex items-center justify-between text-blue-700 mb-1">
                <span className="text-xs font-bold uppercase">In Treatment</span>
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-800">{opdMetrics.inConsultation}</p>
            </div>

            <div className="bg-emerald-50 p-4 sm:p-5 rounded-xl border border-emerald-200 shadow-xs">
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <span className="text-xs font-bold uppercase">Completed</span>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-800">{opdMetrics.completed}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Verbal Doctor Orders Section */}
      {(() => {
        const verbalOrdersList = (verbalOrders || []).filter((ord) => {
          const meta = parseDoctorOrderNotes(ord.notes);
          return meta.isVerbalOrder || (ord.notes && (ord.notes.includes("[GIAS_DOCTOR_ORDER]") || ord.notes.includes("verbal") || ord.notes.includes("زبانی")));
        });

        const pendingCountersignCount = verbalOrdersList.filter((ord) => {
          const meta = parseDoctorOrderNotes(ord.notes);
          return !meta.isCountersigned;
        }).length;

        return (
          <div className="bg-linear-to-r from-rose-50/50 via-white to-rose-50/30 rounded-2xl border border-rose-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-rose-100 flex flex-wrap items-center justify-between gap-3 bg-white/70">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl border border-rose-200 shadow-2xs">
                  <AlertOctagon className="w-5 h-5 text-rose-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      Verbal Doctor Orders (زبانی احکامات)
                    </h2>
                    <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs">
                      {verbalOrdersList.length} {verbalOrdersList.length === 1 ? "Active" : "Active"}
                    </span>
                    {pendingCountersignCount > 0 && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        {pendingCountersignCount} Pending Countersign
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Orders received with physician verbal authorization • Red ink mandate (سرخ سیاہی) &amp; 24h countersign window
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPolicyModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold transition shadow-2xs"
                >
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-700" />
                  <span>SOP Guidelines (پالیسی)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsVerbalOrdersExpanded(!isVerbalOrdersExpanded)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition"
                  title={isVerbalOrdersExpanded ? "Collapse section" : "Expand section"}
                >
                  {isVerbalOrdersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isVerbalOrdersExpanded && (
              <div className="p-4 sm:p-5">
                {verbalOrdersList.length === 0 ? (
                  <div className="bg-white/80 border border-dashed border-rose-200 rounded-xl p-5 text-center text-xs">
                    <div className="flex items-center justify-center gap-2 text-slate-700 font-semibold mb-1">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>No active verbal orders requiring attention</span>
                    </div>
                    <p className="text-slate-400 max-w-md mx-auto">
                      All inpatient treatment orders are documented and validated. Verbal orders are restricted to extraordinary circumstances per hospital SOP.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {verbalOrdersList.map((ord) => {
                      const meta = parseDoctorOrderNotes(ord.notes);
                      const isCountersigned = meta.isCountersigned;

                      return (
                        <div
                          key={ord.id}
                          className="bg-white border border-rose-200 hover:border-rose-300 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all space-y-3 relative overflow-hidden flex flex-col justify-between"
                        >
                          {/* Top Red Strip */}
                          <div className="h-1 bg-rose-600 absolute top-0 left-0 right-0" />

                          <div className="space-y-2">
                            {/* Patient & Bed */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <Link
                                  href={`/staff/inpatients/${ord.admission?.id || ord.id}`}
                                  className="font-bold text-slate-900 hover:text-rose-700 text-xs transition flex items-center gap-1"
                                >
                                  <span>{ord.patient.firstName} {ord.patient.lastName}</span>
                                  <ChevronRight className="w-3 h-3 text-slate-400" />
                                </Link>
                                <span className="font-mono text-[10px] text-slate-500 block">
                                  MR: {ord.patient.mrNumber || ord.patient.patientNumber}
                                </span>
                              </div>

                              <div className="text-right">
                                {ord.admission?.roomBedNo ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                    <BedDouble className="w-3 h-3 text-teal-700" />
                                    {ord.admission.roomBedNo}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Ward Inpatient</span>
                                )}
                              </div>
                            </div>

                            {/* Order Text in RED INK styling per SOP Rule 4 */}
                            <div className="bg-rose-50/80 p-2.5 rounded-lg border border-rose-200">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800 block mb-0.5">
                                Verbal Directive (سرخ سیاہی):
                              </span>
                              <p className="text-xs font-semibold text-rose-950 leading-relaxed line-clamp-3">
                                {meta.orderText || meta.rawText}
                              </p>
                            </div>

                            {/* Prescription items if any */}
                            {ord.items && ord.items.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {ord.items.map((it) => (
                                  <span
                                    key={it.id}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded"
                                  >
                                    <Pill className="w-2.5 h-2.5 text-teal-600" />
                                    {it.medicineName} ({it.dosage})
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Audit Trail & Quick Links */}
                          <div className="pt-2 border-t border-slate-100 text-[10px] space-y-1.5 text-slate-500">
                            <div className="flex items-center justify-between">
                              <span>
                                Doctor: <strong className="text-slate-800">{ord.doctor ? `Dr. ${ord.doctor.firstName} ${ord.doctor.lastName}` : "Attending Physician"}</strong>
                              </span>
                              <span suppressHydrationWarning className="font-mono text-slate-400">
                                {formatTimeAMPM(ord.createdAt)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-slate-500">
                              <span>Taken by: <strong>{meta.receivingNurseName || "Nurse"}</strong></span>
                              <span>Witness: <strong>{meta.secondNurseName || "Verified"}</strong></span>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              {isCountersigned ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                                  Countersigned
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                                  <Clock className="w-3 h-3 text-rose-600 animate-pulse" />
                                  Pending Countersign (24h)
                                </span>
                              )}

                              <Link
                                href={`/staff/inpatients/${ord.admission?.id || ord.id}`}
                                className="font-bold text-teal-700 hover:text-teal-800 flex items-center gap-0.5"
                              >
                                <span>Chart &amp; Meds</span>
                                <ChevronRight className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Patient Queue Preview Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEmergency
                ? "Active Emergency Queue"
                : department === "IPD"
                ? "Active IPD Inpatient Roster (Wards & Beds)"
                : "Today's Patient Queue"}
            </h2>
            <p className="text-xs text-slate-500">
              {isEmergency
                ? "Immediate triage assessment and vital sign monitoring"
                : department === "IPD"
                ? "Active admitted inpatients, bed assignments, medication sheets & nursing chart"
                : "Record vitals and prepare patients for doctor consultation"}
            </p>
          </div>
          <Link
            href={isEmergency ? "/emergency" : department === "IPD" ? "/staff/inpatients" : "/staff/opd"}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-800"
          >
            {department === "IPD" ? "View Inpatient Ward & Sheets" : "View Full Queue"}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {queue.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <BedDouble className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-700">
              {isEmergency
                ? "No emergency patients found in queue."
                : department === "IPD"
                ? "No inpatients currently admitted in IPD wards."
                : "No patients are currently waiting in OPD."}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {department === "IPD"
                ? "New inpatient admissions registered via reception will appear here immediately."
                : "New arrivals will appear here once registered or checked in."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">MR Number</th>
                  {isEmergency ? (
                    <>
                      <th className="py-3 px-4">Priority / Triage</th>
                      <th className="py-3 px-4">Chief Complaint</th>
                    </>
                  ) : department === "IPD" ? (
                    <>
                      <th className="py-3 px-4">Bed / Room</th>
                      <th className="py-3 px-4">Attending Doctor</th>
                      <th className="py-3 px-4">Clinical Diagnosis</th>
                      <th className="py-3 px-4">Status</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3 px-4">Assigned Doctor</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Status</th>
                    </>
                  )}
                  <th className="py-3 px-4">Latest Vitals</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {localQueue.map((item) => {
                  const latestVital = item.patient.vitalSigns?.[0];
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {item.patient.firstName} {item.patient.lastName}
                        </div>
                        <div className="text-xs text-slate-400">
                          {item.patient.gender} | {item.patient.bloodGroup ? item.patient.bloodGroup.replace("_", "") : ""}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700">
                        {item.patient.mrNumber || item.patient.patientNumber}
                      </td>
                      {isEmergency ? (
                        <>
                          <td className="py-3 px-4">
                            <span
                              className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full border ${
                                item.priority === "CRITICAL"
                                  ? "bg-red-100 text-red-800 border-red-300 font-extrabold"
                                  : item.priority === "HIGH"
                                  ? "bg-amber-100 text-amber-900 border-amber-300 font-bold"
                                  : item.priority === "URGENT"
                                  ? "bg-purple-100 text-purple-900 border-purple-300"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {item.priority || "NORMAL"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-700 max-w-xs truncate">
                            {item.chiefComplaint || "Emergency evaluation"}
                          </td>
                        </>
                      ) : department === "IPD" ? (
                        <>
                          <td className="py-3 px-4 text-xs font-semibold text-slate-800">
                            {item.roomBedNo ? (
                              <span className="inline-flex items-center gap-1 font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                <BedDouble className="w-3.5 h-3.5 text-teal-700" />
                                {item.roomBedNo}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">No Bed Assigned</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-800">
                            {item.doctor ? `Dr. ${item.doctor.firstName} ${item.doctor.lastName}` : "Attending Physician"}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-700 max-w-xs truncate">
                            {item.chiefComplaint || "Inpatient Care"}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                                item.status === "ADMITTED" || item.status === "UNDER_TREATMENT"
                                  ? "bg-teal-100 text-teal-800 border border-teal-200"
                                  : item.status === "DISCHARGE_PENDING"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : item.status === "DISCHARGED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-800"
                              }`}
                            >
                              {item.status || "ADMITTED"}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4 text-xs text-slate-800">
                            {item.doctor ? `Dr. ${item.doctor.firstName} ${item.doctor.lastName}` : "General"}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            {item.roomBedNo ? (
                              <span className="inline-flex items-center gap-1 font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                <BedDouble className="w-3 h-3 text-teal-700" />
                                {item.roomBedNo}
                              </span>
                            ) : (
                              item.department?.name || "OPD"
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                                item.status === "ADMITTED" || item.status === "UNDER_TREATMENT"
                                  ? "bg-teal-100 text-teal-800 border border-teal-200"
                                  : item.status === "WAITING"
                                  ? "bg-amber-100 text-amber-800"
                                  : item.status === "IN_CONSULTATION"
                                  ? "bg-blue-100 text-blue-800"
                                  : item.status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-800"
                              }`}
                            >
                              {item.status || "WAITING"}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="py-3 px-4 text-xs">
                        {latestVital ? (
                          <span className="font-mono text-slate-700">
                            {latestVital.systolicBP && latestVital.diastolicBP
                              ? `${latestVital.systolicBP}/${latestVital.diastolicBP}`
                              : ""}{" "}
                            {latestVital.pulse ? `| ${latestVital.pulse} bpm` : ""}{" "}
                            {latestVital.oxygenSaturation ? `| ${latestVital.oxygenSaturation}%` : ""}
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium text-xs">Pending Vitals</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {isEmergency && !item.dischargeDateTime && (
                          <button
                            type="button"
                            onClick={() => handleOpenDischarge(item)}
                            className="inline-flex items-center gap-1 text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs"
                            title="Discharge patient from Emergency"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            Discharge
                          </button>
                        )}
                        {isEmergency && item.dischargeDateTime && (
                          <button
                            type="button"
                            onClick={() => handleOpenDischargePrint(item)}
                            className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs"
                            title="Print official Discharge Form"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Discharge Form
                          </button>
                        )}
                        {department === "IPD" || item.isAdmission ? (
                          <div className="inline-flex items-center gap-1.5">
                            <Link
                              href={`/staff/patients/${item.patient.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 px-2.5 py-1.5 rounded-lg border border-teal-200 transition-colors"
                              title="Record Vitals"
                            >
                              <span>Vitals</span>
                            </Link>
                            <Link
                              href={`/staff/inpatients/${item.admissionId || item.id}`}
                              className="inline-flex items-center gap-1 text-xs font-bold bg-teal-800 text-white hover:bg-teal-900 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
                            >
                              <ClipboardList className="w-3.5 h-3.5" />
                              <span>Chart &amp; Meds</span>
                            </Link>
                          </div>
                        ) : (
                          <Link
                            href={`/staff/patients/${item.patient.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 px-3 py-1.5 rounded-md border border-teal-200 transition-colors"
                          >
                            Record Vitals
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admitted Inpatients Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-lg">
              <BedDouble className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Admitted Inpatients ({department || "Ward"})
                </h2>
                {admittedInpatients && admittedInpatients.length > 0 && (
                  <span className="text-xs font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                    {admittedInpatients.length} Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {isEmergency
                  ? "Emergency admitted inpatients awaiting or receiving clinical treatment"
                  : "OPD referred inpatients admitted to general or specialized wards"}
              </p>
            </div>
          </div>

          <Link
            href="/staff/inpatients"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 transition"
          >
            <span>All Inpatients &amp; Medication Sheets</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {!admittedInpatients || admittedInpatients.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <BedDouble className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              No active inpatients currently admitted via {department || "your department"}.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              When receptionists admit patients under {department || "your ward"}, they will immediately appear here for your initial assessment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">MR Number</th>
                  <th className="py-3 px-4">Bed / Room</th>
                  <th className="py-3 px-4">Attending Doctor</th>
                  <th className="py-3 px-4">Admitted Time</th>
                  <th className="py-3 px-4">Diagnosis</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admittedInpatients.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {adm.patient.firstName} {adm.patient.lastName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {adm.patient.gender} • Blood: {adm.patient.bloodGroup ? adm.patient.bloodGroup.replace("_", "") : "N/A"}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700">
                      {adm.patient.mrNumber || adm.patient.patientNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                        {adm.roomBedNo}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-800">
                      {adm.doctor
                        ? `Dr. ${adm.doctor.firstName} ${adm.doctor.lastName}`
                        : adm.doctorName || "Assigned Physician"}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      <div suppressHydrationWarning>
                        {adm.admissionDate instanceof Date
                          ? adm.admissionDate.toISOString().split("T")[0]
                          : typeof adm.admissionDate === "string"
                          ? adm.admissionDate.split("T")[0]
                          : "Today"}
                      </div>
                      {adm.admissionTime && (
                        <div className="text-[11px] text-slate-400 font-mono">{adm.admissionTime}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 max-w-xs truncate">
                      {adm.provisionalDiagnosis || "General Inpatient Care"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/staff/inpatients/${adm.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold bg-teal-800 text-white hover:bg-teal-900 px-3 py-1.5 rounded-lg shadow-2xs transition-colors"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>Initial Assessment &amp; Chart</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Discharge Patient Modal (Tabbed Interface) */}
      {dischargeModalOpen && itemToDischarge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[94vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-rose-950 via-slate-900 to-rose-900 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-xs">
                  <ArrowRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    Emergency Patient Discharge &amp; Medication Order
                  </h3>
                  <p className="text-xs text-rose-200">
                    {itemToDischarge.patient.firstName} {itemToDischarge.patient.lastName} • MR#{" "}
                    <strong>{itemToDischarge.patient.mrNumber || itemToDischarge.patient.patientNumber}</strong> •{" "}
                    {itemToDischarge.patient.gender} • Phone: {itemToDischarge.patient.phone}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDischargeModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center border-b border-slate-200 bg-slate-50 px-6 pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setDischargeTab("OUTCOME")}
                className={`flex items-center gap-2 pb-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition ${
                  dischargeTab === "OUTCOME"
                    ? "border-rose-600 text-rose-700 bg-white rounded-t-lg shadow-2xs"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <FileText className="w-4 h-4" />
                1. Outcome &amp; Clinical Summary
              </button>
              <button
                type="button"
                onClick={() => setDischargeTab("MEDICATIONS")}
                className={`flex items-center gap-2 pb-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 transition ${
                  dischargeTab === "MEDICATIONS"
                    ? "border-rose-600 text-rose-700 bg-white rounded-t-lg shadow-2xs"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Pill className="w-4 h-4" />
                2. Discharge Medications &amp; Instructions
                <span className="ml-1 bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold">
                  {dischargeMedList.filter((m) => m.medicineName.trim()).length}
                </span>
              </button>
            </div>

            <form onSubmit={(e) => handleConfirmDischarge(e, false)} className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
              {dischargeError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{dischargeError}</span>
                </div>
              )}

              {/* TAB 1: OUTCOME & SUMMARY */}
              {dischargeTab === "OUTCOME" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                        Date &amp; Time of Discharge *
                      </label>
                      <input
                        type="datetime-local"
                        value={dischargeDateTime}
                        onChange={(e) => setDischargeDateTime(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 font-mono bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                        Discharge Condition / Outcome *
                      </label>
                      <select
                        value={dischargeCondition}
                        onChange={(e) => setDischargeCondition(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white font-semibold"
                      >
                        <option value="Satisfactory / Discharged Home">Satisfactory / Discharged Home</option>
                        <option value="Stable">Stable</option>
                        <option value="Transferred to IPD Ward">Transferred to IPD Ward</option>
                        <option value="Referred to Higher Facility">Referred to Higher Facility</option>
                        <option value="LAMA (Left Against Medical Advice)">LAMA (Left Against Medical Advice)</option>
                        <option value="Deceased">Deceased</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Final Clinical Diagnosis
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Acute Gastritis, Resolved Vasovagal Syncope, Stable Angina"
                      value={dischargeFinalDiagnosis}
                      onChange={(e) => setDischargeFinalDiagnosis(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Discharge Clinical Summary / Outcome Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Emergency treatment given, patient stabilized, vitals within normal limits..."
                      value={dischargeSummary}
                      onChange={(e) => setDischargeSummary(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setDischargeTab("MEDICATIONS")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold hover:bg-rose-100 transition shadow-2xs"
                    >
                      <span>Continue to Discharge Medications</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: MEDICATIONS & INSTRUCTIONS */}
              {dischargeTab === "MEDICATIONS" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Discharge Medications for Patient
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        These will appear under &quot;Discharge Medications&quot; on the official printed Discharge Form.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => addDischargeMedRow()}
                      className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Medicine Row
                    </button>
                  </div>

                  {/* Quick-Add Presets */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-slate-500 block mb-1.5">
                      Quick Add Common Emergency Prescriptions:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { name: "Tab Panadol 500mg", dose: "500 mg", freq: "TDS", timing: "After meals", dur: "5 days", inst: "For fever/pain" },
                        { name: "Cap Omeprazole 20mg", dose: "20 mg", freq: "BD", timing: "Before meals", dur: "7 days", inst: "For acidity" },
                        { name: "Tab Flagyl 400mg", dose: "400 mg", freq: "TDS", timing: "After meals", dur: "5 days", inst: "Antibacterial" },
                        { name: "Tab Augmentin 625mg", dose: "625 mg", freq: "BD", timing: "With food", dur: "5 days", inst: "Antibiotic course" },
                        { name: "Syp Gaviscon", dose: "10 ml", freq: "TDS", timing: "After meals", dur: "5 days", inst: "For reflux" },
                        { name: "Tab Brufen 400mg", dose: "400 mg", freq: "BD", timing: "After food", dur: "3 days", inst: "For pain" },
                      ].map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() =>
                            addDischargeMedRow({
                              medicineName: preset.name,
                              dosage: preset.dose,
                              frequency: preset.freq,
                              timing: preset.timing,
                              duration: preset.dur,
                              instructions: preset.inst,
                            })
                          }
                          className="px-2 py-1 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 rounded-md text-[11px] font-semibold transition"
                        >
                          + {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Medications List */}
                  <div className="space-y-2.5">
                    {dischargeMedList.map((med, idx) => (
                      <div key={med.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-200/70">
                          <span className="text-xs font-bold text-slate-800">Medicine #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeDischargeMedRow(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <div className="sm:col-span-5">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Medicine Name *</label>
                            <input
                              type="text"
                              value={med.medicineName}
                              onChange={(e) => updateDischargeMedRow(idx, "medicineName", e.target.value)}
                              className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                              required
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Dosage</label>
                            <input
                              type="text"
                              value={med.dosage || ""}
                              onChange={(e) => updateDischargeMedRow(idx, "dosage", e.target.value)}
                              className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Route</label>
                            <select
                              value={med.route || "Oral"}
                              onChange={(e) => updateDischargeMedRow(idx, "route", e.target.value)}
                              className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                            >
                              <option value="Oral">Oral</option>
                              <option value="IV">IV</option>
                              <option value="IM">IM</option>
                              <option value="Inhalation">Inhalation</option>
                              <option value="Topical">Topical</option>
                            </select>
                          </div>
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Frequency</label>
                            <select
                              value={med.frequency || "TDS"}
                              onChange={(e) => updateDischargeMedRow(idx, "frequency", e.target.value)}
                              className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-bold"
                            >
                              <option value="TDS">TDS</option>
                              <option value="BD">BD</option>
                              <option value="OD">OD</option>
                              <option value="QID">QID</option>
                              <option value="STAT">STAT</option>
                              <option value="SOS / PRN">SOS / PRN</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Timing</label>
                            <input
                              type="text"
                              value={med.timing || ""}
                              onChange={(e) => updateDischargeMedRow(idx, "timing", e.target.value)}
                              className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Duration</label>
                            <input
                              type="text"
                              value={med.duration || ""}
                              onChange={(e) => updateDischargeMedRow(idx, "duration", e.target.value)}
                              className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white font-semibold"
                            />
                          </div>
                          <div className="sm:col-span-5">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Instructions / Note</label>
                            <input
                              type="text"
                              value={med.instructions || ""}
                              onChange={(e) => updateDischargeMedRow(idx, "instructions", e.target.value)}
                              className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Discharge Advice &amp; Special Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={dischargeInstructions}
                      onChange={(e) => setDischargeInstructions(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  {dischargeTab === "MEDICATIONS" ? (
                    <button
                      type="button"
                      onClick={() => setDischargeTab("OUTCOME")}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                    >
                      ← Back to Outcome Details
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDischargeTab("MEDICATIONS")}
                      className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1"
                    >
                      Enter Discharge Medications →
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDischargeModalOpen(false)}
                    disabled={discharging}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={discharging}
                    className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-xs disabled:opacity-50"
                  >
                    {discharging ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Confirm Discharge
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmDischarge(undefined, true)}
                    disabled={discharging}
                    className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-xl text-sm font-bold transition shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" />
                    Save &amp; Print Discharge Form
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Discharge Form Print Modal (A4 Preview) */}
      {dischargePrintModalOpen && recordToPrintDischarge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto print:static print:overflow-visible print:p-0 print:bg-transparent">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[96vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:my-0 print:overflow-visible print:w-auto print:max-w-none">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white print:hidden shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-rose-400" />
                <div>
                  <h3 className="font-bold text-base">Official Discharge Form (A4 Print Preview)</h3>
                  <p className="text-xs text-slate-300">
                    Patient: {recordToPrintDischarge.patient?.firstName} {recordToPrintDischarge.patient?.lastName} • MR#{" "}
                    {recordToPrintDischarge.patient?.mrNumber || recordToPrintDischarge.patient?.patientNumber}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenDischarge(recordToPrintDischarge)}
                  className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition"
                >
                  Edit Meds / Advice
                </button>
                <a
                  href={`/emergency/discharge/${recordToPrintDischarge.id}/print`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition"
                  title="Direct print URL endpoint: /emergency/discharge/[id]/print"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Print URL</span>
                </a>
                <button
                  type="button"
                  onClick={() => { window.location.href = `/emergency/discharge/${recordToPrintDischarge.id}/print?autoprint=true`; }}
                  className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md transition"
                >
                  <Printer className="w-4 h-4" />
                  Print Discharge Form
                </button>
                <button
                  type="button"
                  onClick={() => setDischargePrintModalOpen(false)}
                  className="p-1 rounded-md text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto print:overflow-visible flex-1 p-4 sm:p-8 bg-slate-100 print:bg-white print:p-0">
              <EmergencyDischargeDocument data={getDischargePrintDataFromItem(recordToPrintDischarge)} />
            </div>
          </div>
        </div>
      )}
      {/* Modal: Official SOPs on Verbal Orders */}
      {isPolicyModalOpen && (
        <VerbalOrdersPolicyView
          isModal={true}
          onClose={() => setIsPolicyModalOpen(false)}
        />
      )}
    </div>
  );
}
