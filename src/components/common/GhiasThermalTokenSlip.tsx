"use client";

import React from "react";
import GhiasHospitalLogo from "./GhiasHospitalLogo";

export interface ThermalTokenData {
  tokenNumber?: number | string;
  slipNumber?: string | number;
  mrNumber?: string | null;
  dateTime?: string | Date;
  doctorName: string;
  patientName: string;
  gender?: string | null;
  address?: string | null;
  contactNo?: string | null;
  type: string; // e.g. "UltraSound", "X-Ray", "Lab Test", "Physio", "OPD"
  amount: number | string;
}

interface GhiasThermalTokenSlipProps {
  data: ThermalTokenData;
  className?: string;
  id?: string;
}

export default function GhiasThermalTokenSlip({
  data,
  className = "",
  id = "ghias-thermal-token-slip",
}: GhiasThermalTokenSlipProps) {
  // Format Date into YYYY-MM-DD HH:mm:ss as seen on the receipt
  const formattedDateTime = (() => {
    try {
      if (!data.dateTime) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const hh = String(now.getHours()).padStart(2, "0");
        const min = String(now.getMinutes()).padStart(2, "0");
        const ss = String(now.getSeconds()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
      }

      const d = typeof data.dateTime === "string" ? new Date(data.dateTime) : data.dateTime;
      if (isNaN(d.getTime())) return String(data.dateTime);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    } catch {
      return "—";
    }
  })();

  const cleanSlipNo = data.slipNumber || data.tokenNumber || "—";
  const cleanMR = data.mrNumber && data.mrNumber !== "null" && data.mrNumber.trim() !== "" ? data.mrNumber : "---";
  const cleanGender = data.gender
    ? data.gender.charAt(0).toUpperCase() + data.gender.slice(1).toLowerCase()
    : "---";
  const cleanAddress = data.address && data.address !== "null" && data.address.trim() !== ""
    ? data.address
    : "---";
  const cleanContact = data.contactNo && data.contactNo !== "null" && data.contactNo.trim() !== ""
    ? data.contactNo
    : "000";

  return (
    <div
      id={id}
      className={`bg-white text-slate-950 w-full max-w-[80mm] sm:w-[80mm] mx-auto p-4 sm:p-5 border border-dashed border-slate-300 rounded-lg shadow-sm print:shadow-none print:border-none print:p-2 print:m-0 font-sans text-xs relative select-none ${className}`}
    >
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body * {
            visibility: hidden;
          }
          #${id},
          #${id} * {
            visibility: visible;
          }
          #${id} {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 4mm 5mm !important;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Right Circled Token Number */}
      {data.tokenNumber && (
        <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
          <div className="w-8 h-8 rounded-full border-2 border-slate-800 flex items-center justify-center font-bold text-sm text-slate-900 shadow-2xs">
            {data.tokenNumber}
          </div>
        </div>
      )}

      {/* Center Crescent Logo */}
      <div className="text-center flex flex-col items-center justify-center pt-1">
        <GhiasHospitalLogo size={62} />

        {/* Urdu Hospital Name */}
        <h1
          className="text-2xl font-black tracking-normal text-slate-900 mt-2"
          style={{ fontFamily: "'Noto Nastaliq Urdu', 'Urdu Typesetting', Tahoma, sans-serif" }}
          dir="rtl"
        >
          غیاث ہسپتال
        </h1>

        {/* Official Hospital Contact Numbers */}
        <p className="text-[11px] font-semibold text-slate-800 tracking-tight mt-0.5">
          Contact # 0546-566567 , 0346-4949577
        </p>
      </div>

      {/* Exact Two-Column Form Table */}
      <div className="mt-4 border border-slate-300 rounded-sm overflow-hidden">
        <table className="w-full text-[11px] border-collapse">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="py-1.5 px-3 font-medium text-slate-700 w-[42%] bg-slate-50/40">
                No
              </td>
              <td className="py-1.5 px-3 font-bold text-slate-900 text-right w-[58%]">
                {cleanSlipNo}
              </td>
            </tr>

            <tr className="border-b border-slate-200">
              <td className="py-1.5 px-3 font-medium text-slate-700 bg-slate-50/40">
                MR Number
              </td>
              <td className="py-1.5 px-3 font-bold text-slate-900 text-right font-mono">
                {cleanMR}
              </td>
            </tr>

            <tr className="border-b border-slate-200">
              <td className="py-1.5 px-3 font-medium text-slate-700 bg-slate-50/40">
                Date
              </td>
              <td className="py-1.5 px-3 font-bold text-slate-900 text-right font-mono text-[10px]" suppressHydrationWarning>
                {formattedDateTime}
              </td>
            </tr>

            <tr className="border-b border-slate-200">
              <td className="py-1.5 px-3 font-medium text-slate-700 bg-slate-50/40">
                Doctor Name
              </td>
              <td className="py-1.5 px-3 font-bold text-slate-900 text-right">
                {data.doctorName.startsWith("Dr") ? data.doctorName : `Dr ${data.doctorName}`}
              </td>
            </tr>

            <tr className="border-b border-slate-200">
              <td className="py-1.5 px-3 font-medium text-slate-700 bg-slate-50/40">
                Patient Name
              </td>
              <td className="py-1.5 px-3 font-bold text-slate-900 text-right">
                {data.patientName}
              </td>
            </tr>

            <tr className="border-b border-slate-200">
              <td className="py-1.5 px-3 font-medium text-slate-700 bg-slate-50/40">
                Gender
              </td>
              <td className="py-1.5 px-3 font-bold text-slate-900 text-right">
                {cleanGender}
              </td>
            </tr>

            <tr className="border-b border-slate-200">
              <td className="py-1.5 px-3 font-medium text-slate-700 bg-slate-50/40">
                Address
              </td>
              <td className="py-1.5 px-3 font-medium text-slate-800 text-right truncate max-w-[120px]">
                {cleanAddress}
              </td>
            </tr>

            <tr className="border-b border-slate-200">
              <td className="py-1.5 px-3 font-medium text-slate-700 bg-slate-50/40">
                Contact No
              </td>
              <td className="py-1.5 px-3 font-bold text-slate-900 text-right font-mono">
                {cleanContact}
              </td>
            </tr>

            <tr className="border-b border-slate-200">
              <td className="py-1.5 px-3 font-bold text-slate-900 bg-slate-100/70 uppercase text-[10px]">
                Type
              </td>
              <td className="py-1.5 px-3 font-black text-slate-950 text-right uppercase">
                {data.type}
              </td>
            </tr>

            <tr>
              <td className="py-1.5 px-3 font-bold text-slate-900 bg-slate-100/70 uppercase text-[10px]">
                Amount
              </td>
              <td className="py-1.5 px-3 font-black text-slate-950 text-right font-mono text-sm">
                {Number(data.amount || 0).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bottom Urdu Address Box */}
      <div className="mt-4 bg-slate-100/80 border border-slate-200 rounded-sm py-2 px-3 text-center">
        <p
          className="text-xs font-bold text-slate-800 leading-normal"
          style={{ fontFamily: "'Noto Nastaliq Urdu', 'Urdu Typesetting', Tahoma, sans-serif" }}
          dir="rtl"
        >
          غیاث ہسپتال، مین گجرات روڈ پھالیہ نزد ٹیلی فون ایکسچینج
        </p>
      </div>
    </div>
  );
}
