import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import prisma from "@/lib/prisma";
import StatusBadge from "@/components/ui/StatusBadge";
import PageHeader from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function DoctorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  const { id } = await params;

  const doctor = await prisma.doctor.findUnique({
    where: { id },
    include: {
      department: true,
      user: { select: { id: true, email: true, username: true, role: true } },
    },
  });

  if (!doctor) notFound();

  function infoRow(label: string, value: string | null | undefined) {
    if (!value) return null;
    return (
      <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-3 border-b border-slate-100 last:border-b-0">
        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400 sm:w-44 flex-shrink-0">
          {label}
        </dt>
        <dd className="text-sm text-slate-800">{value}</dd>
      </div>
    );
  }

  return (
    <AdminLayout user={user}>
      <div className="max-w-3xl mx-auto space-y-5">
        <PageHeader
          title={`Dr. ${doctor.firstName} ${doctor.lastName}`}
          subtitle={doctor.doctorNumber}
          backHref="/admin/doctors"
          backLabel="Back to Doctors"
          actionLabel="Edit Doctor"
          actionHref={`/admin/doctors/${id}/edit`}
        />

        {/* Status row */}
        <div className="bg-white border border-slate-200 rounded-lg px-5 py-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Status:</span>
            <StatusBadge status={doctor.status} size="md" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Availability:</span>
            <StatusBadge status={doctor.availability} size="md" />
          </div>
          <div className="ml-auto flex gap-2">
            {doctor.status !== "ACTIVE" && (
              <Link
                href={`/admin/doctors/${id}/edit`}
                className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors font-medium"
              >
                Activate
              </Link>
            )}
            {doctor.status === "ACTIVE" && (
              <Link
                href={`/admin/doctors/${id}/edit`}
                className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100 transition-colors font-medium"
              >
                Change Status
              </Link>
            )}
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Doctor Profile
            </h2>
          </div>
          <dl className="px-5">
            {infoRow("Doctor Number", doctor.doctorNumber)}
            {infoRow("Full Name", `Dr. ${doctor.firstName} ${doctor.lastName}`)}
            {infoRow("Email Address", doctor.email)}
            {infoRow("Phone Number", doctor.phone)}
            {infoRow("Specialization", doctor.specialization)}
            {infoRow("Room Number", doctor.roomNumber ? `📍 ${doctor.roomNumber}` : "Not assigned")}
            {infoRow("Department", doctor.department?.name || "None / General OPD")}
            {infoRow("Qualifications", doctor.qualifications)}
            {infoRow("Experience", doctor.experience)}
            {infoRow(
              "Consultation Fee",
              `PKR ${Number(doctor.consultationFee).toLocaleString()}`
            )}
            {infoRow(
              "Linked System User",
              doctor.user ? `${doctor.user.email} (${doctor.user.role})` : "No linked user"
            )}
            {infoRow("Registered On", new Date(doctor.createdAt).toLocaleDateString("en-PK", {
              day: "2-digit", month: "long", year: "numeric",
            }))}
          </dl>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-4">
          <Link
            href={`/admin/doctors/${id}/edit`}
            className="px-5 py-2 text-sm font-medium text-white bg-teal-700 rounded hover:bg-teal-800 transition-colors"
          >
            Edit Doctor
          </Link>
          <Link
            href="/admin/doctors"
            className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            Back to Doctors
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
