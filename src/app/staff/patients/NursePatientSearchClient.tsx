"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Users, RefreshCw, ChevronRight, HeartPulse } from "lucide-react";

interface PatientItem {
  id: string;
  patientNumber: string;
  mrNumber: string | null;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  cnic: string | null;
  bloodGroup: string;
  status: string;
  allergies: string[];
  vitalSigns?: Array<{
    systolicBP: number | null;
    diastolicBP: number | null;
    pulse: number | null;
    temperature: number | null;
    oxygenSaturation: number | null;
    recordedAt: string;
  }>;
}

export default function NursePatientSearchClient() {
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchPatients = useCallback(async (query: string = "") => {
    try {
      setLoading(true);
      const res = await fetch(`/api/staff/patients?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) {
        setPatients(data.data || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(search);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Directory &amp; Records</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Search patient records, view clinical vital history, and record new vitals.
          </p>
        </div>
      </div>

      {/* Search Toolbar */}
      <form onSubmit={handleSearchSubmit} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by patient name, MR Number, CNIC, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <button
          type="submit"
          className="bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-xs"
        >
          Search
        </button>
      </form>

      {/* Patients Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-2" />
            <p className="text-sm font-medium">Loading patients...</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-700">No patients found matching your query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">MR Number</th>
                  <th className="py-3.5 px-4">Phone / CNIC</th>
                  <th className="py-3.5 px-4">Blood Group</th>
                  <th className="py-3.5 px-4">Latest Vitals</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => {
                  const vitals = p.vitalSigns?.[0];
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {p.firstName} {p.lastName}
                        </div>
                        <div className="text-xs text-slate-400">{p.gender}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700">
                        {p.mrNumber || p.patientNumber}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700">
                        <div>{p.phone}</div>
                        {p.cnic && <div className="text-slate-400 font-mono text-[11px]">{p.cnic}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-700">
                        {p.bloodGroup ? p.bloodGroup.replace("_", "") : "—"}
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
                          <span className="text-xs text-slate-400 italic">No vitals recorded</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/staff/patients/${p.id}`}
                          className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <HeartPulse className="w-3.5 h-3.5" />
                          Vitals &amp; Notes
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
