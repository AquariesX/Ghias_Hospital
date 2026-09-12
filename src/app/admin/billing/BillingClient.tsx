"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Printer,
  FileText,
  Calendar,
  Building2,
  Stethoscope,
  ArrowUpDown,
  CheckCircle2,
  Receipt,
  RotateCcw,
} from "lucide-react";
import GhiasHospitalLogo from "@/components/common/GhiasHospitalLogo";

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netTotal: number;
  totalPatients: number;
  totalAppointmentsCount: number;
  totalAdmissionsCount: number;
  totalExpensesCount: number;
}

interface BillingRecord {
  id: string;
  referenceId: string;
  recordNumber: string;
  type: "APPOINTMENT" | "ADMISSION";
  typeLabel: string;
  date: string;
  time?: string | null;
  patientId: string;
  patientName: string;
  patientPhone: string;
  mrNumber: string | null;
  doctorId?: string | null;
  doctorName?: string | null;
  departmentName?: string | null;
  amount: number;
  status: string;
  paymentMethod: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export default function BillingClient() {
  const [summary, setSummary] = useState<FinancialSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    netTotal: 0,
    totalPatients: 0,
    totalAppointmentsCount: 0,
    totalAdmissionsCount: 0,
    totalExpensesCount: 0,
  });

  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 15,
    totalRecords: 0,
    totalPages: 1,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [feeType, setFeeType] = useState<"ALL" | "APPOINTMENT" | "ADMISSION">("ALL");

  // Metadata dropdowns
  const [doctorsList, setDoctorsList] = useState<Array<{ id: string; name: string }>>([]);
  const [departmentsList, setDepartmentsList] = useState<Array<{ id: string; name: string }>>([]);

  // Load doctors & departments for filter dropdowns
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
        console.error("Failed to load metadata dropdowns:", e);
      }
    }
    loadMeta();
  }, []);

  const fetchBillingData = async (pageNumber: number = 1) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams({
        page: String(pageNumber),
        pageSize: String(pagination.pageSize),
        feeType,
      });

      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (search.trim()) params.set("search", search.trim());
      if (doctorId) params.set("doctorId", doctorId);
      if (departmentId) params.set("departmentId", departmentId);

      const res = await fetch(`/api/admin/billing?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load financial records");
      }

      const data = await res.json();
      setSummary(data.financialSummary);
      setRecords(data.records || []);
      setPagination(data.pagination);
    } catch (err: any) {
      setErrorMessage(err.message || "Network error loading billing information");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData(1);
  }, [feeType]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBillingData(1);
  };

  const handleResetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setDoctorId("");
    setDepartmentId("");
    setFeeType("ALL");
    setTimeout(() => fetchBillingData(1), 0);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Official Printable Hospital Header (Visible only on Print) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 text-center mb-5">
        <div className="flex flex-col items-center justify-center">
          <div className="mb-2">
            <GhiasHospitalLogo size={66} />
          </div>
          <div
            className="text-xl font-bold text-slate-900 font-serif leading-tight"
            style={{
              fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif",
            }}
          >
            غیاث ہسپتال پھالیہ
          </div>
          <h1 className="text-2xl font-black text-slate-950 tracking-wider uppercase font-serif mt-0.5">
            GIAS HOSPITAL PHALIA
          </h1>
          <div className="text-xs font-bold text-slate-800 tracking-widest mt-0.5">
            REG NO. R-59488
          </div>
          <p className="text-[11px] text-slate-600 font-medium mt-1">
            Main Gujrat Road, Phalia, Mandi Bahauddin • Phone: 0546-566567 / 0346-4949577
          </p>
          <div className="mt-2 inline-block px-4 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-black uppercase tracking-wider text-slate-900">
            Billing Records &amp; Patient Revenue Ledger
          </div>
        </div>
      </div>

      {/* Header & Quick Action Buttons (Screen only) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-700 uppercase tracking-wider">
            <span>Hospital Accounts</span>
            <span>•</span>
            <span>Financial Intelligence</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Billing &amp; Revenue Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time financial aggregations directly computed from live PostgreSQL clinical records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/billing/expenses"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition shadow-xs"
          >
            <Receipt className="w-4 h-4 text-amber-700" />
            <span>Manage Expenses ({summary.totalExpensesCount})</span>
          </Link>

          <Link
            href="/admin/reports/day-end"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span>Day End Report →</span>
          </Link>

          <button
            type="button"
            onClick={() => fetchBillingData(pagination.page)}
            disabled={isLoading}
            className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="no-print p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <span className="font-semibold">{errorMessage}</span>
          <button onClick={() => fetchBillingData(1)} className="underline hover:text-rose-950 font-bold">
            Retry
          </button>
        </div>
      )}

      {/* 4 Core Financial Summary Cards (Screen Only) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Fees / Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Revenue / Fees
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            PKR {summary.totalRevenue.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
            <span>OPD: PKR {summary.totalRevenue ? summary.totalRevenue.toLocaleString() : 0}</span>
            <span>•</span>
            <span>{summary.totalAppointmentsCount} Visits</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Expenses
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700">
            PKR {summary.totalExpenses.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            {summary.totalExpensesCount} recorded operational entries
          </div>
        </div>

        {/* Net Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Net Profit / Total
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-2xl font-black ${summary.netTotal >= 0 ? "text-teal-900" : "text-rose-700"}`}>
            PKR {summary.netTotal.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Revenue minus Total Expenses
          </div>
        </div>

        {/* Total Patients */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Patients
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {summary.totalPatients.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Distinct patients in active criteria
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <form
        onSubmit={handleApplyFilters}
        className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span>Filter Financial Records</span>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          {/* Date From */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
            />
          </div>

          {/* Search Patient / MR */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Patient / MR #</label>
            <input
              type="text"
              placeholder="Name, MR #, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
            />
          </div>

          {/* Doctor Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Attending Doctor</label>
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

          {/* Department Filter */}
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

          {/* Fee Type */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Fee Type</label>
            <select
              value={feeType}
              onChange={(e) => setFeeType(e.target.value as any)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="ALL">All Transactions</option>
              <option value="APPOINTMENT">OPD Appointments</option>
              <option value="ADMISSION">Inpatient Admissions</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer inline-flex items-center gap-2"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Apply Filters</span>
          </button>
        </div>
      </form>

      {/* Detailed Financial Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Transaction Records &amp; Fee Ledger
            </h2>
            <p className="text-xs text-slate-500">
              Showing {records.length} of {pagination.totalRecords} filtered revenue items
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Ledger</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600" />
            <p className="text-xs font-semibold">Querying PostgreSQL financial records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <DollarSign className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No transactions match active filter</p>
            <p className="text-xs text-slate-500">Try adjusting your date range or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10.5px]">
                <tr>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Patient Demographics</th>
                  <th className="py-3 px-4">Type / Service</th>
                  <th className="py-3 px-4">Doctor &amp; Department</th>
                  <th className="py-3 px-4">Fee Amount</th>
                  <th className="py-3 px-4">Payment Info</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-teal-50/40 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{rec.date}</div>
                      <div className="text-[11px] text-slate-500">{rec.time || "—"}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{rec.patientName}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          {rec.mrNumber || "Walk-in"}
                        </span>
                        <span className="text-[11px] text-slate-500">{rec.patientPhone}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold ${
                        rec.type === "APPOINTMENT"
                          ? "bg-teal-50 text-teal-800 border border-teal-200"
                          : "bg-indigo-50 text-indigo-800 border border-indigo-200"
                      }`}>
                        {rec.typeLabel}
                      </span>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {rec.recordNumber}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{rec.doctorName || "—"}</div>
                      <div className="text-[11px] text-slate-500">{rec.departmentName || "General OPD"}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-black text-sm text-emerald-700">
                        PKR {rec.amount.toLocaleString()}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-[11px] font-medium text-slate-700">{rec.paymentMethod}</div>
                      <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Collected at Counter</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {pagination.totalPages > 1 && (
          <div className="no-print p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.totalRecords} total items)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => fetchBillingData(pagination.page - 1)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 font-semibold cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => fetchBillingData(pagination.page + 1)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 font-semibold cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Financial Summary Below Patient List (Visible on Print & Screen) */}
      <div className="border-2 border-slate-800 rounded-2xl p-4 bg-slate-50/70 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-300 pb-2">
          <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-700" />
            <span>Financial &amp; Revenue Summary</span>
          </h3>
          <span className="text-[10.5px] text-slate-500 font-medium">
            Computed from Live Database Records
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[10.5px] font-bold text-slate-500 uppercase">Total Revenue / Fees</div>
            <div className="text-xl font-black text-emerald-800 font-mono mt-0.5">
              PKR {summary.totalRevenue.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{summary.totalAppointmentsCount} records</div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[10.5px] font-bold text-slate-500 uppercase">Total Expenses</div>
            <div className="text-xl font-black text-rose-700 font-mono mt-0.5">
              PKR {summary.totalExpenses.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{summary.totalExpensesCount} vouchers</div>
          </div>

          <div className="bg-white p-3 rounded-xl border-2 border-slate-900 bg-emerald-50/30 shadow-xs">
            <div className="text-[10.5px] font-black text-slate-950 uppercase">Net Total</div>
            <div className={`text-xl font-black font-mono mt-0.5 ${summary.netTotal >= 0 ? "text-slate-950" : "text-rose-700"}`}>
              PKR {summary.netTotal.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Fees - Expenses</div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[10.5px] font-bold text-slate-500 uppercase">Total Patients</div>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
              {summary.totalPatients.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Distinct patients</div>
          </div>
        </div>
      </div>

      {/* Official Signatures for Print Only */}
      <div className="hidden print:flex justify-between items-end mt-12 pt-8 border-t border-slate-300 text-xs">
        <div className="text-center w-48">
          <div className="border-b border-slate-400 mb-1 h-8"></div>
          <p className="font-semibold text-slate-700">Accounts Officer / Cashier</p>
          <p className="text-[10px] text-slate-500">GIAS Hospital Phalia</p>
        </div>
        <div className="text-center w-48">
          <div className="border-b border-slate-400 mb-1 h-8"></div>
          <p className="font-semibold text-slate-700">Medical Superintendent</p>
          <p className="text-[10px] text-slate-500">GIAS Hospital Phalia</p>
        </div>
        <div className="text-center w-48">
          <div className="border-b border-slate-400 mb-1 h-8"></div>
          <p className="font-semibold text-slate-700">Hospital Administrator</p>
          <p className="text-[10px] text-slate-500">Seal &amp; Signature</p>
        </div>
      </div>
    </div>
  );
}
