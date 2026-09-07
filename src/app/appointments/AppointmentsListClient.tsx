"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Search,
  Plus,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface AppointmentItem {
  id: string;
  appointmentNumber: string;
  tokenNumber?: number | null;
  appointmentType: "REGULAR" | "FOLLOW_UP" | "EMERGENCY";
  appointmentDate: string;
  appointmentTime: string;
  consultationFee: number | string;
  status: "SCHEDULED" | "WAITING" | "IN_CONSULTATION" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  reason: string;
  isEmergency: boolean;
  emergencyPriority?: "NORMAL" | "URGENT" | "HIGH" | "CRITICAL" | null;
  patient: {
    id: string;
    patientNumber: string;
    mrNumber: string | null;
    firstName: string;
    lastName: string;
    cnic: string | null;
    phone: string;
    gender: string;
  };
  doctor: {
    id: string;
    doctorNumber: string;
    firstName: string;
    lastName: string;
    specialization: string;
    roomNumber: string | null;
  };
  department: {
    id: string;
    name: string;
    code: string;
  };
  createdBy?: {
    firstName: string;
    lastName: string;
    role: string;
  } | null;
}

interface Department {
  id: string;
  name: string;
  doctors: Array<{ id: string; firstName: string; lastName: string }>;
}

export default function AppointmentsListClient() {
  // Filters
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [customDate, setCustomDate] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [doctorId, setDoctorId] = useState<string>("");
  const [appointmentType, setAppointmentType] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Data & State
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Status update modal
  const [statusModalApt, setStatusModalApt] = useState<AppointmentItem | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>("");

  // Fetch departments for dropdown filters
  useEffect(() => {
    async function loadDepts() {
      try {
        const res = await fetch("/api/appointments/departments");
        if (res.ok) {
          const data = await res.json();
          setDepartments(data.departments || []);
        }
      } catch (err) {
        console.error("Failed to load departments:", err);
      }
    }
    loadDepts();
  }, []);

  // Fetch appointments effect
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "10");

    if (dateFilter === "today") {
      params.set("date", "today");
    } else if (dateFilter === "tomorrow") {
      params.set("date", "tomorrow");
    } else if (dateFilter === "custom" && customDate) {
      params.set("date", customDate);
    }

    if (departmentId) params.set("departmentId", departmentId);
    if (doctorId) params.set("doctorId", doctorId);
    if (appointmentType) params.set("appointmentType", appointmentType);
    if (statusFilter) params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());

    fetch(`/api/appointments?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setAppointments(data.appointments || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching appointments:", err);
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, dateFilter, customDate, departmentId, doctorId, appointmentType, statusFilter, search]);

  const refreshAppointments = () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "10");
    if (dateFilter === "today") params.set("date", "today");
    else if (dateFilter === "tomorrow") params.set("date", "tomorrow");
    else if (dateFilter === "custom" && customDate) params.set("date", customDate);
    if (departmentId) params.set("departmentId", departmentId);
    if (doctorId) params.set("doctorId", doctorId);
    if (appointmentType) params.set("appointmentType", appointmentType);
    if (statusFilter) params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());

    fetch(`/api/appointments?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setAppointments(data.appointments || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  };

  // Quick Status Update
  const handleUpdateStatus = async (newStatus: string) => {
    if (!statusModalApt) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/appointments/${statusModalApt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          cancellationReason: newStatus === "CANCELLED" ? cancelReason : undefined,
        }),
      });

      if (res.ok) {
        setStatusModalApt(null);
        setCancelReason("");
        refreshAppointments();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update appointment status");
      }
    } catch {
      alert("Network error updating appointment status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "WAITING":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "IN_CONSULTATION":
        return "bg-blue-100 text-blue-800 border-blue-200 animate-pulse";
      case "COMPLETED":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "CANCELLED":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "SCHEDULED":
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-700 uppercase tracking-wider">
            <span>Hospital Frontdesk</span>
            <span>•</span>
            <span>Appointments &amp; Queues</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Appointment Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time patient appointments, clinical queues, status updates, and fee records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => refreshAppointments()}
            className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/appointments/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Book Appointment</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">
            Date Filter:
          </span>
          <button
            type="button"
            onClick={() => {
              setDateFilter("today");
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              dateFilter === "today"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => {
              setDateFilter("tomorrow");
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              dateFilter === "tomorrow"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => {
              setDateFilter("all");
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              dateFilter === "all"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            All Dates
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-500 font-medium">Custom:</span>
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setDateFilter("custom");
                setPage(1);
              }}
              className="text-xs text-black bg-white border border-slate-200 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Dropdowns & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 text-xs">
          {/* Search box */}
          <div className="md:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by Patient, MR #, Apt #, or Phone..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-teal-500 text-black bg-white"
            />
          </div>

          {/* Department dropdown */}
          <div>
            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setDoctorId("");
                setPage(1);
              }}
              className="w-full p-2 text-xs rounded-lg border border-slate-300 text-black bg-white focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status dropdown */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 text-xs rounded-lg border border-slate-300 text-black bg-white focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Statuses</option>
              <option value="WAITING">Waiting in Queue</option>
              <option value="IN_CONSULTATION">In Consultation</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Type dropdown */}
          <div>
            <select
              value={appointmentType}
              onChange={(e) => {
                setAppointmentType(e.target.value);
                setPage(1);
              }}
              className="w-full p-2 text-xs rounded-lg border border-slate-300 text-black bg-white focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Types</option>
              <option value="REGULAR">Regular OPD</option>
              <option value="FOLLOW_UP">Follow-up</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-800">
              Appointments ({totalCount})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading appointments...
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-medium text-slate-600">No appointments found matching your filter criteria.</p>
            <Link
              href="/appointments/new"
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Book New Appointment</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Appointment #</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Physician &amp; Dept</th>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Fee (PKR)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {apt.tokenNumber ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-black font-mono bg-teal-50 text-teal-800 border border-teal-200" title={`Daily Token #${apt.tokenNumber}`}>
                            #{apt.tokenNumber}
                          </span>
                        ) : null}
                        <Link href={`/appointments/${apt.id}`} className="font-mono font-bold text-teal-800 hover:underline">
                          {apt.appointmentNumber}
                        </Link>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <Link
                          href={`/patients/${apt.patient.id}`}
                          className="font-bold text-slate-900 hover:text-teal-700"
                        >
                          {apt.patient.firstName} {apt.patient.lastName}
                        </Link>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          {apt.patient.mrNumber && (
                            <span className="font-mono text-slate-600">MR: {apt.patient.mrNumber}</span>
                          )}
                          <span>{apt.patient.phone}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-slate-800">
                          Dr. {apt.doctor.firstName} {apt.doctor.lastName}
                        </span>
                        <div className="text-xs text-slate-500">
                          {apt.department.name} {apt.doctor.roomNumber ? `• Rm ${apt.doctor.roomNumber}` : ""}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 text-xs">
                      <div className="font-semibold text-slate-800">
                        {new Date(apt.appointmentDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-slate-500">{apt.appointmentTime}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                        {apt.appointmentType}
                      </span>
                      {apt.isEmergency && (
                        <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          Emergency
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-emerald-700 text-xs">
                      PKR {Number(apt.consultationFee).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                          apt.status
                        )}`}
                      >
                        {apt.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/appointments/${apt.id}`}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-teal-700 transition"
                          title="View Details & Slip"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        {/* Quick Status Action Button */}
                        {apt.status === "SCHEDULED" && (
                          <button
                            type="button"
                            onClick={() => {
                              setStatusModalApt(apt);
                            }}
                            className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition"
                            title="Check-in Patient"
                          >
                            Check In
                          </button>
                        )}

                        {apt.status === "WAITING" && (
                          <button
                            type="button"
                            onClick={() => setStatusModalApt(apt)}
                            className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          >
                            Update
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing {appointments.length} of {totalCount} records
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Status Modal */}
      {statusModalApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                Update Appointment Status
              </h3>
              <button
                type="button"
                onClick={() => setStatusModalApt(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p>
                <strong>Appointment:</strong> {statusModalApt.appointmentNumber}
              </p>
              <p>
                <strong>Patient:</strong> {statusModalApt.patient.firstName} {statusModalApt.patient.lastName}
              </p>
              <p>
                <strong>Current Status:</strong> {statusModalApt.status}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => handleUpdateStatus("WAITING")}
                className="p-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs border border-amber-200 transition"
              >
                Mark Waiting (Check-In)
              </button>

              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => handleUpdateStatus("IN_CONSULTATION")}
                className="p-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 font-semibold text-xs border border-blue-200 transition"
              >
                Start Consultation
              </button>

              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => handleUpdateStatus("COMPLETED")}
                className="p-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-semibold text-xs border border-emerald-200 transition"
              >
                Mark Completed
              </button>

              <button
                type="button"
                disabled={updatingStatus}
                onClick={() => handleUpdateStatus("CANCELLED")}
                className="p-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-900 font-semibold text-xs border border-rose-200 transition"
              >
                Cancel Appointment
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setStatusModalApt(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
