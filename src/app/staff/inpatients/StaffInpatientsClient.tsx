"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Bed,
  Search,
  Users,
  Clock,
  Pill,
  HeartPulse,
  ChevronRight,
  Stethoscope,
  Calendar,
  Activity,
  CheckCircle2,
  FileText,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";

interface AdmissionItem {
  id: string;
  admissionNumber: string;
  admissionDate: string;
  admissionTime: string | null;
  roomBedNo: string;
  status: string;
  provisionalDiagnosis: string | null;
  finalDiagnosis: string | null;
  patient: {
    id: string;
    mrNumber: string | null;
    patientNumber: string;
    firstName: string;
    lastName: string;
    gender: string;
    dateOfBirth: string;
    phone: string;
    bloodGroup: string;
    allergies: string[];
  };
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
    specialization: string;
    department?: { name: string } | null;
  } | null;
  _count: {
    vitalSigns: number;
    nursingNotes: number;
    medicationAdministrations: number;
    prescriptions: number;
  };
}

interface StaffInpatientsClientProps {
  initialAdmissions: AdmissionItem[];
}

export default function StaffInpatientsClient({
  initialAdmissions,
}: StaffInpatientsClientProps) {
  const [admissions] = useState<AdmissionItem[]>(initialAdmissions);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredAdmissions = useMemo(() => {
    return admissions.filter((adm) => {
      const q = search.toLowerCase();
      const patientFullName = `${adm.patient.firstName} ${adm.patient.lastName}`.toLowerCase();
      const mr = (adm.patient.mrNumber || "").toLowerCase();
      const admNo = adm.admissionNumber.toLowerCase();
      const bed = adm.roomBedNo.toLowerCase();
      const doc = adm.doctor
        ? `${adm.doctor.firstName} ${adm.doctor.lastName}`.toLowerCase()
        : "";

      const matchesQuery =
        patientFullName.includes(q) ||
        mr.includes(q) ||
        admNo.includes(q) ||
        bed.includes(q) ||
        doc.includes(q);

      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : adm.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [admissions, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Inpatient Ward Nursing
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Admitted Patients &amp; Inpatient Treatment
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage inpatient care, medication administration sheets (MAR), and clinical records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 bg-teal-50 border border-teal-200 rounded-lg text-teal-800 text-xs font-bold">
              {admissions.length} Admitted Patient(s)
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by patient, MR#, Admission#, bed, or doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        {/* Status Quick Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { key: "ALL", label: "All Active" },
            { key: "ADMITTED", label: "Admitted" },
            { key: "UNDER_TREATMENT", label: "Under Treatment" },
            { key: "DISCHARGE_PENDING", label: "Discharge Pending" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === tab.key
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inpatients Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredAdmissions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Bed className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700">
              No admitted patients found.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {search
                ? "No admitted patients match your search criteria."
                : "There are currently no patients under active inpatient care."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                  <th className="px-4 py-3">Patient &amp; MR#</th>
                  <th className="px-4 py-3">Admission &amp; Bed</th>
                  <th className="px-4 py-3">Attending Doctor</th>
                  <th className="px-4 py-3">Diagnosis</th>
                  <th className="px-4 py-3">Admitted Since</th>
                  <th className="px-4 py-3">Clinical Care</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdmissions.map((adm) => {
                  const admDate = new Date(adm.admissionDate);
                  const daysAdmitted = Math.max(
                    0,
                    Math.floor((Date.now() - admDate.getTime()) / (1000 * 60 * 60 * 24))
                  );

                  return (
                    <tr key={adm.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Patient & MR */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 text-sm">
                          {adm.patient.firstName} {adm.patient.lastName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-teal-700 font-semibold">
                            {adm.patient.mrNumber || adm.patient.patientNumber}
                          </span>
                          <span>•</span>
                          <span>{adm.patient.gender}</span>
                          <span>•</span>
                          <span className="font-semibold">{adm.patient.bloodGroup?.replace("_", "")}</span>
                        </div>
                      </td>

                      {/* Admission & Bed */}
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-semibold text-slate-800">
                          {adm.admissionNumber}
                        </div>
                        <div className="text-xs font-bold text-teal-700 flex items-center gap-1 mt-0.5">
                          <Bed className="w-3.5 h-3.5" />
                          <span>Room / Bed: {adm.roomBedNo}</span>
                        </div>
                      </td>

                      {/* Doctor */}
                      <td className="px-4 py-3.5">
                        {adm.doctor ? (
                          <div>
                            <div className="font-semibold text-slate-800">
                              Dr. {adm.doctor.firstName} {adm.doctor.lastName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {adm.doctor.specialization}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Diagnosis */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="text-slate-700 font-medium truncate" title={adm.provisionalDiagnosis || "—"}>
                          {adm.provisionalDiagnosis || "—"}
                        </p>
                      </td>

                      {/* Admitted Since */}
                      <td className="px-4 py-3.5 font-mono text-slate-600 whitespace-nowrap">
                        <div>{admDate.toLocaleDateString("en-GB")}</div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          {daysAdmitted === 0 ? "Admitted today" : `${daysAdmitted} day(s) ago`}
                        </div>
                      </td>

                      {/* Clinical Care Counts */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[11px] font-semibold"
                            title="Medication Administrations"
                          >
                            <Pill className="w-3 h-3" />
                            {adm._count.medicationAdministrations} MAR
                          </span>
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-semibold"
                            title="Vital Signs Recorded"
                          >
                            <Activity className="w-3 h-3" />
                            {adm._count.vitalSigns} Vitals
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={adm.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <Link
                          href={`/staff/inpatients/${adm.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-lg shadow-xs transition"
                        >
                          <Pill className="w-3.5 h-3.5" />
                          <span>Inpatient Treatment</span>
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
