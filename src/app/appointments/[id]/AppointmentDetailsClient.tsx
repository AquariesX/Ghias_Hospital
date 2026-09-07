"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  User,
  Stethoscope,
  DollarSign,
  Printer,
  ArrowLeft,
  CheckCircle2,
  BadgeAlert,
  XCircle,
  Copy,
  Check,
} from "lucide-react";

interface AppointmentData {
  id: string;
  appointmentNumber: string;
  appointmentType: "REGULAR" | "FOLLOW_UP" | "EMERGENCY";
  appointmentDate: string;
  appointmentTime: string;
  consultationFee: number | string;
  status: "SCHEDULED" | "CONFIRMED" | "WAITING" | "IN_CONSULTATION" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  reason: string;
  notes?: string | null;
  isEmergency: boolean;
  emergencyPriority?: "NORMAL" | "URGENT" | "HIGH" | "CRITICAL" | null;
  emergencyReason?: string | null;
  immediateAttentionRequired?: boolean;
  createdAt: string;
  patient: {
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
    address?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
  };
  doctor: {
    id: string;
    doctorNumber: string;
    firstName: string;
    lastName: string;
    specialization: string;
    roomNumber: string | null;
    phone: string;
    email: string;
  };
  department: {
    id: string;
    name: string;
    code: string;
    description?: string | null;
  };
  createdBy?: {
    firstName: string;
    lastName: string;
    role: string;
  } | null;
  consultation?: {
    id: string;
    consultationNumber: string;
    consultationDate: string;
    provisionalDiagnosis?: string | null;
  } | null;
}

interface AppointmentDetailsClientProps {
  appointment: AppointmentData;
  canManage: boolean;
}

export default function AppointmentDetailsClient({
  appointment: initialAppointment,
  canManage,
}: AppointmentDetailsClientProps) {
  const router = useRouter();
  const [appointment, setAppointment] = useState<AppointmentData>(initialAppointment);
  const [copied, setCopied] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>("");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          cancellationReason: newStatus === "CANCELLED" ? cancelReason : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAppointment((prev) => ({ ...prev, status: data.appointment.status }));
        setShowCancelModal(false);
        setCancelReason("");
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update status");
      }
    } catch {
      alert("Network error updating appointment");
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "WAITING":
        return "bg-amber-100 text-amber-900 border-amber-300";
      case "IN_CONSULTATION":
        return "bg-blue-100 text-blue-900 border-blue-300 animate-pulse";
      case "COMPLETED":
        return "bg-emerald-100 text-emerald-900 border-emerald-300";
      case "CANCELLED":
        return "bg-rose-100 text-rose-900 border-rose-300";
      case "SCHEDULED":
      default:
        return "bg-slate-100 text-slate-900 border-slate-300";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs print:hidden">
        <Link
          href="/appointments"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Appointments</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Slip</span>
          </button>

          {canManage && appointment.status === "SCHEDULED" && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleStatusChange("WAITING")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Check-in (Mark Waiting)</span>
            </button>
          )}

          {canManage && appointment.status !== "CANCELLED" && appointment.status !== "COMPLETED" && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Printable Ticket Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
        {/* Hospital Header Banner */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                GIAS Hospital Management System
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Patient Appointment Slip
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Clinical Consultation &amp; Outpatient Department Token
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Appointment Number
            </span>
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/15">
              <span className="font-mono text-xl font-bold text-teal-300">
                {appointment.appointmentNumber}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(appointment.appointmentNumber)}
                className="p-1 text-slate-300 hover:text-white"
                title="Copy Appointment #"
              >
                {copied ? <Check className="w-4 h-4 text-teal-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-500 uppercase tracking-wider">Status:</span>
            <span
              className={`px-3 py-1 rounded-full font-bold border ${getStatusBadge(
                appointment.status
              )}`}
            >
              {appointment.status.replace("_", " ")}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-500 uppercase tracking-wider">Type:</span>
            <span className="px-2.5 py-1 rounded-md font-bold bg-slate-200 text-slate-800">
              {appointment.appointmentType}
            </span>
            {appointment.isEmergency && (
              <span className="px-2.5 py-1 rounded-md font-bold bg-rose-100 text-rose-800 border border-rose-200">
                Emergency Priority: {appointment.emergencyPriority || "URGENT"}
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Emergency Alert Banner if Emergency */}
          {appointment.isEmergency && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
              <BadgeAlert className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-bold text-rose-900 text-sm">
                  Emergency Triage Encounter
                </h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  <strong>Reason:</strong> {appointment.emergencyReason || appointment.reason}
                </p>
                {appointment.immediateAttentionRequired && (
                  <p className="text-xs font-bold text-rose-800 mt-1">
                    [!] Immediate medical attention requested by frontdesk triage.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Grid Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient Card */}
            <div className="border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-600" />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-600">
                    Patient Profile
                  </span>
                </div>
                <Link
                  href={`/patients/${appointment.patient.id}`}
                  className="text-xs font-bold text-teal-600 hover:text-teal-800 print:hidden"
                >
                  View Profile &rarr;
                </Link>
              </div>

              <div className="text-sm space-y-1.5">
                <p className="font-bold text-slate-900 text-base">
                  {appointment.patient.firstName} {appointment.patient.lastName}
                </p>
                <p className="text-xs font-mono text-slate-700">
                  Patient #: <strong>{appointment.patient.patientNumber}</strong>
                </p>
                {appointment.patient.mrNumber && (
                  <p className="text-xs font-mono text-slate-700">
                    MR #: <strong>{appointment.patient.mrNumber}</strong>
                  </p>
                )}
                <p className="text-xs text-slate-600">
                  Gender: {appointment.patient.gender} | Blood: {appointment.patient.bloodGroup}
                </p>
                <p className="text-xs text-slate-600">
                  Phone: <strong>{appointment.patient.phone}</strong>
                </p>
                {appointment.patient.cnic && (
                  <p className="text-xs text-slate-600">CNIC: {appointment.patient.cnic}</p>
                )}
              </div>
            </div>

            {/* Doctor Card */}
            <div className="border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-600">
                  Physician &amp; Clinical Dept
                </span>
              </div>

              <div className="text-sm space-y-1.5">
                <p className="font-bold text-slate-900 text-base">
                  Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}
                </p>
                <p className="text-xs text-slate-700 font-medium">
                  {appointment.doctor.specialization}
                </p>
                <p className="text-xs text-slate-600">
                  Department: <strong>{appointment.department.name}</strong>
                </p>
                {appointment.doctor.roomNumber && (
                  <p className="text-xs text-slate-600">
                    Consultation Room: <strong>{appointment.doctor.roomNumber}</strong>
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Physician ID: {appointment.doctor.doctorNumber}
                </p>
              </div>
            </div>

            {/* Schedule & Fee Details */}
            <div className="border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-600">
                  Schedule Details
                </span>
              </div>

              <div className="text-sm space-y-2">
                <div>
                  <span className="text-xs text-slate-500">Date &amp; Time:</span>
                  <p className="font-bold text-slate-900 text-base">
                    {new Date(appointment.appointmentDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-teal-800 font-bold">{appointment.appointmentTime}</p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Booked By:</span>
                  <p className="text-xs font-medium text-slate-800">
                    {appointment.createdBy
                      ? `${appointment.createdBy.firstName} ${appointment.createdBy.lastName} (${appointment.createdBy.role})`
                      : "Frontdesk Receptionist"}
                  </p>
                </div>
              </div>
            </div>

            {/* Consultation Fee Card */}
            <div className="border border-slate-200 rounded-xl p-5 space-y-3 bg-emerald-50/40">
              <div className="flex items-center gap-2 border-b border-emerald-100 pb-2">
                <DollarSign className="w-4 h-4 text-emerald-700" />
                <span className="font-bold text-xs uppercase tracking-wider text-emerald-800">
                  Consultation Fee
                </span>
              </div>

              <div className="space-y-1">
                <p className="font-mono text-3xl font-black text-emerald-700">
                  PKR {Number(appointment.consultationFee).toLocaleString()}
                </p>
                <p className="text-xs text-slate-600">
                  Official snapshot of physician fee recorded at booking time.
                </p>
                <div className="pt-2">
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-900">
                    Status: Recorded
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Reason & Clinical Notes */}
          <div className="border border-slate-200 rounded-xl p-5 space-y-3">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-600 block border-b border-slate-100 pb-2">
              Clinical Reason &amp; Complaints
            </span>
            <p className="text-sm text-slate-900 font-medium">{appointment.reason}</p>
            {appointment.notes && (
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">
                <strong>Staff Notes:</strong> {appointment.notes}
              </div>
            )}
          </div>
        </div>

        {/* Slip Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 space-y-1">
          <p>
            Please present this slip at the consultation desk when called by the nursing staff.
          </p>
          <p className="font-mono text-[11px]">
            Issued on: {new Date(appointment.createdAt).toLocaleString()} | GIAS Hospital
          </p>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              Cancel Appointment
            </h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to cancel appointment {appointment.appointmentNumber}? This action will update the patient record and doctor queue.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cancellation Reason:
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Patient requested cancellation, doctor unavailable..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 text-black bg-white focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleStatusChange("CANCELLED")}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {isUpdating ? "Canceling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
