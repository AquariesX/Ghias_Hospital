"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FieldError from "@/components/ui/FieldError";
import { Eye, EyeOff, Lock, Sparkles, ShieldCheck, UserCheck } from "lucide-react";

interface Department { id: string; name: string; }

interface LinkedUser {
  id: string;
  email: string;
  username: string | null;
  role: string;
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
  const [linkedUser, setLinkedUser] = useState<LinkedUser | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [globalError, setGlobalError] = useState("");
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
        if (s.user) {
          setLinkedUser(s.user);
        }
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

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let gen = "";
    for (let i = 0; i < 10; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(gen);
    setShowPassword(true);
    setErrors((prev) => ({ ...prev, password: [] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGlobalError("");

    if (newPassword && newPassword.length < 6) {
      setErrors((prev) => ({ ...prev, password: ["Password must be at least 6 characters long"] }));
      return;
    }

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
          password: newPassword.trim() || null,
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
    <div className="max-w-2xl mx-auto space-y-5">
      <PageHeader
        title="Edit Staff"
        backHref={`/admin/staff/${id}`}
        backLabel="Back to Staff"
      />

      {globalError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded">
          {globalError}
        </div>
      )}

      {/* Quick Status Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Current status: <span className="font-semibold text-slate-800">{form.status}</span>
        </div>
        <div className="flex gap-2">
          {form.status !== "ACTIVE" && (
            <button type="button" onClick={() => setConfirmStatus("ACTIVE")}
              className="text-xs px-2.5 py-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors">
              Set Active
            </button>
          )}
          {form.status !== "ON_LEAVE" && (
            <button type="button" onClick={() => setConfirmStatus("ON_LEAVE")}
              className="text-xs px-2.5 py-1 text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors">
              Set On Leave
            </button>
          )}
          {form.status !== "INACTIVE" && (
            <button type="button" onClick={() => setConfirmStatus("INACTIVE")}
              className="text-xs px-2.5 py-1 text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 transition-colors">
              Set Inactive
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">Personal Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First Name <span className="text-rose-500">*</span></label>
              <input name="firstName" value={form.firstName} onChange={handleChange} className={inputClass} required />
              <FieldError name="firstName" errors={errors} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name <span className="text-rose-500">*</span></label>
              <input name="lastName" value={form.lastName} onChange={handleChange} className={inputClass} required />
              <FieldError name="lastName" errors={errors} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email <span className="text-rose-500">*</span></label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className={inputClass} required />
              <FieldError name="email" errors={errors} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone <span className="text-rose-500">*</span></label>
              <input name="phone" value={form.phone} onChange={handleChange} className={inputClass} required />
              <FieldError name="phone" errors={errors} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">Role &amp; Assignment</h2>
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
                  <option value="IPD">IPD (Inpatient Wards)</option>
                  <option value="EMERGENCY">Emergency (ER / Triage)</option>
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

        {/* Dashboard Login & Password Management */}
        <div className="bg-white border border-teal-200 rounded-lg p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-teal-50 text-teal-700">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Dashboard &amp; Portal Account Access</h2>
                <p className="text-xs text-slate-500">Manage login credentials and password</p>
              </div>
            </div>

            {linkedUser ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                Linked ({linkedUser.role})
              </span>
            ) : (
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                No Linked Account
              </span>
            )}
          </div>

          <div className="space-y-3">
            {linkedUser ? (
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[11px]">LOGIN IDENTIFIER:</span>
                  <span className="font-semibold text-slate-900">{linkedUser.email}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[11px]">PORTAL ROLE:</span>
                  <span className="font-semibold text-teal-700">{linkedUser.role}</span>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  Setting a password below will automatically generate and activate a portal user account for this staff member.
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  {linkedUser ? "Reset / Change Password (Optional)" : "Set Login Password"}
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900"
                >
                  <Sparkles className="w-3 h-3" />
                  Generate
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: [] }));
                  }}
                  placeholder={linkedUser ? "Leave blank to keep existing password" : "Enter minimum 6 characters to enable login"}
                  className={`${inputClass} pr-9`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <FieldError name="password" errors={errors} />
              {linkedUser && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Only enter a new password if you wish to reset or change the user&apos;s login credentials.
                </p>
              )}
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
