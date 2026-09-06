import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export const dynamic = "force-dynamic";

export default async function DoctorDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "DOCTOR") {
    redirect("/login");
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Welcome Banner */}
        <div className="bg-white p-6 sm:p-8 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Physician Clinical Portal
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome to GIAS Hospital
          </h1>
          <p className="text-slate-600 mt-1">
            You are logged in as: <strong className="text-slate-900">DOCTOR</strong> (Dr. {user.firstName} {user.lastName})
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded bg-blue-50 text-blue-800 text-xs font-medium border border-blue-200">
            <span>Clinical Consultations, Prescriptions &amp; Inpatient Care Portal</span>
          </div>
        </div>

        {/* Status Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Clinical Workspace
            </p>
            <p className="text-base font-bold text-slate-900">
              Doctor Dashboard
            </p>
            <p className="text-xs text-blue-600 font-medium mt-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Physician Profile Active
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
              Role: DOCTOR
            </p>
          </div>
        </div>

        {/* Phase 2 Roadmap Notice */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">
            Clinical Modules Notice (Phase 2 &amp; 3)
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Doctor consultation queues, digital prescriptions (Rx), patient electronic medical records (EMR), and inpatient admission rounds will be implemented in Phase 2 &amp; 3 according to the hospital workflow specification.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
