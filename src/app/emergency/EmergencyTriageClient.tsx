"use client";

import { useState, useEffect, useCallback, useId } from "react";
import Link from "next/link";
import {
  Flame,
  AlertTriangle,
  Clock,
  CheckCircle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  X,
  Printer,
  HeartPulse,
  AlertCircle,
  Stethoscope,
  Pill,
  Calendar,
  Phone,
  User,
  MapPin,
  FileText,
  Activity,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import EmergencyDischargeDocument, {
  DischargeMedicationItem,
} from "@/components/emergency/EmergencyDischargeDocument";

export interface MedicationItem {
  id?: string;
  medicineName: string;
  dosage: string;
  route: string;
  frequency: string;
  timeAdministered: string;
  status: string;
  instructions: string;
}

export interface EmergencyTriageRecord {
  id: string;
  chiefComplaint: string;
  priority: "CRITICAL" | "HIGH" | "URGENT" | "NORMAL";
  triageLevel: "RESUSCITATION" | "EMERGENCY" | "URGENT" | "SEMI_URGENT" | "NON_URGENT" | null;
  targetTime: string | null;
  admissionDateTime: string | null;
  dischargeDateTime: string | null;
  provisionalDiagnosis: string | null;
  finalDiagnosis: string | null;
  medicationSheet: MedicationItem[] | null;
  painScore: number | null;
  generalCondition: string | null;
  observations: string | null;
  systolicBP: number | null;
  diastolicBP: number | null;
  pulse: number | null;
  temperature: number | null;
  oxygenSaturation: number | null;
  respiratoryRate: number | null;
  triagedByName: string;
  triagedAt: string;
  admission?: {
    id: string;
    admissionNumber: string;
    roomBedNo: string | null;
    status: string;
    admissionDate: string;
    admissionTime: string | null;
    dischargeDate: string | null;
    dischargeTime: string | null;
    dischargeCondition?: string | null;
    dischargeSummary?: string | null;
    dischargeInstructions?: string | null;
    dischargeMedications?: string | null;
    finalDiagnosis?: string | null;
    outcome?: string | null;
  } | null;
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
    cnic?: string | null;
    maritalStatus?: string | null;
    relationType?: string | null;
    relatedPersonName?: string | null;
    address?: string | null;
    allergies: string[];
    emergencyContactName: string;
    emergencyContactPhone: string;
    vitalSigns?: Array<{
      systolicBP: number | null;
      diastolicBP: number | null;
      pulse: number | null;
      temperature: number | null;
      oxygenSaturation: number | null;
      recordedAt: string;
    }>;
  };
}

// 5 Official Triage Tiers as per Ghias Hospital Phalia Wall Board
export const TRIAGE_TIERS = [
  {
    level: "RESUSCITATION" as const,
    label: "Resuscitation",
    target: "Immediately / within 2 minutes",
    themeColor: "red",
    badgeClass: "bg-red-600 text-white border-red-700 shadow-xs",
    lightBg: "bg-red-50 border-red-200 text-red-800",
    ringClass: "ring-red-500",
    conditions: ["Life Threatening conditions", "Critical injuries", "Cardiac Arrest"],
  },
  {
    level: "EMERGENCY" as const,
    label: "Emergency",
    target: "within 10 minutes",
    themeColor: "amber",
    badgeClass: "bg-amber-500 text-slate-950 border-amber-600 shadow-xs font-bold",
    lightBg: "bg-amber-50 border-amber-200 text-amber-900",
    ringClass: "ring-amber-500",
    conditions: [
      "Critical Illness",
      "Severe Pain",
      "Severe Chest Pain",
      "SOB (Shortness of Breath)",
      "Major Fractures",
    ],
  },
  {
    level: "URGENT" as const,
    label: "Urgent",
    target: "within 30 minutes",
    themeColor: "purple",
    badgeClass: "bg-purple-700 text-white border-purple-800 shadow-xs",
    lightBg: "bg-purple-50 border-purple-200 text-purple-900",
    ringClass: "ring-purple-500",
    conditions: ["Severe Illness", "Fractures", "Heavy Bleeding from wound and cuts"],
  },
  {
    level: "SEMI_URGENT" as const,
    label: "Semi Urgent",
    target: "within 60 minutes",
    themeColor: "sky",
    badgeClass: "bg-sky-600 text-white border-sky-700 shadow-xs",
    lightBg: "bg-sky-50 border-sky-200 text-sky-900",
    ringClass: "ring-sky-500",
    conditions: ["Foreign Bodies in eyes & ear", "Sprained Ankle", "Migraine", "Earache"],
  },
  {
    level: "NON_URGENT" as const,
    label: "Non Urgent",
    target: "within 120 minutes",
    themeColor: "emerald",
    badgeClass: "bg-emerald-600 text-white border-emerald-700 shadow-xs",
    lightBg: "bg-emerald-50 border-emerald-200 text-emerald-900",
    ringClass: "ring-emerald-500",
    conditions: ["Minor Illness (> 1 week)", "Rashes", "Minor Aches / Pain"],
  },
];

function getDischargePrintData(rec: EmergencyTriageRecord) {
  return {
    patient: {
      id: rec.patient.id,
      mrNumber: rec.patient.mrNumber,
      patientNumber: rec.patient.patientNumber,
      firstName: rec.patient.firstName,
      lastName: rec.patient.lastName,
      gender: rec.patient.gender,
      dateOfBirth: rec.patient.dateOfBirth,
      phone: rec.patient.phone,
      cnic: rec.patient.cnic,
      relationType: rec.patient.relationType,
      relatedPersonName: rec.patient.relatedPersonName,
      address: rec.patient.address,
    },
    triage: {
      id: rec.id,
      admissionDateTime: rec.admissionDateTime,
      triagedAt: rec.triagedAt,
      triagedByName: rec.triagedByName,
      systolicBP: rec.systolicBP,
      diastolicBP: rec.diastolicBP,
      pulse: rec.pulse,
      temperature: rec.temperature,
      weight: (rec.patient.vitalSigns?.[0] as any)?.weight || null,
      oxygenSaturation: rec.oxygenSaturation,
      respiratoryRate: rec.respiratoryRate,
      chiefComplaint: rec.chiefComplaint,
      provisionalDiagnosis: rec.provisionalDiagnosis,
      finalDiagnosis: rec.finalDiagnosis || rec.admission?.finalDiagnosis,
      observations: rec.observations,
    },
    discharge: {
      dischargeDateTime: rec.dischargeDateTime || rec.admission?.dischargeDate,
      dischargeCondition: rec.admission?.dischargeCondition,
      dischargeSummary: rec.admission?.dischargeSummary,
      dischargeInstructions: rec.admission?.dischargeInstructions,
      dischargeMedications: rec.admission?.dischargeMedications,
      outcome: rec.admission?.outcome || rec.admission?.dischargeCondition,
    },
  };
}

export default function EmergencyTriageClient({
  initialNewModalOpen = false,
  userRole = "STAFF",
}: {
  initialNewModalOpen?: boolean;
  userRole?: string;
}) {
  const [triages, setTriages] = useState<EmergencyTriageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [allDaysView, setAllDaysView] = useState(false);

  // New Triage Modal state
  const [isModalOpen, setIsModalOpen] = useState(initialNewModalOpen);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Detail / Print Slip Modal state
  const [selectedRecord, setSelectedRecord] = useState<EmergencyTriageRecord | null>(null);

  // Discharge Patient Modal state
  const [dischargeModalOpen, setDischargeModalOpen] = useState(false);
  const [recordToDischarge, setRecordToDischarge] = useState<EmergencyTriageRecord | null>(null);
  const [dischargeTab, setDischargeTab] = useState<"OUTCOME" | "MEDICATIONS">("OUTCOME");
  const [dischargeDateTimeVal, setDischargeDateTimeVal] = useState("");
  const [dischargeCondition, setDischargeCondition] = useState<string>("Satisfactory / Discharged Home");
  const [dischargeSummary, setDischargeSummary] = useState("");
  const [dischargeInstructions, setDischargeInstructions] = useState("");
  const [dischargeMedications, setDischargeMedications] = useState("");
  const [dischargeFinalDiagnosis, setDischargeFinalDiagnosis] = useState("");
  const [dischargeMedList, setDischargeMedList] = useState<DischargeMedicationItem[]>([]);
  const [discharging, setDischarging] = useState(false);
  const [dischargeError, setDischargeError] = useState<string | null>(null);

  // Discharge Print Form Modal state
  const [dischargePrintModalOpen, setDischargePrintModalOpen] = useState(false);
  const [recordToPrintDischarge, setRecordToPrintDischarge] = useState<EmergencyTriageRecord | null>(null);

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

  const copyFromEmergencyMAR = () => {
    if (!recordToDischarge?.medicationSheet || recordToDischarge.medicationSheet.length === 0) return;
    const imported: DischargeMedicationItem[] = recordToDischarge.medicationSheet.map((m, idx) => ({
      id: `dmed-imp-${Date.now()}-${idx}`,
      medicineName: m.medicineName,
      dosage: m.dosage || "1 Tab",
      route: m.route || "Oral",
      frequency: m.frequency === "STAT" ? "TDS" : m.frequency || "TDS",
      timing: "After meals",
      duration: "5 days",
      instructions: m.instructions || "",
    }));
    setDischargeMedList((prev) => [...prev, ...imported]);
  };

  const handleOpenDischarge = (record: EmergencyTriageRecord) => {
    setRecordToDischarge(record);
    setDischargeTab("OUTCOME");
    setDischargeDateTimeVal(new Date().toISOString().slice(0, 16));
    setDischargeCondition(record.admission?.dischargeCondition || "Satisfactory / Discharged Home");
    setDischargeFinalDiagnosis(
      record.admission?.finalDiagnosis || record.finalDiagnosis || record.provisionalDiagnosis || ""
    );
    setDischargeSummary(record.admission?.dischargeSummary || "");
    setDischargeInstructions(
      record.admission?.dischargeInstructions ||
        "Take prescribed medications on time. Maintain adequate hydration and rest. Return immediately to Emergency if symptoms worsen or recur."
    );

    let initialMeds: DischargeMedicationItem[] = [];
    if (record.admission?.dischargeMedications) {
      try {
        const parsed = JSON.parse(record.admission.dischargeMedications);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialMeds = parsed;
        } else {
          setDischargeMedications(record.admission.dischargeMedications);
        }
      } catch {
        setDischargeMedications(record.admission.dischargeMedications);
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
          instructions: "For mild fever or pain",
        },
      ];
    }
    setDischargeMedList(initialMeds);
    setDischargeError(null);
    setDischargeModalOpen(true);
  };

  const handleOpenDischargePrint = (record: EmergencyTriageRecord) => {
    setRecordToPrintDischarge(record);
    setDischargePrintModalOpen(true);
  };

  const handleConfirmDischarge = async (e?: React.FormEvent, shouldPrint: boolean = false) => {
    if (e) e.preventDefault();
    if (!recordToDischarge) return;
    try {
      setDischarging(true);
      setDischargeError(null);

      // Serialize medications list or freeform text
      const validMeds = dischargeMedList.filter((m) => m.medicineName.trim().length > 0);
      const serializedMedications =
        validMeds.length > 0
          ? JSON.stringify(validMeds)
          : dischargeMedications.trim() || undefined;

      const effectiveDischargeTime = dischargeDateTimeVal || new Date().toISOString();

      const res = await fetch("/api/staff/emergency/discharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triageId: recordToDischarge.id,
          admissionId: recordToDischarge.admission?.id,
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

      const dischargedCopy: EmergencyTriageRecord = {
        ...recordToDischarge,
        dischargeDateTime: effectiveDischargeTime,
        finalDiagnosis: dischargeFinalDiagnosis.trim() || recordToDischarge.finalDiagnosis,
        admission: recordToDischarge.admission
          ? {
              ...recordToDischarge.admission,
              dischargeDate: effectiveDischargeTime,
              dischargeCondition,
              dischargeSummary: dischargeSummary.trim(),
              dischargeInstructions: dischargeInstructions.trim(),
              dischargeMedications: serializedMedications || null,
              finalDiagnosis: dischargeFinalDiagnosis.trim(),
              outcome: dischargeCondition,
            }
          : {
              id: `adm-${recordToDischarge.id}`,
              admissionNumber: `ADM-${recordToDischarge.patient.patientNumber}`,
              roomBedNo: "ER Bay",
              status: "DISCHARGED",
              admissionDate: recordToDischarge.admissionDateTime || recordToDischarge.triagedAt,
              admissionTime: null,
              dischargeDate: effectiveDischargeTime,
              dischargeTime: null,
              dischargeCondition,
              dischargeSummary: dischargeSummary.trim(),
              dischargeInstructions: dischargeInstructions.trim(),
              dischargeMedications: serializedMedications || null,
              finalDiagnosis: dischargeFinalDiagnosis.trim(),
              outcome: dischargeCondition,
            },
      };

      setDischargeModalOpen(false);
      setRecordToDischarge(null);
      fetchQueue();

      if (shouldPrint) {
        setRecordToPrintDischarge(dischargedCopy);
        setDischargePrintModalOpen(true);
      }
    } catch (err: any) {
      setDischargeError(err.message || "Failed to discharge emergency patient");
    } finally {
      setDischarging(false);
    }
  };

  // Patient Mode: "existing" or "new"
  const [patientMode, setPatientMode] = useState<"new" | "existing">("new");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [searchingPatients, setSearchingPatients] = useState(false);

  // Form Fields - Primary Data
  const [mrNumber, setMrNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [age, setAge] = useState<string>("35");
  const [relationType, setRelationType] = useState("S/o");
  const [relatedPersonName, setRelatedPersonName] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("Married");
  const [cnic, setCnic] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [bloodGroup, setBloodGroup] = useState("O_POSITIVE");

  // Timestamps
  const nowFormatted = new Date().toISOString().slice(0, 16);
  const [admissionDateTime, setAdmissionDateTime] = useState(nowFormatted);
  const [dischargeDateTime, setDischargeDateTime] = useState("");

  // Triage Assessment
  const [triageLevel, setTriageLevel] = useState<
    "RESUSCITATION" | "EMERGENCY" | "URGENT" | "SEMI_URGENT" | "NON_URGENT"
  >("EMERGENCY");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [observations, setObservations] = useState("");
  const [generalCondition, setGeneralCondition] = useState("Conscious / Distressed");
  const [painScore, setPainScore] = useState<number>(5);

  // Diagnoses
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState("");
  const [finalDiagnosis, setFinalDiagnosis] = useState("");

  // Vitals
  const [systolicBP, setSystolicBP] = useState("");
  const [diastolicBP, setDiastolicBP] = useState("");
  const [pulse, setPulse] = useState("");
  const [temperature, setTemperature] = useState("");
  const [oxygenSaturation, setOxygenSaturation] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");

  // Medication Sheet Entries
  const [medications, setMedications] = useState<MedicationItem[]>([
    {
      id: "med-1",
      medicineName: "",
      dosage: "",
      route: "IV",
      frequency: "STAT",
      timeAdministered: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "GIVEN",
      instructions: "",
    },
  ]);

  // Generate unique ID helper
  const addMedicationRow = () => {
    setMedications([
      ...medications,
      {
        id: `med-${Date.now()}`,
        medicineName: "",
        dosage: "",
        route: "IV",
        frequency: "STAT",
        timeAdministered: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: "GIVEN",
        instructions: "",
      },
    ]);
  };

  const removeMedicationRow = (index: number) => {
    if (medications.length <= 1) {
      setMedications([
        {
          id: `med-${Date.now()}`,
          medicineName: "",
          dosage: "",
          route: "IV",
          frequency: "STAT",
          timeAdministered: "",
          status: "GIVEN",
          instructions: "",
        },
      ]);
      return;
    }
    setMedications(medications.filter((_, i) => i !== index));
  };

  const updateMedication = (index: number, field: keyof MedicationItem, val: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: val };
    setMedications(updated);
  };

  // Fetch queue from API with optional override parameters
  const fetchQueue = useCallback(async (overrideLevel?: string, overrideSearch?: string, overrideAllDays?: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const effectiveLevel = overrideLevel !== undefined ? overrideLevel : levelFilter;
      const effectiveSearch = overrideSearch !== undefined ? overrideSearch : searchQuery;
      const effectiveAllDays = overrideAllDays !== undefined ? overrideAllDays : allDaysView;

      const params = new URLSearchParams();
      if (effectiveLevel !== "ALL") params.set("triageLevel", effectiveLevel);
      if (effectiveSearch.trim()) params.set("search", effectiveSearch.trim());
      if (effectiveAllDays) params.set("allDays", "true");

      const res = await fetch(`/api/staff/emergency/queue?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load emergency queue");
      }
      setTriages(data.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load emergency records");
    } finally {
      setLoading(false);
    }
  }, [levelFilter, searchQuery, allDaysView]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Patient search autocomplete
  const handleSearchPatient = async (query: string) => {
    setPatientSearch(query);
    if (query.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    try {
      setSearchingPatients(true);
      const res = await fetch(`/api/patients?search=${encodeURIComponent(query)}&limit=8`);
      const data = await res.json();
      if (res.ok) {
        setPatientResults(data.patients || data.data || []);
      }
    } catch {
      // ignore
    } finally {
      setSearchingPatients(false);
    }
  };

  const handleSelectExistingPatient = (p: any) => {
    setSelectedPatient(p);
    setPatientResults([]);
    setPatientSearch("");
    setFirstName(p.firstName || "");
    setLastName(p.lastName || "");
    setMrNumber(p.mrNumber || p.patientNumber || "");
    setGender(p.gender || "MALE");
    setPhone(p.phone || "");
    setCnic(p.cnic || "");
    setAddress(p.address || "");
    setRelationType(p.relationType || "S/o");
    setRelatedPersonName(p.relatedPersonName || "");
    setMaritalStatus(p.maritalStatus || "Married");
    if (p.dateOfBirth) {
      const birthYear = new Date(p.dateOfBirth).getFullYear();
      setAge(String(new Date().getFullYear() - birthYear));
    }
  };

  // Reset Form
  const resetForm = () => {
    setPatientMode("new");
    setSelectedPatient(null);
    setPatientSearch("");
    setMrNumber("");
    setFirstName("");
    setLastName("");
    setGender("MALE");
    setAge("35");
    setRelationType("S/o");
    setRelatedPersonName("");
    setMaritalStatus("Married");
    setCnic("");
    setPhone("");
    setAddress("");
    setAdmissionDateTime(new Date().toISOString().slice(0, 16));
    setDischargeDateTime("");
    setTriageLevel("EMERGENCY");
    setChiefComplaint("");
    setObservations("");
    setProvisionalDiagnosis("");
    setFinalDiagnosis("");
    setGeneralCondition("Conscious / Distressed");
    setPainScore(5);
    setSystolicBP("");
    setDiastolicBP("");
    setPulse("");
    setTemperature("");
    setOxygenSaturation("");
    setRespiratoryRate("");
    setMedications([
      {
        id: "med-1",
        medicineName: "",
        dosage: "",
        route: "IV",
        frequency: "STAT",
        timeAdministered: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: "GIVEN",
        instructions: "",
      },
    ]);
  };

  // Handle Submit Form
  const handleSubmitTriage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (patientMode === "existing" && !selectedPatient) {
      setModalError("Please select an existing patient or switch to 'Register New Emergency Patient'.");
      return;
    }
    if (patientMode === "new" && !firstName.trim()) {
      setModalError("Patient first name is required.");
      return;
    }
    if (!chiefComplaint.trim()) {
      setModalError("Chief complaint is required.");
      return;
    }

    try {
      setSubmitting(true);
      setModalError(null);

      // Clean valid medications
      const validMeds = medications
        .filter((m) => m.medicineName.trim().length > 0)
        .map((m) => ({
          medicineName: m.medicineName.trim(),
          dosage: m.dosage.trim(),
          route: m.route,
          frequency: m.frequency,
          timeAdministered: m.timeAdministered || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: m.status,
          instructions: m.instructions.trim(),
        }));

      const payload = {
        patientId: patientMode === "existing" && selectedPatient ? selectedPatient.id : undefined,
        mrNumber: mrNumber.trim() || undefined,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        gender,
        age: age ? parseInt(age, 10) : undefined,
        relationType,
        relatedPersonName: relatedPersonName.trim() || undefined,
        maritalStatus,
        cnic: cnic.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        bloodGroup,
        admissionDateTime: admissionDateTime || undefined,
        dischargeDateTime: dischargeDateTime || undefined,
        triageLevel,
        chiefComplaint: chiefComplaint.trim(),
        observations: observations.trim() || undefined,
        generalCondition: generalCondition.trim() || undefined,
        painScore: Number(painScore),
        provisionalDiagnosis: provisionalDiagnosis.trim() || undefined,
        finalDiagnosis: finalDiagnosis.trim() || undefined,
        medicationSheet: validMeds,
        systolicBP: systolicBP ? parseInt(systolicBP, 10) : undefined,
        diastolicBP: diastolicBP ? parseInt(diastolicBP, 10) : undefined,
        pulse: pulse ? parseInt(pulse, 10) : undefined,
        temperature: temperature ? parseFloat(temperature) : undefined,
        oxygenSaturation: oxygenSaturation ? parseInt(oxygenSaturation, 10) : undefined,
        respiratoryRate: respiratoryRate ? parseInt(respiratoryRate, 10) : undefined,
      };

      const res = await fetch("/api/staff/emergency/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record emergency triage");
      }

      setIsModalOpen(false);
      resetForm();
      setLevelFilter("ALL");
      setSearchQuery("");
      // Fetch with ALL and empty search override to guarantee immediate display
      fetchQueue("ALL", "");
    } catch (err: any) {
      setModalError(err.message || "Failed to record emergency triage");
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics Count
  const resuscitationCount = triages.filter((t) => t.triageLevel === "RESUSCITATION" || t.priority === "CRITICAL").length;
  const emergencyCount = triages.filter((t) => t.triageLevel === "EMERGENCY" || t.priority === "HIGH").length;
  const urgentCount = triages.filter((t) => t.triageLevel === "URGENT").length;
  const semiUrgentCount = triages.filter((t) => t.triageLevel === "SEMI_URGENT").length;
  const nonUrgentCount = triages.filter((t) => t.triageLevel === "NON_URGENT" || (t.priority === "NORMAL" && !t.triageLevel)).length;

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping inline-block" />
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
              Ghias Hospital Phalia â€¢ REG No. 59488
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Triage Assessment Area &amp; Emergency Station
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Emergency Triage &amp; Patient Registry
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Live 5-tier hospital triage queue, rapid patient registration, vitals monitoring, and emergency medication tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchQueue()}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-md hover:shadow-lg active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add Emergency Patient
          </button>
        </div>
      </div>

      {/* 5-Level Triage Category Badges (from Ghias Hospital Phalia wall chart) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Tier 1: Resuscitation */}
        <div
          onClick={() => setLevelFilter(levelFilter === "RESUSCITATION" ? "ALL" : "RESUSCITATION")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            levelFilter === "RESUSCITATION"
              ? "bg-red-100 border-red-500 ring-2 ring-red-500 shadow-md"
              : "bg-red-50/70 border-red-200 hover:bg-red-100/70"
          }`}
        >
          <div className="flex items-center justify-between text-red-700 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider">1. Resuscitation</span>
            <Flame className="w-4 h-4 text-red-600 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-red-900">{resuscitationCount}</p>
          <p className="text-[11px] font-bold text-red-600 mt-1">Immediate (within 2 mins)</p>
        </div>

        {/* Tier 2: Emergency */}
        <div
          onClick={() => setLevelFilter(levelFilter === "EMERGENCY" ? "ALL" : "EMERGENCY")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            levelFilter === "EMERGENCY"
              ? "bg-amber-100 border-amber-500 ring-2 ring-amber-500 shadow-md"
              : "bg-amber-50/70 border-amber-200 hover:bg-amber-100/70"
          }`}
        >
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider">2. Emergency</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-950">{emergencyCount}</p>
          <p className="text-[11px] font-bold text-amber-700 mt-1">within 10 minutes</p>
        </div>

        {/* Tier 3: Urgent */}
        <div
          onClick={() => setLevelFilter(levelFilter === "URGENT" ? "ALL" : "URGENT")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            levelFilter === "URGENT"
              ? "bg-purple-100 border-purple-500 ring-2 ring-purple-500 shadow-md"
              : "bg-purple-50/70 border-purple-200 hover:bg-purple-100/70"
          }`}
        >
          <div className="flex items-center justify-between text-purple-800 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider">3. Urgent</span>
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-950">{urgentCount}</p>
          <p className="text-[11px] font-bold text-purple-700 mt-1">within 30 minutes</p>
        </div>

        {/* Tier 4: Semi Urgent */}
        <div
          onClick={() => setLevelFilter(levelFilter === "SEMI_URGENT" ? "ALL" : "SEMI_URGENT")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            levelFilter === "SEMI_URGENT"
              ? "bg-sky-100 border-sky-500 ring-2 ring-sky-500 shadow-md"
              : "bg-sky-50/70 border-sky-200 hover:bg-sky-100/70"
          }`}
        >
          <div className="flex items-center justify-between text-sky-800 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider">4. Semi Urgent</span>
            <Activity className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-sky-950">{semiUrgentCount}</p>
          <p className="text-[11px] font-bold text-sky-700 mt-1">within 60 minutes</p>
        </div>

        {/* Tier 5: Non Urgent */}
        <div
          onClick={() => setLevelFilter(levelFilter === "NON_URGENT" ? "ALL" : "NON_URGENT")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            levelFilter === "NON_URGENT"
              ? "bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500 shadow-md"
              : "bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/70"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-[11px] font-black uppercase tracking-wider">5. Non Urgent</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-950">{nonUrgentCount}</p>
          <p className="text-[11px] font-bold text-emerald-700 mt-1">within 120 minutes</p>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Time Scope */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search emergency cases by patient name, MR#, CNIC, or complaint..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setAllDaysView(!allDaysView)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition border ${
              allDaysView
                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
            }`}
          >
            {allDaysView ? "All Emergency History" : "Today's Emergency"}
          </button>

          <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
            {["ALL", "RESUSCITATION", "EMERGENCY", "URGENT", "SEMI_URGENT", "NON_URGENT"].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevelFilter(lvl)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase transition ${
                  levelFilter === lvl
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {lvl === "ALL" ? "All Levels" : lvl.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-rose-600 mx-auto mb-2" />
            <p className="text-sm font-semibold">Loading emergency triage registry...</p>
          </div>
        ) : triages.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <HeartPulse className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-800">No emergency cases found matching the criteria.</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Click &quot;Add Emergency Patient&quot; to triage a patient with complete demographics, vitals, and medication sheet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1350px] text-left text-sm text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-slate-700 text-[11px] font-black uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 w-44 min-w-[175px]">Triage Tier</th>
                  <th className="py-3.5 px-4 w-64 min-w-[240px]">Patient &amp; Primary Data</th>
                  <th className="py-3.5 px-4 w-36 min-w-[130px]">MR Number</th>
                  <th className="py-3.5 px-4 w-40 min-w-[150px]">Admission / Arrival</th>
                  <th className="py-3.5 px-4 min-w-[280px]">Chief Complaint &amp; Diagnosis</th>
                  <th className="py-3.5 px-4 w-64 min-w-[230px]">Vitals &amp; Pain</th>
                  <th className="py-3.5 px-4 w-32 min-w-[120px]">Status</th>
                  <th className="py-3.5 px-4 w-36 min-w-[120px]">Medications</th>
                  <th className="py-3.5 px-4 w-60 min-w-[220px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {triages.map((item) => {
                  const tier =
                    TRIAGE_TIERS.find((t) => t.level === item.triageLevel) ||
                    (item.priority === "CRITICAL"
                      ? TRIAGE_TIERS[0]
                      : item.priority === "HIGH"
                      ? TRIAGE_TIERS[1]
                      : item.priority === "URGENT"
                      ? TRIAGE_TIERS[2]
                      : TRIAGE_TIERS[4]);

                  const medsCount = item.medicationSheet?.length || 0;
                  const isDischarged = Boolean(item.dischargeDateTime);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-xs font-black uppercase px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 ${tier.badgeClass}`}
                        >
                          {tier.level === "RESUSCITATION" && (
                            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          )}
                          {tier.label}
                        </span>
                        <div className="text-[10px] text-slate-500 font-medium mt-1">
                          {tier.target}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Link
                          href={`/staff/patients/${item.patient.id}`}
                          className="font-bold text-slate-900 text-sm hover:text-rose-600 transition-colors block"
                        >
                          {item.patient.firstName} {item.patient.lastName}
                        </Link>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {item.patient.relationType && item.patient.relatedPersonName
                            ? `${item.patient.relationType} ${item.patient.relatedPersonName} â€¢ `
                            : ""}
                          <span className="font-semibold text-slate-700">{item.patient.gender}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-700 font-medium">
                            ðŸ“ž {item.patient.phone}
                          </span>
                          {item.patient.cnic && (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-600 text-[10px]">
                              CNIC: {item.patient.cnic}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-800 whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200 inline-block">
                          {item.patient.mrNumber || item.patient.patientNumber}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-700 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {new Date(item.admissionDateTime || item.triagedAt).toLocaleDateString([], {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          {new Date(item.admissionDateTime || item.triagedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 text-xs line-clamp-2">
                          {item.chiefComplaint}
                        </div>
                        {item.provisionalDiagnosis && (
                          <div className="text-[11px] text-rose-700 font-medium mt-1 line-clamp-1">
                            <span className="font-bold">Prov:</span> {item.provisionalDiagnosis}
                          </div>
                        )}
                        {item.finalDiagnosis && (
                          <div className="text-[11px] text-emerald-700 font-medium line-clamp-1">
                            <span className="font-bold">Final:</span> {item.finalDiagnosis}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-800 whitespace-nowrap">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold">
                            BP {item.systolicBP && item.diastolicBP ? `${item.systolicBP}/${item.diastolicBP}` : "â€”"}
                          </span>
                          <span className="bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold">
                            HR {item.pulse || "â€”"}
                          </span>
                          <span className="bg-rose-50 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold">
                            SpO2 {item.oxygenSaturation ? `${item.oxygenSaturation}%` : "â€”"}
                          </span>
                          {item.temperature && (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[11px] font-mono">
                              {item.temperature}Â°F
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 font-sans">
                          Pain: <strong className="text-slate-700">{item.painScore !== null ? `${item.painScore}/10` : "N/A"}</strong>
                          {item.generalCondition && ` â€¢ ${item.generalCondition}`}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isDischarged ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              Discharged
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(item.dischargeDateTime!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Active in ER
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {medsCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-full text-xs font-semibold">
                            <Pill className="w-3 h-3 text-purple-600" />
                            {medsCount} {medsCount === 1 ? "Medicine" : "Medicines"}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No meds</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                        {isDischarged ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenDischargePrint(item)}
                              className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition shadow-2xs"
                              title="Print official Discharge Form"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Discharge Form
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDischarge(item)}
                              className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2 py-1.5 rounded-lg transition shadow-2xs"
                              title="Edit discharge medications or advice"
                            >
                              Edit
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenDischarge(item)}
                            className="inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-2.5 py-1.5 rounded-lg transition shadow-2xs"
                            title="Discharge patient from Emergency"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            Discharge
                          </button>
                        )}

                        <Link
                          href={`/staff/patients/${item.patient.id}`}
                          className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition shadow-2xs"
                          title="Open full patient clinical file"
                        >
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          File
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* ADD EMERGENCY PATIENT MODAL                               */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">New Emergency Patient Registration &amp; Triage</h3>
                  <p className="text-xs text-slate-300">Ghias Hospital Phalia â€¢ REG No. 59488</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Scrollable Body */}
            <form onSubmit={handleSubmitTriage} className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {modalError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Patient Mode Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Patient Registration Mode:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPatientMode("new");
                      setSelectedPatient(null);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      patientMode === "new"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    + Register New Emergency Patient
                  </button>
                  <button
                    type="button"
                    onClick={() => setPatientMode("existing")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      patientMode === "existing"
                        ? "bg-teal-700 text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    Search Existing Patient
                  </button>
                </div>
              </div>

              {/* Existing Patient Search */}
              {patientMode === "existing" && (
                <div className="space-y-2 p-4 bg-teal-50/50 border border-teal-200 rounded-xl">
                  <label className="block text-xs font-bold uppercase tracking-wider text-teal-900">
                    Lookup Patient by Name, MR#, or CNIC <span className="text-rose-600">*</span>
                  </label>
                  {selectedPatient ? (
                    <div className="flex items-center justify-between p-3 bg-white border border-teal-300 rounded-lg">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">
                          {selectedPatient.firstName} {selectedPatient.lastName}
                        </span>
                        <span className="text-xs text-teal-800 font-mono ml-2">
                          ({selectedPatient.mrNumber || selectedPatient.patientNumber})
                        </span>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {selectedPatient.gender} â€¢ Phone: {selectedPatient.phone} â€¢ CNIC: {selectedPatient.cnic || "N/A"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPatient(null)}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Type patient name, MR number (e.g. MR-000123), or CNIC..."
                          value={patientSearch}
                          onChange={(e) => handleSearchPatient(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                        />
                      </div>
                      {searchingPatients && <p className="text-xs text-slate-500 mt-1">Searching directory...</p>}
                      {patientResults.length > 0 && (
                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white mt-1 shadow-md">
                          {patientResults.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => handleSelectExistingPatient(p)}
                              className="p-2.5 hover:bg-teal-50 cursor-pointer flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-800">
                                  {p.firstName} {p.lastName}
                                </span>
                                <span className="text-slate-500 ml-2 font-mono">
                                  ({p.mrNumber || p.patientNumber})
                                </span>
                              </div>
                              <span className="text-slate-400">{p.phone}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Section 1: Patient Primary Data */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                  <User className="w-4 h-4 text-slate-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    1. Patient Primary Demographics
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      MR Number (Optional / Auto)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MR-000123 (auto-generated if empty)"
                      value={mrNumber}
                      onChange={(e) => setMrNumber(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      First Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Patient first name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      placeholder="Patient last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Guardian Relation</label>
                    <select
                      value={relationType}
                      onChange={(e) => setRelationType(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                    >
                      <option value="S/o">S/o (Son of)</option>
                      <option value="D/o">D/o (Daughter of)</option>
                      <option value="W/o">W/o (Wife of)</option>
                      <option value="Guardian">Guardian of</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Father / Husband / Guardian Name
                    </label>
                    <input
                      type="text"
                      placeholder="Relative full name"
                      value={relatedPersonName}
                      onChange={(e) => setRelatedPersonName(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Age (Years) / Sex</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        placeholder="Age"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-20 p-2 border border-slate-300 rounded-lg text-sm"
                      />
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as any)}
                        className="flex-1 p-2 border border-slate-300 rounded-lg text-sm bg-white font-semibold"
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Marital Status</label>
                    <select
                      value={maritalStatus}
                      onChange={(e) => setMaritalStatus(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                    >
                      <option value="Married">Married</option>
                      <option value="Single">Single</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">CNIC (National ID)</label>
                    <input
                      type="text"
                      placeholder="e.g. 37405-1234567-1"
                      value={cnic}
                      onChange={(e) => setCnic(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. 0300-1234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                    >
                      <option value="A_POSITIVE">A+</option>
                      <option value="A_NEGATIVE">A-</option>
                      <option value="B_POSITIVE">B+</option>
                      <option value="B_NEGATIVE">B-</option>
                      <option value="AB_POSITIVE">AB+</option>
                      <option value="AB_NEGATIVE">AB-</option>
                      <option value="O_POSITIVE">O+</option>
                      <option value="O_NEGATIVE">O-</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
                  <input
                    type="text"
                    placeholder="Patient residential address / Tehsil / District"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Section 2: Timestamps */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    2. Admission &amp; Discharge Timestamps
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Date / Time of Admission <span className="text-rose-600">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="datetime-local"
                        value={admissionDateTime}
                        onChange={(e) => setAdmissionDateTime(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setAdmissionDateTime(new Date().toISOString().slice(0, 16))}
                        className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700"
                      >
                        Now
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Date / Time of Discharge (Optional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="datetime-local"
                        value={dischargeDateTime}
                        onChange={(e) => setDischargeDateTime(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                      />
                      {dischargeDateTime && (
                        <button
                          type="button"
                          onClick={() => setDischargeDateTime("")}
                          className="px-2 py-1 text-xs text-rose-600 hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Official 5-Tier Triage Level Selection */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      3. Triage Level Assessment (Ghias Hospital Phalia Chart) <span className="text-rose-600">*</span>
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">Select priority tier</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {TRIAGE_TIERS.map((tier) => (
                    <button
                      key={tier.level}
                      type="button"
                      onClick={() => setTriageLevel(tier.level)}
                      className={`p-3 rounded-xl border text-left transition-all relative ${
                        triageLevel === tier.level
                          ? `${tier.lightBg} ring-2 ${tier.ringClass} shadow-md`
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase">{tier.label}</span>
                        {triageLevel === tier.level && <CheckCircle className="w-4 h-4" />}
                      </div>
                      <p className="text-[11px] font-bold mt-1 opacity-90">{tier.target}</p>
                    </button>
                  ))}
                </div>

                {/* Quick condition tags from wall chart */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
                    Common Condition Presets (Click to pre-fill complaint):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {TRIAGE_TIERS.find((t) => t.level === triageLevel)?.conditions.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setChiefComplaint((prev) => (prev ? `${prev}, ${c}` : c));
                        }}
                        className="px-2.5 py-1 rounded-full text-xs font-medium bg-white hover:bg-slate-200 border border-slate-300 text-slate-800 transition"
                      >
                        + {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chief Complaint & Observations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Chief Complaint <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Acute severe chest pain radiating to left arm, shortness of breath..."
                      value={chiefComplaint}
                      onChange={(e) => setChiefComplaint(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Clinical Observations</label>
                    <textarea
                      rows={2}
                      placeholder="Immediate observations, conscious state, bleeding, distress..."
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Diagnoses */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                  <Stethoscope className="w-4 h-4 text-slate-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    4. Clinical Diagnoses
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Provisional Diagnosis</label>
                    <input
                      type="text"
                      placeholder="e.g. Suspected Acute Coronary Syndrome / STEMI"
                      value={provisionalDiagnosis}
                      onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm font-semibold text-rose-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Final Diagnosis</label>
                    <input
                      type="text"
                      placeholder="e.g. Anterior Wall Myocardial Infarction"
                      value={finalDiagnosis}
                      onChange={(e) => setFinalDiagnosis(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm font-semibold text-emerald-800"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Record Vitals */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                  <HeartPulse className="w-4 h-4 text-rose-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    5. Record Emergency Vitals
                  </h4>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Systolic BP</label>
                    <input
                      type="number"
                      placeholder="120"
                      value={systolicBP}
                      onChange={(e) => setSystolicBP(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Diastolic BP</label>
                    <input
                      type="number"
                      placeholder="80"
                      value={diastolicBP}
                      onChange={(e) => setDiastolicBP(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Pulse (bpm)</label>
                    <input
                      type="number"
                      placeholder="72"
                      value={pulse}
                      onChange={(e) => setPulse(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Temp (Â°F)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="98.6"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">SpO2 (%)</label>
                    <input
                      type="number"
                      placeholder="98"
                      value={oxygenSaturation}
                      onChange={(e) => setOxygenSaturation(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Resp. Rate (/min)</label>
                    <input
                      type="number"
                      placeholder="18"
                      value={respiratoryRate}
                      onChange={(e) => setRespiratoryRate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pain Score (0â€“10): <span className="text-rose-600 font-extrabold">{painScore}</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={painScore}
                      onChange={(e) => setPainScore(parseInt(e.target.value, 10))}
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>0 (None)</span>
                      <span>5 (Moderate)</span>
                      <span>10 (Worst Pain)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">General Condition</label>
                    <input
                      type="text"
                      placeholder="e.g. Acute distress, Conscious, Restless"
                      value={generalCondition}
                      onChange={(e) => setGeneralCondition(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Section 6: Medication Sheet */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-purple-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      6. Emergency Medication Sheet
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={addMedicationRow}
                    className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Medication
                  </button>
                </div>

                <div className="space-y-2">
                  {medications.map((med, idx) => (
                    <div
                      key={med.id || idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                    >
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          placeholder="Medicine name (e.g. Inj Ceftriaxone)"
                          value={med.medicineName}
                          onChange={(e) => updateMedication(idx, "medicineName", e.target.value)}
                          className="w-full p-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Dosage (e.g. 1g)"
                          value={med.dosage}
                          onChange={(e) => updateMedication(idx, "dosage", e.target.value)}
                          className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <select
                          value={med.route}
                          onChange={(e) => updateMedication(idx, "route", e.target.value)}
                          className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                        >
                          <option value="IV">IV (Intravenous)</option>
                          <option value="IM">IM (Intramuscular)</option>
                          <option value="Oral">Oral</option>
                          <option value="SC">SC (Subcutaneous)</option>
                          <option value="Inhalation">Inhalation / Neb</option>
                          <option value="Sublingual">Sublingual</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <select
                          value={med.frequency}
                          onChange={(e) => updateMedication(idx, "frequency", e.target.value)}
                          className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                        >
                          <option value="STAT">STAT (Immediately)</option>
                          <option value="Once">Once</option>
                          <option value="BID">BID (Twice daily)</option>
                          <option value="TID">TID (Thrice daily)</option>
                          <option value="QID">QID (4 times daily)</option>
                          <option value="PRN">PRN (As needed)</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <select
                          value={med.status}
                          onChange={(e) => updateMedication(idx, "status", e.target.value)}
                          className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold"
                        >
                          <option value="GIVEN">Given</option>
                          <option value="SCHEDULED">Scheduled</option>
                          <option value="HELD">Held</option>
                        </select>
                      </div>
                      <div className="sm:col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeMedicationRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                          title="Remove item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving Patient &amp; Triage...
                    </>
                  ) : (
                    "Save &amp; Dispatch to Emergency Queue"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ========================================================= */}
      {/* DISCHARGE EMERGENCY PATIENT MODAL (TABBED INTERFACE)       */}
      {/* ========================================================= */}
      {dischargeModalOpen && recordToDischarge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[94vh] flex flex-col">
            {/* Modal Header */}
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
                    {recordToDischarge.patient.firstName} {recordToDischarge.patient.lastName} â€¢ MR#{" "}
                    <strong>{recordToDischarge.patient.mrNumber || recordToDischarge.patient.patientNumber}</strong> â€¢{" "}
                    {recordToDischarge.patient.gender} â€¢ Phone: {recordToDischarge.patient.phone}
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

            {/* Modal Form Body */}
            <form
              onSubmit={(e) => handleConfirmDischarge(e, false)}
              className="p-6 overflow-y-auto space-y-4 text-sm flex-1"
            >
              {dischargeError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{dischargeError}</span>
                </div>
              )}

              {/* TAB 1: OUTCOME & CLINICAL SUMMARY */}
              {dischargeTab === "OUTCOME" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                        Date &amp; Time of Discharge *
                      </label>
                      <input
                        type="datetime-local"
                        value={dischargeDateTimeVal}
                        onChange={(e) => setDischargeDateTimeVal(e.target.value)}
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
                      placeholder="Emergency treatment provided, clinical stability achieved, vitals stable, fit for discharge..."
                      value={dischargeSummary}
                      onChange={(e) => setDischargeSummary(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 bg-white"
                    />
                  </div>

                  {/* Summary of Vitals & Chief Complaint for Nurse Reference */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1 text-slate-700">
                    <span className="font-bold text-slate-900 block text-[11px] uppercase tracking-wider">
                      Initial Triage Reference
                    </span>
                    <p>
                      <strong>Chief Complaint:</strong> {recordToDischarge.chiefComplaint}
                    </p>
                    <p>
                      <strong>Vitals at Admission:</strong> BP{" "}
                      {recordToDischarge.systolicBP && recordToDischarge.diastolicBP
                        ? `${recordToDischarge.systolicBP}/${recordToDischarge.diastolicBP}`
                        : "â€”"}
                      , Pulse: {recordToDischarge.pulse || "â€”"}, Temp: {recordToDischarge.temperature || "â€”"}Â°F
                    </p>
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

              {/* TAB 2: DISCHARGE MEDICATIONS & INSTRUCTIONS */}
              {dischargeTab === "MEDICATIONS" && (
                <div className="space-y-4">
                  {/* Top Toolbar for Medications Tab */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Discharge Medications for Patient
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        These will appear under &quot;Discharge Medications&quot; on the official printed Discharge Form.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {recordToDischarge.medicationSheet && recordToDischarge.medicationSheet.length > 0 && (
                        <button
                          type="button"
                          onClick={copyFromEmergencyMAR}
                          className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 px-2.5 py-1.5 rounded-lg border border-purple-200 transition"
                          title="Copy emergency medications given during triage"
                        >
                          <Pill className="w-3.5 h-3.5" />
                          Import Emergency Meds
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => addDischargeMedRow()}
                        className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Medicine Row
                      </button>
                    </div>
                  </div>

                  {/* Quick-Add Presets for Nurses */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-slate-500 block mb-1.5">
                      Quick Add Common Emergency Prescriptions:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        {
                          name: "Tab Panadol 500mg",
                          dose: "500 mg",
                          freq: "TDS",
                          timing: "After meals",
                          dur: "5 days",
                          inst: "For fever or pain",
                        },
                        {
                          name: "Cap Omeprazole 20mg",
                          dose: "20 mg",
                          freq: "BD",
                          timing: "Before breakfast/dinner",
                          dur: "7 days",
                          inst: "For acidity / gastric cover",
                        },
                        {
                          name: "Tab Flagyl 400mg",
                          dose: "400 mg",
                          freq: "TDS",
                          timing: "After meals",
                          dur: "5 days",
                          inst: "Antibacterial / GI infection",
                        },
                        {
                          name: "Tab Augmentin 625mg",
                          dose: "625 mg",
                          freq: "BD",
                          timing: "With food",
                          dur: "5 days",
                          inst: "Antibiotic course",
                        },
                        {
                          name: "Syp Gaviscon",
                          dose: "10 ml (2 tsp)",
                          freq: "TDS",
                          timing: "After meals & bedtime",
                          dur: "5 days",
                          inst: "For reflux/heartburn",
                        },
                        {
                          name: "Tab Brufen 400mg",
                          dose: "400 mg",
                          freq: "BD",
                          timing: "After food",
                          dur: "3 days",
                          inst: "For inflammation/pain",
                        },
                        {
                          name: "Tab Gravinate 50mg",
                          dose: "50 mg",
                          freq: "SOS / PRN",
                          timing: "When needed",
                          dur: "3 days",
                          inst: "For nausea or vomiting",
                        },
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
                          + {preset.name} ({preset.freq})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Medications Rows List */}
                  <div className="space-y-2.5">
                    {dischargeMedList.map((med, idx) => (
                      <div
                        key={med.id || idx}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative"
                      >
                        <div className="flex items-center justify-between pb-1 border-b border-slate-200/70">
                          <span className="text-xs font-bold text-slate-800">
                            Medicine #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeDischargeMedRow(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded"
                            title="Remove this medicine"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          {/* Medicine Name */}
                          <div className="sm:col-span-5">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                              Medicine Name *
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Tab Panadol 500mg"
                              value={med.medicineName}
                              onChange={(e) => updateDischargeMedRow(idx, "medicineName", e.target.value)}
                              className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                              required
                            />
                          </div>

                          {/* Dosage */}
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Dosage</label>
                            <input
                              type="text"
                              placeholder="500 mg / 1 Tab"
                              value={med.dosage || ""}
                              onChange={(e) => updateDischargeMedRow(idx, "dosage", e.target.value)}
                              className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                            />
                          </div>

                          {/* Route */}
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
                              <option value="Sublingual">Sublingual</option>
                              <option value="Topical">Topical</option>
                              <option value="Drops">Drops</option>
                            </select>
                          </div>

                          {/* Frequency */}
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Frequency</label>
                            <select
                              value={med.frequency || "TDS"}
                              onChange={(e) => updateDischargeMedRow(idx, "frequency", e.target.value)}
                              className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-bold"
                            >
                              <option value="TDS">TDS (Thrice daily)</option>
                              <option value="BD">BD (Twice daily)</option>
                              <option value="OD">OD (Once daily)</option>
                              <option value="QID">QID (4 times daily)</option>
                              <option value="STAT">STAT (Immediately)</option>
                              <option value="SOS / PRN">SOS / PRN (As needed)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          {/* Timing */}
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Timing</label>
                            <input
                              type="text"
                              placeholder="After meals / Before food"
                              value={med.timing || ""}
                              onChange={(e) => updateDischargeMedRow(idx, "timing", e.target.value)}
                              className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                            />
                          </div>

                          {/* Duration */}
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Duration</label>
                            <input
                              type="text"
                              placeholder="e.g. 5 days, 1 week"
                              value={med.duration || ""}
                              onChange={(e) => updateDischargeMedRow(idx, "duration", e.target.value)}
                              className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white font-semibold"
                            />
                          </div>

                          {/* Special Notes */}
                          <div className="sm:col-span-5">
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Instructions / Note</label>
                            <input
                              type="text"
                              placeholder="e.g. For pain / with plenty of water"
                              value={med.instructions || ""}
                              onChange={(e) => updateDischargeMedRow(idx, "instructions", e.target.value)}
                              className="w-full p-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Discharge Advice & Instructions Box */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                      Discharge Advice &amp; Special Patient Instructions
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Take prescribed medications on time. Maintain bed rest and light diet. Return to Ghias Hospital Emergency immediately if fever > 101Â°F, bleeding, severe vomiting or acute pain recurs..."
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
                      â† Back to Outcome Details
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDischargeTab("MEDICATIONS")}
                      className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1"
                    >
                      Enter Discharge Medications â†’
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

      {/* ========================================================= */}
      {/* OFFICIAL DISCHARGE FORM PRINT MODAL (Exact User Template)  */}
      {/* ========================================================= */}
      {dischargePrintModalOpen && recordToPrintDischarge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto print:static print:overflow-visible print:p-0 print:bg-transparent">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[96vh] flex flex-col print:border-none print:shadow-none print:max-h-none print:my-0 print:overflow-visible print:w-auto print:max-w-none">
            {/* Modal Header Toolbar (hidden on print) */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white print:hidden shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-rose-400" />
                <div>
                  <h3 className="font-bold text-base">Official Discharge Form (A4 Print Preview)</h3>
                  <p className="text-xs text-slate-300">
                    Patient: {recordToPrintDischarge.patient.firstName} {recordToPrintDischarge.patient.lastName} â€¢ MR#{" "}
                    {recordToPrintDischarge.patient.mrNumber || recordToPrintDischarge.patient.patientNumber}
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

            {/* Printable Discharge Document */}
            <div className="overflow-y-auto print:overflow-visible flex-1 p-4 sm:p-8 bg-slate-100 print:bg-white print:p-0">
              <EmergencyDischargeDocument data={getDischargePrintData(recordToPrintDischarge)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
