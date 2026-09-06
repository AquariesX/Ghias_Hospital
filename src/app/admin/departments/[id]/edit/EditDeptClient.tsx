"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function EditDeptClient() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [globalError, setGlobalError] = useState("");
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [doctorCount, setDoctorCount] = useState(0);

  const [form, setForm] = useState({ code: "", name: "", description: "", status: "ACTIVE" });

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const res = await fetch(`/api/admin/departments/${id}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) { setGlobalError(data.error || "Failed to load"); return; }
        const dept = data.data;
        setForm({ code: dept.code, name: dept.name, description: dept.description || "", status: dept.status });
        setDoctorCount(dept._count?.doctors || 0);
      } catch {
        if (!cancelled) setGlobalError("Failed to load");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: [] }));
    setGlobalError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/departments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, description: form.description || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.details) setErrors(data.details);
        else setGlobalError(data.error || "Update failed");
        setIsSubmitting(false);
        return;
      }
      router.push("/admin/departments");
      router.refresh();
    } catch { setGlobalError("Network error"); setIsSubmitting(false); }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/departments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) { setForm((prev) => ({ ...prev, status: data.data.status })); setConfirmStatus(null); }
      else { setGlobalError(data.error || "Status update failed"); setConfirmStatus(null); }
    } catch { setGlobalError("Network error"); setConfirmStatus(null); }
  };

  const inputClass = "w-full text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader
        title="Edit Department"
        backHref="/admin/departments"
        backLabel="Back to Departments"
      />

      {globalError && (
        <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded">{globalError}</div>
      )}

      {/* Quick Status */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-5 flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-slate-500 mr-2">Status:</span>
        {["ACTIVE", "INACTIVE"].map((s) => (
          <button key={s} type="button" onClick={() => setConfirmStatus(s)} disabled={form.status === s}
            className={`text-xs px-3 py-1.5 rounded border font-medium transition-colors ${
              form.status === s ? "bg-teal-700 text-white border-teal-700" : "text-slate-600 border-slate-300 hover:bg-slate-50"
            }`}>
            {s}
          </button>
        ))}
        {doctorCount > 0 && form.status === "ACTIVE" && (
          <p className="text-xs text-amber-600 ml-2">
            ⚠ {doctorCount} active doctor{doctorCount !== 1 ? "s" : ""} assigned
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Department Code <span className="text-rose-500">*</span>
          </label>
          <input name="code" value={form.code} onChange={handleChange}
            className={`${inputClass} uppercase font-mono`} required />
          {errors.code?.length > 0 && <p className="text-xs text-rose-600 mt-1">{errors.code[0]}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Department Name <span className="text-rose-500">*</span>
          </label>
          <input name="name" value={form.name} onChange={handleChange} className={inputClass} required />
          {errors.name?.length > 0 && <p className="text-xs text-rose-600 mt-1">{errors.name[0]}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={3} className={inputClass} />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting}
            className="px-6 py-2 text-sm font-medium text-white bg-teal-700 rounded hover:bg-teal-800 disabled:opacity-60 transition-colors">
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={!!confirmStatus}
        title={`Set Department ${confirmStatus}`}
        message={
          confirmStatus === "INACTIVE" && doctorCount > 0
            ? `This department has ${doctorCount} active doctor(s). Deactivating it may be blocked. Reassign doctors first.`
            : `Are you sure you want to set this department to ${confirmStatus}?`
        }
        confirmLabel={`Yes, set ${confirmStatus}`}
        isDestructive={confirmStatus === "INACTIVE"}
        onConfirm={() => confirmStatus && handleStatusChange(confirmStatus)}
        onCancel={() => setConfirmStatus(null)}
      />
    </div>
  );
}
