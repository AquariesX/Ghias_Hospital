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
    serviceBreakdown?: {
      opdFees: number;
      ultrasoundFees: number;
      xrayFees: number;
      labFees: number;
      admissionFees: number;
    };
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
      dateTime?: string;
      time: string;
      patientName: string;
      contactNo?: string;
      mrNumber: string | null;
      doctorName: string;
      departmentName: string;
      serviceCategory?: "OPD" | "ULTRASOUND" | "XRAY" | "LAB_TEST";
      serviceLabel?: string;
      reason?: string | null;
      appointmentType?: string;
      type: string;
      status: string;
      fee: number;
    }>;
    admissions: Array<{
      id: string;
      admissionNumber: string;
      dateTime?: string;
      time: string | null;
      patientName: string;
      contactNo?: string;
      mrNumber: string | null;
      doctorName: string;
      departmentName: string;
      serviceCategory?: string;
      serviceLabel?: string;
      appointmentType?: string;
      type?: string;
      roomBed?: string;
      source?: string;
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
  const [reportTitleCustom, setReportTitleCustom] = useState<string>("Day End Report");
  const [activeView, setActiveView] = useState<"SLIP" | "EXECUTIVE">("SLIP");
  const [printTimestamp, setPrintTimestamp] = useState<string>("");

  useEffect(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const year = now.getFullYear();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    setPrintTimestamp(`${month}/${day}/${year} ${hours}:${minutes}:${seconds} ${ampm}`);
  }, [reportData]);

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
        ...reportData.itemizedLedger.appointments.map((a) => {
          const displayType = a.appointmentType || a.type || "OPD";
          return {
            id: `apt-${a.id}`,
            mrNumber: a.mrNumber || "—",
            dateTime: a.dateTime || `${reportData.reportHeader.reportDate} ${a.time}`,
            doctorName: a.doctorName,
            patientName: a.patientName,
            contactNo: a.contactNo || "0",
            appointmentType: displayType,
            serviceCategory: a.serviceCategory || "OPD",
            isAdmission: false,
            status: a.status,
            fee: Number(a.fee || 0),
          };
        }),
        ...reportData.itemizedLedger.admissions.map((adm) => ({
          id: `adm-${adm.id}`,
          mrNumber: adm.mrNumber || "—",
          dateTime: adm.dateTime || `${reportData.reportHeader.reportDate} ${adm.time || "00:00:00"}`,
          doctorName: adm.doctorName,
          patientName: adm.patientName,
          contactNo: adm.contactNo || "0",
          appointmentType: adm.appointmentType || adm.type || "Admission",
          serviceCategory: "ADMISSION",
          isAdmission: true,
          status: adm.status,
          fee: Number(adm.fee || 0),
        })),
      ].sort((a, b) => (a.dateTime || "").localeCompare(b.dateTime || ""))
    : [];

  const totalFeeCollected = combinedPatientsList.reduce((acc, p) => acc + (p.fee || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
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
            max-width: 100% !important;
            margin: 0 !important;
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
      <div className="no-print flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
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
            Official daily hospital closing ledger matching hospital paper slip format.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Title Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setReportTitleCustom("Day End Report")}
              className={`px-2.5 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                reportTitleCustom === "Day End Report" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Day End Report
            </button>
            <button
              type="button"
              onClick={() => setReportTitleCustom("Test Report")}
              className={`px-2.5 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                reportTitleCustom === "Test Report" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Test Report
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setActiveView("SLIP")}
              className={`px-2.5 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                activeView === "SLIP" ? "bg-teal-700 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Slip Template (Photo)
            </button>
            <button
              type="button"
              onClick={() => setActiveView("EXECUTIVE")}
              className={`px-2.5 py-1.5 rounded-md font-semibold transition cursor-pointer ${
                activeView === "EXECUTIVE" ? "bg-teal-700 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Closing Analytics
            </button>
          </div>

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
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Closing Date
            </label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-xs"
            >
              <option value="">All Departments</option>
              {departmentsList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Doctor
            </label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-xs"
            >
              <option value="">All Doctors</option>
              {doctorsList.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Admission Source
            </label>
            <select
              value={admissionSource}
              onChange={(e) => setAdmissionSource(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-xs"
            >
              <option value="">All Sources</option>
              <option value="OPD">OPD</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="REFERRAL">Referral</option>
              <option value="DIRECT">Direct</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
            >
              {isLoading ? "Loading..." : "Filter Report"}
            </button>
          </div>
        </div>
      </form>

      {/* Screen KPIs Bar (Always visible on screen, hidden when printing) */}
      {reportData && (
        <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Patients</span>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
              {combinedPatientsList.length}
            </div>
            <span className="text-[10.5px] text-slate-400">Tokens &amp; Admissions</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Fees Collected</span>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-0.5">
              PKR {totalFeeCollected.toLocaleString()}
            </div>
            <span className="text-[10.5px] text-slate-400">
              OPD, Diagnostics &amp; Inpatient
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Expenses</span>
            <div className="text-xl font-bold font-mono text-rose-700 mt-0.5">
              PKR {reportData.financialSummary.totalExpenses.toLocaleString()}
            </div>
            <span className="text-[10.5px] text-slate-400">
              {reportData.expenseCategoryBreakdown.reduce((acc, c) => acc + c.count, 0)} voucher(s)
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Net Day Total</span>
            <div className={`text-xl font-bold font-mono mt-0.5 ${reportData.financialSummary.netTotal >= 0 ? "text-slate-900" : "text-rose-700"}`}>
              PKR {reportData.financialSummary.netTotal.toLocaleString()}
            </div>
            <span className="text-[10.5px] text-slate-400">Revenue minus Expenses</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="no-print bg-rose-50 border border-rose-200 p-4 rounded-xl text-rose-800 text-xs font-semibold">
          {errorMessage}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !reportData ? (
        <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-200 animate-pulse">
          Generating Day End Report...
        </div>
      ) : !reportData ? (
        <div className="bg-white p-12 text-center text-slate-500 rounded-2xl border border-slate-200">
          No report generated.
        </div>
      ) : (
        <>
          {/* =========================================================================
              EXACT PRINTABLE DAY-END REPORT (MATCHING USER'S PHOTO TEMPLATE)
             ========================================================================= */}
          <div
            id="printable-day-end-report"
            ref={reportRef}
            className={`bg-white text-black max-w-[210mm] mx-auto p-4 sm:p-6 print:p-0 shadow-lg print:shadow-none border border-slate-300 print:border-none font-sans ${
              activeView === "SLIP" ? "block" : "hidden print:block"
            }`}
          >
            {/* Top Bar: Page number left, Urdu centered, Print Timestamp right */}
            <div className="relative mb-2 pb-1 border-b border-black">
              {/* Page number on top left */}
              <div className="absolute left-0 top-0 text-[11px] font-mono text-black font-semibold">
                1
              </div>

              {/* Print timestamp on top right */}
              <div className="absolute right-0 top-0 text-[11px] font-mono text-black font-medium">
                {printTimestamp || new Date().toLocaleString()}
              </div>

              {/* Urdu Title & Subtitle centered */}
              <div className="text-center pt-0.5">
                <h1
                  className="text-2xl sm:text-3xl font-black text-black leading-none tracking-normal"
                  style={{
                    fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif",
                  }}
                >
                  غیاث ہسپتال
                </h1>
                <div className="text-xs sm:text-sm font-bold text-black mt-1 tracking-wider uppercase">
                  {reportTitleCustom}
                </div>
              </div>
            </div>

            {/* Exact 7-Column Table matching photo */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-black text-[10.5px] leading-tight text-black">
                <thead>
                  <tr className="bg-transparent text-black">
                    <th className="border border-black px-1.5 py-1 text-left font-bold w-[9%] whitespace-nowrap">
                      MR no
                    </th>
                    <th className="border border-black px-1.5 py-1 text-left font-bold w-[20%] whitespace-nowrap">
                      Date/Time
                    </th>
                    <th className="border border-black px-1.5 py-1 text-left font-bold w-[18%]">
                      Doctor name
                    </th>
                    <th className="border border-black px-1.5 py-1 text-left font-bold w-[18%]">
                      Patient Name
                    </th>
                    <th className="border border-black px-1.5 py-1 text-left font-bold w-[12%]">
                      Contact no
                    </th>
                    <th className="border border-black px-1.5 py-1 text-left font-bold w-[14%]">
                      appointment type
                    </th>
                    <th className="border border-black px-1.5 py-1 text-right font-bold w-[9%]">
                      Fee
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {combinedPatientsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border border-black py-8 text-center text-slate-500 italic">
                        No patient visits or admissions recorded for this closing date.
                      </td>
                    </tr>
                  ) : (
                    combinedPatientsList.map((p) => (
                      <tr key={p.id} className="text-black">
                        <td className="border border-black px-1.5 py-0.5 font-mono text-left whitespace-nowrap">
                          {p.mrNumber}
                        </td>
                        <td className="border border-black px-1.5 py-0.5 font-mono text-left whitespace-nowrap">
                          {p.dateTime}
                        </td>
                        <td className="border border-black px-1.5 py-0.5 text-left truncate max-w-[150px]">
                          {p.doctorName}
                        </td>
                        <td className="border border-black px-1.5 py-0.5 text-left font-medium truncate max-w-[150px]">
                          {p.patientName}
                        </td>
                        <td className="border border-black px-1.5 py-0.5 font-mono text-left whitespace-nowrap">
                          {p.contactNo}
                        </td>
                        <td className="border border-black px-1.5 py-0.5 text-left truncate max-w-[140px]">
                          {p.appointmentType}
                        </td>
                        <td className="border border-black px-1.5 py-0.5 text-right font-mono font-medium">
                          {p.fee}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-black font-bold text-black">
                    <td colSpan={2} className="border border-black px-1.5 py-1 font-mono font-bold text-left">
                      {combinedPatientsList.length} Total
                    </td>
                    <td colSpan={4} className="border border-black px-1.5 py-1"></td>
                    <td className="border border-black px-1.5 py-1 text-right font-mono font-bold">
                      {totalFeeCollected}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* =========================================================================
              EXECUTIVE CLOSING & ANALYTICS VIEW (AVAILABLE ON SCREEN)
             ========================================================================= */}
          {activeView === "EXECUTIVE" && (
            <div className="no-print space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              {/* Closing Summary Header */}
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-700" />
                    <span>Executive Financial &amp; Department Closing</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Detailed revenue breakdown by doctor, department, and operational expense categories.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Closing Date:</div>
                  <div className="text-sm font-bold text-slate-900">{reportData.reportHeader.reportDate}</div>
                </div>
              </div>

              {/* 5-Category Revenue Breakdown */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Revenue Breakdown by Service Category:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">OPD Fees</div>
                    <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                      PKR {(reportData.financialSummary.serviceBreakdown?.opdFees ?? reportData.financialSummary.appointmentFees).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-200 bg-purple-50/30 text-center">
                    <div className="text-[10px] font-bold text-purple-700 uppercase">Ultrasound</div>
                    <div className="text-base font-bold font-mono text-purple-900 mt-0.5">
                      PKR {(reportData.financialSummary.serviceBreakdown?.ultrasoundFees || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-blue-200 bg-blue-50/30 text-center">
                    <div className="text-[10px] font-bold text-blue-700 uppercase">X-Ray</div>
                    <div className="text-base font-bold font-mono text-blue-900 mt-0.5">
                      PKR {(reportData.financialSummary.serviceBreakdown?.xrayFees || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-amber-200 bg-amber-50/30 text-center">
                    <div className="text-[10px] font-bold text-amber-700 uppercase">Lab Tests</div>
                    <div className="text-base font-bold font-mono text-amber-900 mt-0.5">
                      PKR {(reportData.financialSummary.serviceBreakdown?.labFees || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-indigo-200 bg-indigo-50/30 text-center">
                    <div className="text-[10px] font-bold text-indigo-700 uppercase">Inpatient</div>
                    <div className="text-base font-bold font-mono text-indigo-900 mt-0.5">
                      PKR {(reportData.financialSummary.serviceBreakdown?.admissionFees ?? reportData.financialSummary.admissionFees).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expenses Breakdown */}
              {reportData.expenseCategoryBreakdown.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Operational Expenses ({reportData.expenseCategoryBreakdown.length} Categories):
                    </div>
                    <div className="font-mono text-xs font-bold text-rose-700">
                      Total Expenses: PKR {reportData.financialSummary.totalExpenses.toLocaleString()}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {reportData.expenseCategoryBreakdown.map((cat, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs flex justify-between items-center"
                      >
                        <span className="font-medium text-slate-700">{cat.category}:</span>
                        <span className="font-mono font-bold text-rose-700">
                          PKR {cat.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Doctor & Department Dual Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Doctor Revenue */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span>Revenue by Doctor</span>
                    <Stethoscope className="w-4 h-4 text-slate-500" />
                  </div>
                  {reportData.doctorBreakdown.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-2">No doctor consultations on this date</div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-500 font-semibold border-b border-slate-100">
                          <th className="py-1">Doctor Name</th>
                          <th className="py-1 text-center">Visits</th>
                          <th className="py-1 text-right">Fee (PKR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.doctorBreakdown.map((doc, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 font-medium text-slate-800">
                              {doc.doctorName}
                              <div className="text-[10px] text-slate-400">{doc.specialization}</div>
                            </td>
                            <td className="py-1.5 text-center font-mono">{doc.appointmentCount + doc.admissionCount}</td>
                            <td className="py-1.5 text-right font-mono font-bold text-emerald-800">
                              {doc.revenue.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Department Revenue */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span>Visits by Department</span>
                    <Building2 className="w-4 h-4 text-slate-500" />
                  </div>
                  {reportData.departmentBreakdown.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-2">No department entries on this date</div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-500 font-semibold border-b border-slate-100">
                          <th className="py-1">Department</th>
                          <th className="py-1 text-center">Visits</th>
                          <th className="py-1 text-right">Revenue (PKR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.departmentBreakdown.map((dept, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 font-medium text-slate-800">{dept.departmentName}</td>
                            <td className="py-1.5 text-center font-mono">{dept.visitCount}</td>
                            <td className="py-1.5 text-right font-mono font-bold text-emerald-800">
                              {dept.revenue.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
