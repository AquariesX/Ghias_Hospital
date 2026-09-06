import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { getRoleDisplayName, canManagePatients } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import StatusBadge from "@/components/ui/StatusBadge";
import { UserPlus, Users, Search, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff Workspace — GIAS Hospital" };

export default async function StaffDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["NURSE", "RECEPTIONIST", "STAFF"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/login");
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [patientCount, activePatientCount, todayRegisteredCount, recentPatients] =
    await Promise.all([
      prisma.patient.count(),
      prisma.patient.count({ where: { status: "ACTIVE" } }),
      prisma.patient.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.patient.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          patientNumber: true,
          mrNumber: true,
          phone: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

  const canRegister = canManagePatients(user.role);

  return (
    <DashboardLayout user={user}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Welcome Banner */}
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Hospital Operations &amp; Clinical Staff Portal
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome to GIAS Hospital
          </h1>
          <p className="text-slate-600 mt-1">
            Logged in as: <strong className="text-slate-900">{getRoleDisplayName(user.role)}</strong> ({user.firstName} {user.lastName})
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
              Account Status: {user.status}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-teal-50 text-teal-800 text-xs font-semibold border border-teal-200">
              Phase 3 Patient Management Active
            </span>
          </div>
        </div>

        {/* Quick Action Cards for Patient Management */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {canRegister && (
            <Link
              href="/patients/new"
              className="bg-gradient-to-br from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white p-5 rounded-xl shadow-sm transition flex flex-col justify-between group"
            >
              <div>
                <div className="p-2.5 rounded-lg bg-white/10 w-fit mb-3 text-white">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold">Register New Patient</h2>
                <p className="text-xs text-teal-100 mt-1">
                  Create medical record, assign sequential Patient &amp; MR Number.
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold mt-4 text-teal-100 group-hover:translate-x-1 transition">
                <span>Start Registration</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          )}

          <Link
            href="/patients"
            className="bg-white border border-slate-200 hover:border-teal-500 p-5 rounded-xl shadow-xs transition flex flex-col justify-between group"
          >
            <div>
              <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700 w-fit mb-3">
                <Search className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Patient Directory</h2>
              <p className="text-xs text-slate-500 mt-1">
                Lookup patients by MR#, CNIC, Name, or Mobile Phone.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold mt-4 text-teal-600 group-hover:translate-x-1 transition">
              <span>Search Records ({patientCount} total)</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col justify-between">
            <div>
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 w-fit mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Today&apos;s Registrations</h2>
              <p className="text-3xl font-bold text-teal-700 mt-2">{todayRegisteredCount}</p>
              <p className="text-xs text-slate-400 mt-1">
                {activePatientCount} active patients in registry
              </p>
            </div>
            <div className="text-xs text-slate-400 mt-2">
              Updated in real-time
            </div>
          </div>
        </div>

        {/* Recent Patients Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Recent Patient Registrations</h2>
            <Link
              href="/patients"
              className="text-xs font-semibold text-teal-600 hover:text-teal-800 transition"
            >
              View Full Directory &rarr;
            </Link>
          </div>

          {recentPatients.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No patients registered yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/75 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Patient Name</th>
                    <th className="py-2.5 px-4">Patient #</th>
                    <th className="py-2.5 px-4">MR #</th>
                    <th className="py-2.5 px-4">Phone</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentPatients.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {p.firstName} {p.lastName}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">
                        {p.patientNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">
                        {p.mrNumber || "—"}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {p.phone}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/patients/${p.id}`}
                          className="text-xs font-semibold text-teal-600 hover:text-teal-800"
                        >
                          View File →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Operational Modules Info */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800">
            GIAS Operations Status:
          </p>
          <p>
            Patient Registry and Profile features (Phase 3) are active. Appointment booking, doctor consultation scheduling, and emergency triage workflows will integrate with these records in subsequent phases.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
