import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Link from "next/link";
import { BedDouble, Search, FileText, ArrowRight, Stethoscope, Clock, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Patient Discharge Center — GHIAS Hospital",
};

interface SearchProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function ReceptionDischargeIndexPage({ searchParams }: SearchProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["ADMIN", "RECEPTIONIST", "STAFF", "DOCTOR", "NURSE"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/login");
  }

  const sp = await searchParams;
  const search = sp.search?.trim() || "";

  // Query active admitted inpatients
  const where: any = {
    status: { in: ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"] },
  };

  if (search) {
    where.OR = [
      { admissionNumber: { contains: search, mode: "insensitive" } },
      { roomBedNo: { contains: search, mode: "insensitive" } },
      {
        patient: {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { mrNumber: { contains: search, mode: "insensitive" } },
            { patientNumber: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { cnic: { contains: search, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const [activeAdmissions, totalActiveCount] = await Promise.all([
    prisma.admission.findMany({
      where,
      orderBy: { admissionDate: "desc" },
      include: {
        patient: true,
        doctor: { select: { firstName: true, lastName: true, specialization: true } },
      },
      take: 50,
    }),
    prisma.admission.count({
      where: { status: { in: ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"] } },
    }),
  ]);

  const layoutUser = {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    status: user.status,
  };

  return (
    <DashboardLayout user={layoutUser}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Patient Discharge Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Select an admitted inpatient to prepare discharge notes, medications, and generate printable A4 document
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200">
              Active Inpatients: {totalActiveCount}
            </span>
          </div>
        </div>

        {/* Search Input Bar */}
        <form method="GET" className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search active admitted patient by MR No, Patient Name, CNIC, Phone, Bed..."
              className="w-full text-xs pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-700 bg-white"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            Search
          </button>
        </form>

        {/* Inpatients Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Currently Admitted Patients Eligible for Discharge
            </span>
            <span className="text-xs text-slate-500">Showing {activeAdmissions.length} patient(s)</span>
          </div>

          {activeAdmissions.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <BedDouble className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No matching admitted patients found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Only active inpatients with active admissions can be discharged.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Patient Information</th>
                    <th className="py-3 px-4">Admission # &amp; Bed</th>
                    <th className="py-3 px-4">Admission Date</th>
                    <th className="py-3 px-4">Attending Doctor</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeAdmissions.map((adm) => (
                    <tr key={adm.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-teal-700 text-white font-bold flex items-center justify-center text-xs">
                            {adm.patient.firstName[0]}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {adm.patient.firstName} {adm.patient.lastName}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              MR: {adm.patient.mrNumber || adm.patient.patientNumber} • {adm.patient.gender}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 block">
                          {adm.admissionNumber}
                        </span>
                        <span className="text-[11px] text-teal-800 font-semibold font-mono">
                          {adm.roomBedNo || "Bed unassigned"}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-700">
                        {new Date(adm.admissionDate).toLocaleDateString()} {adm.admissionTime || ""}
                      </td>

                      <td className="py-3 px-4">
                        {adm.doctor ? (
                          <div>
                            <span className="font-semibold text-slate-800 block">
                              Dr. {adm.doctor.firstName} {adm.doctor.lastName}
                            </span>
                            <span className="text-[10px] text-slate-400">{adm.doctor.specialization}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Hospital On-Call</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          {adm.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/reception/patients/${adm.patient.id}/discharge`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-xl transition shadow-2xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Discharge Form</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
