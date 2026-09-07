import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import prisma from "@/lib/prisma";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import {
  Bed,
  Stethoscope,
  Clock,
  ArrowRight,
  Search,
  CheckCircle2,
  FileText,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { AdmissionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Inpatient Ward & Discharge — GIAS Hospital",
};

interface SearchParams {
  status?: string;
  search?: string;
}

export default async function DoctorInpatientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "DOCTOR" && user.role !== "ADMIN") redirect("/login");

  const sp = await searchParams;
  const statusFilter = sp.status || "ACTIVE_ONLY";
  const search = sp.search?.trim() || "";

  // Find linked doctor if doctor role
  let doctorId: string | null = null;
  if (user.role === "DOCTOR") {
    const doc = await prisma.doctor.findFirst({
      where: { OR: [{ userId: user.id }, { email: user.email }] },
    });
    if (doc) doctorId = doc.id;
  }

  const where: Record<string, unknown> = {};

  if (statusFilter === "ACTIVE_ONLY") {
    where.status = {
      in: [
        AdmissionStatus.ADMITTED,
        AdmissionStatus.UNDER_TREATMENT,
        AdmissionStatus.DISCHARGE_PENDING,
      ],
    };
  } else if (statusFilter !== "ALL") {
    where.status = statusFilter as AdmissionStatus;
  }

  if (search) {
    where.OR = [
      { admissionNumber: { contains: search, mode: "insensitive" } },
      { roomBedNo: { contains: search, mode: "insensitive" } },
      { provisionalDiagnosis: { contains: search, mode: "insensitive" } },
      {
        patient: {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { mrNumber: { contains: search, mode: "insensitive" } },
            { patientNumber: { contains: search, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const [
    admissions,
    totalActive,
    totalDischargePending,
    totalDischarged,
  ] = await Promise.all([
    prisma.admission.findMany({
      where,
      orderBy: [{ status: "asc" }, { admissionDate: "desc" }],
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            mrNumber: true,
            patientNumber: true,
            gender: true,
            dateOfBirth: true,
            phone: true,
            bloodGroup: true,
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true,
          },
        },
        vitalSigns: {
          orderBy: { recordedAt: "desc" },
          take: 1,
          select: {
            systolicBP: true,
            diastolicBP: true,
            pulse: true,
            temperature: true,
            oxygenSaturation: true,
            recordedAt: true,
          },
        },
        _count: {
          select: {
            nursingNotes: true,
            medicationAdministrations: true,
            prescriptions: true,
          },
        },
      },
    }),
    prisma.admission.count({
      where: {
        status: {
          in: [
            AdmissionStatus.ADMITTED,
            AdmissionStatus.UNDER_TREATMENT,
          ],
        },
      },
    }),
    prisma.admission.count({
      where: { status: AdmissionStatus.DISCHARGE_PENDING },
    }),
    prisma.admission.count({
      where: { status: AdmissionStatus.DISCHARGED },
    }),
  ]);

  return (
    <DashboardLayout user={user}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-teal-100 text-teal-800 rounded-lg">
                <Bed className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Inpatients &amp; Clinical Discharge
                </h1>
                <p className="text-xs text-slate-500">
                  Manage admitted ward patients, clinical reviews, and physician discharge decisions
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Metric KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Inpatients
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totalActive}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Currently occupying beds</p>
            </div>
            <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
              <Bed className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                Discharge Pending
              </p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{totalDischargePending}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Awaiting physician sign-off</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Total Discharged
              </p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{totalDischarged}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Historical records preserved</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <form method="GET" className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              name="search"
              defaultValue={search}
              placeholder="Search by patient name, MR #, admission #, bed..."
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <select
            name="status"
            defaultValue={statusFilter}
            className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
            <option value="ACTIVE_ONLY">Active Inpatients Only</option>
            <option value="ALL">All Admissions (Active + Discharged)</option>
            <option value="ADMITTED">Status: Admitted</option>
            <option value="UNDER_TREATMENT">Status: Under Treatment</option>
            <option value="DISCHARGE_PENDING">Status: Discharge Pending</option>
            <option value="DISCHARGED">Status: Discharged</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition shadow-xs"
          >
            Filter
          </button>

          {(search || statusFilter !== "ACTIVE_ONLY") && (
            <Link
              href="/doctor/inpatients"
              className="px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Reset
            </Link>
          )}
        </form>

        {/* Inpatients Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {admissions.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon="search"
                title={search ? "No inpatients match your search" : "No inpatients currently found"}
                description={
                  search
                    ? "Try adjusting your search terms or filter selection."
                    : "There are currently no patients in this admission category."
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                    <th className="px-4 py-3">Patient &amp; MR #</th>
                    <th className="px-4 py-3">Adm # / Bed</th>
                    <th className="px-4 py-3">Admission Date</th>
                    <th className="px-4 py-3">Attending Doctor</th>
                    <th className="px-4 py-3">Latest Vitals</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {admissions.map((adm) => {
                    const latestVital = adm.vitalSigns[0];
                    const admDate = new Date(adm.admissionDate);
                    const daysAdmitted = Math.max(
                      0,
                      Math.floor((Date.now() - admDate.getTime()) / (1000 * 60 * 60 * 24))
                    );

                    const isDischarged = adm.status === "DISCHARGED";

                    return (
                      <tr key={adm.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">
                            {adm.patient.firstName} {adm.patient.lastName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                            <span className="font-mono text-teal-700 font-semibold">
                              {adm.patient.mrNumber || adm.patient.patientNumber}
                            </span>
                            <span>•</span>
                            <span>{adm.patient.gender}</span>
                            <span>•</span>
                            <span>{adm.patient.bloodGroup?.replace("_", " ") || "—"}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-800">
                            {adm.roomBedNo || "Bed Not Assigned"}
                          </span>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {adm.admissionNumber}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          <p className="text-slate-800 font-medium">
                            {admDate.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {isDischarged
                              ? `Discharged on ${adm.dischargeDate ? new Date(adm.dischargeDate).toLocaleDateString() : "—"}`
                              : `${daysAdmitted} day${daysAdmitted !== 1 ? "s" : ""} admitted`}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          {adm.doctor ? (
                            <div>
                              <p className="font-medium text-slate-800">
                                Dr. {adm.doctor.firstName} {adm.doctor.lastName}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {adm.doctor.specialization}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Hospital On-Call</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {latestVital ? (
                            <div className="text-[11px] text-slate-700 space-y-0.5">
                              {latestVital.systolicBP && latestVital.diastolicBP && (
                                <p>
                                  BP:{" "}
                                  <span className="font-semibold font-mono">
                                    {latestVital.systolicBP}/{latestVital.diastolicBP}
                                  </span>
                                </p>
                              )}
                              {latestVital.pulse && (
                                <p>
                                  HR:{" "}
                                  <span className="font-semibold font-mono">
                                    {latestVital.pulse} bpm
                                  </span>
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              No vitals logged
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge status={adm.status} />
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/doctor/inpatients/${adm.id}`}
                              className="px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 rounded border border-teal-200 transition"
                            >
                              Review
                            </Link>

                            {!isDischarged ? (
                              <Link
                                href={`/doctor/inpatients/${adm.id}/discharge`}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded transition shadow-xs inline-flex items-center gap-1"
                              >
                                <span>Discharge</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            ) : (
                              <Link
                                href={`/admissions/${adm.id}/discharge-summary`}
                                className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition inline-flex items-center gap-1"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Summary</span>
                              </Link>
                            )}
                          </div>
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
    </DashboardLayout>
  );
}
