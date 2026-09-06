import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import prisma from "@/lib/prisma";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

const STAFF_ROLE_LABELS: Record<string, string> = {
  HEAD_NURSE: "Head Nurse", STAFF_NURSE: "Staff Nurse", RECEPTIONIST: "Receptionist",
  LAB_TECHNICIAN: "Lab Technician", RADIOLOGY_TECHNICIAN: "Radiology Technician",
  PHARMACIST: "Pharmacist", SUPPORT_STAFF: "Support Staff", ACCOUNTANT: "Accountant",
  ADMINISTRATOR: "Administrator",
};

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  const { id } = await params;

  const staff = await prisma.staff.findUnique({
    where: { id },
    include: {
      department: true,
      user: { select: { id: true, email: true, username: true, role: true } },
    },
  });

  if (!staff) notFound();

  function infoRow(label: string, value: string | null | undefined) {
    if (!value) return null;
    return (
      <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-3 border-b border-slate-100 last:border-b-0">
        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400 sm:w-44 flex-shrink-0">{label}</dt>
        <dd className="text-sm text-slate-800">{value}</dd>
      </div>
    );
  }

  return (
    <AdminLayout user={user}>
      <div className="max-w-3xl mx-auto space-y-5">
        <PageHeader
          title={`${staff.firstName} ${staff.lastName}`}
          subtitle={staff.staffNumber}
          backHref="/admin/staff"
          backLabel="Back to Staff"
          actionLabel="Edit Staff"
          actionHref={`/admin/staff/${id}/edit`}
        />

        {/* Status */}
        <div className="bg-white border border-slate-200 rounded-lg px-5 py-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Status:</span>
            <StatusBadge status={staff.status} size="md" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Role:</span>
            <span className="text-sm font-medium text-slate-800">
              {STAFF_ROLE_LABELS[staff.role] || staff.role}
            </span>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Staff Profile</h2>
          </div>
          <dl className="px-5">
            {infoRow("Staff Number", staff.staffNumber)}
            {infoRow("Full Name", `${staff.firstName} ${staff.lastName}`)}
            {infoRow("Email Address", staff.email)}
            {infoRow("Phone Number", staff.phone)}
            {infoRow("Role", STAFF_ROLE_LABELS[staff.role] || staff.role)}
            {infoRow("Department", staff.department?.name)}
            {infoRow("Nurse Department", staff.nurseDepartment)}
            {infoRow("Qualification", staff.qualification)}
            {infoRow("Shift", staff.shift)}
            {infoRow("Linked System User",
              staff.user ? `${staff.user.email} (${staff.user.role})` : "No linked user"
            )}
            {infoRow("Registered On", new Date(staff.createdAt).toLocaleDateString("en-PK", {
              day: "2-digit", month: "long", year: "numeric",
            }))}
          </dl>
        </div>

        <div className="flex gap-3 pb-4">
          <Link href={`/admin/staff/${id}/edit`}
            className="px-5 py-2 text-sm font-medium text-white bg-teal-700 rounded hover:bg-teal-800 transition-colors">
            Edit Staff
          </Link>
          <Link href="/admin/staff"
            className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
            Back to Staff
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
