"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Stethoscope,
  Activity,
  Pill,
  Bed,
  ClipboardList,
  Clock,
  Printer,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import SafeHtmlContent from "@/components/ui/SafeHtmlContent";

interface PatientHistoryClientProps {
  patient: {
    id: string;
    mrNumber?: string | null;
    patientNumber: string;
    firstName: string;
    lastName: string;
    gender: string;
    dateOfBirth: string;
    phone: string;
    email?: string | null;
    address?: string | null;
    bloodGroup: string;
    allergies: string[];
    chronicConditions: string[];
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelation?: string | null;
    status: string;
  };
  history: {
    appointments: any[];
    consultations: any[];
    prescriptions: any[];
    admissions: any[];
    vitalSigns: any[];
    nursingNotes: any[];
    medicationAdministrations: any[];
    timelineEvents: any[];
  };
}

export default function PatientHistoryClient({
  patient,
  history,
}: PatientHistoryClientProps) {
  const [activeTab, setActiveTab] = useState<
    "all" | "admissions" | "consultations" | "vitals" | "prescriptions" | "mar" | "notes"
  >("all");

  const dob = new Date(patient.dateOfBirth);
  const age = new Date().getFullYear() - dob.getFullYear();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/patients/${patient.id}`}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition"
            title="Back to Patient Details"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {patient.firstName} {patient.lastName} — Complete Medical Record
              </h1>
              <StatusBadge status={patient.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              MR: <span className="font-mono font-bold text-teal-700">{patient.mrNumber || patient.patientNumber}</span> •
              Age: <span className="font-semibold text-slate-700">{age} yrs</span> •
              Gender: <span className="text-slate-700">{patient.gender}</span> •
              Blood Group: <span className="text-slate-700">{patient.bloodGroup?.replace("_", " ")}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition inline-flex items-center gap-2 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Medical Record</span>
          </button>
        </div>
      </div>

      {/* Patient Summary Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Information</span>
          <p className="font-semibold text-slate-800 mt-1">{patient.phone}</p>
          <p className="text-slate-500">{patient.email || "No email on file"}</p>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Emergency Contact</span>
          <p className="font-semibold text-slate-800 mt-1">{patient.emergencyContactName}</p>
          <p className="text-slate-500">{patient.emergencyContactPhone} ({patient.emergencyContactRelation || "Relation"})</p>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Known Allergies</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {patient.allergies.length > 0 ? (
              patient.allergies.map((a) => (
                <span key={a} className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  {a}
                </span>
              ))
            ) : (
              <span className="text-slate-400 italic">No known allergies</span>
            )}
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chronic Conditions</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {patient.chronicConditions.length > 0 ? (
              patient.chronicConditions.map((c) => (
                <span key={c} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  {c}
                </span>
              ))
            ) : (
              <span className="text-slate-400 italic">None recorded</span>
            )}
          </div>
        </div>
      </div>

      {/* Stream Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
        {[
          { key: "all", label: "All Streams Overview" },
          { key: "admissions", label: `Admissions (${history.admissions.length})` },
          { key: "consultations", label: `Consultations (${history.consultations.length})` },
          { key: "vitals", label: `Vital Signs (${history.vitalSigns.length})` },
          { key: "prescriptions", label: `Prescriptions (${history.prescriptions.length})` },
          { key: "mar", label: `Medication MAR (${history.medicationAdministrations.length})` },
          { key: "notes", label: `Nursing Notes (${history.nursingNotes.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
              activeTab === tab.key
                ? "border-teal-700 text-teal-800 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Rendering based on Tab */}
      {(activeTab === "all" || activeTab === "admissions") && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Bed className="w-4 h-4 text-teal-700" />
              <span>Inpatient Admissions ({history.admissions.length})</span>
            </h3>
          </div>

          {history.admissions.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-3">No admissions on record.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.admissions.map((adm: any) => (
                <div key={adm.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{adm.admissionNumber}</span>
                      <StatusBadge status={adm.status} />
                      <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        {adm.roomBedNo || "Bed unassigned"}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1">
                      Admitted: <span className="font-medium text-slate-800">{new Date(adm.admissionDate).toLocaleDateString()}</span>
                      {adm.dischargeDate && (
                        <span> • Discharged: <span className="font-medium text-slate-800">{new Date(adm.dischargeDate).toLocaleDateString()}</span></span>
                      )}
                      {adm.doctor && (
                        <span> • Attending: <span className="font-medium text-slate-800">Dr. {adm.doctor.firstName} {adm.doctor.lastName}</span></span>
                      )}
                    </p>
                    {adm.finalDiagnosis && (
                      <p className="text-slate-700 mt-0.5">
                        <span className="font-semibold text-slate-500">Final Diagnosis:</span> {adm.finalDiagnosis}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/doctor/inpatients/${adm.id}`}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                    >
                      View Details
                    </Link>
                    {adm.status === "DISCHARGED" && (
                      <Link
                        href={`/admissions/${adm.id}/discharge-summary`}
                        className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Summary Card</span>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(activeTab === "all" || activeTab === "consultations") && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-blue-600" />
              <span>Doctor Consultations ({history.consultations.length})</span>
            </h3>
          </div>

          {history.consultations.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-3">No consultations on record.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.consultations.map((c: any) => (
                <div key={c.id} className="py-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      Dr. {c.doctor?.firstName} {c.doctor?.lastName} ({c.doctor?.specialization})
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {new Date(c.consultationDate).toLocaleDateString()}
                    </span>
                  </div>
                  {c.chiefComplaint && (
                    <p className="text-slate-600"><span className="font-semibold text-slate-500">Complaint:</span> {c.chiefComplaint}</p>
                  )}
                  {c.diagnosis && (
                    <p className="text-slate-800 font-medium"><span className="font-semibold text-slate-500">Diagnosis:</span> {c.diagnosis}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(activeTab === "all" || activeTab === "prescriptions") && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Pill className="w-4 h-4 text-purple-600" />
              <span>Prescriptions &amp; Medications ({history.prescriptions.length})</span>
            </h3>
          </div>

          {history.prescriptions.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-3">No prescriptions on record.</p>
          ) : (
            <div className="space-y-3">
              {history.prescriptions.map((rx: any) => (
                <div key={rx.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900">{rx.prescriptionNumber}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(rx.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {rx.items && rx.items.length > 0 && (
                    <div className="divide-y divide-slate-200/60 pt-1">
                      {rx.items.map((it: any) => (
                        <div key={it.id} className="py-1 flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-800">{it.medicineName} ({it.dosage})</span>
                          <span className="text-slate-500">{it.frequency} • {it.duration} • {it.route}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(activeTab === "all" || activeTab === "vitals") && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              <span>Vital Signs Stream ({history.vitalSigns.length})</span>
            </h3>
          </div>

          {history.vitalSigns.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-3">No vital signs recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                    <th className="px-3 py-2">Recorded At</th>
                    <th className="px-3 py-2">BP</th>
                    <th className="px-3 py-2">Pulse</th>
                    <th className="px-3 py-2">Temp</th>
                    <th className="px-3 py-2">SpO2</th>
                    <th className="px-3 py-2">Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.vitalSigns.map((v: any) => (
                    <tr key={v.id}>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                        {new Date(v.recordedAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-800">
                        {v.systolicBP && v.diastolicBP ? `${v.systolicBP}/${v.diastolicBP}` : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono">{v.pulse ? `${v.pulse} bpm` : "—"}</td>
                      <td className="px-3 py-2 font-mono">{v.temperature ? `${Number(v.temperature)}°F` : "—"}</td>
                      <td className="px-3 py-2 font-mono">{v.oxygenSaturation ? `${v.oxygenSaturation}%` : "—"}</td>
                      <td className="px-3 py-2 text-slate-600">{v.recordedByName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {(activeTab === "all" || activeTab === "mar") && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Pill className="w-4 h-4 text-emerald-600" />
              <span>Medication Administration Record ({history.medicationAdministrations.length})</span>
            </h3>
          </div>

          {history.medicationAdministrations.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-3">No medication administrations recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                    <th className="px-3 py-2">Administered At</th>
                    <th className="px-3 py-2">Medicine</th>
                    <th className="px-3 py-2">Dosage / Route</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Administered By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.medicationAdministrations.map((m: any) => (
                    <tr key={m.id}>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                        {new Date(m.administeredAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-900">{m.medicineName}</td>
                      <td className="px-3 py-2 text-slate-600">{m.dosage} • {m.route}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          {m.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{m.administeredByName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {(activeTab === "all" || activeTab === "notes") && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-600" />
              <span>Nursing Notes &amp; Observations ({history.nursingNotes.length})</span>
            </h3>
          </div>

          {history.nursingNotes.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-3">No nursing notes logged.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.nursingNotes.map((n: any) => (
                <div key={n.id} className="py-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{n.patientCondition}</span>
                    <span className="font-mono text-slate-400 text-[10px]">
                      {new Date(n.recordedAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="text-slate-700 mt-0.5">
                    <SafeHtmlContent content={n.observation} />
                  </div>
                  {n.notes && (
                    <div className="p-2 bg-amber-50/60 rounded text-[11px] text-amber-900 border border-amber-200/60">
                      <span className="font-semibold">Handoff Notes:</span>
                      <SafeHtmlContent content={n.notes} className="mt-0.5" />
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400">By Nurse: {n.recordedByName}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
