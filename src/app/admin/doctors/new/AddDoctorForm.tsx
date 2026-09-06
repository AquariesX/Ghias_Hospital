"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import FieldError from "@/components/ui/FieldError";

interface Department {
  id: string;
  name: string;
  code: string;
}

export default function AddDoctorForm() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [nextNumber, setNextNumber] = useState<string>("Loading...");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [globalError, setGlobalError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    specialization: "",
    phone: "",
    email: "",
    qualifications: "",
    experience: "",
    roomNumber: "",
    consultationFee: "",
    availability: "AVAILABLE",
    status: "ACTIVE",
    departmentId: "",
  });

  useEffect(() => {
    fetch("/api/admin/doctors/next-number")
      .then((r) => r.json())
      .then((d) => setNextNumber(d.data?.doctorNumber || "DOC-00001"))
      .catch(() => setNextNumber("DOC-00001"));

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setGlobalError("");

    try {
      const res = await fetch("/api/admin/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          consultationFee: parseFloat(form.consultationFee) || 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsSubmitting(false);
        if (data.details) {
          setErrors(data.details);
        } else {
          setGlobalError(data.error || "Failed to create doctor");
        }
        return;
      }

      router.push(`/admin/doctors/${data.data.id}`);
      router.refresh();
    } catch {
      setGlobalError("Network error — please try again");
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500";

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Add New Doctor"
        subtitle="Register a new physician in the hospital system"
        backHref="/admin/doctors"
        backLabel="Back to Doctors"
      />

      {globalError && (
        <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded">
          {globalError}
        </div>
      )}

      {/* Doctor Number Preview */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          Auto-generated Doctor Number
        </p>
        <p className="font-mono text-lg font-bold text-slate-800">{nextNumber}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Assigned automatically when the doctor is created.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Personal Info */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">
            Personal Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input name="firstName" value={form.firstName} onChange={handleChange}
                className={inputClass} placeholder="Ahmed" required />
              <FieldError name="firstName" errors={errors} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input name="lastName" value={form.lastName} onChange={handleChange}
                className={inputClass} placeholder="Khan" required />
              <FieldError name="lastName" errors={errors} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                className={inputClass} placeholder="dr.ahmed@giashospital.org" required />
              <FieldError name="email" errors={errors} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input name="phone" value={form.phone} onChange={handleChange}
                className={inputClass} placeholder="0346-5551234" required />
              <FieldError name="phone" errors={errors} />
            </div>
          </div>
        </div>

        {/* Clinical Info */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">
            Clinical Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Specialization <span className="text-rose-500">*</span>
              </label>
              <input name="specialization" value={form.specialization} onChange={handleChange}
                className={inputClass} placeholder="Cardiology" required />
              <FieldError name="specialization" errors={errors} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <select name="departmentId" value={form.departmentId} onChange={handleChange}
                className={inputClass} required>
                <option value="">Select department...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <FieldError name="departmentId" errors={errors} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Qualifications</label>
              <input name="qualifications" value={form.qualifications} onChange={handleChange}
                className={inputClass} placeholder="MBBS, FCPS (Cardiology)" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Experience</label>
              <input name="experience" value={form.experience} onChange={handleChange}
                className={inputClass} placeholder="15 Years" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Room Number</label>
              <input name="roomNumber" value={form.roomNumber} onChange={handleChange}
                className={inputClass} placeholder="OPD-101" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Consultation Fee (PKR) <span className="text-rose-500">*</span>
              </label>
              <input name="consultationFee" type="number" min="0" step="50"
                value={form.consultationFee} onChange={handleChange}
                className={inputClass} placeholder="2500" required />
              <FieldError name="consultationFee" errors={errors} />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">
            Status & Availability
          </h2>
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
            {isSubmitting ? "Adding Doctor..." : "Add Doctor"}
          </button>
        </div>
      </form>
    </div>
  );
}
