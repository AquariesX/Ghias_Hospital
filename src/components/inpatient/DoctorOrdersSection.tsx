"use client";

import React, { useState } from "react";
import {
  Stethoscope,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  FileText,
  AlertOctagon,
  ShieldCheck,
  UserCheck,
  X,
  Pill,
  Send,
} from "lucide-react";
import VerbalOrdersPolicyView from "./VerbalOrdersPolicyView";

interface PrescriptionItem {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  instructions?: string | null;
}

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string;
  roomNumber?: string | null;
}

export interface DoctorOrderData {
  id: string;
  prescriptionNumber: string;
  createdAt: string;
  notes?: string | null;
  diagnosis?: string | null;
  status: string;
  doctor?: Doctor | null;
  items: PrescriptionItem[];
}

interface DoctorOrdersSectionProps {
  admissionId: string;
  patientId: string;
  patientName: string;
  currentUserRole: string;
  currentUserName: string;
  attendingDoctor?: Doctor | null;
  availableDoctors?: Doctor[];
  initialOrders: DoctorOrderData[];
  onOrderAdded?: (newOrder: DoctorOrderData) => void;
}

// Parses metadata stored in notes
export function parseDoctorOrderNotes(notes?: string | null) {
  if (!notes) {
    return {
      isDoctorOrder: false,
      isVerbalOrder: false,
      orderType: "MEDICATION",
      urgency: "ROUTINE",
      orderText: "",
      clinicalNotes: "",
      receivingNurseName: null,
      secondNurseName: null,
      isCountersigned: false,
      countersignedAt: null,
      countersignedByName: null,
      rawText: "",
    };
  }

  if (notes.includes("[GIAS_DOCTOR_ORDER]:")) {
    try {
      const parts = notes.split("[GIAS_DOCTOR_ORDER]:");
      const jsonString = parts[1].split("\n\n")[0];
      const metadata = JSON.parse(jsonString);
      const rawText = parts[1].slice(jsonString.length).trim();
      return {
        ...metadata,
        rawText,
      };
    } catch (e) {
      // Fallback
    }
  }

  const isVerbal = notes.toLowerCase().includes("verbal");
  return {
    isDoctorOrder: true,
    isVerbalOrder: isVerbal,
    orderType: "MEDICATION",
    urgency: "ROUTINE",
    orderText: notes,
    clinicalNotes: "",
    receivingNurseName: null,
    secondNurseName: null,
    isCountersigned: false,
    countersignedAt: null,
    countersignedByName: null,
    rawText: notes,
  };
}

export default function DoctorOrdersSection({
  admissionId,
  patientId,
  patientName,
  currentUserRole,
  currentUserName,
  attendingDoctor,
  availableDoctors = [],
  initialOrders,
  onOrderAdded,
}: DoctorOrdersSectionProps) {
  const [orders, setOrders] = useState<DoctorOrderData[]>(initialOrders);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isAddOrderModalOpen, setIsAddOrderModalOpen] = useState(false);

  const isDoctorOrAdmin = currentUserRole === "DOCTOR" || currentUserRole === "ADMIN";
  const isNurse = currentUserRole === "NURSE" || currentUserRole === "STAFF";

  // Form State
  const [orderType, setOrderType] = useState<
    "MEDICATION" | "INVESTIGATION" | "NURSING_CARE" | "DIET" | "PROCEDURE" | "MONITORING" | "GENERAL"
  >("MEDICATION");
  const [urgency, setUrgency] = useState<"ROUTINE" | "URGENT" | "STAT">("ROUTINE");
  const [orderText, setOrderText] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  // Verbal Order specific state
  const [isVerbalOrder, setIsVerbalOrder] = useState(isNurse);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(attendingDoctor?.id || "");
  const [receivingNurseName, setReceivingNurseName] = useState(currentUserName || "");
  const [secondNurseName, setSecondNurseName] = useState("");
  const [verbalOrderReason, setVerbalOrderReason] = useState("");
  const [isReadBackConfirmed, setIsReadBackConfirmed] = useState(false);

  // Medicine Items (if medication order)
  const [medItems, setMedItems] = useState<
    Array<{
      medicineName: string;
      dosage: string;
      frequency: string;
      route: string;
      duration: string;
      instructions: string;
    }>
  >([]);

  // Submitting & Countersign state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countersigningId, setCountersigningId] = useState<string | null>(null);

  const handleAddMedRow = () => {
    setMedItems((prev) => [
      ...prev,
      {
        medicineName: "",
        dosage: "",
        frequency: "STAT",
        route: "Oral",
        duration: "1 day",
        instructions: "",
      },
    ]);
  };

  const handleRemoveMedRow = (index: number) => {
    setMedItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleMedFieldChange = (
    index: number,
    field: "medicineName" | "dosage" | "frequency" | "route" | "duration" | "instructions",
    value: string
  ) => {
    setMedItems((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderText.trim()) {
      setErrorMessage("Please enter clinical order instructions.");
      return;
    }

    if (isVerbalOrder) {
      if (!selectedDoctorId && !attendingDoctor?.id) {
        setErrorMessage("Please select the attending physician who authorized this verbal order.");
        return;
      }
      if (!secondNurseName.trim()) {
        setErrorMessage(
          "Hospital SOP Rule: A second nurse must verify & repeat the order back (دوسری نرس کے دستخط / نام ضروری ہے)."
        );
        return;
      }
      if (!isReadBackConfirmed) {
        setErrorMessage("Please confirm you repeated the order back to the doctor (Read-Back & Verified).");
        return;
      }
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = {
        doctorId: selectedDoctorId || attendingDoctor?.id || undefined,
        orderType,
        urgency,
        orderText: orderText.trim(),
        clinicalNotes: clinicalNotes.trim() || undefined,
        diagnosis: diagnosis.trim() || undefined,
        items: medItems.filter((m) => m.medicineName.trim().length > 0),
        isVerbalOrder,
        verbalOrderReason: verbalOrderReason.trim() || undefined,
        receivingNurseName: receivingNurseName.trim() || currentUserName,
        secondNurseName: secondNurseName.trim() || undefined,
        isReadBackConfirmed,
      };

      const res = await fetch(`/api/staff/inpatients/${admissionId}/doctor-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record doctor order");
      }

      setSuccessMessage(
        isVerbalOrder
          ? "Verbal Order recorded in RED per hospital SOP. Pending doctor countersign within 24 hours."
          : "Doctor order recorded successfully."
      );

      const createdOrder: DoctorOrderData = data.data;
      setOrders((prev) => [createdOrder, ...prev]);
      if (onOrderAdded) onOrderAdded(createdOrder);

      // Reset modal fields
      setOrderText("");
      setClinicalNotes("");
      setSecondNurseName("");
      setVerbalOrderReason("");
      setIsReadBackConfirmed(false);
      setMedItems([]);
      setTimeout(() => {
        setIsAddOrderModalOpen(false);
        setSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCountersign = async (orderId: string) => {
    setCountersigningId(orderId);
    try {
      const res = await fetch(
        `/api/staff/inpatients/${admissionId}/doctor-orders/${orderId}/countersign`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to countersign verbal order");

      setOrders((prev) =>
        prev.map((ord) => (ord.id === orderId ? data.data : ord))
      );
    } catch (err: any) {
      alert(err.message || "Error countersigning order");
    } finally {
      setCountersigningId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Control Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-lg">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Doctor Orders &amp; Treatment Directives ({orders.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Physician directives, medication orders, investigations, and verified verbal orders.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Policy on Verbal Orders Static Form Button */}
          <button
            type="button"
            onClick={() => setIsPolicyModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold transition shadow-2xs"
            title="View hospital policy and SOPs for verbal orders"
          >
            <AlertOctagon className="w-4 h-4 text-rose-700" />
            <span>SOPs on Verbal Orders (زبانی احکامات)</span>
          </button>

          {/* Add Order Button */}
          <button
            type="button"
            onClick={() => {
              setIsVerbalOrder(isNurse);
              setIsAddOrderModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{isDoctorOrAdmin ? "Add Doctor Order" : "Record Verbal Order (Doctor Permission)"}</span>
          </button>

          {/* Print Orders Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition"
            title="Print Doctor Orders Sheet"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-xs">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No Doctor Orders Issued Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Attending physicians can write direct orders, and nurses may record verbal orders with physician permission per hospital SOP.
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                setIsVerbalOrder(isNurse);
                setIsAddOrderModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Record First Order</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((ord) => {
            const meta = parseDoctorOrderNotes(ord.notes);
            const isVerbal = meta.isVerbalOrder;
            const isCountersigned = meta.isCountersigned;

            return (
              <div
                key={ord.id}
                className={`rounded-xl border transition-all shadow-xs overflow-hidden ${
                  isVerbal
                    ? "bg-rose-50/40 border-rose-300 hover:border-rose-400"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Header Strip */}
                <div
                  className={`px-4 sm:px-5 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${
                    isVerbal ? "bg-rose-100/60 border-rose-200" : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {ord.prescriptionNumber}
                    </span>

                    {/* Verbal vs Direct Badge */}
                    {isVerbal ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs">
                        <AlertOctagon className="w-3 h-3" />
                        <span>VERBAL ORDER (زبانی حکم)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                        <Stethoscope className="w-3 h-3 text-teal-700" />
                        <span>Direct Physician Order</span>
                      </span>
                    )}

                    {/* Urgency Badge */}
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                        meta.urgency === "STAT"
                          ? "bg-red-600 text-white animate-pulse"
                          : meta.urgency === "URGENT"
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {meta.urgency || "ROUTINE"}
                    </span>

                    {meta.orderType && (
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {meta.orderType}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(ord.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-4 sm:p-5 space-y-3">
                  {/* Order Instructions (Rendered in Red if Verbal Order per SOP Rule 4) */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Clinical Order Directives:
                    </span>
                    <div
                      className={`p-3 rounded-lg border text-xs leading-relaxed ${
                        isVerbal
                          ? "bg-white text-rose-900 border-rose-300 font-medium"
                          : "bg-slate-50/70 text-slate-800 border-slate-200"
                      }`}
                      style={isVerbal ? { color: "#991b1b" } : undefined}
                    >
                      <p className="whitespace-pre-wrap">{meta.orderText || meta.rawText}</p>
                    </div>
                  </div>

                  {/* Medicines Table if any */}
                  {ord.items && ord.items.length > 0 && (
                    <div className="overflow-x-auto pt-1">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-slate-100/70 text-[10px] uppercase font-bold text-slate-600">
                            <th className="px-3 py-1.5">Medicine</th>
                            <th className="px-3 py-1.5">Dosage</th>
                            <th className="px-3 py-1.5">Route</th>
                            <th className="px-3 py-1.5">Frequency</th>
                            <th className="px-3 py-1.5">Duration</th>
                            <th className="px-3 py-1.5">Instructions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ord.items.map((it) => (
                            <tr key={it.id} className={isVerbal ? "text-rose-950" : "text-slate-800"}>
                              <td className="px-3 py-1.5 font-bold flex items-center gap-1">
                                <Pill className="w-3 h-3 text-teal-600 shrink-0" />
                                {it.medicineName}
                              </td>
                              <td className="px-3 py-1.5 font-semibold">{it.dosage}</td>
                              <td className="px-3 py-1.5">{it.route}</td>
                              <td className="px-3 py-1.5">{it.frequency}</td>
                              <td className="px-3 py-1.5">{it.duration}</td>
                              <td className="px-3 py-1.5 text-slate-500">{it.instructions || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Verbal Order Audit & Sign-off Details */}
                  {isVerbal && (
                    <div className="p-3 bg-rose-100/40 border border-rose-200 rounded-lg text-xs space-y-2 text-rose-950">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200/80 pb-2">
                        <div>
                          <span className="font-bold text-rose-900">Authorizing Physician: </span>
                          <span>
                            {ord.doctor
                              ? `Dr. ${ord.doctor.firstName} ${ord.doctor.lastName} (${ord.doctor.specialization})`
                              : "Attending Clinician"}
                          </span>
                        </div>
                        <div>
                          <span className="font-bold text-rose-900">Receiving Nurse: </span>
                          <span>{meta.receivingNurseName || "Registered Nurse"}</span>
                        </div>
                        <div>
                          <span className="font-bold text-rose-900">Witness (2nd Nurse): </span>
                          <span>{meta.secondNurseName || "Verified"}</span>
                        </div>
                      </div>

                      {/* Countersign Status */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-2">
                          {isCountersigned ? (
                            <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                Countersigned by {meta.countersignedByName || "Physician"}
                                {meta.countersignedAt && ` on ${new Date(meta.countersignedAt).toLocaleString()}`}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-rose-800 bg-rose-100 px-2.5 py-1 rounded-md border border-rose-300 font-bold text-[11px]">
                              <Clock className="w-3.5 h-3.5 text-rose-600" />
                              <span>Countersignature Pending (24-Hour Regulatory Window)</span>
                            </div>
                          )}
                        </div>

                        {/* Doctor Countersign Action */}
                        {!isCountersigned && isDoctorOrAdmin && (
                          <button
                            type="button"
                            onClick={() => handleCountersign(ord.id)}
                            disabled={countersigningId === ord.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-800 hover:bg-rose-900 text-white rounded-md text-xs font-bold shadow-xs transition disabled:opacity-50"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{countersigningId === ord.id ? "Countersigning..." : "Countersign Order (جوابی دستخط)"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Direct Order Physician Sign-off */}
                  {!isVerbal && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                      <div>
                        Prescribed by:{" "}
                        <strong className="text-slate-800">
                          {ord.doctor ? `Dr. ${ord.doctor.firstName} ${ord.doctor.lastName}` : "Attending Doctor"}
                        </strong>{" "}
                        ({ord.doctor?.specialization || "Clinical Staff"})
                      </div>
                      <span className="font-mono text-slate-400">Electronic Clinical Chart Entry</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Verbal Orders Policy (SOP on Verbal Orders) */}
      {isPolicyModalOpen && (
        <VerbalOrdersPolicyView
          isModal={true}
          onClose={() => setIsPolicyModalOpen(false)}
        />
      )}

      {/* Modal: Add Doctor Order Form */}
      {isAddOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full my-8 overflow-hidden">
            {/* Modal Header */}
            <div
              className={`p-5 text-white flex items-center justify-between ${
                isVerbalOrder ? "bg-rose-900" : "bg-teal-800"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Stethoscope className="w-5 h-5 text-teal-200" />
                <div>
                  <h3 className="text-base font-bold">
                    {isVerbalOrder
                      ? "Record Verbal Doctor Order (بالمشافہ / زبانی احکامات)"
                      : "Add Direct Physician Order"}
                  </h3>
                  <p className="text-xs text-teal-100 opacity-90">
                    Patient: <strong>{patientName}</strong> • Inpatient Admission
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOrderModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {/* Messages */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="font-semibold">{errorMessage}</span>
                </div>
              )}
              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{successMessage}</span>
                </div>
              )}

              {/* Order Mode Switch (If doctor or admin, can toggle; nurse is restricted to verbal with doctor permission) */}
              {isDoctorOrAdmin && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">Order Mode:</span>
                    <span className="text-[11px] text-slate-500">
                      Select whether this is directly written by doctor or taken via verbal permission.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsVerbalOrder(false)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                        !isVerbalOrder
                          ? "bg-teal-700 text-white shadow-xs"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      Direct Doctor Order
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsVerbalOrder(true)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                        isVerbalOrder
                          ? "bg-rose-700 text-white shadow-xs"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      Verbal Order (SOP)
                    </button>
                  </div>
                </div>
              )}

              {/* Verbal Order Warning Banner */}
              {isVerbalOrder && (
                <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl space-y-2 text-rose-950">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-rose-900 text-xs">
                      <AlertOctagon className="w-4 h-4 text-rose-700" />
                      <span>SOPs on Verbal Orders (زبانی احکامات پر پالیسی)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPolicyModalOpen(true)}
                      className="text-[11px] text-rose-800 hover:underline font-bold"
                    >
                      Read 9 Official Rules &rarr;
                    </button>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-900/90 font-medium">
                    1. Acceptable only in extraordinary circumstances. 2. Single STAT dose only. 3. Must be repeated back and witnessed by a second nurse. 4. Strictly PROHIBITED for high-alert and high-risk medications.
                  </p>
                </div>
              )}

              {/* Physician & Personnel Details (Especially for Verbal Orders) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ordering / Authorizing Physician <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-teal-600"
                    required
                  >
                    <option value="">-- Select Ordering Doctor --</option>
                    {availableDoctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.firstName} {doc.lastName} ({doc.specialization})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Order Urgency <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-teal-600"
                  >
                    <option value="ROUTINE">ROUTINE (Standard Ward Care)</option>
                    <option value="URGENT">URGENT (Prompt Execution)</option>
                    <option value="STAT">STAT (Immediate / Single Dose)</option>
                  </select>
                </div>

                {isVerbalOrder && (
                  <>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Receiving Nurse Name <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={receivingNurseName}
                        onChange={(e) => setReceivingNurseName(e.target.value)}
                        placeholder="Name of nurse receiving order"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-teal-600"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-rose-900 mb-1">
                        Witness / 2nd Nurse (Read-back) <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={secondNurseName}
                        onChange={(e) => setSecondNurseName(e.target.value)}
                        placeholder="Second nurse name who verified"
                        className="w-full px-3 py-2 bg-rose-50 border border-rose-300 rounded-lg text-xs focus:outline-rose-600 font-semibold"
                        required
                      />
                      <span className="text-[10px] text-rose-700 mt-0.5 block">
                        SOP Rule 3: Must be verified and repeated by a second nurse.
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Order Category & Diagnosis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Order Category</label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-teal-600"
                  >
                    <option value="MEDICATION">Medication / Prescription Order</option>
                    <option value="INVESTIGATION">Diagnostic / Lab / Imaging</option>
                    <option value="NURSING_CARE">Nursing Care / Dressing / Foley</option>
                    <option value="MONITORING">Vitals &amp; Blood Sugar Monitoring</option>
                    <option value="DIET">Dietary / Nutrition Directives</option>
                    <option value="PROCEDURE">Bedside Procedure / Infusion</option>
                    <option value="GENERAL">General Clinical Directive</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Provisional / Clinical Diagnosis</label>
                  <input
                    type="text"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="e.g. Acute Gastroenteritis, Sepsis, Pneumonia"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-teal-600"
                  />
                </div>
              </div>

              {/* Order Directives Text */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Clinical Order Instructions &amp; Treatment Directives <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={orderText}
                  onChange={(e) => setOrderText(e.target.value)}
                  placeholder="e.g. Infusion Ringers Lactate 1000ml IV STAT over 2 hours. Tab Paracetamol 1000mg PO STAT. Monitor BP and urine output Q2H."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-teal-600 font-medium"
                  required
                />
              </div>

              {/* Medication Table Rows (Optional / Recommended for Medication Orders) */}
              <div className="space-y-2 pt-1 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Prescription Item Breakdown (Optional)</span>
                  <button
                    type="button"
                    onClick={handleAddMedRow}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 px-2 py-1 rounded border border-teal-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Medicine Line</span>
                  </button>
                </div>

                {medItems.length > 0 && (
                  <div className="space-y-2">
                    {medItems.map((med, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg items-center"
                      >
                        <div className="col-span-12 sm:col-span-3">
                          <input
                            type="text"
                            value={med.medicineName}
                            onChange={(e) => handleMedFieldChange(idx, "medicineName", e.target.value)}
                            placeholder="Medicine name"
                            className="w-full px-2 py-1 text-xs border rounded bg-white"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          <input
                            type="text"
                            value={med.dosage}
                            onChange={(e) => handleMedFieldChange(idx, "dosage", e.target.value)}
                            placeholder="Dosage (e.g. 500mg)"
                            className="w-full px-2 py-1 text-xs border rounded bg-white"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          <input
                            type="text"
                            value={med.route}
                            onChange={(e) => handleMedFieldChange(idx, "route", e.target.value)}
                            placeholder="Route (Oral/IV)"
                            className="w-full px-2 py-1 text-xs border rounded bg-white"
                          />
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          <input
                            type="text"
                            value={med.frequency}
                            onChange={(e) => handleMedFieldChange(idx, "frequency", e.target.value)}
                            placeholder="Frequency (STAT/TDS)"
                            className="w-full px-2 py-1 text-xs border rounded bg-white"
                          />
                        </div>
                        <div className="col-span-5 sm:col-span-2">
                          <input
                            type="text"
                            value={med.instructions}
                            onChange={(e) => handleMedFieldChange(idx, "instructions", e.target.value)}
                            placeholder="Instructions"
                            className="w-full px-2 py-1 text-xs border rounded bg-white"
                          />
                        </div>
                        <div className="col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveMedRow(idx)}
                            className="p-1 text-rose-600 hover:text-rose-800"
                            title="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Verbal Order Mandatory Checkbox Confirmation */}
              {isVerbalOrder && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl space-y-2 text-rose-950">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isReadBackConfirmed}
                      onChange={(e) => setIsReadBackConfirmed(e.target.checked)}
                      className="mt-0.5 rounded text-rose-700 focus:ring-rose-500"
                      required
                    />
                    <span className="text-[11px] font-bold leading-tight">
                      I certify that I have executed a 'Read-Back &amp; Verified' with the ordering physician, confirmed the dose details, and verified that this order contains NO high-alert or high-risk medications.
                    </span>
                  </label>
                  <p className="text-[10px] text-rose-700 italic">
                    * Policy Mandate: Attending physician must countersign this order on the chart within 24 hours.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddOrderModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`inline-flex items-center gap-2 px-5 py-2 text-white font-bold rounded-lg text-xs transition shadow-xs disabled:opacity-50 ${
                    isVerbalOrder ? "bg-rose-700 hover:bg-rose-800" : "bg-teal-700 hover:bg-teal-800"
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? "Recording Order..." : isVerbalOrder ? "Save Verbal Order (in Red)" : "Issue Doctor Order"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
