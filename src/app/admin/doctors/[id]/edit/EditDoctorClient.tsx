"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FieldError from "@/components/ui/FieldError";

interface Department {
  id: string;
  name: string;
}

interface DoctorData {
  id: string;
  doctorNumber: string;
  firstName: string;
  lastName: string;
  specialization: string;
  phone: string;
  email: string;
  qualifications: string | null;
  experience: string | null;
  roomNumber: string | null;
  consultationFee: string;
  availability: string;
  status: string;
  departmentId: string | null;
}

export default function EditDoctorClient() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [globalError, setGlobalError] = useState("");
  const [doctorNumber, setDoctorNumber] = useState("");
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "", lastName: "", specialization: "", phone: "", email: "", password: "",
    qualifications: "", experience: "", roomNumber: "", consultationFee: "",
    availability: "AVAILABLE", status: "ACTIVE", departmentId: "",
  });

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [docRes, deptsRes] = await Promise.all([
          fetch(`/api/admin/doctors/${id}`),
          fetch("/api/admin/departments?all=true"),
        ]);
        const [docData, deptsData] = await Promise.all([docRes.json(), deptsRes.json()]);

        if (cancelled) return;
        if (!docRes.ok) {
          setGlobalError(docData.error || "Failed to load doctor");
          return;
        }

        const doc: DoctorData = docData.data;
        setDoctorNumber(doc.doctorNumber);
        setForm({
          firstName: doc.firstName,
          lastName: doc.lastName,
          specialization: doc.specialization,
          phone: doc.phone,
          email: doc.email,
          password: "",
          qualifications: doc.qualifications || "",
          experience: doc.experience || "",
          roomNumber: doc.roomNumber || "",
          consultationFee: String(doc.consultationFee),
          availability: doc.availability,
          status: doc.status,
          departmentId: doc.departmentId || "",
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: [] }));
    setGlobalError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setGlobalError("");

    const fee = parseFloat(form.consultationFee);
    if (isNaN(fee)) {
      setErrors({ consultationFee: ["Please enter a valid fee"] });
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/doctors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          departmentId: form.departmentId || null,
          consultationFee: fee,
          qualifications: form.qualifications || null,
          experience: form.experience || null,
          roomNumber: form.roomNumber || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.details) setErrors(data.details);
        else setGlobalError(data.error || "Update failed");
        setIsSubmitting(false);
        return;
      }
      router.push(`/admin/doctors/${id}`);
      router.refresh();
    } catch {
      setGlobalError("Network error — please try again");
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/doctors/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setForm((prev) => ({ ...prev, status: data.data.status }));
        setConfirmStatus(null);
      } else {
        setGlobalError(data.error || "Status update failed");
        setConfirmStatus(null);
      }
    } catch {
      setGlobalError("Network error");
      setConfirmStatus(null);
    }
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
        title={`Edit: Dr. ${form.firstName} ${form.lastName}`}
        subtitle={`Doctor Number: ${doctorNumber}`}
        backHref={`/admin/doctors/${id}`}
        backLabel="Back to Doctor Details"
      />

      {globalError && (
        <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded">
          {globalError}
        </div>
      )}

      {/* Quick Status Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Current Status:</span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              form.status === "ACTIVE"
                ? "bg-emerald-100 text-emerald-800"
                : form.status === "ON_LEAVE"
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {form.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {form.status !== "ACTIVE" && (
            <button
              type="button"
              onClick={() => setConfirmStatus("ACTIVE")}
              className="text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded"
            >
              Set Active
            </button>
          )}
          {form.status !== "ON_LEAVE" && (
            <button
              type="button"
              onClick={() => setConfirmStatus("ON_LEAVE")}
              className="text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1 rounded"
            >
              Set On Leave
            </button>
          )}
          {form.status !== "INACTIVE" && (
            <button
              type="button"
              onClick={() => setConfirmStatus("INACTIVE")}
              className="text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1 rounded"
            >
              Deactivate
            </button>
          )}
        </div>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email <span className="text-rose-500">*</span></label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className={inputClass} required />
              <FieldError name="email" errors={errors} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone <span className="text-rose-500">*</span></label>
              <input name="phone" value={form.phone} onChange={handleChange} className={inputClass} required />
              <FieldError name="phone" errors={errors} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Doctor Portal Password
              </label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                className={inputClass}
                placeholder="Enter new password to reset doctor portal login (leave blank to keep unchanged)"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Leave empty to retain the physician&apos;s current password.
              </p>
              <FieldError name="password" errors={errors} />
            </div>
          </div>
        </div>

        {/* Clinical Info */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-sm font-semibold text-slate-800">
              Clinical & Room Information
            </h2>
            <span className="text-[11px] text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded font-medium">
              Room # is primary location
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Specialization <span className="text-rose-500">*</span>
              </label>
              <input name="specialization" value={form.specialization} onChange={handleChange} className={inputClass} required />
              <FieldError name="specialization" errors={errors} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Doctor Room Number
              </label>
              <input name="roomNumber" value={form.roomNumber} onChange={handleChange} className={inputClass} placeholder="e.g. Room 101 / OPD-3" />
              <p className="text-[11px] text-slate-500 mt-1">
                Primary consultation room where patients will be directed.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Consultation Fee (PKR) <span className="text-rose-500">*</span>
              </label>
              <input name="consultationFee" type="number" min="0" step="50" value={form.consultationFee} onChange={handleChange} className={inputClass} required />
              <FieldError name="consultationFee" errors={errors} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
              </label>
              <select name="departmentId" value={form.departmentId} onChange={handleChange} className={inputClass}>
                <option value="">No Department Assigned (Optional)</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Optional division grouping. Leave blank if doctor is identified by Room Number.
              </p>
              <FieldError name="departmentId" errors={errors} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Qualifications</label>
              <input name="qualifications" value={form.qualifications} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Experience</label>
              <input name="experience" value={form.experience} onChange={handleChange} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Status & Availability */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">Status & Availability</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Availability</label>
              <select name="availability" value={form.availability} onChange={handleChange} className={inputClass}>
                <option value="AVAILABLE">Available</option>
                <option value="BUSY">Busy</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="OFFLINE">Offline</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="INACTIVE">Inactive</option>
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
        message={`Are you sure you want to change this doctor's status to ${confirmStatus}? This will affect their visibility across the system.`}
        confirmLabel="Yes, Change Status"
        isDestructive={confirmStatus === "INACTIVE"}
        onConfirm={() => confirmStatus && handleStatusChange(confirmStatus)}
        onCancel={() => setConfirmStatus(null)}
      />
    </div>
  );
}
