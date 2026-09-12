"use client";

import React, { useEffect } from "react";
import { AlertOctagon, Printer, X, ShieldAlert, CheckCircle2 } from "lucide-react";

interface VerbalOrdersPolicyViewProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const VERBAL_ORDER_SOPS = [
  {
    num: "01",
    tag: "Emergency Only / صرف ہنگامی صورتحال",
    urdu: "نسخے کیلئے زبانی احکامات معمول کے مطابق قبول نہیں کیے جائیں گے۔ زبانی احکامات صرف غیر معمولی حالات میں استعمال کیے جائیں گے۔",
    english: "Verbal orders for prescriptions shall NOT be routinely accepted. Verbal orders are restricted to extraordinary / emergency situations only.",
  },
  {
    num: "02",
    tag: "Single STAT Dose / صرف ایک خوراک",
    urdu: "صرف ایک اسٹیٹ خوراک زبانی طور پر تجویز کی جائے گی۔",
    english: "Only a single STAT dose may be prescribed verbally.",
  },
  {
    num: "03",
    tag: "Dual Nurse Verification / دو نرسز کی تصدیق",
    urdu: "زبانی احکامات ابتدائی طور پر نرس کے ذریعے لئے جائیں گے اور دوسری نرس کے ذریعہ دہرائے جائیں گے۔",
    english: "Verbal orders shall initially be taken by a registered nurse and repeated back / verified by a second nurse.",
  },
  {
    num: "04",
    tag: "Red Ink Treatment Sheet / سرخ سیاہی کا اندراج",
    urdu: "آرڈر وصول کرنے والی نرس علاج کی شیٹ پر آرڈر ریکارڈ کرے گی۔ اندراج سرخ سیاہی میں ہوگا اور اس میں وقت، تاریخ نسخہ دینے والے کا نام اور نرس کے دستخط کے ساتھ ساتھ دوسری نرس کے دستخط بھی شامل ہوں گے۔",
    english: "The receiving nurse must record the order on the treatment chart. The entry MUST be in RED INK and record time, date, ordering doctor name, receiving nurse signature, and second nurse signature.",
  },
  {
    num: "05",
    tag: "Read-Back & Confirm / ڈاکٹر سے توثیق",
    urdu: "نرس اس بات کو یقینی بنانے کیلئے ڈاکٹر کو حکم دہرائے گی کہ تفصیلات درست ہیں۔",
    english: "The nurse must execute a 'Read-Back & Confirm' to the physician to verify all medication and dosage details are correct.",
  },
  {
    num: "06",
    tag: "24h Countersignature / 24 گھنٹے میں جوابی دستخط",
    urdu: "24 گھنٹے کے اندر زبانی حکم دینے والے ڈاکٹر کے آرڈر شیٹ پر جوابی دستخط کئے جائیں گے۔",
    english: "Countersignature by the prescribing doctor must be completed on the patient order sheet within 24 hours.",
  },
  {
    num: "07",
    tag: "Clinical Clarification / شک کی صورت میں وضاحت",
    urdu: "احکامات کے بارے میں اگر کوئی شک ہو تو نرس پہلے اس کی وضاحت متعلقہ ڈاکٹر سے لے گی۔",
    english: "If there is any ambiguity or doubt regarding the order, the nurse must immediately seek clinical clarification from the physician before administration.",
  },
  {
    num: "08",
    tag: "Hospital Drug Policy / ادویاتی پالیسی کی پاسداری",
    urdu: "ادویات / ادویاتی طریقہ کار اور ادویات کی پالیسی کے مطابق دی جائیں گی۔",
    english: "Medications must be administered strictly in compliance with hospital drug administration protocols and pharmacology safety policy.",
  },
  {
    num: "09",
    tag: "Patient Safety First / مریض کے تحفظ کی دوبارہ جانچ",
    urdu: "زبانی حکم کی دوبارہ تصدیق کی جائے گی اگر نرس کو یقین ہے کہ اس سے مریض کی دیکھ بھال اور علاج میں سمجھوتہ ہو سکتا ہے۔",
    english: "The verbal order shall be re-verified if the nurse has reason to believe patient safety or treatment integrity could be compromised.",
  },
];

export default function VerbalOrdersPolicyView({
  onClose,
  isModal = false,
}: VerbalOrdersPolicyViewProps) {
  useEffect(() => {
    if (!isModal || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModal, onClose]);

  const handlePrint = () => {
    window.print();
  };

  const content = (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-rose-300 overflow-hidden max-w-3xl mx-auto print:shadow-none print:border-none print:max-w-full flex flex-col max-h-[90vh]">
      {/* Top Header Bar */}
      <div className="bg-rose-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0 shadow-sm print:hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-800 flex items-center justify-center border border-rose-700 shrink-0">
            <ShieldAlert className="w-4 h-4 text-rose-200" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-rose-200">
              Ghias Hospital • SOP Guidelines
            </div>
            <div className="text-sm font-black tracking-tight text-white">
              زبانی احکامات پر پالیسی (Verbal Orders Standard)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 text-xs bg-rose-800 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg font-semibold border border-rose-700/60 shadow-xs transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print SOP</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition cursor-pointer"
              title="Close SOPs (Escape)"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="p-5 sm:p-7 space-y-6 text-slate-800 overflow-y-auto">
        {/* Hospital Badge & Poster Header */}
        <div className="text-center border-b-2 border-rose-100 pb-5 bg-gradient-to-b from-rose-50/50 via-white to-transparent -mx-5 -mt-5 pt-6 px-5">
          <div className="inline-flex items-center justify-center gap-2 px-3 py-1 bg-rose-100 text-rose-900 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <span>Reg No: 59488 • Phalia</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-rose-900 uppercase">
            GHIAS HOSPITAL
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-rose-700 tracking-wide mt-0.5">
            Clinical Safety &amp; Inpatient Quality Protocol
          </p>

          <div className="mt-3">
            <h2
              className="text-2xl sm:text-3xl font-bold text-rose-800 tracking-normal leading-relaxed"
              style={{ fontFamily: "'Noto Nastaliq Urdu', 'Urdu Typesetting', Tahoma, sans-serif" }}
              dir="rtl"
            >
              زبانی احکامات پر پالیسی
            </h2>
            <div className="mt-1 px-4 py-1 bg-rose-800 text-white font-bold text-xs uppercase tracking-widest rounded-md inline-block shadow-xs">
              SOPs on Verbal Orders
            </div>
          </div>
        </div>

        {/* 9 Standard Operating Procedures */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 text-xs text-slate-500 font-semibold">
            <span>Mandatory Guidelines (۹ لازمی احکامات)</span>
            <span>All Nurses &amp; Medical Officers</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {VERBAL_ORDER_SOPS.map((sop) => (
              <div
                key={sop.num}
                className="bg-slate-50/70 hover:bg-rose-50/30 border border-slate-200 hover:border-rose-300 rounded-xl p-3.5 transition-colors shadow-2xs"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-7 h-7 rounded-lg bg-rose-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {sop.num}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 bg-rose-100/70 px-2 py-0.5 rounded">
                        {sop.tag}
                      </span>
                    </div>
                    {/* Urdu Rule Text */}
                    <p
                      className="text-sm sm:text-base font-semibold text-slate-900 text-right leading-relaxed"
                      style={{ fontFamily: "'Noto Nastaliq Urdu', 'Urdu Typesetting', Tahoma, sans-serif" }}
                      dir="rtl"
                    >
                      {sop.urdu}
                    </p>
                    {/* English Translation */}
                    <p className="text-xs text-slate-600 font-sans leading-normal">
                      {sop.english}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Red High-Alert Warning Banner */}
        <div className="bg-gradient-to-r from-rose-800 to-red-800 text-white rounded-xl p-4 sm:p-5 border-2 border-rose-900 shadow-md">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white/10 shrink-0 mt-0.5">
              <AlertOctagon className="w-6 h-6 text-rose-200 animate-pulse" />
            </div>
            <div className="space-y-1 text-right flex-1" dir="rtl">
              <span
                className="text-base sm:text-lg font-black tracking-wide leading-relaxed block text-white"
                style={{ fontFamily: "'Noto Nastaliq Urdu', 'Urdu Typesetting', Tahoma, sans-serif" }}
              >
                ہائی الرٹ میڈیکیشن اور ہائی رسک ادویات کیلئے کوئی زبانی احکامات کی تعمیل نہیں ہو گی۔
              </span>
              <p className="text-xs font-bold uppercase text-rose-100 font-sans tracking-wide text-left" dir="ltr">
                STRICT BAN: Under NO circumstances shall High-Alert or High-Risk medications be administered via verbal instruction.
              </p>
            </div>
          </div>
        </div>

        {/* Clinical Sign-off & Regulatory Footer */}
        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Hospital Quality &amp; Patient Safety Committee</span>
            <span className="font-bold text-slate-700 font-mono">• Form: GIAS-SOP-VO-2026</span>
          </div>
          <div className="font-semibold text-rose-800">
            Mandatory Compliance by order of MS
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions Bar */}
      {onClose && (
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0 print:hidden">
          <span className="text-xs text-slate-500">
            Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-mono shadow-2xs">Esc</kbd> or click outside to dismiss
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Close Guidelines (بند کریں)</span>
          </button>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
        onClick={(e) => {
          if (e.target === e.currentTarget && onClose) {
            onClose();
          }
        }}
      >
        <div className="w-full max-w-3xl my-auto">{content}</div>
      </div>
    );
  }

  return content;
}
