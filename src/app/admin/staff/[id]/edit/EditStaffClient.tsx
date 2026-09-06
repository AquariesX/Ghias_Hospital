"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FieldError from "@/components/ui/FieldError";

interface Department { id: string; name: string; }

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

const SHIFTS = [
  "Morning (08:00 - 16:00)", "Afternoon (14:00 - 22:00)",
  "Night (22:00 - 08:00)", "On Call",
];

export default function EditStaffClient() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [globalError, setGlobalError] = useState("");
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "", lastName: "", role: "STAFF_NURSE", phone: "", email: "",
    qualification: "", shift: "", status: "ACTIVE", nurseDepartment: "", departmentId: "",
  });

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [staffRes, deptsRes] = await Promise.all([
          fetch(`/api/admin/staff/${id}`),
          fetch("/api/admin/departments?all=true"),
        ]);
        const [staffData, deptsData] = await Promise.all([staffRes.json(), deptsRes.json()]);
        if (cancelled) return;
        if (!staffRes.ok) { setGlobalError(staffData.error || "Failed to load"); return; }
        const s = staffData.data;
        setForm({
          firstName: s.firstName, lastName: s.lastName, role: s.role,
          phone: s.phone, email: s.email, qualification: s.qualification || "",
          shift: s.shift || "", status: s.status,
          nurseDepartment: s.nurseDepartment || "", departmentId: s.departmentId || "",
        });
        setDepartments(deptsData.data || []);
      } catch {
        if (!cancelled) setGlobalError("Failed to load data");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [id]);

  const isNurse = form.role === "HEAD_NURSE" || form.role === "STAFF_NURSE";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: [] }));
    setGlobalError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          qualification: form.qualification || null,
          shift: form.shift || null,
          nurseDepartment: isNurse && form.nurseDepartment ? form.nurseDepartment : null,
          departmentId: form.departmentId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.details) setErrors(data.details);
        else setGlobalError(data.error || "Update failed");
        setIsSubmitting(false);
        return;
      }
      router.push(`/admin/staff/${id}`);
      router.refresh();
    } catch {
      setGlobalError("Network error");
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/staff/${id}/status`, {
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
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Edit Staff"
        backHref={`/admin/staff/${id}`}
        backLabel="Back to Staff"
      />
      {globalError && (
        <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded">{globalError}</div>
      )}

      {/* Quick Status */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-5 flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-slate-500 mr-2">Quick Status:</span>
        {["ACTIVE", "ON_LEAVE", "SHIFT_OFF", "INACTIVE"].map((s) => (
          <button key={s} type="button" onClick={() => setConfirmStatus(s)} disabled={form.status === s}
            className={`text-xs px-3 py-1.5 rounded border font-medium transition-colors ${
              form.status === s ? "bg-teal-700 text-white border-teal-700" : "text-slate-600 border-slate-300 hover:bg-slate-50"
            }`}>
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name <span className="text-rose-500">*</span></label>
              <input name="firstName" value={form.firstName} onChange={handleChange} className={inputClass} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name <span className="text-rose-500">*</span></label>
              <input name="lastName" value={form.lastName} onChange={handleChange} className={inputClass} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email <span className="text-rose-500">*</span></label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className={inputClass} required />
              <FieldError name="email" errors={errors} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone <span className="text-rose-500">*</span></label>
              <input name="phone" value={form.phone} onChange={handleChange} className={inputClass} required />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">Role & Assignment</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Role <span className="text-rose-500">*</span></label>
              <select name="role" value={form.role} onChange={handleChange} className={inputClass}>
                {STAFF_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <select name="departmentId" value={form.departmentId} onChange={handleChange} className={inputClass}>
                <option value="">No department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            {isNurse && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nurse Working Department</label>
                <select name="nurseDepartment" value={form.nurseDepartment} onChange={handleChange} className={inputClass}>
                  <option value="">Not assigned</option>
                  <option value="OPD">OPD</option>
                  <option value="EMERGENCY">Emergency</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Qualification</label>
              <input name="qualification" value={form.qualification} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shift</label>
              <select name="shift" value={form.shift} onChange={handleChange} className={inputClass}>
                <option value="">Select shift...</option>
                {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
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
        title={`Change Status to ${confirmStatus}`}
        message={`Are you sure you want to change this staff member's status to ${confirmStatus}?`}
        confirmLabel="Yes, Change Status"
        isDestructive={confirmStatus === "INACTIVE"}
        onConfirm={() => confirmStatus && handleStatusChange(confirmStatus)}
        onCancel={() => setConfirmStatus(null)}
      />
    </div>
  );
}
