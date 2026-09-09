"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  HeartPulse,
  Stethoscope,
  ChevronRight,
  AlertCircle,
  BedDouble,
  ClipboardList,
} from "lucide-react";

interface QueueItem {
  id: string;
  isAdmission?: boolean;
  admissionId?: string;
  appointmentNumber: string;
  appointmentTime: string;
  status: string;
  reason: string;
  roomBedNo?: string | null;
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
    allergies: string[];
    chronicConditions: string[];
    vitalSigns?: Array<{
      systolicBP: number | null;
      diastolicBP: number | null;
      pulse: number | null;
      temperature: number | null;
      oxygenSaturation: number | null;
      weight: number | null;
      height: number | null;
      bmi: number | null;
      recordedAt: string;
    }>;
  };
  doctor: {
    id: string;
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
}

export default function OpdQueueClient() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/staff/opd/queue?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load OPD queue");
      }

      setQueueItems(data.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">OPD Patient Queue</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Identify OPD patients, perform initial assessments, record vitals, and prepare charts for attending doctors.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchQueue}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by patient name, MR Number, Bed, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold uppercase text-slate-500">Filter:</span>
          {[
            { id: "ALL", label: "All OPD" },
            { id: "ADMITTED", label: "Admitted Inpatients" },
            { id: "WAITING", label: "Waiting" },
            { id: "IN_CONSULTATION", label: "In Consultation" },
            { id: "COMPLETED", label: "Completed" },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === st.id
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-2" />
            <p className="text-sm font-medium">Loading OPD patient queue...</p>
          </div>
        ) : queueItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-700">No patients found in OPD queue.</p>
            <p className="text-xs text-slate-400 mt-1">
              New arrivals and OPD admissions from reception will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">MR Number</th>
                  <th className="py-3.5 px-4">Intake Type / Bed</th>
                  <th className="py-3.5 px-4">Attending Doctor</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Latest Vitals</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queueItems.map((item) => {
                  const vitals = item.patient.vitalSigns?.[0];
                  const isAdmitted = item.isAdmission;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {item.patient.firstName} {item.patient.lastName}
                        </div>
                        <div className="text-xs text-slate-400">
                          {item.patient.gender} • Blood: {item.patient.bloodGroup ? item.patient.bloodGroup.replace("_", "") : "N/A"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700">
                        {item.patient.mrNumber || item.patient.patientNumber}
                      </td>

                      <td className="py-3.5 px-4">
                        {isAdmitted ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-md">
                              <BedDouble className="w-3.5 h-3.5 text-teal-700" />
                              <span>{item.roomBedNo || "OPD Ward"}</span>
                            </span>
                            <div className="text-[11px] text-slate-500 mt-1 font-mono">
                              Adm #{item.appointmentNumber}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium text-slate-800 text-xs">{item.appointmentNumber}</div>
                            <div className="text-xs text-slate-400">{item.appointmentTime}</div>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 text-xs">
                          {item.doctor ? `Dr. ${item.doctor.firstName} ${item.doctor.lastName}` : "Assigned Physician"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {item.doctor?.specialization || "OPD Consultant"}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full ${
                            item.status === "ADMITTED" || item.status === "UNDER_TREATMENT"
                              ? "bg-teal-100 text-teal-800 border border-teal-200"
                              : item.status === "WAITING"
                              ? "bg-amber-100 text-amber-800"
                              : item.status === "IN_CONSULTATION"
                              ? "bg-blue-100 text-blue-800"
                              : item.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.status.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {vitals ? (
                          <div className="font-mono text-xs text-slate-800">
                            <div>
                              BP: {vitals.systolicBP && vitals.diastolicBP ? `${vitals.systolicBP}/${vitals.diastolicBP}` : "—"} | Pulse: {vitals.pulse || "—"}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              SpO2: {vitals.oxygenSaturation ? `${vitals.oxygenSaturation}%` : "—"} | Temp: {vitals.temperature ? `${vitals.temperature}°F` : "—"}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            <HeartPulse className="w-3.5 h-3.5" />
                            Pending Vitals
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isAdmitted ? (
                          <Link
                            href={`/staff/inpatients/${item.id}`}
                            className="inline-flex items-center gap-1.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
                          >
                            <ClipboardList className="w-3.5 h-3.5" />
                            <span>Initial Assessment &amp; Chart</span>
                          </Link>
                        ) : (
                          <Link
                            href={`/staff/patients/${item.patient.id}`}
                            className="inline-flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-xs"
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
    </div>
  );
}
