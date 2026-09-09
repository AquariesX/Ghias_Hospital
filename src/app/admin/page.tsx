import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import prisma from "@/lib/prisma";
import StatusBadge from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Dashboard — GHIAS Hospital" };

function formatAction(action: string): string {
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function formatStaffRole(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  // Real database stats
  const [
    patientCount,
    activePatientCount,
    doctorCount,
    activeDoctorCount,
    staffCount,
    activeStaffCount,
    departmentCount,
    activeDepartmentCount,
    userCount,
    activeUserCount,
    recentPatients,
    recentDoctors,
    recentStaff,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.patient.count({ where: { status: "ACTIVE" } }),
    prisma.doctor.count(),
    prisma.doctor.count({ where: { status: "ACTIVE" } }),
    prisma.staff.count(),
    prisma.staff.count({ where: { status: "ACTIVE" } }),
    prisma.department.count(),
    prisma.department.count({ where: { status: "ACTIVE" } }),
    prisma.user.count(),
    prisma.user.count({ where: { status: "ACTIVE" } }),
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
        bloodGroup: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.doctor.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { department: { select: { name: true } } },
    }),
    prisma.staff.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { department: { select: { name: true } } },
    }),
    prisma.auditLog.findMany({
      take: 6,
      orderBy: { timestamp: "desc" },
      select: {
        id: true,
        action: true,
        entity: true,
        userName: true,
        userRole: true,
        timestamp: true,
      },
    }),
  ]);

  const stats = [
    {
      label: "Total Patients",
      value: patientCount,
      sub: `${activePatientCount} active`,
      href: "/patients",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    },
    {
      label: "Total Doctors",
      value: doctorCount,
      sub: `${activeDoctorCount} active`,
      href: "/admin/doctors",
      color: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
    },
    {
      label: "Total Staff",
      value: staffCount,
      sub: `${activeStaffCount} active`,
      href: "/admin/staff",
      color: "text-teal-700",
      bg: "bg-teal-50",
      border: "border-teal-200",
    },
    {
      label: "Departments",
      value: departmentCount,
      sub: `${activeDepartmentCount} active`,
      href: "/admin/departments",
      color: "text-purple-700",
      bg: "bg-purple-50",
      border: "border-purple-200",
    },
    {
      label: "System Users",
      value: userCount,
      sub: `${activeUserCount} active`,
      href: "/admin/users",
      color: "text-slate-700",
      bg: "bg-slate-50",
      border: "border-slate-200",
    },
  ];

  return (
    <AdminLayout user={user}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome Banner */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 mb-1">
                Admin Control Panel
              </p>
              <h1 className="text-xl font-bold text-slate-900">
                Welcome back, {user.firstName} {user.lastName}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                GHIAS Hospital Management System — Phase 2: Admin Module
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-700 font-medium">System Online</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <div className={`bg-white border ${stat.border} rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer`}>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  {stat.label}
                </p>
                <p className={`text-2xl sm:text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Patients */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-800">Recent Registered Patients</h2>
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Phase 3 Live
              </span>
            </div>
            <Link
              href="/patients"
              className="text-xs font-medium text-teal-700 hover:text-teal-900 transition-colors"
            >
              View directory →
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
                    <th className="py-2.5 px-4 text-right">Actions</th>
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
                          View Record →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/patients/new"
              className="text-xs font-medium text-teal-700 hover:text-teal-900 transition-colors"
            >
              + Admit Patient
            </Link>
            <Link
              href="/patients"
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Search by Name / MR / CNIC →
            </Link>
          </div>
        </div>

        {/* Recent Doctors + Recent Staff */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recent Doctors */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Recent Doctors</h2>
              <Link
                href="/admin/doctors"
                className="text-xs font-medium text-teal-700 hover:text-teal-900 transition-colors"
              >
                View all →
              </Link>
            </div>
            {recentDoctors.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No doctors registered yet</div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {recentDoctors.map((doc) => (
                  <li key={doc.id}>
                    <Link
                      href={`/admin/doctors/${doc.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          Dr. {doc.firstName} {doc.lastName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {doc.doctorNumber} · {doc.specialization}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {doc.roomNumber ? `Room ${doc.roomNumber}` : (doc.department?.name || "General")}
                        </p>
                      </div>
                      <StatusBadge status={doc.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
              <Link
                href="/admin/doctors/new"
                className="text-xs font-medium text-teal-700 hover:text-teal-900 transition-colors"
              >
                + Add New Doctor
              </Link>
            </div>
          </div>

          {/* Recent Staff */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Recent Staff</h2>
              <Link
                href="/admin/staff"
                className="text-xs font-medium text-teal-700 hover:text-teal-900 transition-colors"
              >
                View all →
              </Link>
            </div>
            {recentStaff.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No staff registered yet</div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {recentStaff.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/admin/staff/${s.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {s.firstName} {s.lastName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {s.staffNumber} · {formatStaffRole(s.role)}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {s.department?.name || "No department"}
                        </p>
                      </div>
                      <StatusBadge status={s.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
              <Link
                href="/admin/staff/new"
                className="text-xs font-medium text-teal-700 hover:text-teal-900 transition-colors"
              >
                + Add New Staff
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Audit Log */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Recent Audit Activity</h2>
            <Link
              href="/admin/audit-logs"
              className="text-xs font-medium text-teal-700 hover:text-teal-900 transition-colors"
            >
              View all →
            </Link>
          </div>
          {recentAuditLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No audit logs yet</div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {recentAuditLogs.map((log) => (
                <li key={log.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{formatAction(log.action)}</p>
                    <p className="text-xs text-slate-500">
                      {log.entity} · by {log.userName || "System"}{" "}
                      <span className="text-slate-400">({log.userRole})</span>
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0 ml-4">
                    {timeAgo(log.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Admit Patient", href: "/patients/new", icon: "🏥" },
            { label: "Patients Directory", href: "/patients", icon: "📋" },
            { label: "Add Doctor", href: "/admin/doctors/new", icon: "👨‍⚕️" },
            { label: "Add Staff", href: "/admin/staff/new", icon: "👤" },
            { label: "Add Department", href: "/admin/departments/new", icon: "🏢" },
            { label: "System Users", href: "/admin/users", icon: "🔐" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:border-teal-300 hover:shadow-sm transition-all text-center"
            >
              <div className="text-2xl mb-1.5">{item.icon}</div>
              <p className="text-xs font-medium text-slate-700">{item.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
