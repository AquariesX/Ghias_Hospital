"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Stethoscope,
  Users,
  Clock,
  Calendar,
  CheckCircle2,
  Play,
  ExternalLink,
  RefreshCw,
  BadgeAlert,
} from "lucide-react";

interface PatientInfo {
  id: string;
  patientNumber: string;
  mrNumber: string | null;
  firstName: string;
  lastName: string;
  cnic: string | null;
  phone: string;
  gender: string;
  dateOfBirth: string;
  bloodGroup: string;
  allergies?: string[];
}

interface DoctorInfo {
  id: string;
  doctorNumber: string;
  firstName: string;
  lastName: string;
  specialization: string;
  roomNumber: string | null;
  consultationFee: number | string;
  department: {
    id: string;
    name: string;
  };
}

interface QueueAppointment {
  id: string;
  appointmentNumber: string;
  tokenNumber?: number | null;
  appointmentType: "REGULAR" | "FOLLOW_UP" | "EMERGENCY";
  appointmentDate: string;
  appointmentTime: string;
  consultationFee: number | string;
  status: "SCHEDULED" | "WAITING" | "IN_CONSULTATION" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  reason: string;
  notes?: string | null;
  isEmergency: boolean;
  emergencyPriority?: "NORMAL" | "URGENT" | "HIGH" | "CRITICAL" | null;
  immediateAttentionRequired?: boolean;
  queuePosition?: number;
  patient: PatientInfo;
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
    specialization: string;
  };
  department: {
    name: string;
  };
}

interface DoctorQueueClientProps {
  initialDoctorId?: string;
  isAdmin: boolean;
}

export default function DoctorQueueClient({
  initialDoctorId,
  isAdmin,
}: DoctorQueueClientProps) {
  const router = useRouter();
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(initialDoctorId || "");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);

  const [doctorsList, setDoctorsList] = useState<DoctorInfo[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorInfo | null>(null);

  const [inConsultation, setInConsultation] = useState<QueueAppointment[]>([]);
  const [waitingQueue, setWaitingQueue] = useState<QueueAppointment[]>([]);
  const [completedAppointments, setCompletedAppointments] = useState<QueueAppointment[]>([]);

  const [stats, setStats] = useState({
    totalToday: 0,
    waitingCount: 0,
    inConsultationCount: 0,
    completedCount: 0,
    emergencyCount: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (selectedDoctorId) params.set("doctorId", selectedDoctorId);
    if (selectedDate) params.set("date", selectedDate);

    fetch(`/api/appointments/queue?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setDoctorsList(data.doctorsList || []);
        setSelectedDoctor(data.selectedDoctor || null);
        setInConsultation(data.inConsultation || []);
        setWaitingQueue(data.waitingQueue || []);
        setCompletedAppointments(data.completedAppointments || []);
        setStats(
          data.stats || {
            totalToday: 0,
            waitingCount: 0,
            inConsultationCount: 0,
            completedCount: 0,
            emergencyCount: 0,
          }
        );

        if (!selectedDoctorId && data.selectedDoctor) {
          setSelectedDoctorId(data.selectedDoctor.id);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load doctor queue:", err);
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedDoctorId, selectedDate]);

  const refreshQueue = () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (selectedDoctorId) params.set("doctorId", selectedDoctorId);
    if (selectedDate) params.set("date", selectedDate);

    fetch(`/api/appointments/queue?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setDoctorsList(data.doctorsList || []);
        setSelectedDoctor(data.selectedDoctor || null);
        setInConsultation(data.inConsultation || []);
        setWaitingQueue(data.waitingQueue || []);
        setCompletedAppointments(data.completedAppointments || []);
        setStats(
          data.stats || {
            totalToday: 0,
            waitingCount: 0,
            inConsultationCount: 0,
            completedCount: 0,
            emergencyCount: 0,
          }
        );
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  };

  // Status Action: Start Consultation, Mark Completed, Skip, Call Next
  const handleAction = async (appointmentId: string, newStatus: string) => {
    setActionInProgress(appointmentId);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        refreshQueue();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update appointment status");
      }
    } catch {
      alert("Network error performing queue action");
    } finally {
      setActionInProgress(null);
    }
  };

  const startConsultation = async (appointmentId: string) => {
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-700 uppercase tracking-wider">
            <span>Clinical Workspace</span>
            <span>•</span>
            <span>Patient Queue Board</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Doctor Consultation Queue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time outpatient triage, priority management, and patient encounter status
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Doctor Switcher for Admin */}
          {isAdmin && doctorsList.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Doctor:</span>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="text-xs font-bold text-black bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500"
              >
                {doctorsList.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.firstName} {d.lastName} ({d.department.name})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold text-black bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <button
            onClick={refreshQueue}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Physician Info Banner */}
      {selectedDoctor && (
        <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">
                  Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {selectedDoctor.doctorNumber}
                </span>
              </div>
              <p className="text-xs text-teal-200 mt-0.5">
                {selectedDoctor.specialization} • Department: {selectedDoctor.department.name}
                {selectedDoctor.roomNumber ? ` • Room: ${selectedDoctor.roomNumber}` : ""}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-teal-300 uppercase tracking-wider font-semibold block">
              Configured Consultation Fee
            </span>
            <span className="text-xl font-mono font-extrabold text-white">
              PKR {Number(selectedDoctor.consultationFee).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Today
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalToday}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
            Waiting in Queue
          </span>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.waitingCount}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs bg-blue-50/20">
          <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
            In Consultation
          </span>
          <p className="text-2xl font-bold text-blue-700 mt-1">{stats.inConsultationCount}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
            Completed
          </span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.completedCount}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs bg-rose-50/20 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
            Emergency Cases
          </span>
          <p className="text-2xl font-bold text-rose-700 mt-1">{stats.emergencyCount}</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACTIVE IN-CONSULTATION PATIENT PINNED CARD                                */}
      {/* ========================================================================= */}
      {inConsultation.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-blue-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600 animate-ping inline-block"></span>
              <h2 className="text-base font-bold text-blue-950 uppercase tracking-wider">
                Current Active Consultation
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-600 text-white shadow-xs">
              IN CONSULTATION
            </span>
          </div>

          {inConsultation.map((apt) => (
            <div
              key={apt.id}
              className="bg-white rounded-xl p-5 border border-blue-200 shadow-xs flex flex-wrap items-center justify-between gap-6"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-extrabold text-slate-900">
                    {apt.patient.firstName} {apt.patient.lastName}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
                    {apt.patient.gender}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-100 text-teal-800">
                    Blood: {apt.patient.bloodGroup}
                  </span>
                </div>
                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-4">
                  <span className="font-mono font-bold text-teal-800">
                    Patient #: {apt.patient.patientNumber}
                  </span>
                  {apt.tokenNumber && (
                    <span className="font-mono font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      Token #{apt.tokenNumber}
                    </span>
                  )}
                  {apt.patient.mrNumber && (
                    <span className="font-mono text-slate-700">MR #: {apt.patient.mrNumber}</span>
                  )}
                  <span>Time: {apt.appointmentTime}</span>
                  <span className="font-semibold text-slate-800">Type: {apt.appointmentType}</span>
                </div>
                <div className="text-xs text-slate-700 pt-1">
                  <strong>Presenting Complaints:</strong> {apt.reason}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/doctor/consultation/${apt.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition"
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>Open Clinical Workspace</span>
                </Link>

                <Link
                  href={`/patients/${apt.patient.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Patient Profile</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* WAITING QUEUE TABLE                                                       */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-900">
              Waiting Queue ({waitingQueue.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Emergency priority patients automatically ordered at top
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Calculating live doctor queue...
          </div>
        ) : waitingQueue.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-base font-bold text-slate-800">Queue is Clear!</p>
            <p className="text-xs text-slate-500">
              No patients are currently waiting for consultation for this date.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-16 text-center">Pos #</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">MR / Patient #</th>
                  <th className="py-3 px-4">Type &amp; Urgency</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Reason / Complaints</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {waitingQueue.map((apt) => (
                  <tr
                    key={apt.id}
                    className={`hover:bg-slate-50/80 transition ${
                      apt.isEmergency ? "bg-rose-50/30 font-medium" : ""
                    }`}
                  >
                    {/* Position & Token */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-mono font-extrabold text-sm shadow-xs ${
                            apt.isEmergency
                              ? "bg-rose-600 text-white animate-pulse"
                              : "bg-teal-700 text-white"
                          }`}
                        >
                          #{apt.queuePosition}
                        </span>
                        {apt.tokenNumber ? (
                          <span className="text-[10px] font-mono font-black text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 mt-1">
                            Tok #{apt.tokenNumber}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Patient Name */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-slate-900 block">
                          {apt.patient.firstName} {apt.patient.lastName}
                        </span>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>{apt.patient.gender}</span>
                          <span>•</span>
                          <span>{apt.patient.phone}</span>
                        </div>
                      </div>
                    </td>

                    {/* MR & Patient # */}
                    <td className="py-3.5 px-4 font-mono text-xs">
                      {apt.patient.mrNumber && (
                        <div className="font-bold text-slate-800">{apt.patient.mrNumber}</div>
                      )}
                      <div className="text-slate-500">{apt.patient.patientNumber}</div>
                    </td>

                    {/* Type & Urgency */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-800">
                        {apt.appointmentType}
                      </span>
                      {apt.isEmergency && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                            <BadgeAlert className="w-3 h-3" />
                            {apt.emergencyPriority || "URGENT"}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Time */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-700">
                      <Clock className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                      {apt.appointmentTime}
                    </td>

                    {/* Reason */}
                    <td className="py-3.5 px-4 text-xs text-slate-700 max-w-xs truncate">
                      {apt.reason}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          apt.status === "WAITING"
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : "bg-slate-100 text-slate-800 border-slate-200"
                        }`}
                      >
                        {apt.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/patients/${apt.patient.id}`}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-teal-700"
                          title="Patient EMR"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>

                        <button
                          type="button"
                          disabled={actionInProgress === apt.id}
                          onClick={() => startConsultation(apt.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Start Consultation</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* COMPLETED APPOINTMENTS TODAY                                              */}
      {/* ========================================================================= */}
      {completedAppointments.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-800">
                Completed &amp; Concluded Encounters ({completedAppointments.length})
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {completedAppointments.map((apt) => (
              <div
                key={apt.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    {apt.patient.firstName} {apt.patient.lastName}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      apt.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {apt.status}
                  </span>
                </div>
                <p className="font-mono text-[11px] text-slate-500">
                  {apt.patient.mrNumber || apt.patient.patientNumber} • {apt.appointmentTime}
                </p>
                <p className="text-slate-600 truncate">{apt.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
