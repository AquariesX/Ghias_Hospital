"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowLeft,
  Heart,
  Activity,
  Plus,
  X,
  Save,
} from "lucide-react";
import FieldError from "@/components/ui/FieldError";

interface PatientProps {
  id: string;
  patientNumber: string;
  mrNumber: string | null;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirthFormatted: string;
  phone: string;
  email: string | null;
  address: string | null;
  bloodGroup: string;
  status: string;
  allergies: string[];
  chronicConditions: string[];
  cnic: string | null;
  maritalStatus: string | null;
  relationType: string | null;
  relatedPersonName: string | null;
  landline: string | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string | null;
}

const COMMON_ALLERGIES = [
  "Penicillin",
  "Sulfa Drugs",
  "Aspirin",
  "NSAIDs",
  "Latex",
  "Peanuts",
  "Iodine / Contrast Dye",
];

const COMMON_CONDITIONS = [
  "Hypertension",
  "Diabetes Mellitus (Type 2)",
  "Asthma",
  "Ischemic Heart Disease",
  "Chronic Kidney Disease",
  "Hepatitis B/C",
];

function calculatePatientAge(dobString: string): string | null {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    years--;
  }
  if (years < 0) return "Future date invalid";
  return `${years} years old`;
}

export default function EditPatientForm({ patient }: { patient: PatientProps }) {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: patient.firstName || "",
    lastName: patient.lastName || "",
    gender: patient.gender || "MALE",
    dateOfBirth: patient.dateOfBirthFormatted || "",
    phone: patient.phone || "",
    email: patient.email || "",
    address: patient.address || "",
    bloodGroup: patient.bloodGroup || "B_POSITIVE",
    status: patient.status || "ACTIVE",

    cnic: patient.cnic || "",
    maritalStatus: patient.maritalStatus || "Married",
    relationType: patient.relationType || "Father",
    relatedPersonName: patient.relatedPersonName || "",
    landline: patient.landline || "",

    allergies: patient.allergies || [],
    chronicConditions: patient.chronicConditions || [],

    emergencyContactName: patient.emergencyContactName || "",
    emergencyContactPhone: patient.emergencyContactPhone || "",
    emergencyContactRelation: patient.emergencyContactRelation || "Spouse",
  });

  const [allergyInput, setAllergyInput] = useState("");
  const [conditionInput, setConditionInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [globalError, setGlobalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: [] }));
    setGlobalError("");
  };

  const handleAddAllergy = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || form.allergies.includes(trimmed)) return;
    setForm((prev) => ({ ...prev, allergies: [...prev.allergies, trimmed] }));
    setAllergyInput("");
  };

  const handleRemoveAllergy = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      allergies: prev.allergies.filter((a) => a !== tag),
    }));
  };

  const handleAddCondition = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || form.chronicConditions.includes(trimmed)) return;
    setForm((prev) => ({
      ...prev,
      chronicConditions: [...prev.chronicConditions, trimmed],
    }));
    setConditionInput("");
  };

  const handleRemoveCondition = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      chronicConditions: prev.chronicConditions.filter((c) => c !== tag),
    }));
  };

  const computedAge = calculatePatientAge(form.dateOfBirth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setGlobalError("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.details) {
          setErrors(data.details);
        }
        setGlobalError(data.error || "Failed to update patient record.");
        setLoading(false);
        return;
      }

      setSuccessMsg("Patient record updated successfully. Redirecting to profile...");
      setTimeout(() => {
        router.push(`/patients/${patient.id}`);
        router.refresh();
      }, 1200);
    } catch {
      setGlobalError("An unexpected network error occurred while updating the patient.");
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-3.5 py-2 text-sm text-black font-medium bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500";
  const labelClass = "block text-xs font-semibold text-black mb-1.5";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Breadcrumb & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href={`/patients/${patient.id}`} className="hover:text-slate-800 flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Patient Profile
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-700">Edit Record</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Edit Patient: {patient.firstName} {patient.lastName}
          </h1>
        </div>

        <Link
          href={`/patients/${patient.id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm"
        >
          Cancel & Return
        </Link>
      </div>

      {/* Immutable Identifiers Notice */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-white/10 text-teal-300">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-teal-300 uppercase tracking-wider">
                Permanent Identifiers (Locked)
              </span>
              <p className="text-xs text-slate-300 mt-0.5">
                Hospital Patient Number and MR Number are immutable and cannot be altered.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white/10 px-3.5 py-1.5 rounded-lg border border-white/10">
              <span className="text-[10px] text-slate-400 block">PATIENT NUMBER</span>
              <span className="font-mono font-bold text-sm text-white">{patient.patientNumber}</span>
            </div>
            {patient.mrNumber && (
              <div className="bg-white/10 px-3.5 py-1.5 rounded-lg border border-white/10">
                <span className="text-[10px] text-slate-400 block">MR NUMBER</span>
                <span className="font-mono font-bold text-sm text-white">{patient.mrNumber}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {globalError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to Save Changes</p>
            <p className="text-xs mt-0.5">{globalError}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Demographics & Clinical Status */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <User className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-900">Demographic &amp; Basic Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* First Name */}
            <div>
              <label className={labelClass}>
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                required
                className={inputClass}
              />
              <FieldError name="firstName" errors={errors} />
            </div>

            {/* Last Name */}
            <div>
              <label className={labelClass}>
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                required
                className={inputClass}
              />
              <FieldError name="lastName" errors={errors} />
            </div>

            {/* Gender */}
            <div>
              <label className={labelClass}>
                Gender <span className="text-rose-500">*</span>
              </label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              <FieldError name="gender" errors={errors} />
            </div>

            {/* Date of Birth */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-black">
                  Date of Birth <span className="text-rose-500">*</span>
                </label>
                {computedAge && (
                  <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {computedAge}
                  </span>
                )}
              </div>
              <input
                type="date"
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={handleChange}
                required
                max={new Date().toISOString().split("T")[0]}
                className={inputClass}
              />
              <FieldError name="dateOfBirth" errors={errors} />
            </div>

            {/* Blood Group */}
            <div>
              <label className={labelClass}>
                Blood Group <span className="text-rose-500">*</span>
              </label>
              <select
                name="bloodGroup"
                value={form.bloodGroup}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="A_POSITIVE">A+ (A Positive)</option>
                <option value="A_NEGATIVE">A- (A Negative)</option>
                <option value="B_POSITIVE">B+ (B Positive)</option>
                <option value="B_NEGATIVE">B- (B Negative)</option>
                <option value="AB_POSITIVE">AB+ (AB Positive)</option>
                <option value="AB_NEGATIVE">AB- (AB Negative)</option>
                <option value="O_POSITIVE">O+ (O Positive)</option>
                <option value="O_NEGATIVE">O- (O Negative)</option>
              </select>
              <FieldError name="bloodGroup" errors={errors} />
            </div>

            {/* Status */}
            <div>
              <label className={labelClass}>
                Patient Status <span className="text-rose-500">*</span>
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="ACTIVE">ACTIVE (Normal)</option>
                <option value="CRITICAL">CRITICAL (High Priority)</option>
                <option value="DISCHARGED">DISCHARGED</option>
              </select>
              <FieldError name="status" errors={errors} />
            </div>

            {/* CNIC */}
            <div>
              <label className={labelClass}>
                CNIC / Identification No
              </label>
              <input
                type="text"
                name="cnic"
                placeholder="e.g. 37405-1234567-1"
                value={form.cnic}
                onChange={handleChange}
                className={`${inputClass} font-mono`}
              />
              <FieldError name="cnic" errors={errors} />
            </div>

            {/* Marital Status */}
            <div>
              <label className={labelClass}>
                Marital Status
              </label>
              <select
                name="maritalStatus"
                value={form.maritalStatus}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>

            {/* Guardian Relation */}
            <div>
              <label className={labelClass}>
                Guardian / Next of Kin Relation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  name="relationType"
                  value={form.relationType}
                  onChange={handleChange}
                  className="px-2 py-2 text-xs text-black font-medium rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="Father">Father (S/o, D/o)</option>
                  <option value="Husband">Husband (W/o)</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </select>
                <input
                  type="text"
                  name="relatedPersonName"
                  placeholder="Relative Name"
                  value={form.relatedPersonName}
                  onChange={handleChange}
                  className="px-2.5 py-2 text-xs text-black font-medium rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Contact & Address */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <Phone className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-900">Contact &amp; Address Information</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className={labelClass}>
                Primary Mobile Phone <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                className={inputClass}
              />
              <FieldError name="phone" errors={errors} />
            </div>

            <div>
              <label className={labelClass}>
                Landline Phone (Optional)
              </label>
              <input
                type="text"
                name="landline"
                value={form.landline}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Email Address (Optional)
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={inputClass}
              />
              <FieldError name="email" errors={errors} />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelClass}>
                Residential Address
              </label>
              <textarea
                name="address"
                rows={2}
                value={form.address}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Emergency Contact Details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <Heart className="w-5 h-5 text-rose-600" />
            <h2 className="text-base font-bold text-slate-900">Emergency Contact Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className={labelClass}>
                Contact Person Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="emergencyContactName"
                value={form.emergencyContactName}
                onChange={handleChange}
                required
                className={inputClass}
              />
              <FieldError name="emergencyContactName" errors={errors} />
            </div>

            <div>
              <label className={labelClass}>
                Emergency Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="emergencyContactPhone"
                value={form.emergencyContactPhone}
                onChange={handleChange}
                required
                className={inputClass}
              />
              <FieldError name="emergencyContactPhone" errors={errors} />
            </div>

            <div>
              <label className={labelClass}>
                Relationship to Patient
              </label>
              <input
                type="text"
                name="emergencyContactRelation"
                value={form.emergencyContactRelation}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Allergies & Chronic Conditions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <Activity className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-900">Clinical Alerts &amp; Medical History</h2>
          </div>

          {/* Allergies */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-black">
              Known Allergies
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={allergyInput}
                onChange={(e) => setAllergyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddAllergy(allergyInput);
                  }
                }}
                placeholder="Type allergy and press Enter or click Add"
                className="flex-1 px-3.5 py-2 text-sm text-black font-medium bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={() => handleAddAllergy(allergyInput)}
                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Presets:</span>
              {COMMON_ALLERGIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleAddAllergy(item)}
                  disabled={form.allergies.includes(item)}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-[11px] font-medium disabled:opacity-40"
                >
                  + {item}
                </button>
              ))}
            </div>

            {/* Selected Allergies Tag list */}
            {form.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {form.allergies.map((allergy) => (
                  <span
                    key={allergy}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200"
                  >
                    <span>{allergy}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAllergy(allergy)}
                      className="hover:text-rose-950"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No allergies registered.</p>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* Chronic Conditions */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-black">
              Chronic Medical Conditions
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={conditionInput}
                onChange={(e) => setConditionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCondition(conditionInput);
                  }
                }}
                placeholder="Type condition and press Enter or click Add"
                className="flex-1 px-3.5 py-2 text-sm text-black font-medium bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={() => handleAddCondition(conditionInput)}
                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Presets:</span>
              {COMMON_CONDITIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleAddCondition(item)}
                  disabled={form.chronicConditions.includes(item)}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-[11px] font-medium disabled:opacity-40"
                >
                  + {item}
                </button>
              ))}
            </div>

            {/* Selected Conditions Tag list */}
            {form.chronicConditions.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {form.chronicConditions.map((cond) => (
                  <span
                    key={cond}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200"
                  >
                    <span>{cond}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(cond)}
                      className="hover:text-blue-950"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No chronic conditions listed.</p>
            )}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href={`/patients/${patient.id}`}
            className="px-5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? "Saving Updates..." : "Save Patient Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
