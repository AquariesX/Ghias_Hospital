"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Edit, AlertCircle, AlertTriangle } from "lucide-react";

interface DepartmentRowActionsProps {
  departmentId: string;
  departmentName: string;
  doctorsCount: number;
}

export default function DepartmentRowActions({
  departmentId,
  departmentName,
  doctorsCount,
}: DepartmentRowActionsProps) {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/departments/${departmentId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete department");
      }
      setIsConfirmOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to delete department");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-3">
        <Link
          href={`/admin/departments/${departmentId}/edit`}
          className="inline-flex items-center gap-1 text-xs text-teal-700 hover:text-teal-900 font-medium transition-colors"
        >
          <Edit className="w-3.5 h-3.5" />
          Edit
        </Link>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsConfirmOpen(true);
          }}
          className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-medium transition-colors"
          title="Delete Department"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>

      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs text-left">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-full bg-rose-50 border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Department</h3>
                <p className="text-xs text-slate-500">Confirm permanent deletion</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Are you sure you want to delete <strong className="text-slate-900">&quot;{departmentName}&quot;</strong>?
              {doctorsCount > 0 ? (
                <span className="block mt-2 text-rose-600 font-medium text-xs bg-rose-50 p-2 rounded border border-rose-200">
                  Warning: There are currently {doctorsCount} doctor(s) assigned to this department. You must reassign or remove them first.
                </span>
              ) : (
                <span className="block mt-1 text-slate-500 text-xs">
                  This will remove the department record from the system.
                </span>
              )}
            </p>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
