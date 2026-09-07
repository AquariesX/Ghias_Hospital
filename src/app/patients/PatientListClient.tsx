"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  BedDouble,
  Search,
  Plus,
  ArrowRight,
  User,
  Filter,
  RefreshCw,
  FileCheck2,
  Stethoscope,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";

interface AppointmentPatientItem {
  id: string;
  appointmentNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  status: string;
  reason: string;
  tokenNumber?: number | null;
  isEmergency: boolean;
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
    status: string;
  };
  doctor: {
    id: string;
    doctorNumber: string;
    firstName: string;
    lastName: string;
    specialization: string;
    department?: { id: string; name: string; code: string } | null;
  };
  department: {
    id: string;
    name: string;
    code: string;
  };
  consultation?: {
    id: string;
    consultationNumber: string;
    status: string;
    provisionalDiagnosis?: string | null;
    finalDiagnosis?: string | null;
    treatmentPlan?: string | null;
  } | null;
  hasConsultation: boolean;
  isConsultationCompleted: boolean;
}

interface AdmittedPatientItem {
  id: string;
  admissionNumber: string;
  admissionDate: string;
  admissionTime?: string | null;
  admissionSource: string;
  roomBedNo: string;
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
    status: string;
    allergies: string[];
  };
  doctor?: {
    id: string;
    doctorNumber: string;
    firstName: string;
    lastName: string;
    specialization: string;
    department?: { id: string; name: string } | null;
  } | null;
  metrics: {
    vitalSigns: number;
    nursingNotes: number;
    medicationAdministrations: number;
    prescriptions: number;
  };
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function PatientListClient({ userRole }: { userRole: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Active Tab: "appointments" | "admitted"
  const activeTabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"appointments" | "admitted">(
    activeTabParam === "admitted" ? "admitted" : "appointments"
  );

  // Sync tab with URL
  const handleTabChange = (newTab: "appointments" | "admitted") => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    params.set("page", "1");
    router.push(`/patients?${params.toString()}`);
  };

  // ---------------------------------------------------------------------------
  // Tab 1: Appointment Patients State
  // ---------------------------------------------------------------------------
  const [appointmentPatients, setAppointmentPatients] = useState<AppointmentPatientItem[]>([]);
  const [apptPagination, setApptPagination] = useState<PaginationMeta | null>(null);
  const [apptLoading, setApptLoading] = useState(true);
  const [apptSearch, setApptSearch] = useState("");
  const [apptStatus, setApptStatus] = useState("");
  const [apptType, setApptType] = useState("");
  const [apptPage, setApptPage] = useState(1);

  // ---------------------------------------------------------------------------
  // Tab 2: Admitted Patients State
  // ---------------------------------------------------------------------------
  const [admittedPatients, setAdmittedPatients] = useState<AdmittedPatientItem[]>([]);
  const [admittedPagination, setAdmittedPagination] = useState<PaginationMeta | null>(null);
  const [admittedLoading, setAdmittedLoading] = useState(true);
  const [admittedSearch, setAdmittedSearch] = useState("");
  const [admittedStatus, setAdmittedStatus] = useState("");
  const [admittedSource, setAdmittedSource] = useState("");
  const [admittedPage, setAdmittedPage] = useState(1);

  const canManage = userRole === "ADMIN" || userRole === "RECEPTIONIST" || userRole === "STAFF";

  // Fetch Appointment Patients
  useEffect(() => {
    if (activeTab !== "appointments") return;

    let isMounted = true;
    const timer = setTimeout(async () => {
      setApptLoading(true);
      try {
        const query = new URLSearchParams({
          page: String(apptPage),
          limit: "10",
        });
        if (apptSearch.trim()) query.set("search", apptSearch.trim());
        if (apptStatus) query.set("status", apptStatus);
        if (apptType) query.set("appointmentType", apptType);

        const res = await fetch(`/api/patients/appointments?${query.toString()}`);
        const data = await res.json();
        if (isMounted && res.ok && Array.isArray(data.appointments)) {
          setAppointmentPatients(data.appointments);
          setApptPagination(data.pagination);
        }
      } catch (err) {
        console.error("Failed to load appointment patients:", err);
      } finally {
        if (isMounted) setApptLoading(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [activeTab, apptPage, apptSearch, apptStatus, apptType]);

  // Fetch Admitted Patients
  useEffect(() => {
    if (activeTab !== "admitted") return;

    let isMounted = true;
    const timer = setTimeout(async () => {
      setAdmittedLoading(true);
      try {
        const query = new URLSearchParams({
          page: String(admittedPage),
          limit: "10",
        });
        if (admittedSearch.trim()) query.set("search", admittedSearch.trim());
        if (admittedStatus) query.set("status", admittedStatus);
        if (admittedSource) query.set("source", admittedSource);

        const res = await fetch(`/api/patients/admitted?${query.toString()}`);
        const data = await res.json();
        if (isMounted && res.ok && Array.isArray(data.admissions)) {
          setAdmittedPatients(data.admissions);
          setAdmittedPagination(data.pagination);
        }
      } catch (err) {
        console.error("Failed to load admitted patients:", err);
      } finally {
        if (isMounted) setAdmittedLoading(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [activeTab, admittedPage, admittedSearch, admittedStatus, admittedSource]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
            <User className="w-4 h-4" />
            <span>Clinical Registry • Hospital Encounters</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Patient Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage outpatient appointment encounters and active inpatient hospital admissions from one unified registry.
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/appointments/new"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3.5 py-2 rounded-xl transition"
            >
              <Plus className="w-4 h-4" />
              <span>Book Appointment</span>
            </Link>

            <Link
              href="/admissions"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 px-4 py-2 rounded-xl shadow-xs transition"
            >
              <BedDouble className="w-4 h-4" />
              <span>Admit Patient</span>
            </Link>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-slate-200 bg-white rounded-t-xl px-4 pt-3 shadow-2xs">
        <button
          type="button"
          onClick={() => handleTabChange("appointments")}
          className={`inline-flex items-center gap-2.5 px-5 py-3 border-b-2 font-bold text-xs transition cursor-pointer ${
            activeTab === "appointments"
              ? "border-teal-700 text-teal-900 bg-teal-50/40 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Appointment Patients (Outpatient)</span>
          {apptPagination && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-black ${
                activeTab === "appointments" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {apptPagination.total}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("admitted")}
          className={`inline-flex items-center gap-2.5 px-5 py-3 border-b-2 font-bold text-xs transition cursor-pointer ${
            activeTab === "admitted"
              ? "border-teal-700 text-teal-900 bg-teal-50/40 rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <BedDouble className="w-4 h-4" />
          <span>Admitted Patients (Active Inpatients)</span>
          {admittedPagination && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-black ${
                activeTab === "admitted" ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {admittedPagination.total}
            </span>
          )}
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: APPOINTMENT PATIENTS                                           */}
      {/* ===================================================================== */}
      {activeTab === "appointments" && (
        <div className="space-y-4">
          {/* Search & Contextual Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={apptSearch}
                onChange={(e) => {
                  setApptSearch(e.target.value);
                  setApptPage(1);
                }}
                placeholder="Search by MR#, Patient Name, Appointment#, Doctor..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 pl-10 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={apptType}
                onChange={(e) => {
                  setApptType(e.target.value);
                  setApptPage(1);
                }}
                className="text-xs text-black bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              >
                <option value="">All Appointment Types</option>
                <option value="REGULAR">Regular</option>
                <option value="FOLLOW_UP">Follow Up</option>
                <option value="EMERGENCY">Emergency</option>
              </select>

              <select
                value={apptStatus}
                onChange={(e) => {
                  setApptStatus(e.target.value);
                  setApptPage(1);
                }}
                className="text-xs text-black bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              >
                <option value="">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="WAITING">Waiting</option>
                <option value="IN_CONSULTATION">In Consultation</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {apptLoading ? (
              <div className="p-12 text-center text-xs text-slate-500">
                <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading appointment encounters from database...
              </div>
            ) : appointmentPatients.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                <p className="text-sm font-semibold text-slate-700">No appointment patients found</p>
                <p className="mt-1 text-slate-400">
                  {apptSearch || apptStatus || apptType
                    ? "Try adjusting your search criteria or filters."
                    : "No active appointment encounters match the outpatient filter."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">MR Number</th>
                      <th className="py-3.5 px-4">Patient Name</th>
                      <th className="py-3.5 px-4">Appt #</th>
                      <th className="py-3.5 px-4">Date &amp; Time</th>
                      <th className="py-3.5 px-4">Department</th>
                      <th className="py-3.5 px-4">Doctor</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appointmentPatients.map((apt) => {
                      const hasAdmissionRecommendation =
                        apt.consultation?.treatmentPlan?.includes("[ADMISSION RECOMMENDED") ||
                        apt.consultation?.treatmentPlan?.includes("RECOMMEND INPATIENT");

                      return (
                        <tr key={apt.id} className="hover:bg-teal-50/30 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-teal-800">
                            <Link href={`/patients/${apt.patient.id}`} className="hover:underline">
                              {apt.patient.mrNumber || apt.patient.patientNumber}
                            </Link>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <Link href={`/patients/${apt.patient.id}`} className="hover:text-teal-700">
                              {apt.patient.firstName} {apt.patient.lastName}
                            </Link>
                            <span className="block text-[11px] text-slate-400 font-mono">
                              {apt.patient.phone}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {apt.appointmentNumber}
                            {apt.tokenNumber && (
                              <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                #{apt.tokenNumber}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            <span className="block font-medium">{apt.appointmentDate}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{apt.appointmentTime}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-medium">
                            {apt.department.name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-900">
                            <span className="font-semibold">
                              Dr. {apt.doctor.firstName} {apt.doctor.lastName}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              {apt.doctor.specialization}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                              {apt.appointmentType}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <StatusBadge status={apt.status} />
                              {hasAdmissionRecommendation && (
                                <span className="inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                  Admission Recommended
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {canManage && (
                                <Link
                                  href={`/admissions?patientId=${apt.patient.id}&appointmentId=${apt.id}&doctorId=${apt.doctor.id}&diagnosis=${encodeURIComponent(
                                    apt.consultation?.provisionalDiagnosis || apt.reason || ""
                                  )}`}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-teal-800 hover:bg-teal-900 px-2.5 py-1.5 rounded-lg shadow-2xs transition"
                                  title="Admit patient into hospital"
                                >
                                  <BedDouble className="w-3.5 h-3.5" />
                                  <span>Admit</span>
                                </Link>
                              )}

                              <Link
                                href={`/patients/${apt.patient.id}`}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition"
                                title="View Patient Profile"
                              >
                                <span>Details</span>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {apptPagination && apptPagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 bg-slate-50/50">
                <span>
                  Showing page {apptPagination.page} of {apptPagination.totalPages} ({apptPagination.total} total appointment patients)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={apptPagination.page <= 1}
                    onClick={() => setApptPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={!apptPagination.hasMore}
                    onClick={() => setApptPage((p) => p + 1)}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: ADMITTED PATIENTS                                              */}
      {/* ===================================================================== */}
      {activeTab === "admitted" && (
        <div className="space-y-4">
          {/* Search & Contextual Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={admittedSearch}
                onChange={(e) => {
                  setAdmittedSearch(e.target.value);
                  setAdmittedPage(1);
                }}
                placeholder="Search by MR#, Patient Name, Admission#, Doctor, Ward/Bed..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 pl-10 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={admittedSource}
                onChange={(e) => {
                  setAdmittedSource(e.target.value);
                  setAdmittedPage(1);
                }}
                className="text-xs text-black bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              >
                <option value="">All Admission Sources</option>
                <option value="OPD">OPD Consultation</option>
                <option value="EMERGENCY">Emergency Triage</option>
              </select>

              <select
                value={admittedStatus}
                onChange={(e) => {
                  setAdmittedStatus(e.target.value);
                  setAdmittedPage(1);
                }}
                className="text-xs text-black bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              >
                <option value="">All Active Statuses</option>
                <option value="ADMITTED">Admitted</option>
                <option value="UNDER_TREATMENT">Under Treatment</option>
                <option value="DISCHARGE_PENDING">Discharge Pending</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            {admittedLoading ? (
              <div className="p-12 text-center text-xs text-slate-500">
                <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading active inpatients from database...
              </div>
            ) : admittedPatients.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                <p className="text-sm font-semibold text-slate-700">No admitted patients found</p>
                <p className="mt-1 text-slate-400">
                  {admittedSearch || admittedStatus || admittedSource
                    ? "Try adjusting your search criteria or filters."
                    : "There are currently no active admitted inpatients in the hospital."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">MR Number</th>
                      <th className="py-3.5 px-4">Patient Name</th>
                      <th className="py-3.5 px-4">Admission #</th>
                      <th className="py-3.5 px-4">Admission Date</th>
                      <th className="py-3.5 px-4">Assigned Doctor</th>
                      <th className="py-3.5 px-4">Ward / Bed</th>
                      <th className="py-3.5 px-4">Source</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {admittedPatients.map((adm) => (
                      <tr key={adm.id} className="hover:bg-teal-50/30 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-teal-800">
                          <Link href={`/patients/${adm.patient.id}`} className="hover:underline">
                            {adm.patient.mrNumber || adm.patient.patientNumber}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <Link href={`/patients/${adm.patient.id}`} className="hover:text-teal-700">
                            {adm.patient.firstName} {adm.patient.lastName}
                          </Link>
                          <span className="block text-[11px] text-slate-400 font-mono">
                            {adm.patient.phone} • Blood: {adm.patient.bloodGroup}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                          {adm.admissionNumber}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          <span className="block font-medium">{adm.admissionDate}</span>
                          {adm.admissionTime && (
                            <span className="text-[11px] text-slate-500 font-mono">
                              {adm.admissionTime}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-900">
                          <span className="font-semibold">
                            {adm.doctor ? `Dr. ${adm.doctor.firstName} ${adm.doctor.lastName}` : "On-Call Staff"}
                          </span>
                          {adm.doctor?.specialization && (
                            <span className="block text-[10px] text-slate-400">
                              {adm.doctor.specialization}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded text-xs">
                            {adm.roomBedNo}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                            {adm.admissionSource}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={adm.status} />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canManage && (
                              <Link
                                href={`/reception/permissions?patientId=${adm.patient.id}&admissionId=${adm.id}`}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1.5 rounded-lg transition"
                                title="Generate Patient Consents"
                              >
                                <FileCheck2 className="w-3.5 h-3.5" />
                                <span>Consents</span>
                              </Link>
                            )}

                            <Link
                              href={`/doctor/inpatients/${adm.id}`}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-teal-800 hover:bg-teal-900 px-2.5 py-1.5 rounded-lg shadow-2xs transition"
                              title="Open Inpatient Clinical File"
                            >
                              <Stethoscope className="w-3.5 h-3.5" />
                              <span>Chart</span>
                            </Link>

                            <Link
                              href={`/patients/${adm.patient.id}`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition"
                              title="View Patient Profile"
                            >
                              <span>Profile</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {admittedPagination && admittedPagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 bg-slate-50/50">
                <span>
                  Showing page {admittedPagination.page} of {admittedPagination.totalPages} ({admittedPagination.total} total active inpatients)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={admittedPagination.page <= 1}
                    onClick={() => setAdmittedPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={!admittedPagination.hasMore}
                    onClick={() => setAdmittedPage((p) => p + 1)}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
