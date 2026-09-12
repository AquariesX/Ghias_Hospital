"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Calendar,
  Filter,
  Printer,
  Download,
  Eye,
  RefreshCw,
  RotateCcw,
  Users,
  Bed,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  Stethoscope,
  ArrowLeft,
  Receipt,
  FileText,
} from "lucide-react";
import GhiasHospitalLogo from "@/components/common/GhiasHospitalLogo";

interface DayEndReportData {
  reportHeader: {
    hospitalNameUrdu: string;
    hospitalNameEnglish: string;
    registrationNumber: string;
    reportTitle: string;
    reportDate: string;
    generatedAt: string;
    generatedByName: string;
    filtersApplied: {
      departmentId: string;
      doctorId: string;
      admissionSource: string;
      status: string;
    };
  };
  patientSummary: {
    totalUniquePatients: number;
    totalAppointments: number;
    totalAdmissions: number;
    totalDischarges: number;
  };
  financialSummary: {
    totalFees: number;
    appointmentFees: number;
    admissionFees: number;
    totalExpenses: number;
    netTotal: number;
  };
  doctorBreakdown: Array<{
    doctorName: string;
    specialization: string;
    appointmentCount: number;
    admissionCount: number;
    revenue: number;
  }>;
  departmentBreakdown: Array<{
    departmentName: string;
    visitCount: number;
    revenue: number;
  }>;
  expenseCategoryBreakdown: Array<{
    category: string;
    count: number;
    totalAmount: number;
  }>;
  itemizedLedger: {
    appointments: Array<{
      id: string;
      tokenNumber: number | null;
      appointmentNumber: string;
      time: string;
      patientName: string;
      mrNumber: string | null;
      doctorName: string;
      departmentName: string;
      type: string;
      status: string;
      fee: number;
    }>;
    admissions: Array<{
      id: string;
      admissionNumber: string;
      time: string | null;
      patientName: string;
      mrNumber: string | null;
      doctorName: string;
      roomBed: string;
      source: string;
      status: string;
      fee: number;
    }>;
    discharges: Array<{
      id: string;
      admissionNumber: string;
      patientName: string;
      mrNumber: string | null;
      doctorName: string;
      admissionDate: string;
      dischargeDate: string;
      stayDays: number;
    }>;
    expenses: Array<{
      id: string;
      title: string;
      amount: number;
      category: string;
      date: string;
      addedByName: string;
    }>;
  };
}

export default function DayEndReportClient() {
  const [reportDate, setReportDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Server-side filters
  const [departmentId, setDepartmentId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [admissionSource, setAdmissionSource] = useState("");
  const [status, setStatus] = useState("");

  // Metadata dropdowns
  const [departmentsList, setDepartmentsList] = useState<Array<{ id: string; name: string }>>([]);
  const [doctorsList, setDoctorsList] = useState<Array<{ id: string; name: string }>>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reportData, setReportData] = useState<DayEndReportData | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);

  // Load department and doctor lists
  useEffect(() => {
    async function loadMeta() {
      try {
        const res = await fetch("/api/appointments/departments");
        if (res.ok) {
          const data = await res.json();
          const depts = data.departments || [];
          setDepartmentsList(depts.map((d: any) => ({ id: d.id, name: d.name })));

          const docs: Array<{ id: string; name: string }> = [];
          for (const d of depts) {
            for (const doc of d.doctors || []) {
              if (!docs.some((x) => x.id === doc.id)) {
                docs.push({ id: doc.id, name: `Dr. ${doc.firstName} ${doc.lastName}` });
              }
            }
          }
          setDoctorsList(docs);
        }
      } catch (e) {
        console.error("Failed to load departments:", e);
      }
    }
    loadMeta();
  }, []);

  const fetchDayEndReport = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams({ date: reportDate });
      if (departmentId) params.set("departmentId", departmentId);
      if (doctorId) params.set("doctorId", doctorId);
      if (admissionSource) params.set("admissionSource", admissionSource);
      if (status) params.set("status", status);

      const res = await fetch(`/api/admin/reports/day-end?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load Day End Report");
      }

      const data = await res.json();
      setReportData(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load Day End Report");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDayEndReport();
  }, []);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDayEndReport();
  };

  const handleReset = () => {
    setReportDate(new Date().toISOString().split("T")[0]);
    setDepartmentId("");
    setDoctorId("");
    setAdmissionSource("");
    setStatus("");
    setTimeout(() => fetchDayEndReport(), 0);
  };

  const handlePrint = () => {
    window.print();
  };

  // Prepare combined patient records list
  const combinedPatientsList = reportData
    ? [
        ...reportData.itemizedLedger.appointments.map((a) => ({
          id: `apt-${a.id}`,
          token: a.tokenNumber ? `#${a.tokenNumber}` : a.appointmentNumber,
          time: a.time,
          patientName: a.patientName,
          mrNumber: a.mrNumber,
          doctorName: a.doctorName,
          department: a.departmentName,
          type: `OPD (${a.type})`,
          isAdmission: false,
          status: a.status,
          fee: a.fee,
        })),
        ...reportData.itemizedLedger.admissions.map((adm) => ({
          id: `adm-${adm.id}`,
          token: adm.admissionNumber,
          time: adm.time || "—",
          patientName: adm.patientName,
          mrNumber: adm.mrNumber,
          doctorName: adm.doctorName,
          department: adm.roomBed || "Inpatient Ward",
          type: `Inpatient (${adm.source})`,
          isAdmission: true,
          status: adm.status,
          fee: adm.fee,
        })),
      ]
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-day-end-report,
          #printable-day-end-report * {
            visibility: visible !important;
          }
          #printable-day-end-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 210mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header Bar (Hidden during print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-700 uppercase tracking-wider">
            <Link href="/admin/reports" className="hover:underline">
              Reports &amp; Intelligence
            </Link>
            <span>•</span>
            <span>Day End Audit</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
            Day End Closing &amp; Financial Report
          </h1>
          <p className="text-xs text-slate-500">
            Official daily hospital closing ledger with real-time PostgreSQL database aggregations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchDayEndReport}
            disabled={isLoading}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={!reportData || isLoading}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition inline-flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report (A4)</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (Hidden during print) */}
      <form
        onSubmit={handleApplyFilter}
        className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span>Day End Filter Options</span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Today</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Closing Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Closing Date</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 font-bold bg-white"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Department</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="">All Departments</option>
              {departmentsList.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Doctor */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Doctor</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="">All Doctors</option>
              {doctorsList.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Admission Source */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Admission Source</label>
            <select
              value={admissionSource}
              onChange={(e) => setAdmissionSource(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="">All Sources</option>
              <option value="OPD">OPD Clinic</option>
              <option value="EMERGENCY">Emergency Dept</option>
              <option value="REFERRAL">External Referral</option>
              <option value="DIRECT">Direct Admission</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="ADMITTED">Admitted</option>
              <option value="DISCHARGED">Discharged</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer inline-flex items-center gap-2"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Generate Day End Report</span>
          </button>
        </div>
      </form>

      {/* Error display */}
      {errorMessage && (
        <div className="no-print p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-bold">
          {errorMessage}
        </div>
      )}

      {/* Printable A4 Report Document Container */}
      {isLoading ? (
        <div className="bg-white p-16 rounded-2xl border border-slate-200 shadow-xs text-center space-y-2">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-600" />
          <p className="text-sm font-bold text-slate-700">Aggregating Day End PostgreSQL Ledgers...</p>
          <p className="text-xs text-slate-500">Calculating patient summary, revenue, and expenses.</p>
        </div>
      ) : !reportData ? (
        <div className="bg-white p-12 text-center text-slate-500 rounded-2xl border border-slate-200">
          No report generated.
        </div>
      ) : (
        <div
          id="printable-day-end-report"
          ref={reportRef}
          className="bg-white text-slate-950 max-w-[210mm] mx-auto p-[10mm_12mm] shadow-lg print:shadow-none border border-slate-200 print:border-none rounded-xl print:rounded-none font-sans space-y-5 text-[12px] leading-relaxed"
        >
          {/* =========================================================================
              1. OFFICIAL HOSPITAL HEADER: LOGO, NAME, ADDRESS, REG NO.
             ========================================================================= */}
          <div className="border-b-2 border-slate-900 pb-4 text-center">
            <div className="flex flex-col items-center justify-center">
              {/* Hospital Center Emblem / Logo */}
              <div className="mb-2">
                <GhiasHospitalLogo size={70} />
              </div>

              {/* Urdu Hospital Title */}
              <div
                className="text-xl font-bold text-slate-900 font-serif leading-tight"
                style={{
                  fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif",
                }}
              >
                غیاث ہسپتال پھالیہ
              </div>

              {/* English Hospital Name */}
              <h1 className="text-2xl font-black text-slate-950 tracking-wider uppercase font-serif mt-0.5">
                {reportData.reportHeader.hospitalNameEnglish}
              </h1>

              {/* Official Registration Number */}
              <div className="text-xs font-bold text-slate-800 tracking-widest mt-0.5">
                {reportData.reportHeader.registrationNumber}
              </div>

              {/* Address & Official Contact */}
              <p className="text-[11px] text-slate-600 font-medium mt-1">
                Main Gujrat Road, Phalia, Mandi Bahauddin • Phone: 0546-566567 / 0346-4949577
              </p>

              {/* Report Title Badge */}
              <div className="mt-2.5 inline-block px-4 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-black uppercase tracking-wider text-slate-900">
                {reportData.reportHeader.reportTitle}
              </div>
            </div>

            {/* Scope / Metadata Sub-bar */}
            <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-700 px-1">
              <div>
                <strong>Closing Date:</strong>{" "}
                <span className="font-bold underline text-slate-950">
                  {reportData.reportHeader.reportDate}
                </span>
                {reportData.reportHeader.filtersApplied.departmentId !== "ALL" && (
                  <span className="ml-3">
                    <strong>Dept:</strong> {reportData.reportHeader.filtersApplied.departmentId}
                  </span>
                )}
                {reportData.reportHeader.filtersApplied.doctorId !== "ALL" && (
                  <span className="ml-3">
                    <strong>Doctor:</strong> {reportData.reportHeader.filtersApplied.doctorId}
                  </span>
                )}
              </div>
              <div>
                <strong>Generated:</strong>{" "}
                {new Date(reportData.reportHeader.generatedAt).toLocaleString("en-US")} •{" "}
                <strong>By:</strong> {reportData.reportHeader.generatedByName}
              </div>
            </div>
          </div>

          {/* =========================================================================
              2. LIST OF THE PATIENTS (OPD TOKENS + INPATIENT ADMISSIONS)
             ========================================================================= */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <h2 className="text-xs font-black text-slate-950 uppercase tracking-wide flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-800" />
                <span>List of Patients ({combinedPatientsList.length} Records)</span>
              </h2>
              <span className="text-[10px] text-slate-500 font-medium">
                OPD Tokens &amp; Inpatients for {reportData.reportHeader.reportDate}
              </span>
            </div>

            {combinedPatientsList.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs italic bg-slate-50 rounded border border-slate-200">
                No patient visits or admissions recorded for this closing date.
              </div>
            ) : (
              <table className="w-full text-left text-[11px] border border-slate-300">
                <thead className="bg-slate-100 text-slate-800 font-black text-[10px] uppercase border-b border-slate-300">
                  <tr>
                    <th className="py-1.5 px-2 border-r border-slate-300 w-12 text-center">Token #</th>
                    <th className="py-1.5 px-2 border-r border-slate-300">Patient Name</th>
                    <th className="py-1.5 px-2 border-r border-slate-300 w-24">MR #</th>
                    <th className="py-1.5 px-2 border-r border-slate-300">Doctor / Department</th>
                    <th className="py-1.5 px-2 border-r border-slate-300 w-28 text-center">Visit Type</th>
                    <th className="py-1.5 px-2 border-r border-slate-300 w-20 text-center">Status</th>
                    <th className="py-1.5 px-2 text-right w-24">Fee (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {combinedPatientsList.map((p, idx) => (
                    <tr key={p.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                      <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono font-bold">
                        {p.token}
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200 font-bold text-slate-900">
                        {p.patientName}
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200 font-mono text-[10px] text-slate-700">
                        {p.mrNumber || "—"}
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200 text-slate-800">
                        <div className="font-semibold">{p.doctorName}</div>
                        <div className="text-[9.5px] text-slate-500">{p.department}</div>
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[9.5px] font-bold rounded ${
                            p.isAdmission
                              ? "bg-indigo-50 text-indigo-800 border border-indigo-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {p.type}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200 text-center text-[10px] font-semibold">
                        <span
                          className={
                            p.status === "COMPLETED" || p.status === "ADMITTED"
                              ? "text-emerald-700 font-bold"
                              : "text-slate-600"
                          }
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-right font-mono font-black text-emerald-900">
                        {p.fee.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
                  <tr>
                    <td colSpan={6} className="py-2 px-2 text-right uppercase text-xs text-slate-800">
                      Subtotal Patient Fees Collected:
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-xs font-black text-emerald-900">
                      PKR {reportData.financialSummary.totalFees.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* =========================================================================
              3. BELOW PATIENT LIST: TOTAL, EXPENSES, NET TOTAL, ETC.
             ========================================================================= */}
          <div className="border-2 border-slate-800 rounded-lg p-4 bg-slate-50/60 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2">
              <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-700" />
                <span>Financial &amp; Closing Summary</span>
              </h3>
              <span className="text-[10.5px] text-slate-500 font-medium">
                Direct PostgreSQL Aggregations
              </span>
            </div>

            {/* 4 Financial Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
              {/* Total Fees */}
              <div className="bg-white p-3 rounded-md border border-slate-300 shadow-xs">
                <div className="text-[10.5px] font-bold text-slate-500 uppercase">Total Fees (Revenue)</div>
                <div className="text-lg font-black text-emerald-800 font-mono mt-0.5">
                  PKR {reportData.financialSummary.totalFees.toLocaleString()}
                </div>
                <div className="text-[9.5px] text-slate-500 mt-0.5">
                  OPD: PKR {reportData.financialSummary.appointmentFees.toLocaleString()} • Adm: PKR{" "}
                  {reportData.financialSummary.admissionFees.toLocaleString()}
                </div>
              </div>

              {/* Total Expenses */}
              <div className="bg-white p-3 rounded-md border border-slate-300 shadow-xs">
                <div className="text-[10.5px] font-bold text-slate-500 uppercase">Total Expenses</div>
                <div className="text-lg font-black text-rose-700 font-mono mt-0.5">
                  PKR {reportData.financialSummary.totalExpenses.toLocaleString()}
                </div>
                <div className="text-[9.5px] text-slate-500 mt-0.5">
                  {reportData.expenseCategoryBreakdown.reduce((acc, c) => acc + c.count, 0)} recorded voucher(s)
                </div>
              </div>

              {/* Net Total */}
              <div className="bg-white p-3 rounded-md border-2 border-slate-900 bg-emerald-50/30 shadow-xs">
                <div className="text-[10.5px] font-black text-slate-950 uppercase">Net Total</div>
                <div
                  className={`text-lg font-black font-mono mt-0.5 ${
                    reportData.financialSummary.netTotal >= 0 ? "text-slate-950" : "text-rose-700"
                  }`}
                >
                  PKR {reportData.financialSummary.netTotal.toLocaleString()}
                </div>
                <div className="text-[9.5px] text-slate-600 font-semibold mt-0.5">
                  Revenue minus Expenses
                </div>
              </div>

              {/* Total Patients */}
              <div className="bg-white p-3 rounded-md border border-slate-300 shadow-xs">
                <div className="text-[10.5px] font-bold text-slate-500 uppercase">Total Patients</div>
                <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                  {reportData.patientSummary.totalUniquePatients}
                </div>
                <div className="text-[9.5px] text-slate-500 mt-0.5">
                  {reportData.patientSummary.totalAppointments} OPD • {reportData.patientSummary.totalAdmissions} Inpatient
                </div>
              </div>
            </div>

            {/* Expenses Breakdown if any */}
            {reportData.expenseCategoryBreakdown.length > 0 && (
              <div className="pt-2 border-t border-slate-200">
                <div className="text-[10.5px] font-bold text-slate-800 uppercase mb-1.5 flex items-center justify-between">
                  <span>Operational Expense Categories:</span>
                  <span className="font-mono text-rose-700 font-black">
                    Total: PKR {reportData.financialSummary.totalExpenses.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {reportData.expenseCategoryBreakdown.map((cat, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-1.5 rounded border border-slate-200 text-[10.5px] flex justify-between items-center"
                    >
                      <span className="font-semibold text-slate-700">{cat.category}:</span>
                      <span className="font-mono font-bold text-rose-700">
                        PKR {cat.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section: Doctor & Department Revenue Breakdowns (Compact dual-column) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* By Doctor */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-1.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-1 flex items-center justify-between">
                <span>Revenue by Doctor</span>
                <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
              </h3>
              {reportData.doctorBreakdown.length === 0 ? (
                <div className="text-[11px] text-slate-400 italic py-2">No doctor consultations on this date</div>
              ) : (
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="text-slate-500 font-semibold border-b border-slate-200">
                      <th className="py-1">Doctor Name</th>
                      <th className="py-1 text-center">Visits</th>
                      <th className="py-1 text-right">Fee (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.doctorBreakdown.map((doc, idx) => (
                      <tr key={idx}>
                        <td className="py-1 font-medium text-slate-800">
                          {doc.doctorName}
                          <div className="text-[9.5px] text-slate-400">{doc.specialization}</div>
                        </td>
                        <td className="py-1 text-center font-mono">{doc.appointmentCount + doc.admissionCount}</td>
                        <td className="py-1 text-right font-mono font-bold text-emerald-800">
                          {doc.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* By Department */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-1.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-1 flex items-center justify-between">
                <span>Visits by Department</span>
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
              </h3>
              {reportData.departmentBreakdown.length === 0 ? (
                <div className="text-[11px] text-slate-400 italic py-2">No department entries on this date</div>
              ) : (
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="text-slate-500 font-semibold border-b border-slate-200">
                      <th className="py-1">Department</th>
                      <th className="py-1 text-center">Visits</th>
                      <th className="py-1 text-right">Revenue (PKR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.departmentBreakdown.map((dept, idx) => (
                      <tr key={idx}>
                        <td className="py-1 font-medium text-slate-800">{dept.departmentName}</td>
                        <td className="py-1 text-center font-mono">{dept.visitCount}</td>
                        <td className="py-1 text-right font-mono font-bold text-emerald-800">
                          {dept.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* =========================================================================
              4. OFFICIAL SIGNATURES & CLOSING STAMP
             ========================================================================= */}
          <div className="pt-8 border-t-2 border-slate-300 grid grid-cols-3 gap-4 text-center text-[11px]">
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1 font-mono font-bold text-slate-800">
                {reportData.reportHeader.generatedByName}
              </div>
              <div className="text-[10.5px] text-slate-500 font-semibold uppercase">Accounts Officer / Cashier</div>
            </div>
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1 font-mono text-transparent select-none">
                .......................................
              </div>
              <div className="text-[10.5px] text-slate-500 font-semibold uppercase">Medical Superintendent</div>
            </div>
            <div>
              <div className="border-b border-slate-400 pb-1 mb-1 font-mono text-transparent select-none">
                .......................................
              </div>
              <div className="text-[10.5px] text-slate-500 font-semibold uppercase">Hospital Administrator / Stamp</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
