"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HeartPulse,
  Activity,
  FileText,
  Clock,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Plus,
  Calendar,
  Phone,
  Flame,
  User,
  ShieldAlert,
} from "lucide-react";

interface VitalSign {
  id: string;
  systolicBP: number | null;
  diastolicBP: number | null;
  pulse: number | null;
  temperature: number | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  painScore: number | null;
  generalCondition: string | null;
  observations: string | null;
  encounterType: string | null;
  recordedByName: string;
  recordedAt: string;
}

interface NursingNote {
  id: string;
  department: string;
  observation: string;
  patientCondition: string;
  intervention: string | null;
  response: string | null;
  notes: string | null;
  recordedByName: string;
  recordedAt: string;
}

interface EmergencyTriage {
  id: string;
  chiefComplaint: string;
  priority: string;
  painScore: number | null;
  generalCondition: string | null;
  observations: string | null;
  systolicBP: number | null;
  diastolicBP: number | null;
  pulse: number | null;
  temperature: number | null;
  oxygenSaturation: number | null;
  triagedByName: string;
  triagedAt: string;
}

interface PatientData {
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
  allergies: string[];
  chronicConditions: string[];
  cnic: string | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string | null;
  vitalSigns: VitalSign[];
  nursingNotes: NursingNote[];
  emergencyTriages: EmergencyTriage[];
  appointments: any[];
}

interface NursePatientClientProps {
  patient: PatientData;
  nurseDepartment: string | null;
}

export default function NursePatientClient({
  patient: initialPatient,
  nurseDepartment,
}: NursePatientClientProps) {
  const [patient, setPatient] = useState<PatientData>(initialPatient);
  const [activeTab, setActiveTab] = useState<"vitals" | "notes" | "triage">("vitals");

  // Vitals form state
  const [vitalsSubmitting, setVitalsSubmitting] = useState(false);
  const [vitalsSuccess, setVitalsSuccess] = useState<string | null>(null);
  const [vitalsError, setVitalsError] = useState<string | null>(null);

  const [systolicBP, setSystolicBP] = useState("");
  const [diastolicBP, setDiastolicBP] = useState("");
  const [pulse, setPulse] = useState("");
  const [temperature, setTemperature] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [oxygenSaturation, setOxygenSaturation] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [painScore, setPainScore] = useState<number | "">("");
  const [generalCondition, setGeneralCondition] = useState("Stable");
  const [observations, setObservations] = useState("");

  // Auto-calculated BMI display
  const weightNum = parseFloat(weight);
  const heightNum = parseFloat(height);
  let liveBmi: string | null = null;
  if (!isNaN(weightNum) && !isNaN(heightNum) && heightNum > 0 && weightNum > 0) {
    const hM = heightNum / 100;
    liveBmi = (weightNum / (hM * hM)).toFixed(2);
  }

  // Nursing notes form state
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  const [noteCondition, setNoteCondition] = useState("");
  const [noteObservation, setNoteObservation] = useState("");
  const [noteIntervention, setNoteIntervention] = useState("");
  const [noteResponse, setNoteResponse] = useState("");
  const [noteAdditional, setNoteAdditional] = useState("");

  // Calculate age
  const birthDate = new Date(patient.dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  const handleRecordVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    setVitalsSubmitting(true);
    setVitalsError(null);
    setVitalsSuccess(null);

    try {
      const payload = {
        systolicBP: systolicBP ? parseInt(systolicBP, 10) : null,
        diastolicBP: diastolicBP ? parseInt(diastolicBP, 10) : null,
        pulse: pulse ? parseInt(pulse, 10) : null,
        temperature: temperature ? parseFloat(temperature) : null,
        respiratoryRate: respiratoryRate ? parseInt(respiratoryRate, 10) : null,
        oxygenSaturation: oxygenSaturation ? parseInt(oxygenSaturation, 10) : null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        painScore: painScore !== "" ? Number(painScore) : null,
        generalCondition: generalCondition.trim() || null,
        observations: observations.trim() || null,
        encounterType: nurseDepartment || "OPD",
      };

      const res = await fetch(`/api/staff/patients/${patient.id}/vitals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record vital signs");
      }

      setVitalsSuccess("Vital signs recorded successfully and added to patient medical record.");
      // Prepend new vital to list
      setPatient((prev) => ({
        ...prev,
        vitalSigns: [data.data, ...prev.vitalSigns],
      }));

      // Reset form
      setSystolicBP("");
      setDiastolicBP("");
      setPulse("");
      setTemperature("");
      setRespiratoryRate("");
      setOxygenSaturation("");
      setWeight("");
      setHeight("");
      setPainScore("");
      setObservations("");
    } catch (err: any) {
      setVitalsError(err.message || "Failed to save vitals");
    } finally {
      setVitalsSubmitting(false);
    }
  };

  const handleRecordNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoteSubmitting(true);
    setNoteError(null);
    setNoteSuccess(null);

    try {
      const payload = {
        observation: noteObservation.trim(),
        patientCondition: noteCondition.trim(),
        intervention: noteIntervention.trim() || null,
        response: noteResponse.trim() || null,
        notes: noteAdditional.trim() || null,
        department: nurseDepartment || "OPD",
      };

      const res = await fetch(`/api/staff/patients/${patient.id}/nursing-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save nursing note");
      }

      setNoteSuccess("Nursing note added successfully.");
      setPatient((prev) => ({
        ...prev,
        nursingNotes: [data.data, ...prev.nursingNotes],
      }));

      // Reset form
      setNoteCondition("");
      setNoteObservation("");
      setNoteIntervention("");
      setNoteResponse("");
      setNoteAdditional("");
    } catch (err: any) {
      setNoteError(err.message || "Failed to save note");
    } finally {
      setNoteSubmitting(false);
    }
  };

  const latestVital = patient.vitalSigns[0];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href={nurseDepartment === "EMERGENCY" ? "/staff/emergency" : "/staff/opd"}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {nurseDepartment === "EMERGENCY" ? "Emergency Queue" : "OPD Queue"}
        </Link>
        <span className="text-xs text-slate-500 font-mono">
          MR#: <strong className="text-slate-800">{patient.mrNumber || patient.patientNumber}</strong>
        </span>
      </div>

      {/* Patient Demographic Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Patient Workspace
              </span>
              <span className="text-xs font-mono text-slate-500">
                {patient.patientNumber}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {age} yrs • {patient.gender} • Blood Group:{" "}
              <strong className="text-slate-800">
                {patient.bloodGroup ? patient.bloodGroup.replace("_", "") : "Not recorded"}
              </strong>
            </p>
          </div>

          <div className="text-right text-xs space-y-1">
            <div className="text-slate-600">
              Phone: <span className="font-semibold text-slate-800">{patient.phone}</span>
            </div>
            {patient.cnic && (
              <div className="text-slate-600 font-mono">
                CNIC: <span className="text-slate-800">{patient.cnic}</span>
              </div>
            )}
            <div className="text-slate-500">
              Emergency: {patient.emergencyContactName} ({patient.emergencyContactPhone})
            </div>
          </div>
        </div>

        {/* Clinical Alert Flags */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Allergies:
          </div>
          {patient.allergies.length > 0 ? (
            patient.allergies.map((a, i) => (
              <span
                key={i}
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200"
              >
                {a}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400 italic">No known allergies</span>
          )}

          <div className="ml-4 flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-500" />
            Chronic Conditions:
          </div>
          {patient.chronicConditions.length > 0 ? (
            patient.chronicConditions.map((c, i) => (
              <span
                key={i}
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
              >
                {c}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400 italic">None reported</span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("vitals")}
          className={`inline-flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "vitals"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          Vital Signs ({patient.vitalSigns.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`inline-flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "notes"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          Nursing Notes ({patient.nursingNotes.length})
        </button>

        {patient.emergencyTriages.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("triage")}
            className={`inline-flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "triage"
                ? "border-rose-600 text-rose-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Flame className="w-4 h-4" />
            Emergency Triage ({patient.emergencyTriages.length})
          </button>
        )}
      </div>

      {/* Tab 1: Vital Signs Workspace */}
      {activeTab === "vitals" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Record Vitals Form (5 Cols) */}
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs h-fit space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-teal-600" />
                Record New Vitals
              </h2>
              <span className="text-[10px] uppercase font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {nurseDepartment || "OPD"} Station
              </span>
            </div>

            {vitalsSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{vitalsSuccess}</span>
              </div>
            )}

            {vitalsError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{vitalsError}</span>
              </div>
            )}

            <form onSubmit={handleRecordVitals} className="space-y-4">
              {/* Blood Pressure */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Systolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 120"
                    value={systolicBP}
                    onChange={(e) => setSystolicBP(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Diastolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 80"
                    value={diastolicBP}
                    onChange={(e) => setDiastolicBP(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Pulse & Temp */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pulse (bpm)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 72"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Temperature (°F)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 98.6"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* RR & SpO2 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Resp. Rate (/min)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 18"
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SpO2 (%)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 98"
                    value={oxygenSaturation}
                    onChange={(e) => setOxygenSaturation(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Weight, Height & Auto-BMI */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 70"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="e.g. 175"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500 font-medium">Calculated BMI:</span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded ${
                      liveBmi
                        ? "bg-teal-100 text-teal-800"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {liveBmi ? `${liveBmi} kg/m²` : "Auto-computed"}
                  </span>
                </div>
              </div>

              {/* Pain Score */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pain Score: <strong className="text-teal-700">{painScore !== "" ? `${painScore} / 10` : "Not assessed"}</strong>
                </label>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setPainScore(score)}
                      className={`flex-1 min-w-[28px] py-1 text-xs font-bold rounded border transition-colors ${
                        painScore === score
                          ? "bg-teal-600 text-white border-teal-600"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>

              {/* General Condition */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  General Condition
                </label>
                <input
                  type="text"
                  value={generalCondition}
                  onChange={(e) => setGeneralCondition(e.target.value)}
                  placeholder="e.g. Stable, Alert, In Pain, Drowsy..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              {/* Observations */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observations / Notes
                </label>
                <textarea
                  rows={2}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Clinical notes, preparation for doctor..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={vitalsSubmitting}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs disabled:opacity-50"
              >
                {vitalsSubmitting ? "Saving Vital Signs..." : "Save Vital Signs"}
              </button>
            </form>
          </div>

          {/* Historical Vitals Table (7 Cols) */}
          <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                Vital Signs History ({patient.vitalSigns.length})
              </h2>
              <span className="text-xs text-slate-400">Append-only clinical record</span>
            </div>

            {patient.vitalSigns.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <HeartPulse className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No vital signs recorded for this patient yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Latest Vitals Callout */}
                {latestVital && (
                  <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs text-teal-800 font-bold uppercase">
                      <span>Latest Recorded Vitals</span>
                      <span>{new Date(latestVital.recordedAt).toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                      <div className="bg-white p-2 rounded border border-teal-100">
                        <span className="text-[10px] uppercase text-slate-400 block">Blood Pressure</span>
                        <strong className="text-slate-900 text-sm">
                          {latestVital.systolicBP && latestVital.diastolicBP
                            ? `${latestVital.systolicBP}/${latestVital.diastolicBP}`
                            : "—"}
                        </strong>
                      </div>
                      <div className="bg-white p-2 rounded border border-teal-100">
                        <span className="text-[10px] uppercase text-slate-400 block">Pulse</span>
                        <strong className="text-slate-900 text-sm">
                          {latestVital.pulse ? `${latestVital.pulse} bpm` : "—"}
                        </strong>
                      </div>
                      <div className="bg-white p-2 rounded border border-teal-100">
                        <span className="text-[10px] uppercase text-slate-400 block">SpO2</span>
                        <strong className="text-slate-900 text-sm">
                          {latestVital.oxygenSaturation ? `${latestVital.oxygenSaturation}%` : "—"}
                        </strong>
                      </div>
                      <div className="bg-white p-2 rounded border border-teal-100">
                        <span className="text-[10px] uppercase text-slate-400 block">BMI</span>
                        <strong className="text-slate-900 text-sm">
                          {latestVital.bmi ? `${latestVital.bmi}` : "—"}
                        </strong>
                      </div>
                    </div>
                    <div className="text-[11px] text-teal-700">
                      Recorded by: {latestVital.recordedByName} ({latestVital.encounterType || "OPD"})
                    </div>
                  </div>
                )}

                {/* All Readings Table */}
                <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-bold uppercase sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Date / Time</th>
                        <th className="py-2.5 px-3">BP</th>
                        <th className="py-2.5 px-3">Pulse</th>
                        <th className="py-2.5 px-3">Temp</th>
                        <th className="py-2.5 px-3">SpO2</th>
                        <th className="py-2.5 px-3">BMI</th>
                        <th className="py-2.5 px-3">Recorded By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
                      {patient.vitalSigns.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-sans text-slate-600">
                            {new Date(v.recordedAt).toLocaleString([], {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="py-2.5 px-3 font-semibold">
                            {v.systolicBP && v.diastolicBP ? `${v.systolicBP}/${v.diastolicBP}` : "—"}
                          </td>
                          <td className="py-2.5 px-3">{v.pulse ? `${v.pulse} bpm` : "—"}</td>
                          <td className="py-2.5 px-3">{v.temperature ? `${v.temperature}°F` : "—"}</td>
                          <td className="py-2.5 px-3">{v.oxygenSaturation ? `${v.oxygenSaturation}%` : "—"}</td>
                          <td className="py-2.5 px-3">{v.bmi ? `${v.bmi}` : "—"}</td>
                          <td className="py-2.5 px-3 font-sans text-slate-500">
                            {v.recordedByName}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Nursing Notes Workspace */}
      {activeTab === "notes" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Add Nursing Note Form (5 Cols) */}
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs h-fit space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                Add Nursing Note
              </h2>
            </div>

            {noteSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{noteSuccess}</span>
              </div>
            )}

            {noteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{noteError}</span>
              </div>
            )}

            <form onSubmit={handleRecordNote} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patient Condition <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={noteCondition}
                  onChange={(e) => setNoteCondition(e.target.value)}
                  placeholder="e.g. Conscious, Oriented, Mild distress..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clinical Observation <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={noteObservation}
                  onChange={(e) => setNoteObservation(e.target.value)}
                  placeholder="Detailed nursing observations..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intervention (Optional)
                </label>
                <textarea
                  rows={2}
                  value={noteIntervention}
                  onChange={(e) => setNoteIntervention(e.target.value)}
                  placeholder="Nursing actions taken (e.g. Oxygen administered, positioned upright)..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patient Response (Optional)
                </label>
                <input
                  type="text"
                  value={noteResponse}
                  onChange={(e) => setNoteResponse(e.target.value)}
                  placeholder="e.g. Patient reported relief, distress lessened..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  rows={2}
                  value={noteAdditional}
                  onChange={(e) => setNoteAdditional(e.target.value)}
                  placeholder="Handoff details or follow-up instructions..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={noteSubmitting}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs disabled:opacity-50"
              >
                {noteSubmitting ? "Saving Note..." : "Save Nursing Note"}
              </button>
            </form>
          </div>

          {/* Historical Nursing Notes List (7 Cols) */}
          <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                Nursing Notes History ({patient.nursingNotes.length})
              </h2>
            </div>

            {patient.nursingNotes.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No nursing notes recorded for this patient yet.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                {patient.nursingNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {note.department}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {new Date(note.recordedAt).toLocaleString()}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-slate-700">Condition: </span>
                      <span className="text-xs text-slate-900 font-medium">{note.patientCondition}</span>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-slate-700">Observation: </span>
                      <p className="text-xs text-slate-800 whitespace-pre-wrap mt-0.5">{note.observation}</p>
                    </div>

                    {note.intervention && (
                      <div>
                        <span className="text-xs font-semibold text-slate-700">Intervention: </span>
                        <p className="text-xs text-slate-800 whitespace-pre-wrap mt-0.5">{note.intervention}</p>
                      </div>
                    )}

                    {note.response && (
                      <div>
                        <span className="text-xs font-semibold text-slate-700">Response: </span>
                        <span className="text-xs text-slate-800">{note.response}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-400">
                      Recorded by: {note.recordedByName}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Emergency Triage History */}
      {activeTab === "triage" && patient.emergencyTriages.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-600" />
              Emergency Triage History ({patient.emergencyTriages.length})
            </h2>
          </div>

          <div className="space-y-4">
            {patient.emergencyTriages.map((tr) => (
              <div
                key={tr.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                      tr.priority === "CRITICAL"
                        ? "bg-rose-100 text-rose-800 border-rose-300"
                        : tr.priority === "HIGH"
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : tr.priority === "URGENT"
                        ? "bg-blue-100 text-blue-800 border-blue-300"
                        : "bg-slate-100 text-slate-700 border-slate-300"
                    }`}
                  >
                    {tr.priority} Priority
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(tr.triagedAt).toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-700">Chief Complaint:</span>
                  <p className="text-sm text-slate-900 font-medium mt-0.5">{tr.chiefComplaint}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-400 block font-sans">BP</span>
                    <strong className="text-slate-800">
                      {tr.systolicBP && tr.diastolicBP ? `${tr.systolicBP}/${tr.diastolicBP}` : "—"}
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-400 block font-sans">Pulse</span>
                    <strong className="text-slate-800">{tr.pulse ? `${tr.pulse} bpm` : "—"}</strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-400 block font-sans">SpO2</span>
                    <strong className="text-slate-800">{tr.oxygenSaturation ? `${tr.oxygenSaturation}%` : "—"}</strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-400 block font-sans">Pain</span>
                    <strong className="text-slate-800">{tr.painScore ?? "—"}/10</strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 pt-1">
                  Triaged by: {tr.triagedByName}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
