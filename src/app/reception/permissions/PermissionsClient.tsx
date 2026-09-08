"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  FileCheck2,
  Printer,
  Eye,
  AlertCircle,
  CheckCircle2,
  X,
  User,
  BedDouble,
  Stethoscope,
  Clock,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  FileText,
} from "lucide-react";
import PermissionDocumentView, {
  PermissionDocumentData,
  PermissionType,
  ConsentFormFields,
} from "@/components/permissions/PermissionDocumentView";

interface PatientSearchResult {
  id: string;
  patientNumber: string;
  mrNumber: string | null;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  bloodGroup: string;
  cnic: string | null;
  relationType: string | null;
  relatedPersonName: string | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string | null;
  status: string;
}

interface PatientAdmission {
  id: string;
  admissionNumber: string;
  admissionDate: string;
  admissionTime?: string | null;
  roomBedNo: string;
  admissionSource: string;
  status: string;
  provisionalDiagnosis?: string | null;
  treatmentPlan?: string | null;
  doctor?: {
    id: string;
    doctorNumber: string;
    firstName: string;
    lastName: string;
    specialization: string;
    department?: { name: string } | null;
  } | null;
}

interface AdmittedInpatient {
  id: string;
  admissionNumber: string;
  admissionDate: string;
  admissionTime?: string | null;
  roomBedNo: string;
  admissionSource: string;
  status: string;
  provisionalDiagnosis?: string | null;
  treatmentPlan?: string | null;
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
    cnic: string | null;
    relationType?: string | null;
    relatedPersonName?: string | null;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string | null;
    status: string;
    address?: string | null;
  };
  doctor?: {
    id: string;
    doctorNumber: string;
    firstName: string;
    lastName: string;
    specialization: string;
    department?: { id?: string; name: string } | null;
  } | null;
}

export default function PermissionsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const queryPatientId = searchParams.get("patientId");
  const queryAdmissionId = searchParams.get("admissionId");

  // Selection mode tab: "admitted" (default) or "all" (search entire patient registry)
  const [selectionTab, setSelectionTab] = useState<"admitted" | "all">("admitted");

  // Admitted Inpatients state
  const [admittedList, setAdmittedList] = useState<AdmittedInpatient[]>([]);
  const [isLoadingAdmittedList, setIsLoadingAdmittedList] = useState(false);
  const [admittedSearch, setAdmittedSearch] = useState("");

  // Search All Patients state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);

  // Admission state
  const [admissions, setAdmissions] = useState<PatientAdmission[]>([]);
  const [selectedAdmission, setSelectedAdmission] = useState<PatientAdmission | null>(null);
  const [isLoadingAdmissions, setIsLoadingAdmissions] = useState(false);

  // Consent Form Custom Fields (as shown in Ghias Hospital official paper form)
  const [consentFields, setConsentFields] = useState<ConsentFormFields>({
    giverName: "",
    relationToPatient: "خود / مریض",
    relationPersonName: "",
    procedureName: "",
    organOrBodyPart: "",
    doctorName: "",
    anesthetistName: "",
    operationComplications: "خون بہنا، انفیکشن، الرجی",
    operationAlternative: "ادویات و دیگر متبادل طریقہ علاج",
    bloodComponents: "ہول بلڈ / ریڈ سیلز (Whole Blood / PRBC)",
    bloodComplications: "بخار، الرجک ری ایکشن، لرزہ",
    bloodAlternative: "آئرن تھراپی / آئی وی فلوئڈز",
    consentDate: new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    consentTime: new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  });

  // Sync consent form defaults whenever a patient or admission is selected
  useEffect(() => {
    if (selectedPatient) {
      const doctorFullName = selectedAdmission?.doctor
        ? `Dr. ${selectedAdmission.doctor.firstName} ${selectedAdmission.doctor.lastName}`
        : "";

      setConsentFields((prev) => ({
        ...prev,
        giverName:
          prev.giverName ||
          selectedPatient.relatedPersonName ||
          `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        relationToPatient:
          prev.relationToPatient || selectedPatient.relationType || "خود / مریض",
        relationPersonName:
          prev.relationPersonName || selectedPatient.relatedPersonName || "",
        procedureName:
          prev.procedureName ||
          selectedAdmission?.provisionalDiagnosis ||
          selectedAdmission?.treatmentPlan ||
          "علاج و سرجری",
        doctorName: prev.doctorName || doctorFullName,
        anesthetistName: prev.anesthetistName || doctorFullName,
      }));
    }
  }, [selectedPatient, selectedAdmission]);

  // Fetch admitted patients
  const fetchAdmittedPatients = async (query = "") => {
    setIsLoadingAdmittedList(true);
    try {
      const url = query.trim()
        ? `/api/patients/admitted?search=${encodeURIComponent(query.trim())}&limit=50`
        : `/api/patients/admitted?limit=50`;
      const res = await fetch(url);
      const json = await res.json();
      const list: AdmittedInpatient[] = Array.isArray(json.admissions)
        ? json.admissions
        : Array.isArray(json.data)
        ? json.data
        : [];
      setAdmittedList(list);
    } catch (err) {
      console.error("Failed to fetch admitted patients:", err);
    } finally {
      setIsLoadingAdmittedList(false);
    }
  };

  // Initial fetch for admitted patients
  useEffect(() => {
    fetchAdmittedPatients();
  }, []);

  // Debounce search on admitted patients list
  useEffect(() => {
    if (selectionTab !== "admitted") return;
    const timer = setTimeout(() => {
      fetchAdmittedPatients(admittedSearch);
    }, 250);
    return () => clearTimeout(timer);
  }, [admittedSearch, selectionTab]);

  // Auto-load patient and admission if URL query params provided
  useEffect(() => {
    if (queryPatientId) {
      fetch(`/api/patients/${queryPatientId}`)
        .then((r) => r.json())
        .then(async (data) => {
          if (data.patient) {
            setSelectedPatient(data.patient);
            setIsLoadingAdmissions(true);
            try {
              const res = await fetch(`/api/admissions?patientId=${data.patient.id}&limit=10`);
              const admJson = await res.json();
              const records: PatientAdmission[] = Array.isArray(admJson.admissions)
                ? admJson.admissions
                : Array.isArray(admJson.data)
                ? admJson.data
                : [];
              if (res.ok && records.length > 0) {
                setAdmissions(records);
                if (queryAdmissionId) {
                  const target = records.find((a: PatientAdmission) => a.id === queryAdmissionId);
                  if (target) {
                    setSelectedAdmission(target);
                  }
                } else {
                  const activeAdm = records.find(
                    (a: PatientAdmission) =>
                      a.status === "ADMITTED" ||
                      a.status === "UNDER_TREATMENT" ||
                      a.status === "DISCHARGE_PENDING"
                  );
                  setSelectedAdmission(activeAdm || records[0]);
                }
              }
            } catch (err) {
              console.error("Failed to load admissions for URL patient:", err);
            } finally {
              setIsLoadingAdmissions(false);
            }
          }
        })
        .catch((err) => console.error("Auto-load patient failed:", err));
    }
  }, [queryPatientId, queryAdmissionId]);

  // Permission selection
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionType[]>([
    "ANESTHESIA",
    "OPERATION",
  ]);

  // Preview & Generation state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PermissionDocumentData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Debounced search for all patients
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/patients?search=${encodeURIComponent(searchQuery.trim())}&limit=8`);
        const json = await res.json();
        if (res.ok && Array.isArray(json.patients)) {
          setSearchResults(json.patients);
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error("Failed to search patients:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle choosing an admitted patient directly from the list
  const handleSelectAdmittedInpatient = (adm: AdmittedInpatient) => {
    const patientResult: PatientSearchResult = {
      id: adm.patient.id,
      patientNumber: adm.patient.patientNumber,
      mrNumber: adm.patient.mrNumber,
      firstName: adm.patient.firstName,
      lastName: adm.patient.lastName,
      gender: adm.patient.gender,
      dateOfBirth: adm.patient.dateOfBirth,
      phone: adm.patient.phone,
      bloodGroup: adm.patient.bloodGroup,
      cnic: adm.patient.cnic,
      relationType: adm.patient.relationType || null,
      relatedPersonName: adm.patient.relatedPersonName || null,
      emergencyContactName: adm.patient.emergencyContactName || "",
      emergencyContactPhone: adm.patient.emergencyContactPhone || "",
      emergencyContactRelation: adm.patient.emergencyContactRelation || null,
      status: adm.patient.status,
    };

    const admissionResult: PatientAdmission = {
      id: adm.id,
      admissionNumber: adm.admissionNumber,
      admissionDate: adm.admissionDate,
      admissionTime: adm.admissionTime,
      roomBedNo: adm.roomBedNo,
      admissionSource: adm.admissionSource,
      status: adm.status,
      provisionalDiagnosis: adm.provisionalDiagnosis,
      treatmentPlan: adm.treatmentPlan,
      doctor: adm.doctor,
    };

    setSelectedPatient(patientResult);
    setSelectedAdmission(admissionResult);
    setAdmissions([admissionResult]);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Also fetch any other admissions in the background for this patient
    fetch(`/api/admissions?patientId=${adm.patient.id}&limit=10`)
      .then((r) => r.json())
      .then((json) => {
        const records: PatientAdmission[] = Array.isArray(json.admissions)
          ? json.admissions
          : Array.isArray(json.data)
          ? json.data
          : [];
        if (records.length > 0) {
          setAdmissions(records);
        }
      })
      .catch((e) => console.error("Error fetching other admissions:", e));
  };

  // Fetch admissions when a patient is selected from Search All
  const handleSelectPatient = async (patient: PatientSearchResult) => {
    setSelectedPatient(patient);
    setSelectedAdmission(null);
    setAdmissions([]);
    setIsLoadingAdmissions(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/admissions?patientId=${patient.id}&limit=10`);
      const json = await res.json();
      const records: PatientAdmission[] = Array.isArray(json.admissions)
        ? json.admissions
        : Array.isArray(json.data)
        ? json.data
        : [];
      if (res.ok && records.length > 0) {
        setAdmissions(records);
        // Automatically select the active or most recent admission
        const activeAdm = records.find(
          (a: PatientAdmission) =>
            a.status === "ADMITTED" ||
            a.status === "UNDER_TREATMENT" ||
            a.status === "DISCHARGE_PENDING"
        );
        setSelectedAdmission(activeAdm || records[0]);
      } else {
        setAdmissions([]);
      }
    } catch (err) {
      console.error("Failed to fetch admissions:", err);
      setErrorMsg("Failed to load admissions for the selected patient.");
    } finally {
      setIsLoadingAdmissions(false);
    }
  };

  const togglePermission = (type: PermissionType) => {
    setSelectedPermissions((prev) =>
      prev.includes(type) ? prev.filter((p) => p !== type) : [...prev, type]
    );
  };

  const selectAllPermissions = () => {
    setSelectedPermissions(["ANESTHESIA", "OPERATION", "BLOOD_TRANSFUSION"]);
  };

  const clearAllPermissions = () => {
    setSelectedPermissions([]);
  };

  // Build document payload for preview or generation
  const buildPreviewData = (): PermissionDocumentData | null => {
    if (!selectedPatient || !selectedAdmission) return null;

    const dob = new Date(selectedPatient.dateOfBirth);
    const ageYears = new Date().getFullYear() - dob.getFullYear();

    return {
      hospitalName: "GHIAS HOSPITAL PHALIA",
      regNumber: "REG NO. R-59488",
      generatedAt: new Date().toISOString(),
      isSigned: false,
      status: "UNSIGNED",
      watermarkText: "UNSIGNED / FOR SIGNATURE",
      selectedPermissions,
      consentDetails: consentFields,
      patient: {
        id: selectedPatient.id,
        patientNumber: selectedPatient.patientNumber,
        mrNumber: selectedPatient.mrNumber || selectedPatient.patientNumber,
        fullName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        firstName: selectedPatient.firstName,
        lastName: selectedPatient.lastName,
        gender: selectedPatient.gender,
        ageYears,
        bloodGroup: selectedPatient.bloodGroup,
        phone: selectedPatient.phone,
        cnic: selectedPatient.cnic || "",
        relationType: selectedPatient.relationType || "",
        relatedPersonName: selectedPatient.relatedPersonName || "",
        emergencyContactName: selectedPatient.emergencyContactName,
        emergencyContactPhone: selectedPatient.emergencyContactPhone,
        emergencyContactRelation: selectedPatient.emergencyContactRelation || "",
      },
      admission: {
        id: selectedAdmission.id,
        admissionNumber: selectedAdmission.admissionNumber,
        admissionDate: selectedAdmission.admissionDate,
        admissionTime: selectedAdmission.admissionTime,
        roomBedNo: selectedAdmission.roomBedNo,
        admissionSource: selectedAdmission.admissionSource,
        status: selectedAdmission.status,
        provisionalDiagnosis: selectedAdmission.provisionalDiagnosis,
        treatmentPlan: selectedAdmission.treatmentPlan,
      },
      doctor: selectedAdmission.doctor
        ? {
            id: selectedAdmission.doctor.id,
            doctorNumber: selectedAdmission.doctor.doctorNumber,
            fullName: `Dr. ${selectedAdmission.doctor.firstName} ${selectedAdmission.doctor.lastName}`,
            firstName: selectedAdmission.doctor.firstName,
            lastName: selectedAdmission.doctor.lastName,
            specialization: selectedAdmission.doctor.specialization,
            departmentName: selectedAdmission.doctor.department?.name || "",
          }
        : null,
    };
  };

  const handleOpenPreview = () => {
    setErrorMsg(null);
    if (!selectedPatient) {
      setErrorMsg("Please select a patient first.");
      return;
    }
    if (!selectedAdmission) {
      setErrorMsg("Please select an active admission record.");
      return;
    }
    if (selectedPermissions.length === 0) {
      setErrorMsg("Please select at least one permission form.");
      return;
    }

    const doc = buildPreviewData();
    if (doc) {
      setPreviewData(doc);
      setPreviewModalOpen(true);
    }
  };

  const handleGenerateAndPrint = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedPatient) {
      setErrorMsg("Please select a patient first.");
      return;
    }
    if (!selectedAdmission) {
      setErrorMsg("Please select an admission record.");
      return;
    }
    if (selectedPermissions.length === 0) {
      setErrorMsg("Please select at least one permission form to generate.");
      return;
    }

    // Persist filled consent fields to sessionStorage for print page
    try {
      sessionStorage.setItem("ghias_permission_consent_fields", JSON.stringify(consentFields));
    } catch (err) {
      console.error("Failed to store consent fields in session:", err);
    }

    setIsGenerating(true);

    try {
      const res = await fetch("/api/permissions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          admissionId: selectedAdmission.id,
          permissions: selectedPermissions,
          consentDetails: consentFields,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to generate permission document");
      }

      setSuccessMsg(
        `Generated ${selectedPermissions.length} permission form(s) successfully. Opening print view...`
      );

      // Open print view in new window or redirect with full parameters
      const queryParams = new URLSearchParams({
        patientId: selectedPatient.id,
        admissionId: selectedAdmission.id,
        forms: selectedPermissions.join(","),
        giverName: consentFields.giverName || "",
        giverRelation: consentFields.relationToPatient || "",
        relationPersonName: consentFields.relationPersonName || "",
        procedureName: consentFields.procedureName || "",
        organOrBodyPart: consentFields.organOrBodyPart || "",
        doctorName: consentFields.doctorName || "",
        anesthetistName: consentFields.anesthetistName || "",
        operationComplications: consentFields.operationComplications || "",
        operationAlternative: consentFields.operationAlternative || "",
        bloodComponents: consentFields.bloodComponents || "",
        bloodComplications: consentFields.bloodComplications || "",
        bloodAlternative: consentFields.bloodAlternative || "",
        consentDate: consentFields.consentDate || "",
        consentTime: consentFields.consentTime || "",
      });

      const printUrl = `/reception/permissions/print?${queryParams.toString()}`;

      startTransition(() => {
        router.push(printUrl);
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMsg(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
            <FileCheck2 className="w-4 h-4" />
            <span>Reception Desk • Patient Consents</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Patient Permissions &amp; Consents
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Digitally prepare, preview, and print official hospital consent forms (Anesthesia, Operation, Blood Transfusion).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/staff"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-lg transition"
          >
            Reception Dashboard
          </Link>
          <Link
            href="/patients"
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 border border-teal-200 px-3.5 py-2 rounded-lg transition"
          >
            Patients Directory
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-4 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Workflow Step Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Search & Patient Selection (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Patient Selection Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-teal-700" />
                <span>1. Select Patient</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (selectionTab === "admitted") {
                    fetchAdmittedPatients(admittedSearch);
                  }
                }}
                title="Refresh admitted list"
                className="p-1 text-slate-400 hover:text-teal-700 rounded-md transition hover:bg-slate-100"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAdmittedList ? "animate-spin text-teal-700" : ""}`} />
              </button>
            </div>

            {/* Selection Mode Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold gap-1">
              <button
                type="button"
                onClick={() => setSelectionTab("admitted")}
                className={`py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition text-[11px] sm:text-xs ${
                  selectionTab === "admitted"
                    ? "bg-white text-teal-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BedDouble className="w-3.5 h-3.5 shrink-0" />
                <span>Admitted Patients</span>
                {admittedList.length > 0 && (
                  <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-mono font-black">
                    {admittedList.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectionTab("all")}
                className={`py-2 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition text-[11px] sm:text-xs ${
                  selectionTab === "all"
                    ? "bg-white text-teal-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span>Search All</span>
              </button>
            </div>

            {/* TAB 1: Admitted Inpatients List (Default) */}
            {selectionTab === "admitted" && (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={admittedSearch}
                    onChange={(e) => setAdmittedSearch(e.target.value)}
                    placeholder="Search by Bed, ADM#, MR#, Name, Doctor..."
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 pl-9 pr-8 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  {admittedSearch && (
                    <button
                      type="button"
                      onClick={() => setAdmittedSearch("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isLoadingAdmittedList ? (
                  <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-teal-700" />
                    <span>Fetching admitted patients...</span>
                  </div>
                ) : admittedList.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
                    {admittedList.map((adm) => {
                      const isSelected =
                        selectedPatient?.id === adm.patient.id && selectedAdmission?.id === adm.id;
                      return (
                        <div
                          key={adm.id}
                          onClick={() => handleSelectAdmittedInpatient(adm)}
                          className={`p-3 rounded-xl border cursor-pointer transition flex flex-col gap-2 ${
                            isSelected
                              ? "border-teal-600 bg-teal-50/70 ring-2 ring-teal-600/20"
                              : "border-slate-200 hover:border-teal-300 hover:bg-slate-50/70 bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-slate-900">
                                  {adm.patient.firstName} {adm.patient.lastName}
                                </p>
                                <span className="text-[10px] font-mono font-bold text-slate-500">
                                  ({adm.patient.mrNumber || adm.patient.patientNumber})
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Phone: {adm.patient.phone} • Blood: {adm.patient.bloodGroup?.replace("_", " ") || "N/A"}
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                  isSelected
                                    ? "bg-teal-700 text-white"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {isSelected ? "Selected" : "Select"}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-100 text-[10px]">
                            <span className="font-bold font-mono text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded flex items-center gap-1">
                              <BedDouble className="w-3 h-3" />
                              <span>{adm.roomBedNo}</span>
                            </span>

                            <span className="font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {adm.admissionNumber}
                            </span>

                            {adm.doctor && (
                              <span className="text-slate-600 truncate max-w-[130px]">
                                Dr. {adm.doctor.firstName} {adm.doctor.lastName}
                              </span>
                            )}

                            <span className="text-slate-400 ml-auto">
                              {new Date(adm.admissionDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500 space-y-2">
                    <p className="font-semibold text-slate-700">
                      {admittedSearch
                        ? "No admitted patients match your search."
                        : "No active admitted inpatients found."}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {admittedSearch
                        ? "Try clearing search or check 'Search All'."
                        : "Admit a patient via the Admissions module to issue consents."}
                    </p>
                    <div className="pt-2 flex items-center justify-center gap-3">
                      {admittedSearch && (
                        <button
                          type="button"
                          onClick={() => setAdmittedSearch("")}
                          className="text-[11px] font-bold text-teal-700 hover:underline"
                        >
                          Clear Search
                        </button>
                      )}
                      <Link
                        href="/admissions"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 hover:underline"
                      >
                        <span>Admit Patient</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Search All Patients */}
            {selectionTab === "all" && (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type MR#, CNIC, Name, or Phone..."
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 pl-9 pr-8 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isSearching && (
                  <p className="text-xs text-slate-500 italic py-3 text-center">
                    Searching database...
                  </p>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-60 overflow-y-auto bg-white">
                    {searchResults.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => handleSelectPatient(patient)}
                        className={`w-full text-left p-3 hover:bg-teal-50/60 transition flex items-center justify-between ${
                          selectedPatient?.id === patient.id
                            ? "bg-teal-50 border-l-4 border-teal-700"
                            : ""
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {patient.firstName} {patient.lastName}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            MR: {patient.mrNumber || patient.patientNumber} • Phone: {patient.phone}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {patient.gender}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">
                    No matching patients found in database.
                  </p>
                )}

                {!isSearching && !searchQuery && (
                  <p className="text-xs text-slate-400 text-center py-4 italic">
                    Type at least 2 characters to search across all hospital patients.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Selected Patient Card */}
          {selectedPatient && (
            <div className="bg-white border border-teal-200 bg-teal-50/20 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-teal-100 pb-3">
                <span className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-700" />
                  <span>Selected Patient</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black font-mono bg-teal-100 text-teal-900 px-2 py-0.5 rounded">
                    {selectedPatient.mrNumber || selectedPatient.patientNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatient(null);
                      setSelectedAdmission(null);
                      setAdmissions([]);
                    }}
                    title="Deselect patient"
                    className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Name</span>
                  <p className="font-bold text-slate-900">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone</span>
                  <p className="font-semibold text-slate-800 font-mono">{selectedPatient.phone}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">CNIC</span>
                  <p className="font-semibold text-slate-800 font-mono">
                    {selectedPatient.cnic || "Not provided"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Group</span>
                  <p className="font-semibold text-slate-800">
                    {selectedPatient.bloodGroup?.replace("_", " ") || "Unknown"}
                  </p>
                </div>
                {selectedPatient.relatedPersonName && (
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      {selectedPatient.relationType || "Relative"}
                    </span>
                    <p className="font-semibold text-slate-800">
                      {selectedPatient.relatedPersonName}
                    </p>
                  </div>
                )}
                {selectedPatient.emergencyContactName && (
                  <div className="col-span-2 pt-1 border-t border-teal-100/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Emergency Contact
                    </span>
                    <p className="font-semibold text-slate-800">
                      {selectedPatient.emergencyContactName} ({selectedPatient.emergencyContactPhone})
                      {selectedPatient.emergencyContactRelation && (
                        <span className="text-slate-500 font-normal"> • {selectedPatient.emergencyContactRelation}</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Admission & Permission Selection (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 2: Admission Selection */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-teal-700" />
                <span>2. Select Admission Record</span>
              </span>
              <span className="text-[10px] text-slate-400">
                {admissions.length} record{admissions.length !== 1 ? "s" : ""} found
              </span>
            </div>

            {!selectedPatient && (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                Search and select a patient to view their hospital admissions.
              </p>
            )}

            {selectedPatient && isLoadingAdmissions && (
              <p className="text-xs text-slate-500 italic py-4 text-center">
                Loading admissions...
              </p>
            )}

            {selectedPatient && !isLoadingAdmissions && admissions.length === 0 && (
              <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 text-xs text-amber-800">
                <p className="font-semibold">No admission records found for this patient.</p>
                <p className="text-[11px] text-amber-700 mt-1">
                  Permissions are normally generated for admitted inpatients. Please admit the patient via the Admission module first.
                </p>
                <Link
                  href="/admissions"
                  className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-teal-800 hover:underline"
                >
                  <span>Go to Admit Patient</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}

            {selectedPatient && !isLoadingAdmissions && admissions.length > 0 && (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {admissions.map((adm) => {
                  const isSelected = selectedAdmission?.id === adm.id;
                  const isActive =
                    adm.status === "ADMITTED" ||
                    adm.status === "UNDER_TREATMENT" ||
                    adm.status === "DISCHARGE_PENDING";

                  return (
                    <button
                      key={adm.id}
                      type="button"
                      onClick={() => setSelectedAdmission(adm)}
                      className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
                        isSelected
                          ? "border-teal-600 bg-teal-50/70 ring-2 ring-teal-600/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {adm.admissionNumber}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                              isActive
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {adm.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Admitted: {new Date(adm.admissionDate).toLocaleDateString()} • Ward/Bed:{" "}
                          <span className="font-semibold text-slate-800">{adm.roomBedNo}</span>
                        </p>
                        {adm.doctor && (
                          <p className="text-[11px] text-teal-800 mt-0.5">
                            Attending: Dr. {adm.doctor.firstName} {adm.doctor.lastName}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-md ${
                            isSelected ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isSelected ? "Selected" : "Choose"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 3: Permission Selection */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-700" />
                <span>3. Select Permission Forms</span>
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={selectAllPermissions}
                  className="font-bold text-teal-700 hover:underline"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={clearAllPermissions}
                  className="font-semibold text-slate-500 hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {/* Form 1: Anesthesia */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  selectedPermissions.includes("ANESTHESIA")
                    ? "border-teal-600 bg-teal-50/40"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes("ANESTHESIA")}
                  onChange={() => togglePermission("ANESTHESIA")}
                  className="w-4 h-4 mt-1 accent-teal-700 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900">
                      Permission for Unconsciousness / Anesthesia
                    </p>
                    <span
                      dir="rtl"
                      className="text-xs font-bold text-teal-900 font-sans"
                    >
                      اجازت نامہ برائے بے ہوشی
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Local, General, or Spinal anesthesia consent with hospital legal indemnity.
                  </p>
                </div>
              </label>

              {/* Form 2: Operation */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  selectedPermissions.includes("OPERATION")
                    ? "border-teal-600 bg-teal-50/40"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes("OPERATION")}
                  onChange={() => togglePermission("OPERATION")}
                  className="w-4 h-4 mt-1 accent-teal-700 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900">
                      Permission for Surgical Operation
                    </p>
                    <span
                      dir="rtl"
                      className="text-xs font-bold text-teal-900 font-sans"
                    >
                      اجازت نامہ برائے آپریشن
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Surgical procedure authorization with doctor/surgeon attestation and witness areas.
                  </p>
                </div>
              </label>

              {/* Form 3: Blood Transfusion */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  selectedPermissions.includes("BLOOD_TRANSFUSION")
                    ? "border-teal-600 bg-teal-50/40"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes("BLOOD_TRANSFUSION")}
                  onChange={() => togglePermission("BLOOD_TRANSFUSION")}
                  className="w-4 h-4 mt-1 accent-teal-700 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900">
                      Permission for Blood Transfusion
                    </p>
                    <span
                      dir="rtl"
                      className="text-xs font-bold text-teal-900 font-sans"
                    >
                      اجازت نامہ برائے انتقال خون (مریض)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Blood or blood products transfusion consent with patient blood group.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Step 4: Fill Permission Form Fields (Required by Official Paper Form) */}
          {selectedPatient && selectedAdmission && (
            <div className="bg-white border border-teal-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-700" />
                  <span>4. Consent Form Details (فارم کے ضروری کوائف)</span>
                </span>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                  Official Paper Fields
                </span>
              </div>

              {/* Section A: Person Giving Permission (اجازت دینے والے کے کوائف) */}
              <div className="space-y-2 bg-slate-50/70 border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-teal-700" />
                    <span>اجازت دینے والا (Signer / Permission Giver)</span>
                  </p>
                  <span className="text-[10px] text-slate-500">
                    Patient or Guardian Info
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      اجازت دینے والے کا نام (Name)
                    </label>
                    <input
                      type="text"
                      value={consentFields.giverName || ""}
                      onChange={(e) =>
                        setConsentFields((p) => ({ ...p, giverName: e.target.value }))
                      }
                      placeholder="e.g. محمد احمد"
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      مریض سے رشتہ (Relation)
                    </label>
                    <input
                      type="text"
                      value={consentFields.relationToPatient || ""}
                      onChange={(e) =>
                        setConsentFields((p) => ({
                          ...p,
                          relationToPatient: e.target.value,
                        }))
                      }
                      placeholder="e.g. خود / والد / شوہر"
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      ولدیت / بنت / زوجہ (Father/Husband Name)
                    </label>
                    <input
                      type="text"
                      value={consentFields.relationPersonName || ""}
                      onChange={(e) =>
                        setConsentFields((p) => ({
                          ...p,
                          relationPersonName: e.target.value,
                        }))
                      }
                      placeholder="e.g. بشیر احمد"
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                    />
                  </div>
                </div>
              </div>

              {/* Section B: Operation & Anesthesia Details */}
              {(selectedPermissions.includes("ANESTHESIA") ||
                selectedPermissions.includes("OPERATION")) && (
                <div className="space-y-2 bg-slate-50/70 border border-slate-200 rounded-xl p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
                      <span>آپریشن و بیہوشی کی تفصیلات (Procedure Details)</span>
                    </p>
                    <span className="text-[10px] text-slate-500">
                      Anesthesia & Surgery
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        کس آپریشن کے لئے / سرجری کی نوعیت (Procedure Name)
                      </label>
                      <input
                        type="text"
                        value={consentFields.procedureName || ""}
                        onChange={(e) =>
                          setConsentFields((p) => ({
                            ...p,
                            procedureName: e.target.value,
                          }))
                        }
                        placeholder="e.g. اپینڈکس سرجری / ہرنیا / سیزیرین"
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        کس عضو کا آپریشن (Body Part / Organ)
                      </label>
                      <input
                        type="text"
                        value={consentFields.organOrBodyPart || ""}
                        onChange={(e) =>
                          setConsentFields((p) => ({
                            ...p,
                            organOrBodyPart: e.target.value,
                          }))
                        }
                        placeholder="e.g. پیٹ (Abdomen) / آنکھ / دائیں ٹانگ"
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        سرجن / ڈاکٹر کا نام (Operating Doctor)
                      </label>
                      <input
                        type="text"
                        value={consentFields.doctorName || ""}
                        onChange={(e) =>
                          setConsentFields((p) => ({
                            ...p,
                            doctorName: e.target.value,
                          }))
                        }
                        placeholder="e.g. Dr. Ghias"
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        بیہوشی کے ڈاکٹر کا نام (Anesthetist Name)
                      </label>
                      <input
                        type="text"
                        value={consentFields.anesthetistName || ""}
                        onChange={(e) =>
                          setConsentFields((p) => ({
                            ...p,
                            anesthetistName: e.target.value,
                          }))
                        }
                        placeholder="e.g. Dr. Asif"
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        ممکنہ پیچیدگیاں مثلاً (Complications)
                      </label>
                      <input
                        type="text"
                        value={consentFields.operationComplications || ""}
                        onChange={(e) =>
                          setConsentFields((p) => ({
                            ...p,
                            operationComplications: e.target.value,
                          }))
                        }
                        placeholder="e.g. خون بہنا، انفیکشن، الرجی"
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        متبادل طریقہ علاج (Alternative Treatment)
                      </label>
                      <input
                        type="text"
                        value={consentFields.operationAlternative || ""}
                        onChange={(e) =>
                          setConsentFields((p) => ({
                            ...p,
                            operationAlternative: e.target.value,
                          }))
                        }
                        placeholder="e.g. ادویات و دیگر متبادل طریقہ علاج"
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Section C: Blood Transfusion Details */}
              {selectedPermissions.includes("BLOOD_TRANSFUSION") && (
                <div className="space-y-2 bg-slate-50/70 border border-slate-200 rounded-xl p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-teal-700" />
                      <span>انتقالِ خون کی تفصیلات (Blood Transfusion)</span>
                    </p>
                    <span className="text-[10px] text-slate-500">
                      Blood Products & Risks
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        خون / اجزاء مثلاً (Blood Components)
                      </label>
                      <input
                        type="text"
                        value={consentFields.bloodComponents || ""}
                        onChange={(e) =>
                          setConsentFields((p) => ({
                            ...p,
                            bloodComponents: e.target.value,
                          }))
                        }
                        placeholder="e.g. Whole Blood, PRBC, FFP, Platelets"
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        مضر اثرات و پیچیدگیاں مثلاً (Risks)
                      </label>
                      <input
                        type="text"
                        value={consentFields.bloodComplications || ""}
                        onChange={(e) =>
                          setConsentFields((p) => ({
                            ...p,
                            bloodComplications: e.target.value,
                          }))
                        }
                        placeholder="e.g. بخار، الرجک ری ایکشن، لرزہ"
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        متبادل (Alternative)
                      </label>
                      <input
                        type="text"
                        value={consentFields.bloodAlternative || ""}
                        onChange={(e) =>
                          setConsentFields((p) => ({
                            ...p,
                            bloodAlternative: e.target.value,
                          }))
                        }
                        placeholder="e.g. آئرن تھراپی / آئی وی فلوئڈز"
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Section D: Date and Time */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    تاریخ (Date)
                  </label>
                  <input
                    type="text"
                    value={consentFields.consentDate || ""}
                    onChange={(e) =>
                      setConsentFields((p) => ({ ...p, consentDate: e.target.value }))
                    }
                    placeholder="DD/MM/YYYY"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">
                    وقت (Time)
                  </label>
                  <input
                    type="text"
                    value={consentFields.consentTime || ""}
                    onChange={(e) =>
                      setConsentFields((p) => ({ ...p, consentTime: e.target.value }))
                    }
                    placeholder="HH:MM AM/PM"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleOpenPreview}
              disabled={!selectedPatient || !selectedAdmission || selectedPermissions.length === 0}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 px-5 py-2.5 rounded-xl transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye className="w-4 h-4" />
              <span>Preview Document</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateAndPrint}
              disabled={
                !selectedPatient ||
                !selectedAdmission ||
                selectedPermissions.length === 0 ||
                isGenerating
              }
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 px-6 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              <span>{isGenerating ? "Generating..." : "Generate & Print"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewModalOpen && previewData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-100 border border-slate-300 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800 block">
                  Document Preview ({previewData.selectedPermissions.length} Form{previewData.selectedPermissions.length !== 1 ? "s" : ""})
                </span>
                <h3 className="text-base font-black text-slate-900">
                  {previewData.patient.fullName} • MR: {previewData.patient.mrNumber}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateAndPrint}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 px-4 py-2 rounded-lg shadow-xs transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isGenerating ? "Processing..." : "Generate & Print"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Document Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <PermissionDocumentView data={previewData} showWatermark={true} />
            </div>

            {/* Modal Footer */}
            <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-rose-700">
                STATUS: UNSIGNED (Official hospital document requires physical signature upon printing)
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="font-bold text-slate-700 hover:underline"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
