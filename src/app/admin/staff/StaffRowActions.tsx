"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, AlertCircle, AlertTriangle } from "lucide-react";

interface StaffRowActionsProps {
  staffId: string;
  staffName: string;
  role: string;
}

export default function StaffRowActions({
  staffId,
  staffName,
  role,
}: StaffRowActionsProps) {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/staff/${staffId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete staff member");
      }
      setIsConfirmOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to delete staff member");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2.5">
        <Link
          href={`/admin/staff/${staffId}`}
          className="text-xs text-teal-700 hover:text-teal-900 font-medium"
        >
          View
        </Link>
        <Link
          href={`/admin/staff/${staffId}/edit`}
          className="text-xs text-slate-600 hover:text-slate-900 font-medium"
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsConfirmOpen(true);
          }}
          className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-medium transition-colors"
          title="Delete Staff Member"
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
                <h3 className="text-base font-bold text-slate-900">Delete Staff Member</h3>
                <p className="text-xs text-slate-500">Confirm permanent deletion</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete <strong className="text-slate-900">{staffName}</strong> ({role}) and their associated portal user profile?
            </p>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsConfirmOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Staff"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
