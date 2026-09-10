"use client";

import React from "react";
import { Printer, X, Stethoscope, User, Calendar, Clock, CheckCircle2, ShieldAlert } from "lucide-react";

export interface AppointmentSlipData {
  appointmentNumber: string;
  tokenNumber: number | string;
  queuePosition?: number | string | null;
  mrNumber?: string | null;
  patientNumber?: string | null;
  patientName: string;
  patientPhone: string;
  patientGender?: string | null;
  patientAge?: string | number | null;
  doctorName: string;
  specialization?: string | null;
  departmentName?: string | null;
  roomNumber?: string | null;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: "REGULAR" | "FOLLOW_UP" | "EMERGENCY" | string;
  consultationFee: number | string;
  reason?: string | null;
  createdByName?: string | null;
  createdAt?: string | null;
}

interface Props {
  data: AppointmentSlipData;
  onClose?: () => void;
  isModal?: boolean;
}

export default function AppointmentPrintSlip({ data, onClose, isModal = false }: Props) {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = (() => {
    try {
      const d = new Date(data.appointmentDate);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-PK", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
      return data.appointmentDate;
    } catch {
      return data.appointmentDate;
    }
  })();

  const isEmergency = data.appointmentType === "EMERGENCY";
  const isFollowUp = data.appointmentType === "FOLLOW_UP";

  const slipContent = (
    <div id="appointment-print-slip" className="bg-white text-slate-900 w-full max-w-[420px] mx-auto p-5 sm:p-6 border-2 border-dashed border-slate-300 rounded-2xl shadow-sm print:border-none print:shadow-none print:p-2 print:m-0 font-sans">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #appointment-print-slip, #appointment-print-slip * {
            visibility: visible;
          }
          #appointment-print-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 80mm;
            margin: 0;
            padding: 8px;
            border: none;
            box-shadow: none;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Hospital Header */}
      <div className="text-center pb-3 border-b-2 border-slate-800">
        <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 leading-none">
          GHIAS HOSPITAL
        </h2>
        <p className="text-[10px] font-semibold text-slate-600 tracking-wider uppercase mt-1">
          Medical Center &amp; Clinical Care
        </p>
        <p className="text-[9px] text-slate-500 mt-0.5">
          Main Hospital Road • UAN: (042) 111-444-272 • Emergency: 24/7
        </p>
        <div className="mt-2 inline-block px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
          OPD Consultation Token Slip
        </div>
      </div>

      {/* Token & Reference Row */}
      <div className="flex items-center justify-between py-3 border-b border-dashed border-slate-300">
        <div>
          <span className="text-[9px] font-bold uppercase text-slate-500 block">
            Daily Token Number
          </span>
          <span className="font-mono font-black text-3xl sm:text-4xl text-teal-800 leading-none block mt-0.5">
            #{data.tokenNumber}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-bold uppercase text-slate-500 block">
            Appointment Ref
          </span>
          <span className="font-mono font-bold text-xs text-slate-900 block mt-0.5">
            {data.appointmentNumber}
          </span>
          {data.queuePosition && (
            <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-900 font-mono">
              Queue: #{data.queuePosition}
            </span>
          )}
        </div>
      </div>

      {/* Patient Primary Record: MR Number prominent */}
      <div className="py-2.5 border-b border-slate-200">
        <div className="bg-slate-100 rounded-lg p-2.5 border border-slate-200 mb-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
              Patient MR Number:
            </span>
            <span className="font-mono font-black text-sm text-teal-950 bg-teal-50 px-2 py-0.5 rounded border border-teal-300">
              {data.mrNumber || data.patientNumber || "N/A"}
            </span>
          </div>
          {data.patientNumber && data.patientNumber !== data.mrNumber && (
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span>Patient ID:</span>
              <span>{data.patientNumber}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 block">Patient Name:</span>
            <span className="font-bold text-slate-900 text-xs block leading-tight">
              {data.patientName}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Phone:</span>
            <span className="font-mono font-semibold text-slate-800 text-xs block">
              {data.patientPhone || "—"}
            </span>
          </div>
          {(data.patientGender || data.patientAge) && (
            <div className="col-span-2 text-[11px] text-slate-600">
              <span className="font-medium">Details: </span>
              {data.patientGender && <span className="capitalize">{data.patientGender.toLowerCase()} </span>}
              {data.patientAge && <span>• {data.patientAge} yrs</span>}
            </div>
          )}
        </div>
      </div>

      {/* Doctor & Clinic Information */}
      <div className="py-2.5 border-b border-slate-200 text-xs space-y-1">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] text-slate-500 block">Consulting Physician:</span>
            <span className="font-extrabold text-slate-900 text-sm block">
              {data.doctorName.startsWith("Dr.") ? data.doctorName : `Dr. ${data.doctorName}`}
            </span>
            {data.specialization && (
              <span className="text-[11px] font-medium text-teal-800 block">
                {data.specialization}
              </span>
            )}
          </div>
          {data.roomNumber && (
            <div className="text-right">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Clinic Room</span>
              <span className="font-bold text-xs bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded inline-block mt-0.5">
                📍 {data.roomNumber}
              </span>
            </div>
          )}
        </div>

        {data.departmentName && (
          <p className="text-[11px] text-slate-600">
            Department: <strong className="text-slate-800">{data.departmentName}</strong>
          </p>
        )}
      </div>

      {/* Schedule & Visit Type */}
      <div className="py-2.5 border-b border-slate-200 text-xs grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10px] text-slate-500 block">Appointment Date:</span>
          <span className="font-bold text-slate-900 block">{formattedDate}</span>
          <span className="text-[11px] text-slate-600 block">{data.appointmentTime}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 block">Visit Category:</span>
          <span
            className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded mt-0.5 border ${
              isEmergency
                ? "bg-rose-100 text-rose-900 border-rose-300"
                : isFollowUp
                ? "bg-sky-100 text-sky-900 border-sky-300"
                : "bg-slate-100 text-slate-900 border-slate-300"
            }`}
          >
            {isEmergency ? "Emergency" : isFollowUp ? "Follow-Up Check" : "Regular Consultation"}
          </span>
        </div>
      </div>

      {/* Fee & Payment Section */}
      <div className="py-2.5 border-b-2 border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Consultation Fee
            </span>
            <span className="font-mono font-black text-xl text-emerald-800">
              PKR {Number(data.consultationFee).toLocaleString()}
            </span>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
              Paid at Reception
            </span>
            {data.createdByName && (
              <span className="text-[9px] text-slate-500 block mt-1">
                Issued by: {data.createdByName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Notice / Footer */}
      <div className="pt-3 text-center space-y-1">
        <p className="text-[10px] font-bold text-slate-800 leading-tight">
          Please wait in the OPD lounge until Token #{data.tokenNumber} is called.
        </p>
        <p className="text-[9px] text-slate-500 leading-tight">
          Keep this token slip for doctor consultation, pharmacy prescriptions, and lab tests.
        </p>
        <div className="pt-2 font-mono text-[8px] text-slate-400 tracking-widest uppercase">
          * * * OFFICIAL HOSPITAL RECORD * * *
        </div>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-4 sm:p-6 space-y-4 my-8">
          <div className="flex items-center justify-between no-print pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-teal-600" />
              <h3 className="font-bold text-slate-900 text-base">Print Appointment Slip</h3>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-[75vh] py-2">
            {slipContent}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 no-print">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Close
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return slipContent;
}
