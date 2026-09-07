"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  UserPlus,
  Users,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Calendar,
  IdCard,
} from "lucide-react";

interface PatientSearchResult {
  id: string;
  patientNumber: string;
  mrNumber: string | null;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  bloodGroup: string;
  phone: string;
  cnic: string | null;
  allergies: string[];
  chronicConditions: string[];
  createdAt: string;
}

interface Props {
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
    specialization: string;
  } | null;
}

export default function DoctorPatientsClient({ doctor }: Props) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [patients, setPatients] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New Patient Registration Modal
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [registering, setRegistering] = useState<boolean>(false);
  const [regError, setRegError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    gender: "MALE",
    dateOfBirth: "",
    bloodGroup: "O_POSITIVE",
    cnic: "",
    address: "",
    city: "Lahore",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "Family",
    allergies: "",
    chronicConditions: "",
  });

  const searchPatients = async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/doctor/patients?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
      }
    } catch (err) {
      console.error("Error searching patients:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchPatients(searchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setRegError(null);

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth,
        bloodGroup: formData.bloodGroup,
        cnic: formData.cnic || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        emergencyContactName: formData.emergencyContactName || "Attendant",
        emergencyContactPhone: formData.emergencyContactPhone || formData.phone,
        emergencyContactRelation: formData.emergencyContactRelation || "Family",
        allergies: formData.allergies ? formData.allergies.split(",").map((s) => s.trim()).filter(Boolean) : [],
        chronicConditions: formData.chronicConditions ? formData.chronicConditions.split(",").map((s) => s.trim()).filter(Boolean) : [],
      };

      const res = await fetch("/api/doctor/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || "Failed to register patient");
      } else {
        setShowRegisterModal(false);
        // Refresh patient list
        searchPatients(formData.phone || formData.firstName);
        // Reset form
        setFormData({
          firstName: "",
          lastName: "",
          phone: "",
          gender: "MALE",
          dateOfBirth: "",
          bloodGroup: "UNKNOWN",
          cnic: "",
          address: "",
          city: "Lahore",
          emergencyContactName: "",
          emergencyContactPhone: "",
          emergencyContactRelation: "Family",
          allergies: "",
          chronicConditions: "",
        });
      }
    } catch {
      setRegError("Network error registering patient");
    } finally {
      setRegistering(false);
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob) return "N/A";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} yrs`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-700 uppercase tracking-wider">
            <span>Clinical Records</span>
            <span>•</span>
            <span>Patient Search &amp; EMR Lookup</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Doctor Patient Search
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Look up registered patients by Name, MR #, Patient #, Phone, or CNIC, or register walk-in patients
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowRegisterModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Search Input Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Type patient name, MR number (MR-000001), phone number, or CNIC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 text-sm text-black border border-slate-300 rounded-lg focus:ring-1 focus:ring-teal-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Searching patient database...
          </div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-base font-bold text-slate-800">No Patients Found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No existing patient record matched &ldquo;{searchTerm}&rdquo;. If this is a new walk-in patient, you can register them directly.
            </p>
            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, firstName: searchTerm }));
                setShowRegisterModal(true);
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Patient &ldquo;{searchTerm}&rdquo;</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">MR / Patient #</th>
                  <th className="py-3 px-4">Gender &amp; Age</th>
                  <th className="py-3 px-4">Contact &amp; CNIC</th>
                  <th className="py-3 px-4">Blood Group</th>
                  <th className="py-3 px-4">Clinical Alerts</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">
                        {p.firstName} {p.lastName}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Registered: {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs">
                      {p.mrNumber && (
                        <div className="font-bold text-teal-800">{p.mrNumber}</div>
                      )}
                      <div className="text-slate-500">{p.patientNumber}</div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-700">
                      <div>{p.gender}</div>
                      <div className="text-slate-500">{calculateAge(p.dateOfBirth)}</div>
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      <div className="text-slate-800 font-medium">{p.phone}</div>
                      {p.cnic && <div className="text-[11px] text-slate-500 font-mono">CNIC: {p.cnic}</div>}
                    </td>

                    <td className="py-3.5 px-4 text-xs font-bold text-slate-800">
                      {p.bloodGroup}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {p.allergies && p.allergies.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            {p.allergies.length} Allergy
                          </span>
                        )}
                        {p.chronicConditions && p.chronicConditions.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            {p.chronicConditions.length} Chronic
                          </span>
                        )}
                        {(!p.allergies || p.allergies.length === 0) &&
                          (!p.chronicConditions || p.chronicConditions.length === 0) && (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/patients/${p.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 text-xs font-bold transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View EMR History</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* REGISTER NEW PATIENT MODAL                                                */}
      {/* ========================================================================= */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Register Walk-in Patient
                </h3>
                <p className="text-xs text-slate-500">
                  Doctor-initiated patient record creation • Generates sequential Patient &amp; MR Numbers
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPatient} className="p-6 overflow-y-auto space-y-4 text-xs">
              {regError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
                  {regError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1 text-[11px]">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full text-xs text-black border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1 text-[11px]">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full text-xs text-black border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1 text-[11px]">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0300-1234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs text-black border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1 text-[11px]">
                    Gender *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full text-xs text-black bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1 text-[11px]">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full text-xs text-black border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                {/* Blood Group */}
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1 text-[11px]">
                    Blood Group
                  </label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full text-xs text-black bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="O_POSITIVE">O+ (O Positive)</option>
                    <option value="A_POSITIVE">A+ (A Positive)</option>
                    <option value="B_POSITIVE">B+ (B Positive)</option>
                    <option value="AB_POSITIVE">AB+ (AB Positive)</option>
                    <option value="O_NEGATIVE">O- (O Negative)</option>
                    <option value="A_NEGATIVE">A- (A Negative)</option>
                    <option value="B_NEGATIVE">B- (B Negative)</option>
                    <option value="AB_NEGATIVE">AB- (AB Negative)</option>
                  </select>
                </div>

                {/* CNIC */}
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1 text-[11px]">
                    CNIC (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="35201-XXXXXXX-X"
                    value={formData.cnic}
                    onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                    className="w-full text-xs text-black border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none font-mono"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1 text-[11px]">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full text-xs text-black border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Allergies & Chronic Conditions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1 text-[11px]">
                    Allergies (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="Penicillin, Sulfa, Peanuts..."
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    className="w-full text-xs text-black border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1 text-[11px]">
                    Chronic Conditions (comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="Hypertension, Type 2 Diabetes, Asthma..."
                    value={formData.chronicConditions}
                    onChange={(e) => setFormData({ ...formData, chronicConditions: e.target.value })}
                    className="w-full text-xs text-black border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-xs transition disabled:opacity-50"
                >
                  {registering ? "Saving Patient..." : "Register Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
