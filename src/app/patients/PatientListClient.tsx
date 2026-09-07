"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";

interface PatientListItem {
  id: string;
  patientNumber: string;
  mrNumber: string | null;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  email: string | null;
  bloodGroup: string;
  status: string;
  cnic: string | null;
  relationType: string | null;
  relatedPersonName: string | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  createdAt: string;
  _count: {
    appointments: number;
    consultations: number;
    admissions: number;
    prescriptions: number;
    vitalSigns: number;
  };
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

const BLOOD_GROUPS = [
  { value: "A_POSITIVE", label: "A+" },
  { value: "A_NEGATIVE", label: "A-" },
  { value: "B_POSITIVE", label: "B+" },
  { value: "B_NEGATIVE", label: "B-" },
  { value: "AB_POSITIVE", label: "AB+" },
  { value: "AB_NEGATIVE", label: "AB-" },
  { value: "O_POSITIVE", label: "O+" },
  { value: "O_NEGATIVE", label: "O-" },
];

function calculateAge(dobString: string): string {
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return "—";
  const diffMs = Date.now() - dob.getTime();
  const ageDate = new Date(diffMs);
  const years = Math.abs(ageDate.getUTCFullYear() - 1970);
  if (years > 0) return `${years} yrs`;
  const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375));
  return `${months} mos`;
}

function formatBloodGroup(bg: string): string {
  const match = BLOOD_GROUPS.find((b) => b.value === bg);
  return match ? match.label : bg;
}

export default function PatientListClient({ userRole }: { userRole: string }) {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const canManage = userRole === "ADMIN" || userRole === "RECEPTIONIST" || userRole === "STAFF";

  useEffect(() => {
    let cancelled = false;
    async function loadPatients() {
      setIsLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page) });
        if (search) params.set("search", search);
        if (gender) params.set("gender", gender);
        if (bloodGroup) params.set("bloodGroup", bloodGroup);
        if (status) params.set("status", status);

        const res = await fetch(`/api/patients?${params}`);
        const data = await res.json();
        if (cancelled) return;

        if (res.ok) {
          setPatients(data.data || []);
          setPagination(data.pagination);
        } else {
          setError(data.error || "Failed to load patients");
        }
      } catch {
        if (!cancelled) setError("Network error loading patients");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadPatients();
    return () => {
      cancelled = true;
    };
  }, [page, search, gender, bloodGroup, status, refreshKey]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setRefreshKey((k) => k + 1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setGender("");
    setBloodGroup("");
    setStatus("");
    setPage(1);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Patients Directory"
        subtitle={
          pagination
            ? `Total ${pagination.total} registered patient${pagination.total === 1 ? "" : "s"} in GIAS Hospital`
            : "Centralized hospital patient medical records and registration"
        }
        actionLabel={canManage ? "+ Admit Patient" : undefined}
        actionHref={canManage ? "/patients/new" : undefined}
      />

      {/* Filter and Search Bar */}
      <form
        onSubmit={handleSearch}
        className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-wrap gap-3 items-center"
      >
        <div className="flex-1 min-w-[240px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Name, MR#, Patient#, CNIC, Phone..."
            className="w-full text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <select
          value={gender}
          onChange={(e) => {
            setGender(e.target.value);
            setPage(1);
          }}
          className="text-sm px-3 py-2 border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All Genders</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
        </select>

        <select
          value={bloodGroup}
          onChange={(e) => {
            setBloodGroup(e.target.value);
            setPage(1);
          }}
          className="text-sm px-3 py-2 border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All Blood Groups</option>
          {BLOOD_GROUPS.map((bg) => (
            <option key={bg.value} value={bg.value}>
              {bg.label}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="text-sm px-3 py-2 border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="CRITICAL">Critical</option>
          <option value="DISCHARGED">Discharged</option>
        </select>

        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded hover:bg-teal-800 transition-colors shadow-xs"
        >
          Search
        </button>

        {(search || gender || bloodGroup || status) && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
          >
            Clear
          </button>
        )}
      </form>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Patient Directory Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : patients.length === 0 ? (
          <EmptyState
            title="No patients found"
            description={
              search || gender || bloodGroup || status
                ? "No patient records match the applied search and filter criteria."
                : "No patients are registered in the hospital system yet."
            }
            actionLabel={canManage && !search ? "Register First Patient" : undefined}
            actionHref={canManage && !search ? "/patients/new" : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3.5">Numbers</th>
                  <th className="px-4 py-3.5">Patient Details</th>
                  <th className="px-4 py-3.5">CNIC</th>
                  <th className="px-4 py-3.5">Contact</th>
                  <th className="px-4 py-3.5">Blood Group</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 hidden lg:table-cell">Activity</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <Link
                          href={`/patients/${p.id}`}
                          className="font-mono font-bold text-teal-700 hover:text-teal-900 text-xs"
                        >
                          {p.patientNumber}
                        </Link>
                        {p.mrNumber ? (
                          <span className="font-mono text-[11px] text-slate-500">
                            {p.mrNumber}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div>
                        <Link
                          href={`/patients/${p.id}`}
                          className="font-semibold text-slate-900 hover:text-teal-700 block"
                        >
                          {p.firstName} {p.lastName}
                        </Link>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="capitalize">{p.gender.toLowerCase()}</span>
                          <span>•</span>
                          <span>{calculateAge(p.dateOfBirth)}</span>
                          {p.relatedPersonName && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[140px]" title={p.relatedPersonName}>
                                {p.relationType ? `${p.relationType}: ` : ""}
                                {p.relatedPersonName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-mono text-xs text-slate-700">
                        {p.cnic || <span className="text-slate-400">—</span>}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="text-xs font-medium text-slate-800">{p.phone}</p>
                      {p.emergencyContactPhone && (
                        <p className="text-[11px] text-slate-400">
                          Em: {p.emergencyContactPhone}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        {formatBloodGroup(p.bloodGroup)}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <StatusBadge status={p.status} />
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap hidden lg:table-cell">
                      <div className="text-[11px] text-slate-500 space-y-0.5">
                        <p>{p._count.appointments} appointments</p>
                        <p>{p._count.vitalSigns} vitals recorded</p>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/patients/${p.id}`}
                          className="px-2.5 py-1 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded border border-teal-200 transition-colors"
                        >
                          Profile
                        </Link>
                        {canManage && (
                          <Link
                            href={`/patients/${p.id}/edit`}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors"
                          >
                            Edit
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/50 text-xs">
            <span className="text-slate-500 font-medium">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} registered patients)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, pagination.page - 1))}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
              >
                Previous
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === pagination.totalPages ||
                    Math.abs(p - pagination.page) <= 1
                )
                .map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 rounded font-semibold transition ${
                      p === pagination.page
                        ? "bg-teal-600 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              <button
                type="button"
                onClick={() => setPage(Math.min(pagination.totalPages, pagination.page + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 rounded border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
