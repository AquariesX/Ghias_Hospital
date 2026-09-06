"use client";

import { useState, useEffect } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface User {
  id: string;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const ROLES = ["ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST", "STAFF"];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin", DOCTOR: "Doctor", NURSE: "Nurse",
  RECEPTIONIST: "Receptionist", STAFF: "Staff",
};

export default function UsersClient({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    userName: string;
    newStatus: string;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchUsers() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page) });
        if (search) params.set("search", search);
        if (role) params.set("role", role);
        if (status) params.set("status", status);

        const res = await fetch(`/api/admin/users?${params}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setUsers(data.data);
          setPagination(data.pagination);
        } else {
          setError(data.error || "Failed to load users");
        }
      } catch {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchUsers();
    return () => { cancelled = true; };
  }, [page, search, role, status, refreshKey]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setRefreshKey((k) => k + 1);
  };

  const handleStatusChange = async () => {
    if (!confirmAction) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${confirmAction.userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: confirmAction.newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === confirmAction.userId ? { ...u, status: data.data.status } : u
          )
        );
      } else {
        setError(data.error || "Status update failed");
      }
    } catch { setError("Network error"); }
    finally { setIsUpdating(false); setConfirmAction(null); }
  };

  function getRoleBadge(r: string) {
    const colors: Record<string, string> = {
      ADMIN: "bg-purple-50 text-purple-700 border-purple-200",
      DOCTOR: "bg-blue-50 text-blue-700 border-blue-200",
      NURSE: "bg-teal-50 text-teal-700 border-teal-200",
      RECEPTIONIST: "bg-amber-50 text-amber-700 border-amber-200",
      STAFF: "bg-slate-100 text-slate-600 border-slate-300",
    };
    return (
      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border ${colors[r] || colors.STAFF}`}>
        {ROLE_LABELS[r] || r}
      </span>
    );
  }

  function formatDate(d: string | null): string {
    if (!d) return "Never";
    return new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-lg font-bold text-slate-900">System Users</h1>
          {pagination && (
            <p className="text-sm text-slate-500 mt-0.5">{pagination.total} user{pagination.total !== 1 ? "s" : ""} in the system</p>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded">{error}</div>
      )}

      {/* Filters */}
      <form onSubmit={handleSearch} className="bg-white border border-slate-200 rounded-lg p-4 mb-5 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, username..."
          className="flex-1 min-w-48 text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="text-sm px-3 py-2 border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="text-sm px-3 py-2 border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <button type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded hover:bg-teal-800 transition-colors">
          Search
        </button>
      </form>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No users found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">Username</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">Last Login</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell font-mono text-xs">
                        {u.username || "—"}
                      </td>
                      <td className="px-4 py-3">{getRoleBadge(u.role)}</td>
                      <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">{formatDate(u.lastLoginAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {u.id === currentUserId ? (
                          <span className="text-xs text-slate-400">(You)</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {u.status !== "ACTIVE" && (
                              <button
                                onClick={() => setConfirmAction({ userId: u.id, userName: `${u.firstName} ${u.lastName}`, newStatus: "ACTIVE" })}
                                className="text-xs text-emerald-700 hover:text-emerald-900 font-medium px-2 py-1 rounded hover:bg-emerald-50 transition-colors"
                              >
                                Activate
                              </button>
                            )}
                            {u.status === "ACTIVE" && (
                              <button
                                onClick={() => setConfirmAction({ userId: u.id, userName: `${u.firstName} ${u.lastName}`, newStatus: "SUSPENDED" })}
                                className="text-xs text-amber-700 hover:text-amber-900 font-medium px-2 py-1 rounded hover:bg-amber-50 transition-colors"
                              >
                                Suspend
                              </button>
                            )}
                            {u.status !== "INACTIVE" && (
                              <button
                                onClick={() => setConfirmAction({ userId: u.id, userName: `${u.firstName} ${u.lastName}`, newStatus: "INACTIVE" })}
                                className="text-xs text-rose-700 hover:text-rose-900 font-medium px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                              >
                                Deactivate
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page >= pagination.totalPages}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmAction}
        title={`${confirmAction?.newStatus === "ACTIVE" ? "Activate" : confirmAction?.newStatus === "SUSPENDED" ? "Suspend" : "Deactivate"} User`}
        message={`Are you sure you want to change ${confirmAction?.userName}'s status to ${confirmAction?.newStatus}?`}
        confirmLabel={`Yes, ${confirmAction?.newStatus === "ACTIVE" ? "Activate" : confirmAction?.newStatus === "SUSPENDED" ? "Suspend" : "Deactivate"}`}
        isDestructive={confirmAction?.newStatus !== "ACTIVE"}
        isLoading={isUpdating}
        onConfirm={handleStatusChange}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
