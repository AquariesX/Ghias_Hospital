import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import prisma from "@/lib/prisma";
import StatusBadge from "@/components/ui/StatusBadge";
import SafeHtmlContent from "@/components/ui/SafeHtmlContent";
import {
  Bed,
  ArrowLeft,
  ArrowRight,
  Activity,
  ClipboardList,
  Pill,
  FileText,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const adm = await prisma.admission.findFirst({
    where: { OR: [{ id }, { admissionNumber: id }] },
    include: { patient: true },
  });
  if (!adm) return { title: "Inpatient Not Found — GHIAS Hospital" };
  return {
    title: `Inpatient: ${adm.patient.firstName} ${adm.patient.lastName} (${adm.roomBedNo}) — GHIAS Hospital`,
  };
}

export default async function DoctorInpatientReviewPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "DOCTOR" && user.role !== "ADMIN") redirect("/login");

  const { id } = await params;

  const admission = await prisma.admission.findFirst({
    where: { OR: [{ id }, { admissionNumber: id }] },
    include: {
      patient: true,
      doctor: {
        include: { department: true },
      },
      vitalSigns: {
        orderBy: { recordedAt: "desc" },
      },
      nursingNotes: {
        orderBy: { recordedAt: "desc" },
      },
      medicationAdministrations: {
        orderBy: { administeredAt: "desc" },
      },
      prescriptions: {
        orderBy: { createdAt: "desc" },
        include: {
          items: true,
          doctor: true,
        },
      },
    },
  });

  if (!admission) {
    notFound();
  }

  const isDischarged = admission.status === "DISCHARGED";
  const admDate = new Date(admission.admissionDate);
  const daysAdmitted = Math.max(
    0,
    Math.floor((Date.now() - admDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  return (
    <DashboardLayout user={user}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Back Link & Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/doctor/inpatients"
              className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition"
              title="Back to Inpatients"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  {admission.patient.firstName} {admission.patient.lastName}
                </h1>
                <StatusBadge status={admission.status} />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                MR: <span className="font-mono font-bold text-teal-700">{admission.patient.mrNumber}</span> •
                Adm: <span className="font-mono font-medium text-slate-600">{admission.admissionNumber}</span> •
                Bed: <span className="font-semibold text-slate-800">{admission.roomBedNo}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isDischarged ? (
              <Link
                href={`/doctor/inpatients/${admission.id}/discharge`}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg shadow-sm transition flex items-center gap-2"
              >
                <span>Initiate Discharge Decision</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href={`/admissions/${admission.id}/discharge-summary`}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-lg shadow-sm transition flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>View &amp; Print Discharge Summary</span>
              </Link>
            )}
          </div>
        </div>

        {/* Discharge Banner if already discharged */}
        {isDischarged && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900">
              <p className="font-bold">Patient Discharged</p>
              <p className="text-emerald-700 mt-0.5">
                Discharged on {admission.dischargeDate ? new Date(admission.dischargeDate).toLocaleDateString() : "—"} at {admission.dischargeTime || "—"}.
                Final Diagnosis: <span className="font-semibold">{admission.finalDiagnosis || "—"}</span>.
              </p>
            </div>
          </div>
        )}

        {/* Patient Profile Card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Demographics</span>
            <p className="text-sm font-bold text-slate-900 mt-1">
              {admission.patient.gender} • {admission.patient.bloodGroup?.replace("_", " ")}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Phone: {admission.patient.phone}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Admission Details</span>
            <p className="text-sm font-bold text-slate-900 mt-1">
              {admDate.toLocaleDateString()} ({daysAdmitted} days)
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Source: {admission.admissionSource} {admission.referenceNumber ? `(${admission.referenceNumber})` : ""}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Attending Doctor</span>
            <p className="text-sm font-bold text-slate-900 mt-1">
              {admission.doctor ? `Dr. ${admission.doctor.firstName} ${admission.doctor.lastName}` : "On-Call Staff"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {admission.doctor?.specialization || "General Inpatient Care"}
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Allergies &amp; Alerts</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {admission.allergies && admission.allergies.length > 0 ? (
                admission.allergies.map((a) => (
                  <span key={a} className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    {a}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">No allergies known</span>
              )}
            </div>
          </div>
        </div>

        {/* Diagnosis & Treatment Plan Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
            Clinical Overview &amp; Treatment Plan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-semibold text-slate-500">Provisional Diagnosis:</p>
              <p className="text-slate-800 mt-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {admission.provisionalDiagnosis || "None recorded at admission."}
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-500">Presenting Complaints:</p>
              <p className="text-slate-800 mt-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {admission.presentingComplaints || "None recorded."}
              </p>
            </div>
            {admission.treatmentPlan && (
              <div className="md:col-span-2">
                <p className="font-semibold text-slate-500">Inpatient Treatment Plan:</p>
                <p className="text-slate-800 mt-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {admission.treatmentPlan}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Longitudinal History Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vitals History */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                <Activity className="w-4 h-4 text-teal-600" />
                <span>Vital Signs Stream ({admission.vitalSigns.length})</span>
              </div>
            </div>

            {admission.vitalSigns.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No vitals logged for this admission.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                {admission.vitalSigns.map((v) => (
                  <div key={v.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-3">
                        {v.systolicBP && v.diastolicBP && (
                          <span className="font-mono font-bold text-slate-900">
                            BP: {v.systolicBP}/{v.diastolicBP}
                          </span>
                        )}
                        {v.pulse && (
                          <span className="font-mono text-slate-700">
                            HR: {v.pulse} bpm
                          </span>
                        )}
                        {v.temperature && (
                          <span className="font-mono text-slate-700">
                            Temp: {Number(v.temperature)}°F
                          </span>
                        )}
                        {v.oxygenSaturation && (
                          <span className="font-mono text-slate-700">
                            SpO2: {v.oxygenSaturation}%
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Recorded by {v.recordedByName} ({v.recordedByRole})
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(v.recordedAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nursing Notes */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                <ClipboardList className="w-4 h-4 text-blue-600" />
                <span>Nursing Observations &amp; Notes ({admission.nursingNotes.length})</span>
              </div>
            </div>

            {admission.nursingNotes.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No nursing notes logged yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
                {admission.nursingNotes.map((note) => (
                  <div key={note.id} className="py-2.5 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{note.patientCondition}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(note.recordedAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="text-slate-700 mt-0.5">
                      <SafeHtmlContent content={note.observation} />
                    </div>
                    {note.intervention && (
                      <div className="text-slate-600 text-[11px]">
                        <span className="font-semibold">Intervention:</span>
                        <SafeHtmlContent content={note.intervention} className="mt-0.5" />
                      </div>
                    )}
                    {note.notes && (
                      <div className="p-2 bg-amber-50/60 rounded text-[11px] text-amber-900 border border-amber-200/60">
                        <span className="font-semibold">Nurse Handoff Notes:</span>
                        <SafeHtmlContent content={note.notes} className="mt-0.5" />
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400">By Nurse: {note.recordedByName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Medication Administration Records (MAR) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                <Pill className="w-4 h-4 text-purple-600" />
                <span>Medication Administration Record (MAR) ({admission.medicationAdministrations.length})</span>
              </div>
            </div>

            {admission.medicationAdministrations.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No medication administrations logged.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                      <th className="px-3 py-2">Medicine</th>
                      <th className="px-3 py-2">Dosage / Route</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Administered By</th>
                      <th className="px-3 py-2">Date &amp; Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {admission.medicationAdministrations.map((mar) => (
                      <tr key={mar.id}>
                        <td className="px-3 py-2 font-semibold text-slate-900">{mar.medicineName}</td>
                        <td className="px-3 py-2 text-slate-600">{mar.dosage} • {mar.route}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            mar.status === "GIVEN"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}>
                            {mar.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{mar.administeredByName}</td>
                        <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">
                          {new Date(mar.administeredAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
