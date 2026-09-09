import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";
import prisma from "@/lib/prisma";
import StatusBadge from "@/components/ui/StatusBadge";
import Pagination from "@/components/ui/Pagination";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import DepartmentRowActions from "./DepartmentRowActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Departments — GHIAS Hospital Admin" };

const PAGE_SIZE = 20;

interface SearchParams { page?: string; search?: string; status?: string; }

export default async function DepartmentsListPage({
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
  const status = sp.status || "";

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;

  const [total, departments] = await Promise.all([
    prisma.department.count({ where }),
    prisma.department.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { doctors: true, staffMembers: true } },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const spObj: Record<string, string> = {};
  if (search) spObj.search = search;
  if (status) spObj.status = status;

  return (
    <AdminLayout user={user}>
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Departments"
          subtitle={`${total} department${total !== 1 ? "s" : ""}`}
          actionLabel="Add Department"
          actionHref="/admin/departments/new"
        />

        {/* Filters */}
        <form method="GET" className="bg-white border border-slate-200 rounded-lg p-4 mb-5 flex flex-wrap gap-3">
          <input name="search" defaultValue={search} placeholder="Search by name or code..."
            className="flex-1 min-w-48 text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <select name="status" defaultValue={status}
            className="text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <button type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded hover:bg-teal-800 transition-colors">
            Filter
          </button>
          {(search || status) && (
            <Link href="/admin/departments"
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
              Clear
            </Link>
          )}
        </form>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {departments.length === 0 ? (
            <EmptyState
              icon="departments"
              title={search ? "No departments match your search" : "No departments registered yet"}
              actionLabel={!search ? "Add Department" : undefined}
              actionHref={!search ? "/admin/departments/new" : undefined}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Code</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">Description</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Doctors</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Staff</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {departments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-medium text-slate-600">{dept.code}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{dept.name}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell max-w-xs truncate">
                          {dept.description || "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                            {dept._count.doctors}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-50 text-teal-700 text-xs font-bold">
                            {dept._count.staffMembers}
                          </span>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={dept.status} /></td>
                        <td className="px-4 py-3 text-right">
                          <DepartmentRowActions
                            departmentId={dept.id}
                            departmentName={dept.name}
                            doctorsCount={dept._count.doctors}
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
                basePath="/admin/departments"
                searchParams={spObj}
              />
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
