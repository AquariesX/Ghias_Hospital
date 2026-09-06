"use client";

import React, { useState, useEffect } from "react";

interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  timestamp: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

function formatAction(action: string): string {
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(date: string): string {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function getActionColor(action: string): string {
  if (action.startsWith("CREATE")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (action.startsWith("UPDATE")) return "bg-blue-50 text-blue-700 border-blue-200";
  if (action.startsWith("DELETE")) return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function JsonDisplay({ value }: { value: string | null }) {
  if (!value) return <span className="text-slate-400">—</span>;
  let formatted: string | null = null;
  try {
    const parsed = JSON.parse(value);
    formatted = JSON.stringify(parsed, null, 2);
  } catch {
    formatted = null;
  }

  if (formatted !== null) {
    return (
      <pre className="text-xs text-slate-600 bg-slate-50 rounded p-2 max-w-xs overflow-auto">
        {formatted}
      </pre>
    );
  }

  return <span className="text-xs text-slate-600">{value}</span>;
}

export default function AuditLogsClient() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchLogs() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page) });
        if (search) params.set("search", search);
        if (entity) params.set("entity", entity);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        const res = await fetch(`/api/admin/audit-logs?${params}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setLogs(data.data);
          setPagination(data.pagination);
          if (data.meta?.entityTypes) setEntityTypes(data.meta.entityTypes);
        }
      } catch { /* silent */ }
      finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetchLogs();
    return () => { cancelled = true; };
  }, [page, search, entity, dateFrom, dateTo, refreshKey]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Audit Logs</h1>
          {pagination && (
            <p className="text-sm text-slate-500 mt-0.5">{pagination.total} log entries</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="bg-white border border-slate-200 rounded-lg p-4 mb-5 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by user, action, entity..."
          className="flex-1 min-w-48 text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}
          className="text-sm px-3 py-2 border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">All Entities</option>
          {entityTypes.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
          title="From date" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
          title="To date" />
        <button type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded hover:bg-teal-800 transition-colors">
          Filter
        </button>
        {(search || entity || dateFrom || dateTo) && (
          <button type="button" onClick={() => { setSearch(""); setEntity(""); setDateFrom(""); setDateTo(""); setPage(1); }}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
            Clear
          </button>
        )}
      </form>

      {/* Log Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">No audit logs found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Action</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Entity</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">Performed By</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Time</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded border ${getActionColor(log.action)}`}>
                            {formatAction(log.action)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-900">{log.entity}</p>
                          {log.entityId && (
                            <p className="text-xs text-slate-400 font-mono">{log.entityId.substring(0, 8)}...</p>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-sm text-slate-800">{log.userName || "System"}</p>
                          <p className="text-xs text-slate-400">{log.userRole || "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-800">{timeAgo(log.timestamp)}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(log.timestamp).toLocaleString("en-PK", {
                              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(log.oldValue || log.newValue) && (
                            <button
                              onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                              className="text-xs text-teal-700 hover:text-teal-900 font-medium"
                            >
                              {expandedId === log.id ? "Hide" : "View"}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedId === log.id && (
                        <tr className="bg-slate-50">
                          <td colSpan={5} className="px-4 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Before</p>
                                <JsonDisplay value={log.oldValue} />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">After</p>
                                <JsonDisplay value={log.newValue} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Page {pagination.page} of {pagination.totalPages} · {pagination.total} entries
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 transition-colors">
                    Previous
                  </button>
                  <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 transition-colors">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
