import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import prisma from "@/lib/prisma";
import StatusBadge from "@/components/ui/StatusBadge";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import DoctorRowActions from "./DoctorRowActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Doctors — GIAS Hospital Admin" };

const PAGE_SIZE = 10;

interface SearchParams {
  page?: string;
  search?: string;
  departmentId?: string;
  status?: string;
  availability?: string;
}

export default async function DoctorsListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const search = sp.search || "";
  const departmentId = sp.departmentId || "";
  const status = sp.status || "";
  const availability = sp.availability || "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { doctorNumber: { contains: search, mode: "insensitive" } },
      { specialization: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (departmentId) where.departmentId = departmentId;
  if (status) where.status = status;
  if (availability) where.availability = availability;

  const [total, doctors, departments] = await Promise.all([
    prisma.doctor.count({ where }),
    prisma.doctor.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        department: { select: { id: true, name: true } },
      },
    }),
    prisma.department.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Build search param object for pagination links
  const spObj: Record<string, string> = {};
  if (search) spObj.search = search;
  if (departmentId) spObj.departmentId = departmentId;
  if (status) spObj.status = status;
  if (availability) spObj.availability = availability;

  return (
    <AdminLayout user={user}>
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Doctors"
          subtitle={`${total} doctor${total !== 1 ? "s" : ""} registered`}
          actionLabel="Add Doctor"
          actionHref="/admin/doctors/new"
        />

        {/* Filters */}
        <form method="GET" className="bg-white border border-slate-200 rounded-lg p-4 mb-5 flex flex-wrap gap-3">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search by name, number, specialization..."
            className="flex-1 min-w-48 text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          <select
            name="departmentId"
            defaultValue={departmentId}
            className="text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={status}
            className="text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <select
            name="availability"
            defaultValue={availability}
            className="text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            <option value="">All Availability</option>
            <option value="AVAILABLE">Available</option>
            <option value="BUSY">Busy</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="OFFLINE">Offline</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded hover:bg-teal-800 transition-colors"
          >
            Filter
          </button>
          {(search || departmentId || status || availability) && (
            <Link
              href="/admin/doctors"
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
            >
              Clear
            </Link>
          )}
        </form>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {doctors.length === 0 ? (
            <EmptyState
              icon="doctors"
              title={search ? "No doctors match your search" : "No doctors registered yet"}
              description={
                search
                  ? "Try a different search or clear the filters."
                  : "Add your first doctor to get started."
              }
              actionLabel={!search ? "Add Doctor" : undefined}
              actionHref={!search ? "/admin/doctors/new" : undefined}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Doctor #</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">Specialization & Room</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">Department</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">Fee (PKR)</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Availability</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {doctors.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{doc.doctorNumber}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">Dr. {doc.firstName} {doc.lastName}</p>
                          <p className="text-xs text-slate-400">{doc.email}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-slate-800 font-medium">{doc.specialization}</p>
                          {doc.roomNumber ? (
                            <p className="text-xs font-semibold text-teal-700">📍 Room: {doc.roomNumber}</p>
                          ) : (
                            <p className="text-[11px] text-slate-400">No room</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 hidden lg:table-cell text-xs">
                          {doc.department?.name || <span className="text-slate-400 italic">None</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">
                          {Number(doc.consultationFee).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={doc.availability} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DoctorRowActions
                            doctorId={doc.id}
                            doctorName={`Dr. ${doc.firstName} ${doc.lastName}`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                pageSize={PAGE_SIZE}
                basePath="/admin/doctors"
                searchParams={spObj}
              />
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
