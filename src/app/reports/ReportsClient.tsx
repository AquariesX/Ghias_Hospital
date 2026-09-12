"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  Users,
  Bed,
  CheckCircle2,
  Calendar,
  Activity,
  ShieldAlert,
  Printer,
  RefreshCw,
  Clock,
  Filter,
  Receipt,
  FileText,
} from "lucide-react";

type ReportType =
  | "patients"
  | "admissions"
  | "discharges"
  | "appointments"
  | "clinical"
  | "audit";

export default function ReportsClient() {
  const [activeType, setActiveType] = useState<ReportType>("patients");
  const [dateRange, setDateRange] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchReport = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/reports?type=${activeType}&dateRange=${dateRange}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load report data");
      }
      setReportData(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeType, dateRange]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header & Print Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-teal-100 text-teal-800 rounded-lg">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Hospital Intelligence &amp; Clinical Reports
              </h1>
              <p className="text-xs text-slate-500">
                Official real-time analytics querying live PostgreSQL clinical database
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/reports/day-end"
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-xs rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Day End Report</span>
          </Link>
          <Link
            href="/admin/reports/patient-report"
            className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold text-xs rounded-lg transition inline-flex items-center gap-1.5 shadow-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Patient Report</span>
          </Link>
          <button
            type="button"
            onClick={fetchReport}
            disabled={isLoading}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition inline-flex items-center gap-2 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Overview</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs flex flex-wrap gap-1 text-xs font-semibold">
        {[
          { key: "patients", label: "Patient Demographics", icon: Users },
          { key: "admissions", label: "Ward Admissions", icon: Bed },
          { key: "discharges", label: "Discharge & Stay", icon: CheckCircle2 },
          { key: "appointments", label: "Appointments & OPD", icon: Calendar },
          { key: "clinical", label: "Clinical Activity", icon: Activity },
          { key: "audit", label: "System Audit Logs", icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeType === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveType(tab.key as ReportType)}
              className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition ${
                isActive
                  ? "bg-teal-700 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-700">Time Filter:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
            <option value="all">All Time Records</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>
        </div>

        <div className="text-[11px] text-slate-400">
          Source: <span className="font-mono text-slate-600 font-semibold">PostgreSQL</span> • Live Query
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
          {errorMessage}
        </div>
      )}

      {/* Loading state */}
      {isLoading && !reportData ? (
        <div className="p-16 text-center text-xs text-slate-400 space-y-3">
          <div className="w-6 h-6 border-2 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Compiling database report...</p>
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          {activeType === "patients" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Patients</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">{reportData.summary.total}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Registered in system</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider block">Active Care</span>
                <p className="text-2xl font-bold text-teal-800 mt-1">{reportData.summary.active}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Under outpatient / inpatient care</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider block">Critical</span>
                <p className="text-2xl font-bold text-rose-700 mt-1">{reportData.summary.critical}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Requiring emergency attention</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Discharged</span>
                <p className="text-2xl font-bold text-slate-700 mt-1">{reportData.summary.discharged}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Completed hospital course</p>
              </div>
            </div>
          )}

          {activeType === "admissions" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Admissions</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">{reportData.summary.total}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider block">Admitted &amp; In Ward</span>
                <p className="text-2xl font-bold text-teal-800 mt-1">{reportData.summary.admitted}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider block">Discharge Pending</span>
                <p className="text-2xl font-bold text-amber-700 mt-1">{reportData.summary.dischargePending}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider block">Discharged</span>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{reportData.summary.discharged}</p>
              </div>
            </div>
          )}

          {activeType === "discharges" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Discharged</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">{reportData.summary.total}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Patients safely completed care</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider block">Average Length of Stay</span>
                <p className="text-2xl font-bold text-teal-800 mt-1">{reportData.summary.averageStayDays} <span className="text-sm font-normal text-slate-500">days</span></p>
                <p className="text-[11px] text-slate-400 mt-0.5">Inpatient bed duration</p>
              </div>
            </div>
          )}

          {activeType === "appointments" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Booked</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">{reportData.summary.total}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider block">Completed</span>
                <p className="text-2xl font-bold text-emerald-800 mt-1">{reportData.summary.completed}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider block">Waiting in Queue</span>
                <p className="text-2xl font-bold text-blue-800 mt-1">{reportData.summary.waiting}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider block">No Show / Missed</span>
                <p className="text-2xl font-bold text-rose-700 mt-1">{reportData.summary.noShow}</p>
              </div>
            </div>
          )}

          {activeType === "clinical" && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Consultations</span>
                <p className="text-xl font-bold text-slate-900 mt-1">{reportData.summary.consultations}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider block">Vitals Logged</span>
                <p className="text-xl font-bold text-teal-800 mt-1">{reportData.summary.vitalsRecorded}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-purple-600 tracking-wider block">Prescriptions</span>
                <p className="text-xl font-bold text-purple-800 mt-1">{reportData.summary.prescriptions}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider block">Med Admin (MAR)</span>
                <p className="text-xl font-bold text-emerald-800 mt-1">{reportData.summary.medicationsAdministered}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider block">Nursing Notes</span>
                <p className="text-xl font-bold text-blue-800 mt-1">{reportData.summary.nursingNotes}</p>
              </div>
            </div>
          )}

          {activeType === "audit" && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total System Audit Events</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{reportData.summary.total}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {reportData.summary.topActions?.map((act: any) => (
                  <span key={act.label} className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700">
                    {act.label}: <span className="font-bold text-slate-900">{act.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Data Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Detailed Activity Records ({reportData.data?.length || 0})
              </h3>
            </div>

            {reportData.data?.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400 italic">No records found matching current criteria.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                      {activeType === "patients" && (
                        <>
                          <th className="px-4 py-3">Patient Name</th>
                          <th className="px-4 py-3">MR # / Patient #</th>
                          <th className="px-4 py-3">Gender</th>
                          <th className="px-4 py-3">Blood Group</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Registered At</th>
                        </>
                      )}
                      {activeType === "admissions" && (
                        <>
                          <th className="px-4 py-3">Admission #</th>
                          <th className="px-4 py-3">Patient</th>
                          <th className="px-4 py-3">Source</th>
                          <th className="px-4 py-3">Attending Doctor</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Admission Date</th>
                        </>
                      )}
                      {activeType === "discharges" && (
                        <>
                          <th className="px-4 py-3">Admission #</th>
                          <th className="px-4 py-3">Patient</th>
                          <th className="px-4 py-3">Doctor</th>
                          <th className="px-4 py-3">Stay (Days)</th>
                          <th className="px-4 py-3">Final Diagnosis</th>
                          <th className="px-4 py-3">Discharge Date</th>
                        </>
                      )}
                      {activeType === "appointments" && (
                        <>
                          <th className="px-4 py-3">Appointment #</th>
                          <th className="px-4 py-3">Patient</th>
                          <th className="px-4 py-3">Doctor / Dept</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Date &amp; Time</th>
                        </>
                      )}
                      {activeType === "clinical" && (
                        <>
                          <th className="px-4 py-3">Consultation #</th>
                          <th className="px-4 py-3">Patient</th>
                          <th className="px-4 py-3">Consultant</th>
                          <th className="px-4 py-3">Diagnosis</th>
                          <th className="px-4 py-3">Date</th>
                        </>
                      )}
                      {activeType === "audit" && (
                        <>
                          <th className="px-4 py-3">Action</th>
                          <th className="px-4 py-3">Entity</th>
                          <th className="px-4 py-3">User</th>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Timestamp</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.data.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        {activeType === "patients" && (
                          <>
                            <td className="px-4 py-3 font-semibold text-slate-900">{row.firstName} {row.lastName}</td>
                            <td className="px-4 py-3 font-mono text-teal-700 font-medium">{row.mrNumber || row.patientNumber}</td>
                            <td className="px-4 py-3 text-slate-600">{row.gender}</td>
                            <td className="px-4 py-3 text-slate-600">{row.bloodGroup?.replace("_", " ")}</td>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">{row.status}</span></td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{new Date(row.createdAt).toLocaleDateString()}</td>
                          </>
                        )}
                        {activeType === "admissions" && (
                          <>
                            <td className="px-4 py-3 font-mono font-bold text-teal-700">{row.admissionNumber}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900">{row.patient?.firstName} {row.patient?.lastName}</td>
                            <td className="px-4 py-3 text-slate-600">{row.admissionSource}</td>
                            <td className="px-4 py-3 text-slate-600">{row.doctor ? `Dr. ${row.doctor.firstName} ${row.doctor.lastName}` : "On-Call"}</td>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">{row.status}</span></td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{new Date(row.admissionDate).toLocaleDateString()}</td>
                          </>
                        )}
                        {activeType === "discharges" && (
                          <>
                            <td className="px-4 py-3 font-mono font-bold text-teal-700">{row.admissionNumber}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900">{row.patientName}</td>
                            <td className="px-4 py-3 text-slate-600">{row.doctorName}</td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-800">{row.stayDays} days</td>
                            <td className="px-4 py-3 text-slate-700">{row.finalDiagnosis}</td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{new Date(row.dischargeDate).toLocaleDateString()}</td>
                          </>
                        )}
                        {activeType === "appointments" && (
                          <>
                            <td className="px-4 py-3 font-mono font-bold text-teal-700">{row.appointmentNumber}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900">{row.patient?.firstName} {row.patient?.lastName}</td>
                            <td className="px-4 py-3 text-slate-600">Dr. {row.doctor?.firstName} {row.doctor?.lastName} ({row.department?.name})</td>
                            <td className="px-4 py-3 text-slate-600">{row.appointmentType}</td>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">{row.status}</span></td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{new Date(row.appointmentDate).toLocaleDateString()} {row.appointmentTime}</td>
                          </>
                        )}
                        {activeType === "clinical" && (
                          <>
                            <td className="px-4 py-3 font-mono font-bold text-teal-700">{row.consultationNumber || row.id.slice(0, 8)}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900">{row.patient?.firstName} {row.patient?.lastName}</td>
                            <td className="px-4 py-3 text-slate-600">Dr. {row.doctor?.firstName} {row.doctor?.lastName}</td>
                            <td className="px-4 py-3 text-slate-700">{row.diagnosis || "—"}</td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{new Date(row.consultationDate).toLocaleDateString()}</td>
                          </>
                        )}
                        {activeType === "audit" && (
                          <>
                            <td className="px-4 py-3 font-bold text-slate-900">{row.action}</td>
                            <td className="px-4 py-3 text-slate-600">{row.entity}</td>
                            <td className="px-4 py-3 text-slate-700">{row.userName || "System"}</td>
                            <td className="px-4 py-3 text-slate-500">{row.userRole || "—"}</td>
                            <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">{new Date(row.timestamp).toLocaleString()}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
