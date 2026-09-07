"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Flame,
  AlertTriangle,
  Clock,
  CheckCircle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  X,
  ChevronRight,
  HeartPulse,
  AlertCircle,
} from "lucide-react";

interface TriageItem {
  id: string;
  chiefComplaint: string;
  priority: "CRITICAL" | "HIGH" | "URGENT" | "NORMAL";
  painScore: number | null;
  generalCondition: string | null;
  observations: string | null;
  systolicBP: number | null;
  diastolicBP: number | null;
  pulse: number | null;
  temperature: number | null;
  oxygenSaturation: number | null;
  respiratoryRate: number | null;
  triagedByName: string;
  triagedAt: string;
  patient: {
    id: string;
    patientNumber: string;
    mrNumber: string | null;
    firstName: string;
    lastName: string;
    gender: string;
    dateOfBirth: string;
    phone: string;
    bloodGroup: string;
    allergies: string[];
    emergencyContactName: string;
    emergencyContactPhone: string;
    vitalSigns?: Array<{
      systolicBP: number | null;
      diastolicBP: number | null;
      pulse: number | null;
      temperature: number | null;
      oxygenSaturation: number | null;
      recordedAt: string;
    }>;
  };
}

export default function EmergencyQueueClient() {
  const [triages, setTriages] = useState<TriageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Triage Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Patient search in modal
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [searchingPatients, setSearchingPatients] = useState(false);

  // Triage Form fields
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [priority, setPriority] = useState<"CRITICAL" | "HIGH" | "URGENT" | "NORMAL">("HIGH");
  const [painScore, setPainScore] = useState<number>(5);
  const [generalCondition, setGeneralCondition] = useState("Distressed");
  const [observations, setObservations] = useState("");
  const [systolicBP, setSystolicBP] = useState<string>("");
  const [diastolicBP, setDiastolicBP] = useState<string>("");
  const [pulse, setPulse] = useState<string>("");
  const [temperature, setTemperature] = useState<string>("");
  const [oxygenSaturation, setOxygenSaturation] = useState<string>("");
  const [respiratoryRate, setRespiratoryRate] = useState<string>("");

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (priorityFilter !== "ALL") params.set("priority", priorityFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/staff/emergency/queue?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load Emergency queue");
      }

      setTriages(data.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load emergency queue");
    } finally {
      setLoading(false);
    }
  }, [priorityFilter, searchQuery]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Handle searching patient inside modal
  const handleSearchPatient = async (query: string) => {
    setPatientSearch(query);
    if (query.trim().length < 2) {
      setPatientResults([]);
      return;
    }

    try {
      setSearchingPatients(true);
      const res = await fetch(`/api/staff/patients?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) {
        setPatientResults(data.data || []);
      }
    } catch {
      // ignore
    } finally {
      setSearchingPatients(false);
    }
  };

  const handleSubmitTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setModalError("Please select a patient for emergency triage.");
      return;
    }
    if (!chiefComplaint.trim()) {
      setModalError("Chief complaint is required.");
      return;
    }

    try {
      setSubmitting(true);
      setModalError(null);

      const payload = {
        patientId: selectedPatient.id,
        chiefComplaint: chiefComplaint.trim(),
        priority,
        painScore: Number(painScore),
        generalCondition: generalCondition.trim() || undefined,
        observations: observations.trim() || undefined,
        systolicBP: systolicBP ? parseInt(systolicBP, 10) : undefined,
        diastolicBP: diastolicBP ? parseInt(diastolicBP, 10) : undefined,
        pulse: pulse ? parseInt(pulse, 10) : undefined,
        temperature: temperature ? parseFloat(temperature) : undefined,
        oxygenSaturation: oxygenSaturation ? parseInt(oxygenSaturation, 10) : undefined,
        respiratoryRate: respiratoryRate ? parseInt(respiratoryRate, 10) : undefined,
      };

      const res = await fetch("/api/staff/emergency/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit triage");
      }

      // Reset modal and reload queue
      setIsModalOpen(false);
      setSelectedPatient(null);
      setPatientSearch("");
      setChiefComplaint("");
      setObservations("");
      setSystolicBP("");
      setDiastolicBP("");
      setPulse("");
      setTemperature("");
      setOxygenSaturation("");
      setRespiratoryRate("");
      fetchQueue();
    } catch (err: any) {
      setModalError(err.message || "Failed to record triage");
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics summary
  const criticalCount = triages.filter((t) => t.priority === "CRITICAL").length;
  const highCount = triages.filter((t) => t.priority === "HIGH").length;
  const urgentCount = triages.filter((t) => t.priority === "URGENT").length;
  const normalCount = triages.filter((t) => t.priority === "NORMAL").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping inline-block" />
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              Emergency Nursing &amp; Triage Station
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Emergency Patient Queue</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Rapid patient triage, priority tagging, and emergency vitals monitoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchQueue}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            New Emergency Triage
          </button>
        </div>
      </div>

      {/* Priority Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setPriorityFilter(priorityFilter === "CRITICAL" ? "ALL" : "CRITICAL")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            priorityFilter === "CRITICAL"
              ? "bg-rose-100 border-rose-400 ring-2 ring-rose-500 shadow-sm"
              : "bg-rose-50 border-rose-200 hover:bg-rose-100/60 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-xs font-bold uppercase">Critical (Priority 1)</span>
            <Flame className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-900">{criticalCount}</p>
        </div>

        <div
          onClick={() => setPriorityFilter(priorityFilter === "HIGH" ? "ALL" : "HIGH")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            priorityFilter === "HIGH"
              ? "bg-amber-100 border-amber-400 ring-2 ring-amber-500 shadow-sm"
              : "bg-amber-50 border-amber-200 hover:bg-amber-100/60 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-bold uppercase">High (Priority 2)</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-900">{highCount}</p>
        </div>

        <div
          onClick={() => setPriorityFilter(priorityFilter === "URGENT" ? "ALL" : "URGENT")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            priorityFilter === "URGENT"
              ? "bg-blue-100 border-blue-400 ring-2 ring-blue-500 shadow-sm"
              : "bg-blue-50 border-blue-200 hover:bg-blue-100/60 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-xs font-bold uppercase">Urgent (Priority 3)</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900">{urgentCount}</p>
        </div>

        <div
          onClick={() => setPriorityFilter(priorityFilter === "NORMAL" ? "ALL" : "NORMAL")}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            priorityFilter === "NORMAL"
              ? "bg-slate-200 border-slate-400 ring-2 ring-slate-500 shadow-sm"
              : "bg-slate-100 border-slate-200 hover:bg-slate-200/60 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-slate-700 mb-1">
            <span className="text-xs font-bold uppercase">Normal (Non-urgent)</span>
            <CheckCircle className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{normalCount}</p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search emergency queue by patient name, MR #, or complaint..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold uppercase text-slate-500">Filter:</span>
          {["ALL", "CRITICAL", "HIGH", "URGENT", "NORMAL"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                priorityFilter === p
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-rose-600 mx-auto mb-2" />
            <p className="text-sm font-medium">Loading emergency triage queue...</p>
          </div>
        ) : triages.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-700">No emergency patients currently queued.</p>
            <p className="text-xs text-slate-400 mt-1">
              Click &quot;New Emergency Triage&quot; to assess and register a new ER arrival.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-slate-700 text-xs font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">MR Number</th>
                  <th className="py-3.5 px-4">Chief Complaint</th>
                  <th className="py-3.5 px-4">Condition &amp; Pain</th>
                  <th className="py-3.5 px-4">Latest Vitals</th>
                  <th className="py-3.5 px-4">Triaged At</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {triages.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${
                          item.priority === "CRITICAL"
                            ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
                            : item.priority === "HIGH"
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : item.priority === "URGENT"
                            ? "bg-blue-100 text-blue-800 border-blue-300"
                            : "bg-slate-100 text-slate-700 border-slate-300"
                        }`}
                      >
                        {item.priority === "CRITICAL" && <Flame className="w-3 h-3 text-rose-600" />}
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {item.patient.firstName} {item.patient.lastName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {item.patient.gender} | Contact: {item.patient.emergencyContactPhone || item.patient.phone}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700">
                      {item.patient.mrNumber || item.patient.patientNumber}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-slate-800 text-xs truncate">
                        {item.chiefComplaint}
                      </div>
                      {item.observations && (
                        <div className="text-[11px] text-slate-400 truncate">{item.observations}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700">
                      <div>{item.generalCondition || "Under observation"}</div>
                      <div className="text-[11px] text-slate-400">Pain: {item.painScore ?? "N/A"}/10</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-800">
                      <div>
                        BP: {item.systolicBP && item.diastolicBP ? `${item.systolicBP}/${item.diastolicBP}` : "—"} | Pulse: {item.pulse || "—"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        SpO2: {item.oxygenSaturation ? `${item.oxygenSaturation}%` : "—"} | RR: {item.respiratoryRate || "—"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      <div>{new Date(item.triagedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      <div className="text-[11px] text-slate-400">By {item.triagedByName}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/staff/patients/${item.patient.id}`}
                        className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-xs"
                      >
                        Clinical View
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Emergency Triage Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">Record Emergency Triage</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTriage} className="p-6 space-y-5">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Patient Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Select Patient <span className="text-rose-600">*</span>
                </label>
                {selectedPatient ? (
                  <div className="flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded-lg">
                    <div>
                      <span className="font-semibold text-teal-900 text-sm">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </span>
                      <span className="text-xs text-teal-700 ml-2 font-mono">
                        ({selectedPatient.mrNumber || selectedPatient.patientNumber})
                      </span>
                      <div className="text-xs text-teal-600 mt-0.5">
                        {selectedPatient.gender} | Phone: {selectedPatient.phone}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPatient(null)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search patient by name, MR #, or phone..."
                        value={patientSearch}
                        onChange={(e) => handleSearchPatient(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    {searchingPatients && <p className="text-xs text-slate-400">Searching...</p>}
                    {patientResults.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                        {patientResults.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedPatient(p);
                              setPatientResults([]);
                              setPatientSearch("");
                            }}
                            className="p-2.5 hover:bg-teal-50/50 cursor-pointer flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-semibold text-slate-800">
                                {p.firstName} {p.lastName}
                              </span>
                              <span className="text-slate-500 ml-2">
                                ({p.mrNumber || p.patientNumber})
                              </span>
                            </div>
                            <span className="text-slate-400">{p.phone}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Priority Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Triage Priority Level <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "CRITICAL", label: "Critical", color: "bg-rose-600 text-white border-rose-600" },
                    { id: "HIGH", label: "High", color: "bg-amber-600 text-white border-amber-600" },
                    { id: "URGENT", label: "Urgent", color: "bg-blue-600 text-white border-blue-600" },
                    { id: "NORMAL", label: "Normal", color: "bg-slate-700 text-white border-slate-700" },
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setPriority(lvl.id as any)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold uppercase border transition-all text-center ${
                        priority === lvl.id
                          ? `${lvl.color} shadow-sm ring-2 ring-offset-1 ring-slate-900`
                          : "bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chief Complaint */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Chief Complaint <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="e.g. Severe chest pain radiating to left arm, shortness of breath..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              {/* Pain Score & Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pain Score (0 - 10): <span className="font-bold text-rose-600">{painScore}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={painScore}
                    onChange={(e) => setPainScore(parseInt(e.target.value, 10))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>0: No Pain</span>
                    <span>5: Moderate</span>
                    <span>10: Worst Possible</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">General Condition</label>
                  <input
                    type="text"
                    value={generalCondition}
                    onChange={(e) => setGeneralCondition(e.target.value)}
                    placeholder="e.g. Acute distress, Conscious, Lethargic..."
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Vitals Snapshot */}
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Emergency Vital Signs (Optional Initial Readings)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Systolic BP (mmHg)</label>
                    <input
                      type="number"
                      placeholder="120"
                      value={systolicBP}
                      onChange={(e) => setSystolicBP(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Diastolic BP (mmHg)</label>
                    <input
                      type="number"
                      placeholder="80"
                      value={diastolicBP}
                      onChange={(e) => setDiastolicBP(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Pulse (bpm)</label>
                    <input
                      type="number"
                      placeholder="75"
                      value={pulse}
                      onChange={(e) => setPulse(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Temp (°F)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="98.6"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">SpO2 (%)</label>
                    <input
                      type="number"
                      placeholder="98"
                      value={oxygenSaturation}
                      onChange={(e) => setOxygenSaturation(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Resp. Rate (/min)</label>
                    <input
                      type="number"
                      placeholder="18"
                      value={respiratoryRate}
                      onChange={(e) => setRespiratoryRate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Observations */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Observations</label>
                <textarea
                  rows={2}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Additional nursing observations, immediate actions taken..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedPatient}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold shadow-xs disabled:opacity-50"
                >
                  {submitting ? "Saving Triage..." : "Confirm & Save Triage"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
