"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BedDouble,
  Search,
  User,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileCheck2,
  Clock,
  Calendar,
  Sparkles,
  Phone,
  CreditCard,
  MapPin,
  XCircle,
  Activity,
  ShieldAlert,
} from "lucide-react";

interface DoctorOption {
  id: string;
  doctorNumber: string;
  firstName: string;
  lastName: string;
  specialization: string;
  roomNumber?: string | null;
  department?: { name: string } | null;
}

interface PatientResult {
  id: string;
  patientNumber: string;
  mrNumber: string | null;
  firstName: string;
  lastName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  dateOfBirth: string;
  phone: string;
  bloodGroup?: string;
  cnic: string | null;
  address?: string | null;
  relationType?: string | null;
  relatedPersonName?: string | null;
  status: string;
}

function calculateAgeYears(dobString?: string | null): number | "" {
  if (!dobString) return "";
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return "";
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    years--;
  }
  return years >= 0 ? years : "";
}

function formatSystemDate(date: Date = new Date()): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatSystemTime(date: Date = new Date()): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function AdmissionsClient() {
  const searchParams = useSearchParams();

  const queryPatientId = searchParams.get("patientId");
  const queryDoctorId = searchParams.get("doctorId");
  const queryDiagnosis = searchParams.get("diagnosis");

  // Auto-generated MR Number for Walk-In / New Patient
  const [autoMrNumber, setAutoMrNumber] = useState<string>("Loading...");

  // Quick lookup state
  const [patientSearch, setPatientSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PatientResult[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isExistingPatient, setIsExistingPatient] = useState(false);

  // Patient Demographic Information
  const [mrNumber, setMrNumber] = useState("");
  const [patientName, setPatientName] = useState("");
  const [relationType, setRelationType] = useState<string>("Father");
  const [fatherHusbandName, setFatherHusbandName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");

  // Doctor List
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);

  // Admission & Bed Details
  const [admissionSource, setAdmissionSource] = useState<"OPD" | "EMERGENCY">("OPD");
  const [roomBedNo, setRoomBedNo] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState(queryDoctorId || "");

  // System Live Timestamp Display
  const [systemDate, setSystemDate] = useState<string>(() => formatSystemDate());
  const [systemTime, setSystemTime] = useState<string>(() => formatSystemTime());

  // Clinical Details
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState(queryDiagnosis || "");
  const [finalDiagnosis, setFinalDiagnosis] = useState("");
  const [operation, setOperation] = useState("");

  // Submission & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    admissionId: string;
    admissionNumber: string;
    patientId: string;
    patientName: string;
    roomBedNo: string;
    admissionSource: string;
    mrNumber: string;
  } | null>(null);

  // Live system clock updater for realistic frontdesk timestamp
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setSystemDate(formatSystemDate(now));
      setSystemTime(formatSystemTime(now));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch next sequential MR Number
  const fetchNextMRNumber = async () => {
    try {
      const res = await fetch("/api/patients/next-number");
      const json = await res.json();
      if (res.ok && json.data?.mrNumber) {
        setAutoMrNumber(json.data.mrNumber);
        if (!isExistingPatient) {
          setMrNumber(json.data.mrNumber);
        }
      } else {
        setAutoMrNumber("MR-AUTO");
        if (!isExistingPatient) {
          setMrNumber("MR-AUTO");
        }
      }
    } catch (err) {
      console.error("Failed to load next MR number:", err);
      setAutoMrNumber("MR-AUTO");
      if (!isExistingPatient) {
        setMrNumber("MR-AUTO");
      }
    }
  };

  useEffect(() => {
    fetchNextMRNumber();
  }, []);

  // Load active doctors from PostgreSQL
  useEffect(() => {
    fetch("/api/doctors")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data.data) ? data.data : Array.isArray(data.doctors) ? data.doctors : [];
        setDoctors(list);
      })
      .catch((err) => console.error("Failed to load doctors:", err))
      .finally(() => setIsLoadingDoctors(false));
  }, []);

  // Helper to populate form from a patient record
  const populatePatientData = (p: PatientResult) => {
    setSelectedPatientId(p.id);
    setIsExistingPatient(true);
    setMrNumber(p.mrNumber || p.patientNumber);
    setPatientName(`${p.firstName} ${p.lastName}`.trim());
    setFatherHusbandName(p.relatedPersonName || "");
    setRelationType(p.relationType || "Father");
    setAge(calculateAgeYears(p.dateOfBirth));
    setGender(p.gender || "MALE");
    setAddress(p.address || "");
    setPhone(p.phone || "");
    setCnic(p.cnic || "");
  };

  // Pre-load patient if queryPatientId provided in URL
  useEffect(() => {
    if (queryPatientId) {
      fetch(`/api/patients/${queryPatientId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.patient) {
            populatePatientData(data.patient);
          }
        })
        .catch((err) => console.error("Failed to load pre-selected patient:", err));
    }
  }, [queryPatientId]);

  // Debounced search for quick-fill
  useEffect(() => {
    if (!patientSearch.trim() || patientSearch.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/patients?search=${encodeURIComponent(patientSearch.trim())}&limit=6`);
        const json = await res.json();
        if (res.ok && Array.isArray(json.patients)) {
          setSearchResults(json.patients);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearInterval(timer);
  }, [patientSearch]);

  // Clear patient link and reset to fresh walk-in patient form
  const handleClearPatientLink = () => {
    setSelectedPatientId(null);
    setIsExistingPatient(false);
    setPatientSearch("");
    setSearchResults([]);
    setMrNumber(autoMrNumber);
    setPatientName("");
    setFatherHusbandName("");
    setRelationType("Father");
    setAge("");
    setGender("MALE");
    setAddress("");
    setPhone("");
    setCnic("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!patientName.trim()) {
      setErrorMessage("Patient Name is required.");
      return;
    }

    if (age === "" || isNaN(Number(age)) || Number(age) < 0 || Number(age) > 130) {
      setErrorMessage("Please enter a valid Patient Age between 0 and 130 years.");
      return;
    }

    if (!roomBedNo.trim()) {
      setErrorMessage("Room / Bed Number is required for inpatient admission.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        patientId: selectedPatientId || undefined,
        patientName: patientName.trim(),
        fatherHusbandName: fatherHusbandName.trim() || undefined,
        relationType: relationType || "Father",
        age: Number(age),
        gender,
        phone: phone.trim() || undefined,
        cnic: cnic.trim() || undefined,
        address: address.trim() || undefined,
        doctorId: selectedDoctorId || undefined,
        admissionSource,
        roomBedNo: roomBedNo.trim(),
        provisionalDiagnosis: provisionalDiagnosis.trim() || undefined,
        finalDiagnosis: finalDiagnosis.trim() || undefined,
        operation: operation.trim() || undefined,
      };

      const res = await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to create admission");
      }

      const admission = json.data || json.admission;

      if (!admission || !admission.id) {
        throw new Error("Admission was saved, but response data was incomplete.");
      }

      setSuccessData({
        admissionId: admission.id,
        admissionNumber: admission.admissionNumber,
        patientId: admission.patientId || selectedPatientId || "",
        patientName: patientName.trim(),
        roomBedNo: admission.roomBedNo,
        admissionSource: admission.admissionSource,
        mrNumber: mrNumber || autoMrNumber,
      });

      // Refresh next MR number for future walk-ins
      fetchNextMRNumber();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error creating admission");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSuccessData(null);
    handleClearPatientLink();
    setRoomBedNo("");
    setSelectedDoctorId("");
    setProvisionalDiagnosis("");
    setFinalDiagnosis("");
    setOperation("");
    setAdmissionSource("OPD");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
            <BedDouble className="w-4 h-4" />
            <span>Frontdesk Operations • Inpatient Admission</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Receptionist Admission Form
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete inpatient and emergency admission registration. All admission details are recorded directly into the hospital system.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/patients?tab=admitted"
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition"
          >
            Admitted Patients List
          </Link>
          <Link
            href="/reception/permissions"
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 border border-teal-200 px-3.5 py-2 rounded-xl transition"
          >
            Patient Consents
          </Link>
        </div>
      </div>

      {/* Success Notification Card */}
      {successData && (
        <div className="bg-white border-2 border-emerald-500 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                Admission Successfully Confirmed
              </span>
              <h2 className="text-xl font-black text-slate-900">
                {successData.patientName} — Admission #{successData.admissionNumber}
              </h2>
              <p className="text-xs text-slate-600">
                M.R. No: <span className="font-mono font-bold text-slate-900">{successData.mrNumber}</span> • Assigned to{" "}
                <span className="font-bold text-slate-900">{successData.roomBedNo}</span> via{" "}
                <span className="font-bold text-teal-800">[{successData.admissionSource}]</span>. The patient is now officially admitted and accessible on the Nurse Station and Ward Dashboard.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
            <Link
              href={`/reception/permissions?patientId=${successData.patientId}&admissionId=${successData.admissionId}`}
              className="inline-flex items-center gap-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 px-5 py-2.5 rounded-xl shadow-xs transition"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Generate Patient Consents Now</span>
            </Link>

            <Link
              href="/patients?tab=admitted"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl transition"
            >
              <span>View in Admitted Patients</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={handleResetForm}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 transition"
            >
              Admit Another Patient
            </button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!successData && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick-Search Existing Registered Patient Box (Optional) */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-teal-700" />
                  <span>Quick Search Registered Patient (Optional)</span>
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  If the patient is already registered, search by MR#, CNIC, Name, or Phone to auto-populate the form.
                </p>
              </div>

              {isExistingPatient && (
                <button
                  type="button"
                  onClick={handleClearPatientLink}
                  className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg transition self-start sm:self-auto"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Clear / New Walk-In Patient</span>
                </button>
              )}
            </div>

            {!isExistingPatient ? (
              <div className="relative">
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Type MR number, CNIC, patient name, or contact number..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-4 py-2.5 pl-10 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition shadow-2xs"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />

                {isSearching && (
                  <p className="text-[11px] text-slate-500 italic py-1.5 text-center">
                    Searching registered patient directory...
                  </p>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-56 overflow-y-auto bg-white shadow-lg">
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          populatePatientData(p);
                          setSearchResults([]);
                          setPatientSearch("");
                        }}
                        className="w-full text-left p-3 hover:bg-teal-50/70 transition flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {p.firstName} {p.lastName}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            MR: {p.mrNumber || p.patientNumber} • Phone: {p.phone} • CNIC: {p.cnic || "N/A"}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                          Auto-Fill Form
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-teal-50/80 border border-teal-200 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-700 text-white font-bold flex items-center justify-center text-xs">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-teal-950">
                      Linked to Existing Record: {patientName}
                    </span>
                    <span className="text-[11px] text-teal-700 block font-mono">
                      M.R. No: {mrNumber} • ID: {selectedPatientId?.substring(0, 8)}...
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded uppercase">
                  Existing Registered Patient
                </span>
              </div>
            )}
          </div>

          {/* SECTION 1: PATIENT INFORMATION */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-teal-700" />
                <span>1. Patient Information</span>
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                {isExistingPatient ? "Loaded from Patient Registry" : "New Patient / Direct Walk-In"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
              {/* 1. M.R. No (AUTO-GENERATED, Read-only) */}
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>M.R. No *</span>
                  <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-bold uppercase">
                    Auto-Generated
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={mrNumber || autoMrNumber}
                    className="w-full text-xs font-mono font-bold text-teal-950 bg-slate-100 border border-slate-300 rounded-xl p-2.5 focus:outline-hidden cursor-not-allowed"
                    title="M.R. Number is auto-generated by the system"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Official system generated medical record number.
                </span>
              </div>

              {/* 2. Patient Name (Required) */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Patient Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Ali Khan"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                />
              </div>

              {/* 4. Age (Required) */}
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Age (Years) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  max="130"
                  placeholder="e.g. 35"
                  value={age}
                  onChange={(e) => setAge(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                />
              </div>

              {/* 3. Father / Husband Name / Guardian */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Father / Husband / Guardian Name
                </label>
                <div className="flex gap-2">
                  <select
                    value={relationType}
                    onChange={(e) => setRelationType(e.target.value)}
                    className="w-32 shrink-0 text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                  >
                    <option value="Father">S/O (Father)</option>
                    <option value="Husband">W/O (Husband)</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Mother">Mother</option>
                  </select>
                  <input
                    type="text"
                    placeholder="e.g. Tariq Mehmood"
                    value={fatherHusbandName}
                    onChange={(e) => setFatherHusbandName(e.target.value)}
                    className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                  />
                </div>
              </div>

              {/* 5. Sex (Required) */}
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sex *
                </label>
                <select
                  required
                  value={gender}
                  onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE" | "OTHER")}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* 7. Contact (Phone) */}
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-500" />
                  <span>Contact Number</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 0300-1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                />
              </div>

              {/* 8. CNIC */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-slate-500" />
                  <span>CNIC / National ID</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 37405-1234567-1"
                  value={cnic}
                  onChange={(e) => setCnic(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white font-mono"
                />
              </div>

              {/* 6. Address */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span>Address</span>
                </label>
                <input
                  type="text"
                  placeholder="Residential address, city, area"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: ADMISSION & WARD INFORMATION */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-teal-700" />
                <span>2. Inpatient Admission Details</span>
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                Department Visibility & Ward Assignment
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              {/* 11. Admitted Through [ OPD ] / [ EMERGENCY ] */}
              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Admitted Through *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdmissionSource("OPD")}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition ${
                      admissionSource === "OPD"
                        ? "bg-teal-50/80 border-teal-600 ring-2 ring-teal-500/20"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        admissionSource === "OPD" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">[ OPD ] Outpatient Admission</span>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        Visible to OPD Ward Nursing Staff & Routine Inpatient Care.
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdmissionSource("EMERGENCY")}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition ${
                      admissionSource === "EMERGENCY"
                        ? "bg-rose-50/80 border-rose-600 ring-2 ring-rose-500/20"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        admissionSource === "EMERGENCY" ? "bg-rose-700 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">[ EMERGENCY ] Emergency Intake</span>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        Visible to Emergency Triage & ER Nursing Station for immediate assessment.
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* 10. Room / Bed Number (Required) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Room / Bed Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ward-A Bed 03, Room 204, ICU-01"
                  value={roomBedNo}
                  onChange={(e) => setRoomBedNo(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Required for inpatient room/bed allotment.
                </span>
              </div>

              {/* 9. Doctor Selection (From PostgreSQL Doctors Table) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
                  <span>Attending Doctor (Dr. Name)</span>
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  disabled={isLoadingDoctors}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white disabled:opacity-50"
                >
                  <option value="">-- Select Attending Doctor (Optional) --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.firstName} {d.lastName} ({d.specialization}){d.roomNumber ? ` • Room ${d.roomNumber}` : ""}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Active physicians loaded from PostgreSQL.
                </span>
              </div>

              {/* 12. Admission Date & Time (Automatic System Timestamp) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-teal-700" />
                    <span>Admission Date & Time</span>
                  </span>
                  <span className="text-[9px] bg-teal-100 text-teal-800 px-1.5 py-0.2 rounded font-bold uppercase">
                    System Recorded
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Date</span>
                    <span className="text-xs font-semibold text-slate-800 font-mono">{systemDate}</span>
                  </div>
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Time</span>
                    <span className="text-xs font-semibold text-slate-800 font-mono">{systemTime}</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Timestamp is recorded authoritatively by the system.
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: CLINICAL INFORMATION ENTERED DURING ADMISSION */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-700" />
                <span>3. Clinical Information Entered During Admission</span>
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                Admitting Diagnosis & Surgical Details
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Provisional Diagnosis */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Provisional Diagnosis
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acute Appendicitis, Observation"
                  value={provisionalDiagnosis}
                  onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                />
              </div>

              {/* Final Diagnosis */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Final Diagnosis (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Confirmed clinical diagnosis"
                  value={finalDiagnosis}
                  onChange={(e) => setFinalDiagnosis(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                />
              </div>

              {/* Operation (if any) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Operation (if any)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Laparoscopic Appendectomy"
                  value={operation}
                  onChange={(e) => setOperation(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 bg-white"
                />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600">
              <span className="font-bold text-slate-700">Clinical Workflow Note:</span> Stored directly in the Admission record. Intake vital signs, nursing notes, and bedside assessments are administered directly by the ward nurse upon patient transfer.
            </div>
          </div>

          {/* Submission Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/patients?tab=admitted"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-5 py-2.5 rounded-xl transition shadow-2xs"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || !patientName.trim() || age === "" || !roomBedNo.trim()}
              className="inline-flex items-center gap-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 px-6 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BedDouble className="w-4 h-4" />
              <span>{isSubmitting ? "Submitting Admission..." : "Confirm & Admit Patient"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
