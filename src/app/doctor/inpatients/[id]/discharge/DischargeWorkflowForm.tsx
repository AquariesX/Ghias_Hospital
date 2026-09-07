"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Calendar,
  Pill,
  FileText,
  ArrowRight,
  Printer,
} from "lucide-react";

interface MedicationItem {
  medicineName: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  instructions: string;
}

interface DoctorOption {
  id: string;
  name: string;
  specialization: string;
}

interface DischargeWorkflowFormProps {
  admissionId: string;
  admissionNumber: string;
  patientName: string;
  mrNumber: string;
  gender: string;
  roomBedNo: string;
  admissionDate: string;
  provisionalDiagnosis?: string | null;
  attendingDoctorName?: string | null;
  doctors: DoctorOption[];
  isAlreadyDischarged: boolean;
  existingDischargeData?: {
    finalDiagnosis?: string | null;
    dischargeSummary?: string | null;
    dischargeInstructions?: string | null;
    dischargeDate?: string | null;
  };
}

export default function DischargeWorkflowForm({
  admissionId,
  admissionNumber,
  patientName,
  mrNumber,
  gender,
  roomBedNo,
  admissionDate,
  provisionalDiagnosis,
  attendingDoctorName,
  doctors,
  isAlreadyDischarged,
  existingDischargeData,
}: DischargeWorkflowFormProps) {
  const router = useRouter();

  const [finalDiagnosis, setFinalDiagnosis] = useState(
    existingDischargeData?.finalDiagnosis || provisionalDiagnosis || ""
  );
  const [dischargeCondition, setDischargeCondition] = useState("Stable & Improved");
  const [dischargeSummary, setDischargeSummary] = useState(
    existingDischargeData?.dischargeSummary ||
      "Patient received inpatient medical care and treatment. Vital signs stabilized and symptoms subsided adequately for safe outpatient recovery."
  );
  const [dischargeInstructions, setDischargeInstructions] = useState(
    existingDischargeData?.dischargeInstructions ||
      "1. Continue prescribed oral medications strictly as scheduled.\n2. Maintain balanced hydration and recommended diet.\n3. Avoid strenuous physical exertion for 7 days.\n4. Seek immediate emergency medical care if experiencing severe pain, fever > 101°F, shortness of breath, or bleeding."
  );
  const [dischargeDate, setDischargeDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dischargeTime, setDischargeTime] = useState(
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  );

  // Discharge Medications list
  const [medications, setMedications] = useState<MedicationItem[]>([
    {
      medicineName: "Paracetamol",
      dosage: "500 mg",
      frequency: "Every 8 hours",
      route: "Oral",
      duration: "5 days",
      instructions: "After meals if pain or fever occurs",
    },
  ]);

  // Follow-up plan
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpDoctorId, setFollowUpDoctorId] = useState("");
  const [followUpInstructions, setFollowUpInstructions] = useState(
    "Return to OPD clinic for follow-up review in 7 to 10 days."
  );
  const [scheduleFollowUpAppointment, setScheduleFollowUpAppointment] = useState(false);

  // Modals and UI status
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    admissionNumber: string;
    dischargeDate: string;
  } | null>(null);

  const handleAddMedication = () => {
    setMedications([
      ...medications,
      {
        medicineName: "",
        dosage: "",
        frequency: "Once daily",
        route: "Oral",
        duration: "5 days",
        instructions: "After meal",
      },
    ]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleMedChange = (index: number, field: keyof MedicationItem, val: string) => {
    const updated = [...medications];
    updated[index][field] = val;
    setMedications(updated);
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!finalDiagnosis.trim()) {
      setErrorMessage("Please specify the final clinical diagnosis.");
      return;
    }
    if (!dischargeSummary.trim()) {
      setErrorMessage("Please enter the hospital course & discharge summary.");
      return;
    }
    if (!dischargeInstructions.trim()) {
      setErrorMessage("Please specify patient care instructions.");
      return;
    }

    setIsConfirmModalOpen(true);
  };

  const handleConfirmDischarge = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        finalDiagnosis: finalDiagnosis.trim(),
        dischargeCondition: dischargeCondition.trim(),
        dischargeSummary: dischargeSummary.trim(),
        dischargeInstructions: dischargeInstructions.trim(),
        dischargeDate,
        dischargeTime,
        medications: medications.filter((m) => m.medicineName.trim().length > 0),
        followUpInstructions: followUpInstructions.trim() || null,
        followUpDate: followUpDate || null,
        followUpDoctorId: followUpDoctorId || null,
        scheduleFollowUpAppointment,
      };

      const res = await fetch(`/api/admissions/${admissionId}/discharge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process discharge");
      }

      setIsConfirmModalOpen(false);
      setSuccessResult({
        admissionNumber: data.data?.admissionNumber || admissionNumber,
        dischargeDate,
      });
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
      setIsConfirmModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAlreadyDischarged && !successResult) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs text-center space-y-4 max-w-xl mx-auto">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Patient Already Discharged</h2>
        <p className="text-xs text-slate-600">
          This patient has already been officially discharged from Admission #{admissionNumber}. Clinical and medication history has been permanently preserved.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href={`/admissions/${admissionId}/discharge-summary`}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-lg transition inline-flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print Discharge Summary</span>
          </Link>
          <Link
            href="/doctor/inpatients"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition"
          >
            Return to Inpatients
          </Link>
        </div>
      </div>
    );
  }

  if (successResult) {
    return (
      <div className="bg-white border border-emerald-200 rounded-2xl p-8 shadow-sm text-center space-y-5 max-w-xl mx-auto">
        <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Discharge Completed Successfully!</h2>
          <p className="text-xs text-slate-600 mt-1">
            Patient <strong className="text-slate-900">{patientName}</strong> ({mrNumber}) has been officially discharged from Admission #{successResult.admissionNumber}.
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Room/Bed {roomBedNo} is released. Discharge medications &amp; timeline audit logs have been recorded.
          </p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-1.5">
          <p><span className="font-semibold text-slate-500">Final Diagnosis:</span> {finalDiagnosis}</p>
          <p><span className="font-semibold text-slate-500">Condition:</span> {dischargeCondition}</p>
          <p><span className="font-semibold text-slate-500">Discharge Date:</span> {successResult.dischargeDate}</p>
          {scheduleFollowUpAppointment && followUpDate && (
            <p className="text-teal-700 font-semibold">
              ✓ Follow-up outpatient appointment scheduled for {followUpDate}.
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href={`/admissions/${admissionId}/discharge-summary`}
            className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-lg shadow-sm transition inline-flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>View &amp; Print Discharge Summary</span>
          </Link>
          <Link
            href="/doctor/inpatients"
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition"
          >
            Back to Inpatients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleOpenConfirm} className="space-y-6">
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Patient & Admission Summary Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-teal-400 block tracking-wider">Patient Name</span>
          <p className="font-bold text-sm text-white mt-0.5">{patientName}</p>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">MR: {mrNumber}</p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-teal-400 block tracking-wider">Admission #</span>
          <p className="font-bold text-sm text-white mt-0.5 font-mono">{admissionNumber}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Bed: {roomBedNo}</p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-teal-400 block tracking-wider">Admitted Date</span>
          <p className="font-bold text-sm text-white mt-0.5">{new Date(admissionDate).toLocaleDateString()}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Dr: {attendingDoctorName || "On-call"}</p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-teal-400 block tracking-wider">Provisional Diagnosis</span>
          <p className="font-medium text-slate-200 mt-0.5 truncate">{provisionalDiagnosis || "General Inpatient"}</p>
        </div>
      </div>

      {/* Section 1: Final Diagnosis & Discharge Condition */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-600"></span>
          1. Clinical Discharge Diagnosis &amp; Condition
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Final Confirmed Diagnosis <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={finalDiagnosis}
              onChange={(e) => setFinalDiagnosis(e.target.value)}
              placeholder="e.g. Acute Appendicitis - Post Laparoscopic Appendectomy"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Patient Condition at Discharge <span className="text-rose-500">*</span>
            </label>
            <select
              value={dischargeCondition}
              onChange={(e) => setDischargeCondition(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            >
              <option value="Stable & Improved">Stable &amp; Improved</option>
              <option value="Fully Recovered">Fully Recovered</option>
              <option value="Stable with Medication">Stable with Medication</option>
              <option value="Referred to Tertiary Care">Referred to Tertiary Care</option>
              <option value="Discharged against Medical Advice (LAMA)">Discharged against Medical Advice (LAMA)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Discharge Date
            </label>
            <input
              type="date"
              value={dischargeDate}
              onChange={(e) => setDischargeDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Discharge Time
            </label>
            <input
              type="text"
              value={dischargeTime}
              onChange={(e) => setDischargeTime(e.target.value)}
              placeholder="e.g. 02:30 PM"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Hospital Course & Clinical Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-600"></span>
          2. Hospital Course &amp; Treatment Summary
        </h2>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Summary of Hospital Course &amp; Treatment Provided <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            required
            value={dischargeSummary}
            onChange={(e) => setDischargeSummary(e.target.value)}
            placeholder="Document patient's inpatient clinical progress, medical treatments administered, procedures performed, and response..."
            className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Post-Discharge Instructions &amp; Warning Signs <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={4}
            required
            value={dischargeInstructions}
            onChange={(e) => setDischargeInstructions(e.target.value)}
            placeholder="Instructions regarding diet, physical activity, wound management, warning signs to watch for..."
            className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Section 3: Discharge Medications */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
            3. Discharge Medications (Take-Home Prescription)
          </h2>
          <button
            type="button"
            onClick={handleAddMedication}
            className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Medication</span>
          </button>
        </div>

        {medications.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2 text-center">
            No discharge medications added yet. Click &quot;Add Medication&quot; above if take-home medicines are prescribed.
          </p>
        ) : (
          <div className="space-y-3">
            {medications.map((med, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-6 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl items-end text-xs"
              >
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Medicine Name
                  </label>
                  <input
                    type="text"
                    required
                    value={med.medicineName}
                    onChange={(e) => handleMedChange(idx, "medicineName", e.target.value)}
                    placeholder="e.g. Ciprofloxacin"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Dosage
                  </label>
                  <input
                    type="text"
                    required
                    value={med.dosage}
                    onChange={(e) => handleMedChange(idx, "dosage", e.target.value)}
                    placeholder="e.g. 500 mg"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Frequency
                  </label>
                  <input
                    type="text"
                    required
                    value={med.frequency}
                    onChange={(e) => handleMedChange(idx, "frequency", e.target.value)}
                    placeholder="e.g. Twice daily"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    required
                    value={med.duration}
                    onChange={(e) => handleMedChange(idx, "duration", e.target.value)}
                    placeholder="e.g. 5 days"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Instructions
                    </label>
                    <input
                      type="text"
                      value={med.instructions}
                      onChange={(e) => handleMedChange(idx, "instructions", e.target.value)}
                      placeholder="e.g. After meal"
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMedication(idx)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition mt-4"
                    title="Remove Medication"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 4: Follow-up Recommendation & Booking */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          4. Follow-up Care &amp; Clinical Appointment
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Recommended Follow-up Date
            </label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Follow-up Doctor / Department
            </label>
            <select
              value={followUpDoctorId}
              onChange={(e) => setFollowUpDoctorId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
            >
              <option value="">Select Doctor (Optional)</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.specialization})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Follow-up Clinical Instructions
            </label>
            <input
              type="text"
              value={followUpInstructions}
              onChange={(e) => setFollowUpInstructions(e.target.value)}
              placeholder="e.g. Routine OPD review with CBC and ultrasound report"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {followUpDate && (
            <div className="md:col-span-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-teal-800 bg-teal-50 p-3 rounded-xl border border-teal-200">
                <input
                  type="checkbox"
                  checked={scheduleFollowUpAppointment}
                  onChange={(e) => setScheduleFollowUpAppointment(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
                <span>
                  Automatically book this follow-up appointment in GIAS OPD Appointment system for {followUpDate}
                </span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href={`/doctor/inpatients/${admissionId}`}
          className="px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition"
        >
          Cancel
        </Link>
        <button
          type="submit"
          className="px-6 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition flex items-center gap-2"
        >
          <span>Review &amp; Confirm Discharge</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs text-left">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-full bg-rose-50 border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Patient Discharge</h3>
                <p className="text-xs text-slate-500">Official hospital discharge execution</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              You are about to officially discharge <strong className="text-slate-900">{patientName}</strong> (MR #{mrNumber}) from Admission #{admissionNumber}.
            </p>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <p><span className="font-bold text-slate-700">Final Diagnosis:</span> {finalDiagnosis}</p>
              <p><span className="font-bold text-slate-700">Discharge Condition:</span> {dischargeCondition}</p>
              <p><span className="font-bold text-slate-700">Discharge Date &amp; Time:</span> {dischargeDate} at {dischargeTime}</p>
              <p><span className="font-bold text-slate-700">Prescribed Medications:</span> {medications.filter(m => m.medicineName.trim()).length} medicine(s)</p>
              {scheduleFollowUpAppointment && followUpDate && (
                <p><span className="font-bold text-teal-700">Follow-up Booking:</span> Scheduled on {followUpDate}</p>
              )}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] space-y-1">
              <p className="font-bold">System Actions on Confirmation:</p>
              <ul className="list-disc list-inside text-amber-700">
                <li>Admission status will become <strong>DISCHARGED</strong>.</li>
                <li>Room/Bed {roomBedNo} will be released.</li>
                <li>Official discharge prescription will be generated.</li>
                <li>Patient clinical history will be preserved permanently in EMR.</li>
                <li>Timeline &amp; audit records will be written.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Go Back &amp; Edit
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDischarge}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Discharge...</span>
                  </>
                ) : (
                  <span>Yes, Confirm Patient Discharge</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
