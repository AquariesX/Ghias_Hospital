import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Link from "next/link";
import { Search, FileText, Printer, Plus, HeartCrack } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Death Certificates Directory — GHIAS Hospital",
};

interface SearchProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function ReceptionDeathCertificateIndexPage({ searchParams }: SearchProps) {
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

  const where: any = {};
  if (search) {
    where.OR = [
      { certificateNumber: { contains: search, mode: "insensitive" } },
      { causeOfDeath: { contains: search, mode: "insensitive" } },
      { bodyReceivedBy: { contains: search, mode: "insensitive" } },
      { receivedByCnic: { contains: search, mode: "insensitive" } },
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

  const [certificates, totalCount] = await Promise.all([
    prisma.deathCertificate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            gender: true,
            mrNumber: true,
            patientNumber: true,
            phone: true,
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
        admission: {
          select: {
            id: true,
            admissionNumber: true,
            roomBedNo: true,
          },
        },
      },
      take: 50,
    }),
    prisma.deathCertificate.count(),
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
            <h1 className="text-xl font-bold text-slate-900">Hospital Death Certificates</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Official hospital death certification records, handover verification &amp; printable documents
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-300">
              Total Issued: {totalCount}
            </span>
            <Link
              href="/patients"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Certificate (Select Patient)</span>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <form method="GET" className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search by Certificate #, Patient Name, MR Number, Receiver Name, CNIC..."
              className="w-full text-xs pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500/20 focus:border-slate-700 bg-white"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Death Certificates List Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Issued Hospital Death Certificates
            </span>
            <span className="text-xs text-slate-500">Showing {certificates.length} record(s)</span>
          </div>

          {certificates.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <HeartCrack className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No death certificates found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                To issue a death certificate, search for a patient in the Patient Directory or Patient File and click [ Death Certificate ].
              </p>
              <Link
                href="/patients"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-black"
              >
                Go to Patient Directory
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Certificate #</th>
                    <th className="py-3 px-4">Deceased Information</th>
                    <th className="py-3 px-4">Date &amp; Time of Death</th>
                    <th className="py-3 px-4">Immediate Cause</th>
                    <th className="py-3 px-4">Body Handed Over To</th>
                    <th className="py-3 px-4">Doctor</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {certificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 block">
                          {cert.certificateNumber}
                        </span>
                        {cert.admission?.roomBedNo && (
                          <span className="text-[10px] text-slate-400">
                            Bed: {cert.admission.roomBedNo}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center text-xs">
                            {cert.patient.firstName[0]}
                          </div>
                          <div>
                            <Link
                              href={`/patients/${cert.patient.id}`}
                              className="font-bold text-slate-900 hover:underline block"
                            >
                              {cert.patient.firstName} {cert.patient.lastName}
                            </Link>
                            <span className="text-[11px] font-mono text-slate-500">
                              MR: {cert.patient.mrNumber || cert.patient.patientNumber} • {cert.patient.gender}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-700">
                        {new Date(cert.dateOfDeath).toLocaleDateString()}{" "}
                        <span className="text-[10px] text-slate-500 font-semibold">
                          {cert.timeOfDeath}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-900 block truncate max-w-xs">
                          {cert.causeOfDeath}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {cert.bodyReceivedBy}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {cert.receivedByRelation || ""}{" "}
                          {cert.receivedByPhone ? `• ${cert.receivedByPhone}` : ""}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {cert.doctor ? (
                          <span className="font-semibold text-slate-800 block">
                            Dr. {cert.doctor.firstName} {cert.doctor.lastName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">
                            {cert.doctorName || "Hospital On-Call"}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/reception/death-certificate/${cert.id}/print`}
                            target="_blank"
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition shadow-2xs"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print / PDF</span>
                          </Link>
                        </div>
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
