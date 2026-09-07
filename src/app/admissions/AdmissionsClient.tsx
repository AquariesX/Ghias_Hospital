"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Activity,
  Calendar,
} from "lucide-react";

interface DoctorOption {
  id: string;
  doctorNumber: string;
  firstName: string;
  lastName: string;
  specialization: string;
  department?: { name: string } | null;
}

interface PatientResult {
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
  status: string;
  allergies?: string[];
}

export default function AdmissionsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryPatientId = searchParams.get("patientId");
  const queryAppointmentId = searchParams.get("appointmentId");
  const queryDoctorId = searchParams.get("doctorId");
  const queryDiagnosis = searchParams.get("diagnosis");

  // State
  const [patientSearch, setPatientSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);

  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);

  // Form State
  const [admissionSource, setAdmissionSource] = useState<"OPD" | "EMERGENCY">("OPD");
  const [roomBedNo, setRoomBedNo] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState(queryDoctorId || "");
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split("T")[0]);
  const [admissionTime, setAdmissionTime] = useState(
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  );
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState(queryDiagnosis || "");
  const [presentingComplaints, setPresentingComplaints] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");

  // Baseline Vitals
  const [systolicBP, setSystolicBP] = useState("");
  const [diastolicBP, setDiastolicBP] = useState("");
  const [pulse, setPulse] = useState("");
  const [temperature, setTemperature] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    admissionId: string;
    admissionNumber: string;
    patientId: string;
    patientName: string;
    roomBedNo: string;
  } | null>(null);

  // Load doctors
  useEffect(() => {
    fetch("/api/admin/doctors?limit=100")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.doctors)) {
          setDoctors(data.doctors);
        }
      })
      .catch((err) => console.error("Failed to load doctors:", err))
      .finally(() => setIsLoadingDoctors(false));
  }, []);

  // Pre-load patient if queryPatientId provided
  useEffect(() => {
    if (queryPatientId) {
      fetch(`/api/patients/${queryPatientId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.patient) {
            setSelectedPatient(data.patient);
          }
        })
        .catch((err) => console.error("Failed to load pre-selected patient:", err));
    }
  }, [queryPatientId]);

  // Debounced search
  useEffect(() => {
    if (!patientSearch.trim() || patientSearch.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/patients?search=${encodeURIComponent(patientSearch.trim())}&limit=8`);
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

    return () => clearTimeout(timer);
  }, [patientSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedPatient) {
      setErrorMessage("Please search and select a patient to admit.");
      return;
    }

    if (!roomBedNo.trim()) {
      setErrorMessage("Room / Bed number is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        patientId: selectedPatient.id,
        doctorId: selectedDoctorId || null,
        admissionDate,
        admissionTime,
        admissionSource,
        roomBedNo: roomBedNo.trim(),
        provisionalDiagnosis: provisionalDiagnosis.trim() || null,
        presentingComplaints: presentingComplaints.trim() || null,
        treatmentPlan: treatmentPlan.trim() || null,
      };

      if (systolicBP) payload.systolicBP = parseInt(systolicBP, 10);
      if (diastolicBP) payload.diastolicBP = parseInt(diastolicBP, 10);
      if (pulse) payload.pulse = parseInt(pulse, 10);
      if (temperature) payload.temperature = parseFloat(temperature);
      if (weight) payload.weight = parseFloat(weight);
      if (height) payload.height = parseFloat(height);

      const res = await fetch("/api/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to create admission");
      }

      setSuccessData({
        admissionId: json.admission.id,
        admissionNumber: json.admission.admissionNumber,
        patientId: selectedPatient.id,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        roomBedNo: json.admission.roomBedNo,
      });
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error creating admission");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedPatient(null);
    setSuccessData(null);
    setRoomBedNo("");
    setProvisionalDiagnosis("");
    setPresentingComplaints("");
    setTreatmentPlan("");
    setSystolicBP("");
    setDiastolicBP("");
    setPulse("");
    setTemperature("");
    setWeight("");
    setHeight("");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
            <BedDouble className="w-4 h-4" />
            <span>Frontdesk Operations • Inpatient Admission</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Patient Admission Procedure
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Assign inpatient bed, admitting physician, baseline vitals, and initiate hospital admission.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/patients?tab=admitted"
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-lg transition"
          >
            Admitted Patients List
          </Link>
          <Link
            href="/patients?tab=appointments"
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 border border-teal-200 px-3.5 py-2 rounded-lg transition"
          >
            Appointment Patients
          </Link>
        </div>
      </div>

      {/* Success Notification Card */}
      {successData && (
        <div className="bg-white border-2 border-emerald-500 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                Admission Confirmed Successfully
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                {successData.patientName} — Admission #{successData.admissionNumber}
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Assigned to <span className="font-bold text-slate-900">{successData.roomBedNo}</span>. The patient is now an active inpatient in the hospital database.
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
              onClick={handleReset}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2"
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
          {/* Step 1: Patient Selection */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Search className="w-4 h-4 text-teal-700" />
                <span>1. Patient Lookup &amp; Verification</span>
              </span>
              <span className="text-[10px] text-slate-400">Search by MR#, Name, CNIC, Phone</span>
            </div>

            {!selectedPatient ? (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Type MR number, CNIC, patient name, or phone..."
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pl-10 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>

                {isSearching && (
                  <p className="text-xs text-slate-500 italic py-2 text-center">
                    Searching registered patients...
                  </p>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-52 overflow-y-auto bg-white">
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatient(p);
                          setSearchResults([]);
                          setPatientSearch("");
                        }}
                        className="w-full text-left p-3 hover:bg-teal-50/60 transition flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {p.firstName} {p.lastName}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            MR: {p.mrNumber || p.patientNumber} • Phone: {p.phone} • Blood: {p.bloodGroup}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                          Select
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-teal-50/40 border border-teal-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-700 text-white font-bold flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </h3>
                    <p className="text-xs text-slate-600 font-mono mt-0.5">
                      MR: {selectedPatient.mrNumber || selectedPatient.patientNumber} • Phone: {selectedPatient.phone} • Blood: {selectedPatient.bloodGroup}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs"
                >
                  Change Patient
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Admission Bed & Doctor Assignment */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-teal-700" />
              <span>2. Bed, Doctor &amp; Clinical Details</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Admission Source */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Admission Mode *
                </label>
                <select
                  value={admissionSource}
                  onChange={(e) => setAdmissionSource(e.target.value as "OPD" | "EMERGENCY")}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                >
                  <option value="OPD">OPD Consultation Referral</option>
                  <option value="EMERGENCY">Emergency Triage / Direct</option>
                </select>
              </div>

              {/* Room / Bed Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ward / Bed Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ward-B Bed 04, Room 102"
                  value={roomBedNo}
                  onChange={(e) => setRoomBedNo(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              {/* Assigned Doctor */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Attending Physician
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                >
                  <option value="">-- Assign Doctor (Optional) --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.firstName} {d.lastName} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              {/* Admission Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Admission Date *
                </label>
                <input
                  type="date"
                  required
                  value={admissionDate}
                  onChange={(e) => setAdmissionDate(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              {/* Admission Time */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Admission Time
                </label>
                <input
                  type="text"
                  value={admissionTime}
                  onChange={(e) => setAdmissionTime(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              {/* Provisional Diagnosis */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Admitting Diagnosis / Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acute Appendicitis, Observation"
                  value={provisionalDiagnosis}
                  onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>
            </div>

            {/* Presenting Complaints & Plan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Presenting Complaints &amp; Admission Notes
                </label>
                <textarea
                  rows={2}
                  value={presentingComplaints}
                  onChange={(e) => setPresentingComplaints(e.target.value)}
                  placeholder="Chief symptoms, pain duration, referral notes..."
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Immediate Inpatient Orders / Plan
                </label>
                <textarea
                  rows={2}
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  placeholder="NPO status, IV line, Pre-op checklist, vital checks frequency..."
                  className="w-full text-xs text-black border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Baseline Vitals (Optional) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-700" />
              <span>3. Baseline Vital Signs (Intake)</span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Systolic BP</label>
                <input
                  type="number"
                  placeholder="120"
                  value={systolicBP}
                  onChange={(e) => setSystolicBP(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Diastolic BP</label>
                <input
                  type="number"
                  placeholder="80"
                  value={diastolicBP}
                  onChange={(e) => setDiastolicBP(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Pulse (bpm)</label>
                <input
                  type="number"
                  placeholder="72"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Temp (°F)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="98.6"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="70"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Height (cm)</label>
                <input
                  type="number"
                  placeholder="170"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full text-xs text-black border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>
          </div>

          {/* Submission Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/patients?tab=appointments"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 px-5 py-2.5 rounded-xl transition shadow-2xs"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || !selectedPatient || !roomBedNo.trim()}
              className="inline-flex items-center gap-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 px-6 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <BedDouble className="w-4 h-4" />
              <span>{isSubmitting ? "Creating Admission..." : "Confirm & Admit Patient"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
