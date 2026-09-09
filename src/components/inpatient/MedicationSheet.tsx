"use client";

import { useState, useMemo } from "react";
import {
  Pill,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PauseCircle,
  Calendar,
  Clock,
  User,
  FileText,
  Filter,
  RefreshCw,
  X,
  Stethoscope,
  Info,
} from "lucide-react";

export interface MedicationAdminItem {
  id: string;
  patientId: string;
  admissionId: string | null;
  prescriptionItemId: string | null;
  medicineName: string;
  dosage: string;
  route: string;
  status: "GIVEN" | "MISSED" | "REFUSED" | "HELD";
  administeredAt: string;
  administeredById: string | null;
  administeredByName: string;
  notes: string | null;
  createdAt: string;
  prescriptionItem?: {
    id: string;
    medicineName: string;
    dosage: string;
    frequency: string;
    route: string;
  } | null;
}

export interface PrescribedItem {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  instructions: string | null;
  administrations?: Array<{
    id: string;
    status: string;
    administeredAt: string;
    administeredByName: string;
  }>;
}

export interface PrescriptionGroup {
  id: string;
  prescriptionNumber: string;
  createdAt: string;
  doctor?: {
    firstName: string;
    lastName: string;
    specialization: string;
  } | null;
  items: PrescribedItem[];
}

interface MedicationSheetProps {
  admissionId: string;
  admissionNumber: string;
  patientId: string;
  patientName: string;
  mrNumber: string | null;
  roomBedNo: string | null;
  initialMedications?: MedicationAdminItem[];
  prescriptions?: PrescriptionGroup[];
  readOnly?: boolean;
  onRecordAdded?: (record: MedicationAdminItem) => void;
}

const COMMON_ROUTES = [
  "Oral",
  "IV",
  "IM",
  "SC",
  "Topical",
  "Inhalation",
  "Sublingual",
  "Rectal",
  "Eye Drops",
  "Ear Drops",
  "Other",
];

export default function MedicationSheet({
  admissionId,
  admissionNumber,
  patientId,
  patientName,
  mrNumber,
  roomBedNo,
  initialMedications = [],
  prescriptions = [],
  readOnly = false,
  onRecordAdded,
}: MedicationSheetProps) {
  const [medications, setMedications] = useState<MedicationAdminItem[]>(initialMedications);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"manual" | "prescribed">("manual");
  const [selectedPrescriptionItemId, setSelectedPrescriptionItemId] = useState<string | null>(null);

  // Form Fields
  const [formDrugName, setFormDrugName] = useState("");
  const [formDose, setFormDose] = useState("");
  const [formRoute, setFormRoute] = useState("Oral");
  const [formCustomRoute, setFormCustomRoute] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formTime, setFormTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [formStatus, setFormStatus] = useState<"GIVEN" | "MISSED" | "REFUSED" | "HELD">("GIVEN");
  const [formNotes, setFormNotes] = useState("");

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Open modal for manual entry
  const handleOpenManualModal = () => {
    const now = new Date();
    setModalMode("manual");
    setSelectedPrescriptionItemId(null);
    setFormDrugName("");
    setFormDose("");
    setFormRoute("Oral");
    setFormCustomRoute("");
    setFormDate(now.toISOString().slice(0, 10));
    setFormTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    setFormStatus("GIVEN");
    setFormNotes("");
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  // Open modal pre-populated from doctor prescription
  const handleOpenPrescriptionModal = (item: PrescribedItem) => {
    const now = new Date();
    setModalMode("prescribed");
    setSelectedPrescriptionItemId(item.id);
    setFormDrugName(item.medicineName);
    setFormDose(item.dosage);

    const isKnownRoute = COMMON_ROUTES.includes(item.route);
    setFormRoute(isKnownRoute ? item.route : "Other");
    setFormCustomRoute(isKnownRoute ? "" : item.route);

    setFormDate(now.toISOString().slice(0, 10));
    setFormTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    setFormStatus("GIVEN");
    setFormNotes(item.instructions ? `Prescription note: ${item.instructions}` : "");
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  // Submit form to API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    const actualRoute = formRoute === "Other" && formCustomRoute.trim() ? formCustomRoute.trim() : formRoute;

    if (!formDrugName.trim()) {
      setErrorMessage("Drug Name is required.");
      setSubmitting(false);
      return;
    }

    if (!formDose.trim()) {
      setErrorMessage("Dose is required (e.g., 500 mg, 1 g).");
      setSubmitting(false);
      return;
    }

    if (!actualRoute.trim()) {
      setErrorMessage("Route is required.");
      setSubmitting(false);
      return;
    }

    if (!formDate) {
      setErrorMessage("Administration Date is required.");
      setSubmitting(false);
      return;
    }

    if (!formTime) {
      setErrorMessage("Administration Time is required.");
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        patientId,
        medicineName: formDrugName.trim(),
        dosage: formDose.trim(),
        route: actualRoute,
        status: formStatus,
        administeredDate: formDate,
        administeredTime: formTime,
        prescriptionItemId: selectedPrescriptionItemId || null,
        notes: formNotes.trim() || null,
      };

      const res = await fetch(`/api/admissions/${admissionId}/medications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to record medication administration");
      }

      const newRecord: MedicationAdminItem = {
        ...json.data,
        administeredAt: typeof json.data.administeredAt === "string" ? json.data.administeredAt : new Date(json.data.administeredAt).toISOString(),
      };

      // Prepend to list
      setMedications((prev) => [newRecord, ...prev]);
      if (onRecordAdded) {
        onRecordAdded(newRecord);
      }

      setSuccessBanner(`Medication administration for "${newRecord.medicineName}" recorded as ${newRecord.status}.`);
      setTimeout(() => setSuccessBanner(null), 5000);
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred while saving the record.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered medications
  const filteredMedications = useMemo(() => {
    return medications.filter((item) => {
      const matchesSearch =
        item.medicineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.administeredByName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [medications, searchTerm, statusFilter]);

  // Helper for Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "GIVEN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            GIVEN
          </span>
        );
      case "MISSED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            MISSED
          </span>
        );
      case "REFUSED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            REFUSED
          </span>
        );
      case "HELD":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <PauseCircle className="w-3 h-3 text-purple-600" />
            HELD
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Notification */}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-900 text-sm animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Doctor Prescriptions Accordion / List */}
      {prescriptions.length > 0 && (
        <div className="bg-white border border-teal-100 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-teal-50 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-700" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900">
                Active Prescribed Medications (Doctor Orders)
              </h3>
            </div>
            <span className="text-xs text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full font-medium border border-teal-200">
              {prescriptions.reduce((acc, p) => acc + p.items.length, 0)} Prescribed Drug(s)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {prescriptions.map((rx) =>
              rx.items.map((item) => {
                const lastAdmin = item.administrations?.[0];
                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-50 hover:bg-teal-50/40 border border-slate-200 rounded-lg transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{item.medicineName}</h4>
                          <p className="text-xs text-slate-600 mt-0.5">
                            <span className="font-semibold text-teal-700">{item.dosage}</span> • {item.route} • {item.frequency}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                          Rx: {rx.prescriptionNumber}
                        </span>
                      </div>

                      {item.instructions && (
                        <p className="text-[11px] text-slate-500 italic mt-1.5 flex items-center gap-1">
                          <Info className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>Instructions: {item.instructions}</span>
                        </p>
                      )}

                      {lastAdmin && (
                        <p className="text-[10px] text-slate-400 mt-2 font-mono">
                          Last Admin: {new Date(lastAdmin.administeredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ({lastAdmin.status}) by {lastAdmin.administeredByName}
                        </p>
                      )}
                    </div>

                    {!readOnly && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenPrescriptionModal(item)}
                          className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-md shadow-xs transition flex items-center gap-1.5"
                        >
                          <Pill className="w-3.5 h-3.5" />
                          <span>Record Administration</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Medication Sheet Main Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Sheet Header */}
        <div className="p-5 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    MEDICATION SHEET
                  </h2>
                  <p className="text-xs text-slate-500">
                    Clinical Medication Administration Record (MAR) for Admission{" "}
                    <span className="font-mono font-medium text-teal-700">{admissionNumber}</span> • Bed:{" "}
                    <span className="font-semibold text-slate-700">{roomBedNo || "—"}</span>
                  </p>
                </div>
              </div>
            </div>

            {!readOnly && (
              <button
                type="button"
                onClick={handleOpenManualModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Medication</span>
              </button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search medication, nurse, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {["ALL", "GIVEN", "MISSED", "REFUSED", "HELD"].map((status) => {
                const count =
                  status === "ALL"
                    ? medications.length
                    : medications.filter((m) => m.status === status).length;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                      statusFilter === status
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    {status} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Medication Table */}
        <div className="overflow-x-auto">
          {filteredMedications.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Pill className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">
                No medication records found for this admission.
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchTerm || statusFilter !== "ALL"
                  ? "Try changing your search keywords or status filter."
                  : "Nurses can record medication administrations using the button above or from prescribed orders."}
              </p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Drug Name</th>
                  <th className="px-4 py-3">Dose</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Recorded By</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMedications.map((item) => {
                  const adminDate = new Date(item.administeredAt);
                  const formattedDate = adminDate.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                  const formattedTime = adminDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                        {formattedDate}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800 whitespace-nowrap">
                        {formattedTime}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                        {item.medicineName}
                        {item.prescriptionItemId && (
                          <span className="ml-1.5 px-1.5 py-0.2 bg-teal-50 text-teal-700 border border-teal-200 text-[9px] rounded font-medium">
                            Rx
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                        {item.dosage}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {item.route}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {renderStatusBadge(item.status)}
                      </td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium">{item.administeredByName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={item.notes || ""}>
                        {item.notes || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Record Medication Administration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {modalMode === "prescribed" ? "Record Prescribed Medication" : "Record Medication Administration"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Patient: <span className="font-semibold text-slate-700">{patientName}</span> • Adm:{" "}
                    <span className="font-mono text-teal-700">{admissionNumber}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}

              {/* Drug Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Drug Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ceftriaxone, Paracetamol"
                  value={formDrugName}
                  onChange={(e) => setFormDrugName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Dose & Route Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Dose <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1 g, 500 mg, 5 mL"
                    value={formDose}
                    onChange={(e) => setFormDose(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Route <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formRoute}
                    onChange={(e) => setFormRoute(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {COMMON_ROUTES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  {formRoute === "Other" && (
                    <input
                      type="text"
                      placeholder="Specify route..."
                      value={formCustomRoute}
                      onChange={(e) => setFormCustomRoute(e.target.value)}
                      className="mt-1.5 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Date, Time & Status Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Date</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Time</span> <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs bg-white font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="GIVEN">GIVEN</option>
                    <option value="MISSED">MISSED</option>
                    <option value="REFUSED">REFUSED</option>
                    <option value="HELD">HELD</option>
                  </select>
                </div>
              </div>

              {/* Status explanation alert if not GIVEN */}
              {formStatus !== "GIVEN" && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
                  <p className="font-semibold">
                    Recording status as {formStatus}:
                  </p>
                  <p className="text-amber-700 mt-0.5">
                    Please provide the clinical rationale or explanation in the notes field below.
                  </p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Notes / Clinical Remarks <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Infused via IV cannula, site clean. Patient tolerated well."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save Medication</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
