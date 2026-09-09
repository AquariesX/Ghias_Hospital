"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";
import DischargeDocumentView, {
  DischargeDocumentData,
} from "@/components/discharge/DischargeDocumentView";

interface DischargePrintClientProps {
  data: DischargeDocumentData;
}

export default function DischargePrintClient({ data: initialData }: DischargePrintClientProps) {
  const [data, setData] = useState<DischargeDocumentData>(initialData);
  const [hasLoggedPrint, setHasLoggedPrint] = useState(false);

  // Check if preview session storage has freshly edited fields
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(`ghias_discharge_fields_${initialData.admission.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setData((prev) => ({
          ...prev,
          admission: {
            ...prev.admission,
            ...parsed.admission,
          },
          medications: parsed.medications || prev.medications,
        }));
      }
    } catch (e) {
      console.error("Error reading stored discharge fields:", e);
    }
  }, [initialData.admission.id]);

  const handlePrint = async () => {
    window.print();

    if (!hasLoggedPrint) {
      setHasLoggedPrint(true);
      try {
        await fetch(`/api/audit-logs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "PRINT_DISCHARGE_DOCUMENT",
            entity: "Admission",
            entityId: data.admission.id,
            details: `Printed discharge form for patient ${data.patient.fullName} (${data.patient.mrNumber}).`,
          }),
        });
      } catch (err) {
        // Non-blocking
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:bg-white print:p-0">
      {/* Top Action Bar (Hidden during printing) */}
      <div className="max-w-[210mm] mx-auto mb-4 flex items-center justify-between print:hidden">
        <Link
          href={`/patients/${data.patient.id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 px-3.5 py-2 rounded-lg transition shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Patient File</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 px-5 py-2 rounded-lg shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Render Document */}
      <DischargeDocumentView data={data} showWatermark={false} />
    </div>
  );
}
