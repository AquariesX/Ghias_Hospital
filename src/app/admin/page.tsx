import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Welcome Banner */}
        <div className="bg-white p-6 sm:p-8 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-3 h-3 rounded-full bg-purple-600 inline-block"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
              Admin Control Panel
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome to GIAS Hospital
          </h1>
          <p className="text-slate-600 mt-1">
            You are logged in as: <strong className="text-slate-900">ADMIN</strong> ({user.firstName} {user.lastName})
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded bg-purple-50 text-purple-800 text-xs font-medium border border-purple-200">
            <span>Hospital Administration &amp; System Governance Portal</span>
          </div>
        </div>

        {/* Phase 1 Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Active Milestone
            </p>
            <p className="text-base font-bold text-slate-900">
              Phase 1: Foundation &amp; Auth
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              PostgreSQL &amp; Prisma Active
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Authentication Security
            </p>
            <p className="text-base font-bold text-slate-900">
              JWT + HTTP-Only Session
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Bcrypt Hashing (10 rounds) &amp; RBAC
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Last Login Timestamp
            </p>
            <p className="text-sm font-semibold text-slate-800">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "First Login"}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              User Status: <span className="text-emerald-700 font-medium">{user.status}</span>
            </p>
          </div>
        </div>

        {/* Development Notice */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">
            System Notice: Foundation Phase Complete
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Phase 1 establishes the Next.js foundation, PostgreSQL connectivity, Prisma ORM 7 integration, secure authentication, and role-based access control. Clinical and administrative hospital modules (Patient Registration, Appointments, Consultations, Wards, Pharmacy, Billing) will be implemented in subsequent phases.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
