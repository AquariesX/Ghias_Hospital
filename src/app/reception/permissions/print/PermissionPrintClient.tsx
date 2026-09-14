"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Printer, ArrowLeft, CheckCircle2 } from "lucide-react";
import PermissionDocumentView, {
  PermissionDocumentData,
} from "@/components/permissions/PermissionDocumentView";

interface PermissionPrintClientProps {
  data: PermissionDocumentData;
}

export default function PermissionPrintClient({ data: initialData }: PermissionPrintClientProps) {
  const [data, setData] = useState<PermissionDocumentData>(initialData);
  const [hasLoggedPrint, setHasLoggedPrint] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("ghias_permission_consent_fields");
      if (stored) {
        const parsed = JSON.parse(stored);
        setData((prev) => ({
          ...prev,
          consentDetails: {
            ...prev.consentDetails,
            ...parsed,
          },
        }));
      }
    } catch (e) {
      console.error("Error reading stored consent details:", e);
    }
  }, []);

  const handlePrint = async () => {
    // Trigger browser print
    window.print();

    // Log print event once to audit trail
    if (!hasLoggedPrint) {
      setHasLoggedPrint(true);
      try {
        await fetch("/api/permissions/log-print", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: data.patient.id,
            admissionId: data.admission.id,
            permissions: data.selectedPermissions,
          }),
        });
      } catch (err) {
        console.error("Failed to log print action:", err);
      }
    }
  };

  // Optional: Auto prompt print dialog on first load
  useEffect(() => {
    const timer = setTimeout(() => {
      // Automatic print trigger
      handlePrint();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 font-sans text-slate-900 print:bg-white print:p-0">
      {/* Top Floating Action Bar (Hidden during printing) */}
      <div className="max-w-4xl mx-auto mb-6 print:hidden">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/reception/permissions"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Consents</span>
            </Link>

            <div>
              <p className="text-xs font-bold text-slate-900">
                {data.patient.fullName} <span className="font-mono text-slate-500 font-normal">({data.patient.mrNumber})</span>
              </p>
              <p className="text-[11px] text-slate-500">
                {data.selectedPermissions.length} Form(s) • Standard A4 Portrait Paper
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-slate-400 hidden md:inline">
              Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px]">P</kbd>
            </span>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 px-6 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Document (A4)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Printable Document Container */}
      <div className="max-w-4xl mx-auto">
        <PermissionDocumentView data={data} showWatermark={true} />
      </div>
    </div>
  );
}

