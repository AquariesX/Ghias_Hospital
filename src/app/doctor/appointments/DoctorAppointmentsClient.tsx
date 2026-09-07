"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Search,
  RefreshCw,
  Play,
  Stethoscope,
  CheckCircle2,
  ExternalLink,
  User,
  Filter,
} from "lucide-react";

interface PatientSummary {
  id: string;
  patientNumber: string;
  mrNumber: string | null;
  firstName: string;
  lastName: string;
  gender: string;
  phone: string;
  bloodGroup: string;
}

interface ConsultationSummary {
  id: string;
  consultationNumber: string;
  status: string;
  consultationDate: string;
}

interface AppointmentItem {
  id: string;
  appointmentNumber: string;
  appointmentType: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string;
  status: "SCHEDULED" | "CONFIRMED" | "WAITING" | "IN_CONSULTATION" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  isEmergency: boolean;
  patient: PatientSummary;
  consultation?: ConsultationSummary | null;
}

interface Props {
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
    specialization: string;
    department?: { name: string } | null;
  } | null;
}

export default function DoctorAppointmentsClient({ doctor }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("today");
  const [search, setSearch] = useState<string>("");
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("tab", activeTab);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/doctor/appointments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error("Error fetching doctor appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAppointments();
  };

  const handleStartConsultation = async (appointmentId: string) => {
    setActionInProgress(appointmentId);
    try {
      const res = await fetch(`/api/doctor/appointments/${appointmentId}/start`, {
        method: "POST",
      });
      if (res.ok) {
        router.push(`/doctor/consultation/${appointmentId}`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to start consultation");
      }
    } catch {
      alert("Network error starting consultation");
    } finally {
      setActionInProgress(null);
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
      case "NO_SHOW":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "CANCELLED":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-teal-50 text-teal-800 border-teal-200";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-700 uppercase tracking-wider">
            <span>Doctor Appointments</span>
            <span>•</span>
            <span>{doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : "Clinical Practice"}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Clinical Appointments
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your patient consultations, schedule, and historical clinic records
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/doctor/queue"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Today&apos;s Queue</span>
          </Link>
          <button
            onClick={fetchAppointments}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2 sm:pb-0 sm:border-0">
            {[
              { id: "today", label: "Today" },
              { id: "upcoming", label: "Upcoming" },
              { id: "completed", label: "Completed" },
              { id: "no_show", label: "No Show" },
              { id: "cancelled", label: "Cancelled" },
              { id: "all", label: "All History" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === tab.id
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search patient or appt #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs text-black border border-slate-300 rounded-lg w-56 sm:w-64 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
            >
              Filter
            </button>
          </form>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading appointments...
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-base font-bold text-slate-800">No Appointments Found</p>
            <p className="text-xs text-slate-500">
              There are no appointments matching the selected filter ({activeTab}).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Appt #</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Reason / Complaints</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/80 transition">
                    {/* Appt Number */}
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-800">
                      {apt.appointmentNumber}
                      {apt.isEmergency && (
                        <span className="block mt-0.5 text-[10px] font-extrabold text-rose-700 uppercase">
                          Emergency
                        </span>
                      )}
                    </td>

                    {/* Patient */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900 block">
                          {apt.patient.firstName} {apt.patient.lastName}
                        </span>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="font-mono">{apt.patient.mrNumber || apt.patient.patientNumber}</span>
                          <span>•</span>
                          <span>{apt.patient.gender}</span>
                          <span>•</span>
                          <span>{apt.patient.phone}</span>
                        </div>
                      </div>
                    </td>

                    {/* Date & Time */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                      <div className="font-medium text-slate-800">
                        {new Date(apt.appointmentDate).toLocaleDateString()}
                      </div>
                      <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{apt.appointmentTime}</span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                      <span className="px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                        {apt.appointmentType}
                      </span>
                    </td>

                    {/* Reason */}
                    <td className="py-3.5 px-4 text-xs text-slate-700 max-w-xs truncate">
                      {apt.reason || "General Consultation"}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                          apt.status
                        )}`}
                      >
                        {apt.status}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {/* Contextual actions */}
                        {apt.status === "WAITING" || apt.status === "SCHEDULED" || apt.status === "CONFIRMED" ? (
                          <button
                            type="button"
                            disabled={actionInProgress === apt.id}
                            onClick={() => handleStartConsultation(apt.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition disabled:opacity-50"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Start Consultation</span>
                          </button>
                        ) : apt.status === "IN_CONSULTATION" ? (
                          <Link
                            href={`/doctor/consultation/${apt.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition"
                          >
                            <Stethoscope className="w-3 h-3" />
                            <span>Continue</span>
                          </Link>
                        ) : apt.status === "COMPLETED" ? (
                          <Link
                            href={`/doctor/consultation/${apt.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>View Encounter</span>
                          </Link>
                        ) : null}

                        {/* Patient profile */}
                        <Link
                          href={`/patients/${apt.patient.id}`}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-teal-700"
                          title="Patient EMR"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
