"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  User,
  Phone,
  Stethoscope,
  Calendar,
  Clock,
  CheckCircle2,
  Printer,
  RotateCcw,
  Search,
  Check,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  BedDouble,
} from "lucide-react";

interface Doctor {
  id: string;
  doctorNumber: string;
  firstName: string;
  lastName: string;
  specialization: string;
  roomNumber: string | null;
  consultationFee: number | string;
  availability: string;
  status: string;
}

interface Department {
  id: string;
  code: string;
  name: string;
  doctors: Doctor[];
}

interface PatientSearchMatch {
  id: string;
  patientNumber: string;
  mrNumber: string | null;
  firstName: string;
  lastName: string;
  phone: string;
}

interface SuccessData {
  id: string;
  appointmentNumber: string;
  patientName: string;
  patientPhone: string;
  patientNumber: string;
  mrNumber: string | null;
  doctorName: string;
  departmentName: string;
  roomNumber: string | null;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  consultationFee: string;
  queuePosition: number;
}

const TIME_SLOTS = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
  "04:00 PM", "04:30 PM", "05:00 PM", "06:00 PM",
  "07:00 PM", "08:00 PM",
];

export default function AppointmentBookingWizard() {
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId");

  // Form State - Basic Information
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientMR, setSelectedPatientMR] = useState<string | null>(null);

  // Doctor & Department State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [isLoadingDepts, setIsLoadingDepts] = useState(true);

  // Schedule & Optional notes
  const [appointmentDate, setAppointmentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [appointmentTime, setAppointmentTime] = useState<string>("10:00 AM");
  const [appointmentType, setAppointmentType] = useState<"REGULAR" | "FOLLOW_UP" | "EMERGENCY">("REGULAR");
  const [reason, setReason] = useState<string>("");

  // Live Patient Search Dropdown
  const [patientMatches, setPatientMatches] = useState<PatientSearchMatch[]>([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Submission & Success
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  // Load Departments & Doctors on mount
  useEffect(() => {
    async function loadDepts() {
      try {
        setIsLoadingDepts(true);
        const res = await fetch("/api/appointments/departments");
        if (res.ok) {
          const data = await res.json();
          setDepartments(data.departments || []);
        }
      } catch (err) {
        console.error("Failed to load departments:", err);
      } finally {
        setIsLoadingDepts(false);
      }
    }
    loadDepts();
  }, []);

  // If patientId preselected in URL (e.g. from patient profile)
  useEffect(() => {
    if (!preselectedPatientId) return;
    async function loadPatient() {
      try {
        const res = await fetch(`/api/patients/${preselectedPatientId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.patient) {
            setSelectedPatientId(data.patient.id);
            setPatientName(`${data.patient.firstName} ${data.patient.lastName}`);
            setPatientPhone(data.patient.phone || "");
            setSelectedPatientMR(data.patient.mrNumber || data.patient.patientNumber);
          }
        }
      } catch (err) {
        console.error("Failed to load preselected patient:", err);
      }
    }
    loadPatient();
  }, [preselectedPatientId]);

  // Flattened list of active doctors with department info
  const allDoctors = useMemo(() => {
    const list: Array<Doctor & { departmentName: string; departmentId: string }> = [];
    for (const dept of departments) {
      for (const doc of dept.doctors) {
        list.push({
          ...doc,
          departmentName: dept.name,
          departmentId: dept.id,
        });
      }
    }
    return list;
  }, [departments]);

  // Selected doctor object
  const selectedDoctor = allDoctors.find((d) => d.id === selectedDoctorId);

  // Live patient search as user types name or phone
  useEffect(() => {
    const query = patientName.trim();
    if (selectedPatientId || query.length < 2) {
      setPatientMatches([]);
      setShowPatientDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingPatients(true);
        const res = await fetch(`/api/patients?search=${encodeURIComponent(query)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          const items: PatientSearchMatch[] = data.data || [];
          setPatientMatches(items);
          setShowPatientDropdown(items.length > 0);
        }
      } catch {
        // ignore live search network errors
      } finally {
        setIsSearchingPatients(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [patientName, selectedPatientId]);

  // Select an existing patient from autocomplete
  const handleSelectExistingPatient = (p: PatientSearchMatch) => {
    setSelectedPatientId(p.id);
    setPatientName(`${p.firstName} ${p.lastName}`);
    setPatientPhone(p.phone);
    setSelectedPatientMR(p.mrNumber || p.patientNumber);
    setShowPatientDropdown(false);
  };

  const handleClearSelectedPatient = () => {
    setSelectedPatientId(null);
    setSelectedPatientMR(null);
  };

  // Submit appointment
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientName.trim()) {
      setSubmitError("Please enter the patient's name.");
      return;
    }

    if (!patientPhone.trim()) {
      setSubmitError("Please enter the patient's contact phone number.");
      return;
    }

    if (!selectedDoctorId) {
      setSubmitError("Please select an attending doctor.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        patientId: selectedPatientId || undefined,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        doctorId: selectedDoctorId,
        departmentId: selectedDoctor?.departmentId,
        appointmentDate,
        appointmentTime,
        reason: reason.trim() || "Doctor Consultation",
        appointmentType,
        isEmergency: appointmentType === "EMERGENCY",
      };

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsSubmitting(false);
        setSubmitError(data.error || "Failed to book appointment.");
        return;
      }

      setSuccessData({
        id: data.appointment.id,
        appointmentNumber: data.appointment.appointmentNumber,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientNumber: data.appointment.patient?.patientNumber || "PAT-NEW",
        mrNumber: data.appointment.patient?.mrNumber || null,
        doctorName: selectedDoctor ? `Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}` : "Attending Doctor",
        departmentName: selectedDoctor?.departmentName || "General OPD",
        roomNumber: selectedDoctor?.roomNumber || null,
        appointmentDate,
        appointmentTime,
        appointmentType,
        consultationFee: String(data.appointment.consultationFee || (selectedDoctor?.consultationFee ?? "1000")),
        queuePosition: data.queuePosition || 1,
      });
    } catch {
      setSubmitError("Network error while booking appointment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPatientName("");
    setPatientPhone("");
    setSelectedPatientId(null);
    setSelectedPatientMR(null);
    setSelectedDoctorId("");
    setAppointmentType("REGULAR");
    setReason("");
    setSuccessData(null);
    setSubmitError(null);
  };

  // --------------------------------------------------------------------------
  // SUCCESS / TOKEN SLIP VIEW
  // --------------------------------------------------------------------------
  if (successData) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-lg p-6 sm:p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Check className="w-9 h-9 stroke-[3]" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              OPD Appointment Confirmed
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3">
              Appointment Token Issued
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Patient is added to the doctor&apos;s outpatient consultation queue.
            </p>
          </div>

          {/* Printable Token Slip Card */}
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-6 text-left max-w-lg mx-auto space-y-4 font-sans print:border-solid print:bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Token Number
                </span>
                <span className="font-mono font-extrabold text-xl text-teal-800">
                  {successData.appointmentNumber}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Queue Position
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-teal-700 text-white font-mono font-black text-xl shadow-xs">
                  #{successData.queuePosition}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Patient:</span>
                <p className="font-bold text-slate-900 text-sm">{successData.patientName}</p>
                <p className="text-slate-600 font-mono mt-0.5">Phone: {successData.patientPhone}</p>
                {successData.mrNumber && (
                  <p className="text-teal-700 font-mono text-[11px] font-semibold">MR: {successData.mrNumber}</p>
                )}
              </div>
              <div>
                <span className="text-slate-500 font-medium">Doctor:</span>
                <p className="font-bold text-slate-900 text-sm">{successData.doctorName}</p>
                <p className="text-slate-600">{successData.departmentName}</p>
                {successData.roomNumber && (
                  <p className="text-slate-500 font-medium mt-0.5">Room: {successData.roomNumber}</p>
                )}
              </div>
              <div>
                <span className="text-slate-500 font-medium">Date &amp; Time:</span>
                <p className="font-bold text-slate-900">{successData.appointmentDate}</p>
                <p className="text-slate-700">{successData.appointmentTime}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Consultation Fee:</span>
                <p className="font-extrabold text-emerald-700 text-base">
                  PKR {Number(successData.consultationFee).toLocaleString()}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Paid at Reception
                  </span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    successData.appointmentType === "EMERGENCY"
                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                      : successData.appointmentType === "FOLLOW_UP"
                      ? "bg-sky-100 text-sky-800 border border-sky-200"
                      : "bg-slate-200 text-slate-800"
                  }`}>
                    {successData.appointmentType === "FOLLOW_UP" ? "Follow-up" : successData.appointmentType === "EMERGENCY" ? "Emergency" : "Regular"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Token Slip</span>
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Book Another</span>
            </button>

            <Link
              href="/appointments"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition"
            >
              <span>Appointments List</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // QUICK APPOINTMENT BOOKING FORM
  // --------------------------------------------------------------------------
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-700 uppercase tracking-wider">
            <span>Outpatient (OPD) Desk</span>
            <span>•</span>
            <span>Quick Booking</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Book Patient Appointment
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quick frontdesk entry — enter basic patient details and select doctor.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/patients/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition"
            title="Hospital Patient Admission & Intake"
          >
            <BedDouble className="w-3.5 h-3.5" />
            <span>Admit Patient</span>
          </Link>
          <Link
            href="/appointments"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </Link>
        </div>
      </div>

      {/* Module Banner */}
      <div className="bg-sky-50 border border-sky-200 rounded-lg p-3.5 flex items-center justify-between text-xs text-sky-900">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            <strong>Need to admit a patient to the hospital?</strong> Inpatient admission and full patient intake are handled in{" "}
            <Link href="/patients/new" className="font-bold underline text-sky-800 hover:text-sky-950">
              Admit Patient →
            </Link>
          </span>
        </div>
      </div>

      {/* Error banner */}
      {submitError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <p className="font-medium">{submitError}</p>
        </div>
      )}

      {/* Booking Form */}
      <form onSubmit={handleBookAppointment} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Section 1: Basic Patient Details */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">1</span>
              Patient Information
            </h2>
            {selectedPatientId && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <Check className="w-3 h-3" /> Registered Patient ({selectedPatientMR})
                <button
                  type="button"
                  onClick={handleClearSelectedPatient}
                  className="ml-1 text-slate-400 hover:text-rose-600 font-bold"
                  title="Clear selection"
                >
                  ×
                </button>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Patient Name with Autocomplete */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Ali"
                  value={patientName}
                  onChange={(e) => {
                    setPatientName(e.target.value);
                    if (selectedPatientId) setSelectedPatientId(null);
                  }}
                  className="w-full text-sm font-medium pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {showPatientDropdown && patientMatches.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                  <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                    <span>Matching Registered Patients</span>
                    {isSearchingPatients && <span className="text-teal-600 animate-pulse">Searching...</span>}
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {patientMatches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => handleSelectExistingPatient(match)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-teal-50 flex items-center justify-between group transition"
                      >
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-teal-900">
                            {match.firstName} {match.lastName}
                          </p>
                          <p className="text-slate-500 text-[11px] font-mono">
                            Phone: {match.phone}
                          </p>
                        </div>
                        <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded group-hover:bg-teal-100 group-hover:text-teal-800">
                          {match.mrNumber || match.patientNumber}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 03001234567"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="w-full text-sm font-medium pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Doctor Selection */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">2</span>
              Select Doctor
            </h2>
            {selectedDoctor && (
              <span className="text-xs font-bold text-emerald-700">
                Fee: PKR {Number(selectedDoctor.consultationFee).toLocaleString()}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Attending Physician <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Stethoscope className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <select
                required
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                disabled={isLoadingDepts}
                className="w-full text-sm font-medium pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white disabled:bg-slate-50"
              >
                <option value="">-- Choose Doctor --</option>
                {allDoctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.firstName} {doc.lastName} — {doc.specialization} ({doc.departmentName}) • Fee: PKR {Number(doc.consultationFee).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selected Doctor Summary Card */}
          {selectedDoctor && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-teal-900">
              <div>
                <p className="font-extrabold text-sm text-teal-950">
                  Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}
                </p>
                <p className="text-teal-800 font-medium">
                  {selectedDoctor.specialization} • {selectedDoctor.departmentName}
                </p>
                {selectedDoctor.roomNumber && (
                  <p className="text-teal-700 mt-0.5 font-medium">Room: {selectedDoctor.roomNumber}</p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-teal-700 block">Consultation Fee</span>
                <span className="text-base font-extrabold text-teal-900">
                  PKR {Number(selectedDoctor.consultationFee).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Appointment Type & Schedule */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">3</span>
              Appointment Type &amp; Schedule
            </h2>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              {appointmentType === "EMERGENCY" ? "Emergency Priority" : appointmentType === "FOLLOW_UP" ? "Follow-up Visit" : "Regular Consultation"}
            </span>
          </div>

          {/* Appointment Type Options: Regular, Follow-up, Emergency */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Appointment Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setAppointmentType("REGULAR")}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  appointmentType === "REGULAR"
                    ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>Regular</span>
                <span className={`text-[10px] font-normal ${appointmentType === "REGULAR" ? "text-teal-100" : "text-slate-500"}`}>
                  General OPD
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAppointmentType("FOLLOW_UP")}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  appointmentType === "FOLLOW_UP"
                    ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>Follow-up</span>
                <span className={`text-[10px] font-normal ${appointmentType === "FOLLOW_UP" ? "text-sky-100" : "text-slate-500"}`}>
                  Review Visit
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAppointmentType("EMERGENCY")}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  appointmentType === "EMERGENCY"
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm animate-pulse"
                    : "bg-white border-rose-200 text-rose-700 hover:bg-rose-50"
                }`}
              >
                <span>Emergency</span>
                <span className={`text-[10px] font-normal ${appointmentType === "EMERGENCY" ? "text-rose-100" : "text-rose-500"}`}>
                  Immediate Care
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Appointment Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full text-sm font-medium pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                />
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setAppointmentDate(new Date().toISOString().split("T")[0])}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded border transition ${
                    appointmentDate === new Date().toISOString().split("T")[0]
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    setAppointmentDate(d.toISOString().split("T")[0]);
                  }}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded border transition ${
                    appointmentDate !== new Date().toISOString().split("T")[0]
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  Tomorrow
                </button>
              </div>
            </div>

            {/* Time Slot */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Time Slot
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="w-full text-sm font-medium pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Simple Notes / Presenting Complaint (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Presenting Complaint / Reason <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Routine consultation, checkup, fever"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-sm font-medium px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <Link
            href="/appointments"
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-sm transition flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Booking &amp; Generating Token...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Book Appointment &amp; Issue Token</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
