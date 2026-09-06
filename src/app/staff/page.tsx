import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { getRoleDisplayName } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function StaffDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["NURSE", "RECEPTIONIST", "STAFF"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/login");
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Welcome Banner */}
        <div className="bg-white p-6 sm:p-8 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Hospital Operations &amp; Clinical Staff Portal
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome to GIAS Hospital
          </h1>
          <p className="text-slate-600 mt-1">
            You are logged in as: <strong className="text-slate-900">{user.role}</strong> ({user.firstName} {user.lastName})
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-50 text-emerald-800 text-xs font-medium border border-emerald-200">
            <span>Role Assigned: {getRoleDisplayName(user.role)}</span>
          </div>
        </div>

        {/* Status Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Operational Portal
            </p>
            <p className="text-base font-bold text-slate-900">
              Staff Workspace
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Connected to GIAS Core
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Account Status
            </p>
            <p className="text-base font-bold text-emerald-700">
              {user.status}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Email: {user.email}
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Last Login
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "First Login"}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Role: {user.role}
            </p>
          </div>
        </div>

        {/* Phase 2/3 Roadmap Notice */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">
            Staff &amp; Nursing Modules Notice (Phase 2 &amp; 3)
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Patient registration, appointment scheduling, token generation, emergency triage assessments, vital sign recordings, nursing notes, and medication administration records (MAR) will be available in subsequent development phases.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
