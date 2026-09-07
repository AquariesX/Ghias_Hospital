import Link from "next/link";
import {
  Users,
  Clock,
  Activity,
  CheckCircle,
  AlertTriangle,
  HeartPulse,
  ArrowRight,
  Stethoscope,
  ChevronRight,
  Flame,
} from "lucide-react";

interface NurseDashboardViewProps {
  nurseName: string;
  department: "OPD" | "EMERGENCY" | null;
  role: string;
  shift: string | null;
  opdMetrics?: {
    totalPatients: number;
    waiting: number;
    inConsultation: number;
    completed: number;
  };
  erMetrics?: {
    totalCases: number;
    critical: number;
    high: number;
    urgent: number;
    normal: number;
  };
  queue: Array<{
    id: string;
    patient: {
      id: string;
      patientNumber: string;
      mrNumber: string | null;
      firstName: string;
      lastName: string;
      gender: string;
      dateOfBirth: Date;
      phone: string;
      bloodGroup: string;
      allergies: string[];
      vitalSigns?: Array<{
        systolicBP: number | null;
        diastolicBP: number | null;
        pulse: number | null;
        temperature: any;
        oxygenSaturation: number | null;
        recordedAt: Date;
      }>;
    };
    doctor?: {
      firstName: string;
      lastName: string;
      specialization: string;
      roomNumber: string | null;
    } | null;
    department?: {
      name: string;
    } | null;
    appointmentTime?: string;
    status?: string;
    priority?: string;
    chiefComplaint?: string;
    triagedAt?: Date;
  }>;
}

export default function NurseDashboardView({
  nurseName,
  department,
  role,
  shift,
  opdMetrics,
  erMetrics,
  queue,
}: NurseDashboardViewProps) {
  const isEmergency = department === "EMERGENCY";

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isEmergency ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                }`}
              />
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  isEmergency
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-teal-50 text-teal-700 border border-teal-200"
                }`}
              >
                {isEmergency ? "Emergency Nursing Station" : "OPD Nursing Station"}
              </span>
              {shift && (
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Shift: {shift}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Welcome, {nurseName}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Department:{" "}
              <span className="font-semibold text-slate-800">
                {department ? (isEmergency ? "Emergency / Triage" : "Outpatient (OPD)") : "Clinical General"}
              </span>{" "}
              | Role: <span className="font-medium text-slate-700">{role.replace(/_/g, " ")}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isEmergency ? (
              <Link
                href="/staff/emergency"
                className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-xs"
              >
                <Flame className="w-4 h-4" />
                Emergency Queue &amp; Triage
              </Link>
            ) : (
              <Link
                href="/staff/opd"
                className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-xs"
              >
                <Stethoscope className="w-4 h-4" />
                Open OPD Queue
              </Link>
            )}
            <Link
              href="/staff/patients"
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-xs"
            >
              <Users className="w-4 h-4 text-slate-500" />
              Patient Directory
            </Link>
          </div>
        </div>
      </div>

      {/* Today's Overview Cards */}
      {isEmergency && erMetrics ? (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Emergency Cases &amp; Triage Priority
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase">Total ER Cases</span>
                <HeartPulse className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{erMetrics.totalCases}</p>
            </div>

            <div className="bg-rose-50 p-4 sm:p-5 rounded-xl border border-rose-200 shadow-xs">
              <div className="flex items-center justify-between text-rose-700 mb-1">
                <span className="text-xs font-bold uppercase">Critical</span>
                <Flame className="w-4 h-4 text-rose-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-rose-800">{erMetrics.critical}</p>
            </div>

            <div className="bg-amber-50 p-4 sm:p-5 rounded-xl border border-amber-200 shadow-xs">
              <div className="flex items-center justify-between text-amber-700 mb-1">
                <span className="text-xs font-bold uppercase">High</span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-amber-800">{erMetrics.high}</p>
            </div>

            <div className="bg-blue-50 p-4 sm:p-5 rounded-xl border border-blue-200 shadow-xs">
              <div className="flex items-center justify-between text-blue-700 mb-1">
                <span className="text-xs font-bold uppercase">Urgent</span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-800">{erMetrics.urgent}</p>
            </div>

            <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-700 mb-1">
                <span className="text-xs font-bold uppercase">Normal</span>
                <CheckCircle className="w-4 h-4 text-slate-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-800">{erMetrics.normal}</p>
            </div>
          </div>
        </div>
      ) : opdMetrics ? (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Today&apos;s OPD Overview
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-xs font-semibold uppercase">Total Patients</span>
                <Users className="w-4 h-4 text-teal-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{opdMetrics.totalPatients}</p>
            </div>

            <div className="bg-amber-50 p-4 sm:p-5 rounded-xl border border-amber-200 shadow-xs">
              <div className="flex items-center justify-between text-amber-700 mb-1">
                <span className="text-xs font-bold uppercase">Waiting</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-amber-800">{opdMetrics.waiting}</p>
            </div>

            <div className="bg-blue-50 p-4 sm:p-5 rounded-xl border border-blue-200 shadow-xs">
              <div className="flex items-center justify-between text-blue-700 mb-1">
                <span className="text-xs font-bold uppercase">In Treatment</span>
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-800">{opdMetrics.inConsultation}</p>
            </div>

            <div className="bg-emerald-50 p-4 sm:p-5 rounded-xl border border-emerald-200 shadow-xs">
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <span className="text-xs font-bold uppercase">Completed</span>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-800">{opdMetrics.completed}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Patient Queue Preview Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEmergency ? "Active Emergency Queue" : "Today's Patient Queue"}
            </h2>
            <p className="text-xs text-slate-500">
              {isEmergency
                ? "Immediate triage assessment and vital sign monitoring"
                : "Record vitals and prepare patients for doctor consultation"}
            </p>
          </div>
          <Link
            href={isEmergency ? "/staff/emergency" : "/staff/opd"}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-800"
          >
            View Full Queue
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {queue.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <HeartPulse className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-700">
              {isEmergency
                ? "No emergency patients found in queue."
                : "No patients are currently waiting in OPD."}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              New arrivals will appear here once registered or checked in.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">MR Number</th>
                  {isEmergency ? (
                    <>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Chief Complaint</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3 px-4">Assigned Doctor</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Status</th>
                    </>
                  )}
                  <th className="py-3 px-4">Latest Vitals</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.map((item) => {
                  const latestVital = item.patient.vitalSigns?.[0];
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {item.patient.firstName} {item.patient.lastName}
                        </div>
                        <div className="text-xs text-slate-400">
                          {item.patient.gender} | {item.patient.bloodGroup ? item.patient.bloodGroup.replace("_", "") : ""}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700">
                        {item.patient.mrNumber || item.patient.patientNumber}
                      </td>
                      {isEmergency ? (
                        <>
                          <td className="py-3 px-4">
                            <span
                              className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full border ${
                                item.priority === "CRITICAL"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : item.priority === "HIGH"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : item.priority === "URGENT"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {item.priority || "NORMAL"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-700 max-w-xs truncate">
                            {item.chiefComplaint || "Emergency evaluation"}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4 text-xs text-slate-800">
                            {item.doctor ? `Dr. ${item.doctor.firstName} ${item.doctor.lastName}` : "General"}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            {item.department?.name || "OPD"}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                                item.status === "WAITING"
                                  ? "bg-amber-100 text-amber-800"
                                  : item.status === "IN_CONSULTATION"
                                  ? "bg-blue-100 text-blue-800"
                                  : item.status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-800"
                              }`}
                            >
                              {item.status || "WAITING"}
                            </span>
                          </td>
                        </>
                      )}
                      <td className="py-3 px-4 text-xs">
                        {latestVital ? (
                          <span className="font-mono text-slate-700">
                            {latestVital.systolicBP && latestVital.diastolicBP
                              ? `${latestVital.systolicBP}/${latestVital.diastolicBP}`
                              : ""}{" "}
                            {latestVital.pulse ? `| ${latestVital.pulse} bpm` : ""}{" "}
                            {latestVital.oxygenSaturation ? `| ${latestVital.oxygenSaturation}%` : ""}
                          </span>
                        ) : (
                          <span className="text-amber-600 font-medium text-xs">Pending Vitals</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Link
                          href={`/staff/patients/${item.patient.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 px-3 py-1.5 rounded-md border border-teal-200 transition-colors"
                        >
                          Record Vitals
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
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
