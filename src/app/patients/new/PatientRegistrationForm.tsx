"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import FieldError from "@/components/ui/FieldError";

const COMMON_ALLERGIES = [
  "Penicillin",
  "Sulfa Drugs",
  "Aspirin",
  "NSAIDs",
  "Latex",
  "Iodine / Contrast",
  "Dust / Pollen",
  "Peanuts",
];

const COMMON_CONDITIONS = [
  "Hypertension",
  "Diabetes Type 2",
  "Diabetes Type 1",
  "Ischemic Heart Disease",
  "Asthma",
  "COPD",
  "Chronic Kidney Disease",
  "Hepatitis B / C",
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

export default function PatientRegistrationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  const [nextNumbers, setNextNumbers] = useState<{
    patientNumber: string;
    mrNumber: string;
  }>({
    patientNumber: "Loading...",
    mrNumber: "Loading...",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [globalError, setGlobalError] = useState("");
  const [successData, setSuccessData] = useState<{
    id: string;
    patientNumber: string;
    mrNumber: string;
  } | null>(null);

  // Tag inputs
  const [allergyInput, setAllergyInput] = useState("");
  const [conditionInput, setConditionInput] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    gender: "MALE",
    dateOfBirth: "",
    phone: "",
    email: "",
    address: "",
    bloodGroup: "B_POSITIVE",
    status: "ACTIVE",

    cnic: "",
    maritalStatus: "Married",
    relationType: "Father",
    relatedPersonName: "",
    landline: "",

    allergies: [] as string[],
    chronicConditions: [] as string[],

    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "Spouse",
  });

  useEffect(() => {
    fetch("/api/patients/next-number")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setNextNumbers({
            patientNumber: d.data.patientNumber,
            mrNumber: d.data.mrNumber,
          });
        }
      })
      .catch(() => {
        setNextNumbers({
          patientNumber: "P-000001",
          mrNumber: "MR-000001",
        });
      });
  }, []);

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

  // Live Age Calculation
  const computedAge = calculatePatientAge(form.dateOfBirth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setGlobalError("");

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsSubmitting(false);
        if (data.details) {
          setErrors(data.details);
        } else {
          setGlobalError(data.error || "Failed to register patient");
        }
        return;
      }

      setSuccessData({
        id: data.data.id,
        patientNumber: data.data.patientNumber,
        mrNumber: data.data.mrNumber,
      });

      setTimeout(() => {
        if (returnTo) {
          router.push(`${returnTo}?patientId=${data.data.id}`);
        } else {
          router.push(`/patients/${data.data.id}`);
        }
        router.refresh();
      }, 1000);
    } catch {
      setGlobalError("Network error — please verify connection and try again");
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full text-sm text-black font-medium px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-teal-50/80 border border-teal-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div>
          <span className="font-bold text-teal-900 text-sm">Admitting a patient to an Inpatient Ward / Bed?</span>
          <p className="text-teal-700 mt-0.5">
            Use the Patient Admission Form to assign a ward, bed, attending physician, and admitting diagnosis.
          </p>
        </div>
        <Link
          href="/admissions"
          className="inline-flex items-center gap-1.5 font-bold text-white bg-teal-800 hover:bg-teal-900 px-4 py-2 rounded-lg transition shrink-0 shadow-2xs"
        >
          <span>Open Admission Form</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <PageHeader
        title="Register New Patient"
        subtitle="Complete patient intake, generate hospital MR number, and initiate medical record"
        backHref="/patients"
        backLabel="Back to Directory"
      />

      {globalError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-lg shadow-xs">
          {globalError}
        </div>
      )}

      {successData && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-4 rounded-lg shadow-xs flex items-center justify-between">
          <div>
            <p className="font-bold">Patient Registered Successfully!</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Assigned Patient #: <span className="font-mono font-bold">{successData.patientNumber}</span> | MR #:{" "}
              <span className="font-mono font-bold">{successData.mrNumber}</span>.{" "}
              {returnTo
                ? "Returning to appointment booking with new patient selected..."
                : "Opening patient profile..."}
            </p>
          </div>
          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Hospital Identity Preview Banner */}
      <div className="bg-slate-900 text-white rounded-lg p-5 shadow-sm border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400 block mb-1">
            Official Hospital Registration Numbers (Auto-Generated)
          </span>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-slate-400">Patient Number</p>
              <p className="font-mono text-xl font-bold text-teal-300">
                {nextNumbers.patientNumber}
              </p>
            </div>
            <div className="border-l border-slate-700 pl-6">
              <p className="text-xs text-slate-400">Medical Record (MR) Number</p>
              <p className="font-mono text-xl font-bold text-white">
                {nextNumbers.mrNumber}
              </p>
            </div>
          </div>
        </div>
        <div className="text-right text-xs text-slate-400 hidden sm:block">
          <p>GHIAS Hospital Management System</p>
          <p className="text-teal-400 font-medium">Frontdesk Patient Intake</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Demographics & Personal Information */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-600"></span>
            1. Personal Demographics
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g. Muhammad"
                required
              />
              <FieldError name="firstName" errors={errors} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g. Tariq"
                required
              />
              <FieldError name="lastName" errors={errors} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gender <span className="text-rose-500">*</span>
              </label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className={inputClass}
                required
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
              <FieldError name="gender" errors={errors} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Birth <span className="text-rose-500">*</span>
                {computedAge && (
                  <span className="ml-2 text-teal-700 font-normal">
                    ({computedAge})
                  </span>
                )}
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={handleChange}
                max={new Date().toISOString().split("T")[0]}
                className={inputClass}
                required
              />
              <FieldError name="dateOfBirth" errors={errors} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Blood Group <span className="text-rose-500">*</span>
              </label>
              <select
                name="bloodGroup"
                value={form.bloodGroup}
                onChange={handleChange}
                className={inputClass}
                required
              >
                <option value="A_POSITIVE">A+ (Positive)</option>
                <option value="A_NEGATIVE">A- (Negative)</option>
                <option value="B_POSITIVE">B+ (Positive)</option>
                <option value="B_NEGATIVE">B- (Negative)</option>
                <option value="AB_POSITIVE">AB+ (Positive)</option>
                <option value="AB_NEGATIVE">AB- (Negative)</option>
                <option value="O_POSITIVE">O+ (Positive)</option>
                <option value="O_NEGATIVE">O- (Negative)</option>
              </select>
              <FieldError name="bloodGroup" errors={errors} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CNIC Number (Identity Card)
              </label>
              <input
                name="cnic"
                value={form.cnic}
                onChange={handleChange}
                className={`${inputClass} font-mono`}
                placeholder="34201-1234567-1"
              />
              <FieldError name="cnic" errors={errors} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Relation
              </label>
              <select
                name="relationType"
                value={form.relationType}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="Father">Father (S/o, D/o)</option>
                <option value="Husband">Husband (W/o)</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Father / Husband / Guardian Name
              </label>
              <input
                name="relatedPersonName"
                value={form.relatedPersonName}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g. Abdul Hameed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Marital Status
              </label>
              <select
                name="maritalStatus"
                value={form.maritalStatus}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="Married">Married</option>
                <option value="Single">Single</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Contact Details */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-600"></span>
            2. Contact Details &amp; Address
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Mobile Phone <span className="text-rose-500">*</span>
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className={inputClass}
                placeholder="0300-1234567"
                required
              />
              <FieldError name="phone" errors={errors} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className={inputClass}
                placeholder="patient@example.com"
              />
              <FieldError name="email" errors={errors} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Landline Phone
              </label>
              <input
                name="landline"
                value={form.landline}
                onChange={handleChange}
                className={inputClass}
                placeholder="0546-551234"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Residential Address
              </label>
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                className={inputClass}
                placeholder="House #, Street, Mohallah / Village, Tehsil Phalia, District Mandi Bahauddin"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Emergency Contact Information */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-600"></span>
            3. Emergency Contact (Next of Kin)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Person Name <span className="text-rose-500">*</span>
              </label>
              <input
                name="emergencyContactName"
                value={form.emergencyContactName}
                onChange={handleChange}
                className={inputClass}
                placeholder="e.g. Asad Tariq"
                required
              />
              <FieldError name="emergencyContactName" errors={errors} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Emergency Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                name="emergencyContactPhone"
                value={form.emergencyContactPhone}
                onChange={handleChange}
                className={inputClass}
                placeholder="0345-7654321"
                required
              />
              <FieldError name="emergencyContactPhone" errors={errors} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Relationship
              </label>
              <select
                name="emergencyContactRelation"
                value={form.emergencyContactRelation}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="Spouse">Spouse (Wife / Husband)</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Brother">Brother</option>
                <option value="Sister">Sister</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Relative / Friend">Relative / Friend</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Clinical Background (Allergies & Chronic Diseases) */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-600"></span>
            4. Clinical Background &amp; Warnings
          </h2>

          {/* Allergies */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Known Drug / Food Allergies
            </label>
            <div className="flex gap-2 mb-2">
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
                placeholder="Type allergy and press Enter or click Add..."
                className="flex-1 text-sm px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => handleAddAllergy(allergyInput)}
                className="px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-900 border border-amber-300 rounded hover:bg-amber-200 transition-colors"
              >
                + Add
              </button>
            </div>

            {/* Quick Allergy Tag Presets */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="text-[11px] text-slate-400 self-center mr-1">Quick Add:</span>
              {COMMON_ALLERGIES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => handleAddAllergy(a)}
                  disabled={form.allergies.includes(a)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                    form.allergies.includes(a)
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-default"
                      : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  + {a}
                </button>
              ))}
            </div>

            {/* Selected Allergies */}
            {form.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 p-2 bg-amber-50/50 border border-amber-200 rounded">
                {form.allergies.map((a) => (
                  <span
                    key={a}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded bg-amber-100 text-amber-900 border border-amber-300"
                  >
                    <span>⚠️ {a}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAllergy(a)}
                      className="text-amber-700 hover:text-rose-700 text-xs font-bold"
                      title="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No known allergies selected.</p>
            )}
          </div>

          {/* Chronic Conditions */}
          <div className="pt-3 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pre-existing / Chronic Conditions
            </label>
            <div className="flex gap-2 mb-2">
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
                placeholder="Type condition and press Enter or click Add..."
                className="flex-1 text-sm px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={() => handleAddCondition(conditionInput)}
                className="px-3 py-1.5 text-xs font-medium bg-teal-100 text-teal-900 border border-teal-300 rounded hover:bg-teal-200 transition-colors"
              >
                + Add
              </button>
            </div>

            {/* Quick Condition Tag Presets */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="text-[11px] text-slate-400 self-center mr-1">Quick Add:</span>
              {COMMON_CONDITIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleAddCondition(c)}
                  disabled={form.chronicConditions.includes(c)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                    form.chronicConditions.includes(c)
                      ? "bg-slate-100 text-slate-400 border-slate-200 cursor-default"
                      : "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100"
                  }`}
                >
                  + {c}
                </button>
              ))}
            </div>

            {/* Selected Chronic Conditions */}
            {form.chronicConditions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 p-2 bg-teal-50/50 border border-teal-200 rounded">
                {form.chronicConditions.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded bg-teal-100 text-teal-900 border border-teal-300"
                  >
                    <span>🩺 {c}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(c)}
                      className="text-teal-700 hover:text-rose-700 text-xs font-bold"
                      title="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No chronic conditions selected.</p>
            )}
          </div>
        </div>

        {/* Section 5: Admission & Patient Status */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-600"></span>
            5. Admission &amp; Patient Status
          </h2>

          <div className="max-w-xs">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Admission Status
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="ACTIVE">Active (Admitted / General Care)</option>
              <option value="CRITICAL">Critical (Immediate Attention)</option>
              <option value="DISCHARGED">Discharged</option>
            </select>
          </div>
        </div>

        {/* Submission Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/patients")}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || Boolean(successData)}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Admitting Patient...
              </>
            ) : (
              "Complete Patient Admission"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
