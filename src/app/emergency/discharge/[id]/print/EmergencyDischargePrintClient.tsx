"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";
import EmergencyDischargeDocument, {
  EmergencyDischargeDocumentData,
} from "@/components/emergency/EmergencyDischargeDocument";

interface EmergencyDischargePrintClientProps {
  data: EmergencyDischargeDocumentData;
  triageId: string;
  patientId: string;
}

export default function EmergencyDischargePrintClient({
  data,
  triageId,
  patientId,
}: EmergencyDischargePrintClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const autoPrint = searchParams.get("autoprint") === "true";

  // After the print dialog closes, redirect back to the patient list
  useEffect(() => {
    const handleAfterPrint = () => {
      router.push("/emergency");
    };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [router]);

  // Auto-print mode: trigger print automatically on load
  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:bg-white print:p-0 print:min-h-0 font-sans">
      {/* Top Action Bar (Hidden during printing) */}
      <div className="max-w-[210mm] mx-auto mb-4 flex items-center justify-between print:hidden">
        <Link
          href="/emergency"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 px-3.5 py-2 rounded-xl transition shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Emergency &amp; Triage</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/patients/${patientId}`}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl transition"
          >
            Patient File
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-5 py-2 rounded-xl shadow-xs transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Discharge Form</span>
          </button>
        </div>
      </div>

      {/* Render Document */}
      <div className="max-w-[210mm] mx-auto bg-white rounded-xl shadow-lg border border-slate-200 print:border-none print:shadow-none print:rounded-none print:max-w-none">
        <EmergencyDischargeDocument data={data} />
      </div>
    </div>
  );
}
