"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import FieldError from "@/components/ui/FieldError";

export default function AddDepartmentForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [globalError, setGlobalError] = useState("");
  const [form, setForm] = useState({ code: "", name: "", description: "", status: "ACTIVE" });

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
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          code: form.code.toUpperCase().trim(),
          description: form.description || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsSubmitting(false);
        if (data.details) {
          setErrors(data.details);
        } else {
          setGlobalError(data.error || "Failed to create department");
        }
        return;
      }

      router.push("/admin/departments");
      router.refresh();
    } catch {
      setGlobalError("Network error — please try again");
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full text-sm px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500";

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader
        title="Add New Department"
        subtitle="Create a new hospital department"
        backHref="/admin/departments"
        backLabel="Back to Departments"
      />

      {globalError && (
        <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded">
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Department Code <span className="text-rose-500">*</span>
          </label>
          <input
            name="code"
            value={form.code}
            onChange={handleChange}
            className={`${inputClass} uppercase font-mono`}
            placeholder="CARDIOLOGY"
            required
          />
          <p className="text-xs text-slate-400 mt-1">
            Uppercase letters, numbers, and underscores only. E.g. OPD, GEN_MED, CARD
          </p>
          <FieldError name="code" errors={errors} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Department Name <span className="text-rose-500">*</span>
          </label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className={inputClass}
            placeholder="Cardiology & Cardiac Care"
            required
          />
          <FieldError name="name" errors={errors} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            className={inputClass}
            placeholder="Brief description of this department's services..."
          />
        </div>

        <div className="max-w-xs">
          <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
          <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
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
            {isSubmitting ? "Creating..." : "Create Department"}
          </button>
        </div>
      </form>
    </div>
  );
}
