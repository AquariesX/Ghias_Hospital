import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import prisma from "@/lib/prisma";
import StatusBadge from "@/components/ui/StatusBadge";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import StaffRowActions from "./StaffRowActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff — GIAS Hospital Admin" };

const PAGE_SIZE = 10;

interface SearchParams {
  page?: string;
  search?: string;
  role?: string;
  status?: string;
  departmentId?: string;
}

const STAFF_ROLES = [
  { value: "HEAD_NURSE", label: "Head Nurse" },
  { value: "STAFF_NURSE", label: "Staff Nurse" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "LAB_TECHNICIAN", label: "Lab Technician" },
  { value: "RADIOLOGY_TECHNICIAN", label: "Radiology Technician" },
  { value: "PHARMACIST", label: "Pharmacist" },
  { value: "SUPPORT_STAFF", label: "Support Staff" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "ADMINISTRATOR", label: "Administrator" },
];

export default async function StaffListPage({
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
  const role = sp.role || "";
  const status = sp.status || "";
  const departmentId = sp.departmentId || "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { staffNumber: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (role) where.role = role;
  if (status) where.status = status;
  if (departmentId) where.departmentId = departmentId;

  const [total, staff, departments] = await Promise.all([
    prisma.staff.count({ where }),
    prisma.staff.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { department: { select: { name: true } } },
    }),
    prisma.department.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const spObj: Record<string, string> = {};
  if (search) spObj.search = search;
  if (role) spObj.role = role;
  if (status) spObj.status = status;
  if (departmentId) spObj.departmentId = departmentId;

  function formatRole(r: string) {
    return STAFF_ROLES.find((x) => x.value === r)?.label || r;
  }

  return (
    <AdminLayout user={user}>
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Staff"
          subtitle={`${total} staff member${total !== 1 ? "s" : ""} registered`}
          actionLabel="Add Staff"
          actionHref="/admin/staff/new"
        />

        {/* Filters */}
        <form method="GET" className="bg-white border border-slate-200 rounded-lg p-4 mb-5 flex flex-wrap gap-3">
          <input
            name="search"
            defaultValue={search}
            placeholder="Search by name, number, email..."
            className="flex-1 min-w-48 text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <select name="role" defaultValue={role}
            className="text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
            <option value="">All Roles</option>
            {STAFF_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <select name="status" defaultValue={status}
            className="text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="SHIFT_OFF">Shift Off</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <select name="departmentId" defaultValue={departmentId}
            className="text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <button type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded hover:bg-teal-800 transition-colors">
            Filter
          </button>
          {(search || role || status || departmentId) && (
            <Link href="/admin/staff"
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
              Clear
            </Link>
          )}
        </form>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {staff.length === 0 ? (
            <EmptyState
              icon="staff"
              title={search ? "No staff match your search" : "No staff registered yet"}
              description={search ? "Try different search terms." : "Add your first staff member."}
              actionLabel={!search ? "Add Staff" : undefined}
              actionHref={!search ? "/admin/staff/new" : undefined}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Staff #</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">Role</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">Department</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">Shift</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staff.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.staffNumber}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{s.firstName} {s.lastName}</p>
                          <p className="text-xs text-slate-400">{s.email}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600 hidden md:table-cell text-xs">{formatRole(s.role)}</td>
                        <td className="px-4 py-3 text-slate-600 hidden lg:table-cell text-xs">{s.department?.name || "—"}</td>
                        <td className="px-4 py-3 text-slate-600 hidden lg:table-cell text-xs">{s.shift || "—"}</td>
                        <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                        <td className="px-4 py-3 text-right">
                          <StaffRowActions
                            staffId={s.id}
                            staffName={`${s.firstName} ${s.lastName}`}
                            role={formatRole(s.role)}
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
                basePath="/admin/staff"
                searchParams={spObj}
              />
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
