"use client";

import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface DischargeSummaryPrintClientProps {
  admission: {
    id: string;
    admissionNumber: string;
    admissionDate: string;
    admissionTime?: string | null;
    dischargeDate?: string | null;
    dischargeTime?: string | null;
    roomBedNo?: string | null;
    admissionSource: string;
    provisionalDiagnosis?: string | null;
    finalDiagnosis?: string | null;
    dischargeSummary?: string | null;
    dischargeInstructions?: string | null;
    dischargeMedications?: string | null;
    followUpInstructions?: string | null;
    generalExamination?: string | null;
    patient: {
      firstName: string;
      lastName: string;
      mrNumber?: string | null;
      patientNumber: string;
      gender: string;
      dateOfBirth: string;
      phone: string;
      bloodGroup: string;
      allergies: string[];
      emergencyContactName: string;
      emergencyContactPhone: string;
    };
    doctor?: {
      firstName: string;
      lastName: string;
      specialization: string;
      doctorNumber: string;
      department?: { name: string } | null;
    } | null;
    prescriptions: Array<{
      prescriptionNumber: string;
      createdAt: string;
      items: Array<{
        medicineName: string;
        dosage: string;
        frequency: string;
        route: string;
        duration: string;
        instructions?: string | null;
      }>;
    }>;
  };
}

export default function DischargeSummaryPrintClient({
  admission,
}: DischargeSummaryPrintClientProps) {
  const handlePrint = () => {
    window.print();
  };

  const admDate = new Date(admission.admissionDate);
  const disDate = admission.dischargeDate ? new Date(admission.dischargeDate) : null;
  const daysStay = disDate
    ? Math.max(1, Math.ceil((disDate.getTime() - admDate.getTime()) / (1000 * 60 * 60 * 24)))
    : "N/A";

  const dob = new Date(admission.patient.dateOfBirth);
  const ageYears = new Date().getFullYear() - dob.getFullYear();

  // Pick discharge prescription items if available
  const dischargeRx = admission.prescriptions[0];

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 font-sans text-slate-900 print:bg-white print:p-0">
      {/* Top Action Bar (Hidden in Print) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href={`/doctor/inpatients/${admission.id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inpatient Details</span>
        </Link>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 px-4 py-2 rounded-lg shadow-sm transition"
        >
          <Printer className="w-4 h-4" />
          <span>Print Discharge Summary</span>
        </button>
      </div>

      {/* Official Discharge Card Container */}
      <div className="max-w-4xl mx-auto bg-white border border-slate-300 print:border-0 rounded-2xl print:rounded-none shadow-sm print:shadow-none p-8 sm:p-10 space-y-6">
        {/* Hospital Letterhead Header */}
        <div className="border-b-2 border-teal-800 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-800 text-white font-bold text-2xl rounded-xl flex items-center justify-center shadow-xs">
              +
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-wide uppercase">
                GIAS HOSPITAL
              </h1>
              <p className="text-xs font-bold uppercase tracking-wider text-teal-800">
                Inpatient &amp; Emergency Clinical Services
              </p>
              <p className="text-[11px] text-slate-500">
                Department of Clinical Medicine &amp; Surgery • Islamabad / Rawalpindi
              </p>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="inline-block px-3 py-1 bg-teal-50 text-teal-900 font-extrabold uppercase tracking-wider rounded-md border border-teal-200">
              Discharge Summary Card
            </span>
            <p className="text-[11px] font-mono text-slate-500 mt-1">
              Doc ID: {admission.admissionNumber}
            </p>
          </div>
        </div>

        {/* Patient Demographics & Episode Grid */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Patient Name</span>
            <p className="font-bold text-slate-900 text-sm mt-0.5">
              {admission.patient.firstName} {admission.patient.lastName}
            </p>
            <p className="text-[11px] text-slate-500 font-mono mt-0.5">
              MR: {admission.patient.mrNumber || admission.patient.patientNumber}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Age / Gender / Blood</span>
            <p className="font-semibold text-slate-800 mt-0.5">
              {ageYears} yrs • {admission.patient.gender}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Blood Group: {admission.patient.bloodGroup?.replace("_", " ")}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Admission Date / Bed</span>
            <p className="font-semibold text-slate-800 mt-0.5">
              {admDate.toLocaleDateString()}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Ward/Bed: {admission.roomBedNo || "Not assigned"}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Discharge Date &amp; Stay</span>
            <p className="font-semibold text-slate-800 mt-0.5">
              {disDate ? disDate.toLocaleDateString() : "Pending"}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Duration: {daysStay} day{daysStay !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Attending Physician & Admission Source */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-100 pb-3">
          <p>
            <span className="font-bold text-slate-600">Attending Physician:</span>{" "}
            <span className="font-semibold text-slate-900">
              {admission.doctor ? `Dr. ${admission.doctor.firstName} ${admission.doctor.lastName}` : "Hospital Staff"}
            </span>{" "}
            {admission.doctor?.specialization ? `(${admission.doctor.specialization})` : ""}
          </p>
          <p>
            <span className="font-bold text-slate-600">Admission Mode:</span>{" "}
            <span className="font-semibold text-slate-900">{admission.admissionSource}</span>
          </p>
        </div>

        {/* Diagnoses */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Provisional / Admitting Diagnosis
              </span>
              <p className="text-xs text-slate-800 font-medium mt-1">
                {admission.provisionalDiagnosis || "General Acute Care"}
              </p>
            </div>

            <div className="border border-teal-200 bg-teal-50/30 rounded-lg p-3">
              <span className="text-[10px] uppercase font-bold text-teal-800 tracking-wider block">
                Final Confirmed Clinical Diagnosis
              </span>
              <p className="text-xs font-bold text-slate-900 mt-1">
                {admission.finalDiagnosis || "Clinically Stabilized"}
              </p>
            </div>
          </div>
        </div>

        {/* Clinical Summary / Hospital Course */}
        <div className="space-y-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
            Summary of Hospital Course &amp; Treatment Provided
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line pt-1">
            {admission.dischargeSummary || "Patient completed prescribed inpatient therapy and responded satisfactorily."}
          </p>
        </div>

        {/* Discharge Condition */}
        {admission.generalExamination && (
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
              Condition at Discharge
            </h3>
            <p className="text-xs text-slate-700 pt-1 font-medium">
              {admission.generalExamination}
            </p>
          </div>
        )}

        {/* Discharge Medications */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
            Discharge Medications (Prescription on Discharge)
          </h3>

          {dischargeRx && dischargeRx.items && dischargeRx.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-bold text-slate-700 uppercase">
                    <th className="px-3 py-1.5 border-b border-slate-200">#</th>
                    <th className="px-3 py-1.5 border-b border-slate-200">Medicine</th>
                    <th className="px-3 py-1.5 border-b border-slate-200">Dosage</th>
                    <th className="px-3 py-1.5 border-b border-slate-200">Frequency</th>
                    <th className="px-3 py-1.5 border-b border-slate-200">Route</th>
                    <th className="px-3 py-1.5 border-b border-slate-200">Duration</th>
                    <th className="px-3 py-1.5 border-b border-slate-200">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dischargeRx.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-1.5 font-mono text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-1.5 font-bold text-slate-900">{item.medicineName}</td>
                      <td className="px-3 py-1.5 text-slate-700">{item.dosage}</td>
                      <td className="px-3 py-1.5 text-slate-700">{item.frequency}</td>
                      <td className="px-3 py-1.5 text-slate-700">{item.route}</td>
                      <td className="px-3 py-1.5 text-slate-700">{item.duration}</td>
                      <td className="px-3 py-1.5 text-slate-600 italic">{item.instructions || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : admission.dischargeMedications ? (
            <div className="text-xs text-slate-700 whitespace-pre-line bg-slate-50 p-3 rounded-lg border border-slate-200">
              {admission.dischargeMedications}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No take-home medications prescribed.</p>
          )}
        </div>

        {/* Post-Discharge Care & Warnings */}
        <div className="space-y-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1">
            Post-Discharge Care Instructions &amp; Emergency Warnings
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line pt-1">
            {admission.dischargeInstructions || "Follow general medical advice and take medicines as prescribed."}
          </p>
        </div>

        {/* Follow-up Plan */}
        {admission.followUpInstructions && (
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 border-b border-teal-200 pb-1">
              Follow-up Review &amp; Outpatient Plan
            </h3>
            <p className="text-xs text-slate-800 pt-1 font-medium">
              {admission.followUpInstructions}
            </p>
          </div>
        )}

        {/* Signatures & Hospital Legal Seal */}
        <div className="pt-12 grid grid-cols-2 gap-8 text-xs border-t border-slate-200">
          <div>
            <p className="font-bold text-slate-700">Patient / Attendant Signature:</p>
            <div className="mt-8 border-b border-slate-400 w-48"></div>
            <p className="text-[10px] text-slate-400 mt-1">Signature confirms receipt of instructions &amp; summary</p>
          </div>

          <div className="text-right">
            <p className="font-bold text-slate-900">
              {admission.doctor ? `Dr. ${admission.doctor.firstName} ${admission.doctor.lastName}` : "Attending Physician"}
            </p>
            <p className="text-[11px] text-slate-500">
              {admission.doctor?.specialization || "Clinical Consultant"} • GIAS Hospital
            </p>
            <div className="mt-8 border-b border-slate-400 w-48 ml-auto"></div>
            <p className="text-[10px] text-slate-400 mt-1">Authorized Medical Officer Signature &amp; Stamp</p>
          </div>
        </div>

        {/* Print Footer */}
        <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between print:pt-2">
          <span>GIAS Hospital Management System — Automated Clinical Record</span>
          <span>Printed on: {new Date().toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
