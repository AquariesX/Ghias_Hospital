"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import FieldError from "@/components/ui/FieldError";
import { Eye, EyeOff, Lock, Sparkles, ShieldCheck } from "lucide-react";

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
  "Morning (08:00 - 16:00)",
  "Afternoon (14:00 - 22:00)",
  "Night (22:00 - 08:00)",
  "Rotating",
  "On-Call",
];

export default function AddStaffForm() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [nextNumber, setNextNumber] = useState<string>("Loading...");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [globalError, setGlobalError] = useState("");

  const [createPortalAccount, setCreatePortalAccount] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "RECEPTIONIST",
    qualification: "",
    shift: "Morning (08:00 - 16:00)",
    status: "ACTIVE",
    departmentId: "",
    nurseDepartment: "OPD",
  });

  useEffect(() => {
    fetch("/api/admin/staff/next-number")
      .then((r) => r.json())
      .then((d) => setNextNumber(d.data?.staffNumber || "STF-00001"))
      .catch(() => setNextNumber("STF-00001"));

    fetch("/api/admin/departments?all=true")
      .then((r) => r.json())
      .then((d) => setDepartments(d.data || []))
      .catch(() => {});
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
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
    setPassword(gen);
    setConfirmPassword(gen);
    setShowPassword(true);
    setErrors((prev) => ({ ...prev, password: [], confirmPassword: [] }));
  };

  const isNurse = form.role === "HEAD_NURSE" || form.role === "STAFF_NURSE";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGlobalError("");

    // Password validation if portal account is enabled
    if (createPortalAccount) {
      if (!password) {
        setErrors((prev) => ({ ...prev, password: ["Password is required to set up dashboard access"] }));
        return;
      }
      if (password.length < 6) {
        setErrors((prev) => ({ ...prev, password: ["Password must be at least 6 characters long"] }));
        return;
      }
      if (password !== confirmPassword) {
        setErrors((prev) => ({ ...prev, confirmPassword: ["Passwords do not match"] }));
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          departmentId: form.departmentId || null,
          nurseDepartment: isNurse ? form.nurseDepartment : null,
          qualification: form.qualification || null,
          shift: form.shift || null,
          createPortalAccount,
          password: createPortalAccount ? password : null,
          username: createPortalAccount && username.trim() ? username.trim() : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsSubmitting(false);
        if (data.details) {
          setErrors(data.details);
        } else {
          setGlobalError(data.error || "Failed to add staff member");
        }
        return;
      }

      router.push(`/admin/staff/${data.data.id}`);
      router.refresh();
    } catch {
      setGlobalError("Network error — please try again");
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500";

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <PageHeader
        title="Add New Staff"
        subtitle="Register a new hospital staff member and configure portal dashboard access"
        backHref="/admin/staff"
        backLabel="Back to Staff"
      />

      {globalError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded">
          {globalError}
        </div>
      )}

      {/* Staff Number Preview */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Auto-generated Staff Number
        </p>
        <p className="font-mono text-lg font-bold text-slate-800">{nextNumber}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Personal Info */}
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Login Identifier) <span className="text-rose-500">*</span></label>
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

        {/* Role & Assignment */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">Role & Assignment</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Role <span className="text-rose-500">*</span></label>
              <select name="role" value={form.role} onChange={handleChange} className={inputClass}>
                {STAFF_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <FieldError name="role" errors={errors} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <select name="departmentId" value={form.departmentId} onChange={handleChange} className={inputClass}>
                <option value="">No department assigned</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            {isNurse && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nurse Working Department</label>
                <select name="nurseDepartment" value={form.nurseDepartment} onChange={handleChange} className={inputClass}>
                  <option value="">Not assigned</option>
                  <option value="OPD">OPD (Outpatient)</option>
                  <option value="EMERGENCY">Emergency</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">Applies to Head Nurse and Staff Nurse roles only.</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Qualification</label>
              <input name="qualification" value={form.qualification} onChange={handleChange} className={inputClass} placeholder="e.g. BSN, Bachelor of Commerce..." />
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

        {/* Dashboard & Portal Access Credentials */}
        <div className="bg-white border border-teal-200 rounded-lg p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-teal-50 text-teal-700">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Dashboard &amp; Portal Login Access</h2>
                <p className="text-xs text-slate-500">Allow this staff member to log in to GIAS Hospital</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={createPortalAccount}
                onChange={(e) => setCreatePortalAccount(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>

          {createPortalAccount ? (
            <div className="space-y-4 pt-1">
              <div className="bg-teal-50/60 border border-teal-100 rounded-md p-3 text-xs text-teal-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Role-based Access Enabled:</span> As a{" "}
                  <strong>{STAFF_ROLES.find((r) => r.value === form.role)?.label}</strong>, this user can access the
                  staff workspace to {form.role === "RECEPTIONIST" ? "register patients, book appointments, and admit patients" : "view patient clinical records and carry out assigned duties"}.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Password <span className="text-rose-500">*</span>
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
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, password: [] }));
                      }}
                      placeholder="Minimum 6 characters"
                      className={`${inputClass} pr-9`}
                      required={createPortalAccount}
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
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrors((prev) => ({ ...prev, confirmPassword: [] }));
                    }}
                    placeholder="Re-enter password"
                    className={inputClass}
                    required={createPortalAccount}
                  />
                  <FieldError name="confirmPassword" errors={errors} />
                </div>

                {/* Optional Username */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom Username (Optional)
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. recep.fatima (leave blank to log in with email)"
                    className={inputClass}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Staff can always log in using their primary email address ({form.email || "e.g. name@hospital.com"}).
                  </p>
                  <FieldError name="username" errors={errors} />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              Portal login disabled. This staff member will not have system user credentials to log in.
            </p>
          )}
        </div>

        {/* Status */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Status</h2>
          <div className="max-w-xs">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Status</label>
            <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="SHIFT_OFF">Shift Off</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 text-sm font-medium text-white bg-teal-700 rounded hover:bg-teal-800 disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? "Adding Staff & Creating Account..." : "Add Staff Member"}
          </button>
        </div>
      </form>
    </div>
  );
}
