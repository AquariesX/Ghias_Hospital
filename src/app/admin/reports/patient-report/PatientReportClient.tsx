"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  Printer,
  Download,
  RotateCcw,
  RefreshCw,
  Building2,
  Stethoscope,
  ArrowLeft,
  FileSpreadsheet,
  CheckCircle2,
  Bed,
  Calendar,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Phone,
  MapPin,
} from "lucide-react";
import GhiasHospitalLogo from "@/components/common/GhiasHospitalLogo";

interface PatientRecord {
  id: string;
  patientNumber: string;
  mrNumber: string;
  fullName: string;
  gender: string;
  age: number | string;
  phone: string;
  address: string;
  relationType: string;
  relatedPersonName: string;
  status: string;
  totalAppointments: number;
  totalAdmissions: number;
  totalConsultations: number;
  totalPrescriptions: number;
  lastAppointment: {
    number: string;
    date: string;
    doctor: string;
    department: string;
  } | null;
  currentAdmission: {
    admissionNumber: string;
    date: string;
    doctor: string;
    bedRoom: string;
  } | null;
}

interface PatientReportData {
  summary: {
    totalFilteredPatients: number;
    activePatients: number;
    admittedPatients: number;
  };
  patients: PatientRecord[];
  pagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
}

export default function PatientReportClient() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PatientReportData | null>(null);

  // Filter Options
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [doctors, setDoctors] = useState<Array<{ id: string; firstName: string; lastName: string; department?: { name: string } }>>([]);

  // Filters State
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [status, setStatus] = useState("");
  const [gender, setGender] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Fetch doctors and departments
  useEffect(() => {
    async function loadMeta() {
      try {
        const [deptRes, docRes] = await Promise.all([
          fetch("/api/departments"),
          fetch("/api/doctors"),
        ]);
        if (deptRes.ok) {
          const d = await deptRes.json();
          setDepartments(d.data || d || []);
        }
        if (docRes.ok) {
          const docData = await docRes.json();
          setDoctors(docData.doctors || docData.data || docData || []);
        }
      } catch (err) {
        console.error("Failed to load metadata", err);
      }
    }
    loadMeta();
  }, []);

  // Fetch Report Data
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);
      if (departmentId) params.append("departmentId", departmentId);
      if (doctorId) params.append("doctorId", doctorId);
      if (status) params.append("status", status);
      if (gender) params.append("gender", gender);
      if (search) params.append("search", search);
      params.append("page", page.toString());
      params.append("pageSize", pageSize.toString());

      const res = await fetch(`/api/admin/reports/patient-report?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch report");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [page, pageSize]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReport();
  };

  const handleReset = () => {
    setDateFrom("");
    setDateTo("");
    setDepartmentId("");
    setDoctorId("");
    setStatus("");
    setGender("");
    setSearch("");
    setPage(1);
    setTimeout(() => {
      fetchReport();
    }, 50);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data || !data.patients.length) return;

    const headers = [
      "MR Number",
      "Full Name",
      "Guardian / S/O",
      "Gender",
      "Age",
      "Phone",
      "Address",
      "Status",
      "Total Appointments",
      "Total Admissions",
      "Current Admission",
      "Last Appointment Doctor",
      "Last Appointment Dept",
    ];

    const rows = data.patients.map((p) => [
      `"${p.mrNumber}"`,
      `"${p.fullName}"`,
      `"${p.relationType} ${p.relatedPersonName}"`,
      `"${p.gender}"`,
      `"${p.age}"`,
      `"${p.phone}"`,
      `"${p.address.replace(/"/g, '""')}"`,
      `"${p.status}"`,
      p.totalAppointments,
      p.totalAdmissions,
      p.currentAdmission ? `"${p.currentAdmission.bedRoom}"` : `""`,
      p.lastAppointment ? `"${p.lastAppointment.doctor}"` : `""`,
      p.lastAppointment ? `"${p.lastAppointment.department}"` : `""`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `gias_patient_report_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header - Screen Only */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Link href="/admin/reports" className="hover:text-emerald-700 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Reports
            </Link>
            <span>/</span>
            <span className="text-emerald-800">Patient Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-600" />
            Patient Records & Clinical Activity Report
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Server-side filtered registry with appointment visits, inpatient stays, and hospital census.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!data?.patients.length}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Filter Control Bar - Screen Only */}
      <div className="print:hidden bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handleApplyFilter} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Search Patient / MR # / Phone
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Name, MR #, CNIC, Phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registered Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registered Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Attending Doctor
              </label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                <option value="">All Doctors</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.firstName} {doc.lastName}
                  </option>
                ))}
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                <option value="">All Genders</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="DECEASED">Deceased</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Filter className="w-3.5 h-3.5" /> Apply Filters
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
                title="Reset Filters"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Metric Summary Cards - Screen Only */}
      <div className="print:hidden grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Filtered Patients</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              {data ? data.summary.totalFilteredPatients.toLocaleString() : "—"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Matching current criteria</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Status</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              {data ? data.summary.activePatients.toLocaleString() : "—"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Currently registered active</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <Bed className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Currently Inpatients</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              {data ? data.summary.admittedPatients.toLocaleString() : "—"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Admitted in ward / rooms</p>
          </div>
        </div>
      </div>

      {/* Official Printable Header (Visible only on Print) */}
      <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-4">
        <div className="flex items-center justify-between">
          <div className="w-20 h-20 relative flex items-center justify-center">
            <GhiasHospitalLogo className="w-16 h-16" />
          </div>

          <div className="text-center flex-1 px-4">
            <h2 className="text-2xl font-bold text-slate-900 tracking-wide font-serif">
              GIAS HOSPITAL PHALIA
            </h2>
            <p className="text-xs font-semibold text-slate-700 tracking-widest mt-0.5">
              REG NO. R-59488
            </p>
            <p className="text-[11px] text-slate-600 mt-1">
              Gujrat Road, Phalia, Mandi Bahauddin | Phone: 0546-591234
            </p>
            <div className="mt-2 inline-block px-3 py-1 bg-slate-100 rounded text-xs font-bold uppercase tracking-wider text-slate-800">
              Official Patient Activity & Registry Report
            </div>
          </div>

          <div className="w-20 text-right text-[10px] text-slate-500 space-y-1">
            <p><strong>Generated:</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>Time:</strong> {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            <p><strong>Page:</strong> 1 of 1</p>
          </div>
        </div>

        {/* Filter Summary on Print */}
        <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-slate-600">
          <span><strong>Total Records:</strong> {data?.summary.totalFilteredPatients || 0}</span>
          {dateFrom && <span><strong>From:</strong> {dateFrom}</span>}
          {dateTo && <span><strong>To:</strong> {dateTo}</span>}
          {gender && <span><strong>Gender:</strong> {gender}</span>}
          {status && <span><strong>Status:</strong> {status}</span>}
          {search && <span><strong>Search Term:</strong> "{search}"</span>}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between print:hidden">
          <h2 className="font-semibold text-slate-900 text-sm">
            Patient Records ({data?.pagination.totalRecords || 0})
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="text-xs border border-slate-300 rounded px-2 py-1 bg-slate-50"
            >
              <option value="15">15</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider print:bg-slate-100">
                <th className="py-3 px-3">MR # / Patient</th>
                <th className="py-3 px-3">Guardian</th>
                <th className="py-3 px-3">Age / Sex</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3 text-center">Visits</th>
                <th className="py-3 px-3">Inpatient Bed</th>
                <th className="py-3 px-3">Last Visit / Doctor</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading patient registry records...
                  </td>
                </tr>
              ) : !data || data.patients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No patient records found matching the specified filters.
                  </td>
                </tr>
              ) : (
                data.patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 font-mono text-[11px] text-emerald-800">
                        {p.mrNumber}
                      </div>
                      <div className="font-medium text-slate-800">{p.fullName}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <span className="text-[10px] text-slate-400 font-semibold">{p.relationType}: </span>
                      {p.relatedPersonName}
                    </td>
                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                      <span>{p.age !== "—" ? `${p.age} yrs` : "—"}</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="capitalize">{p.gender.toLowerCase()}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{p.phone || "—"}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[160px] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span>{p.address}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-semibold">
                        {p.totalAppointments} apts
                      </span>
                      {p.totalAdmissions > 0 && (
                        <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                          {p.totalAdmissions} adm
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {p.currentAdmission ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <Bed className="w-3 h-3 text-amber-600" />
                          {p.currentAdmission.bedRoom}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {p.lastAppointment ? (
                        <div>
                          <div className="font-medium text-slate-800">{p.lastAppointment.doctor}</div>
                          <div className="text-[11px] text-slate-500">
                            {p.lastAppointment.department} • {p.lastAppointment.date}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider ${
                          p.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : p.status === "INACTIVE"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls - Screen Only */}
        {data && data.pagination.totalPages > 1 && (
          <div className="print:hidden p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
            <span className="text-xs text-slate-600">
              Showing page <strong>{data.pagination.page}</strong> of{" "}
              <strong>{data.pagination.totalPages}</strong> (
              {data.pagination.totalRecords} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.pagination.page <= 1}
                className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(data.pagination.totalPages, p + 1))
                }
                disabled={data.pagination.page >= data.pagination.totalPages}
                className="p-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Official Signatures for Print Only */}
      <div className="hidden print:flex justify-between items-end mt-12 pt-8 border-t border-slate-300 text-xs">
        <div className="text-center w-48">
          <div className="border-b border-slate-400 mb-1 h-8"></div>
          <p className="font-semibold text-slate-700">Medical Record Officer</p>
          <p className="text-[10px] text-slate-500">GIAS Hospital Phalia</p>
        </div>
        <div className="text-center w-48">
          <div className="border-b border-slate-400 mb-1 h-8"></div>
          <p className="font-semibold text-slate-700">Hospital Administrator</p>
          <p className="text-[10px] text-slate-500">Seal & Signature</p>
        </div>
      </div>
    </div>
  );
}
