"use client";

import React from "react";

export type PermissionType = "ANESTHESIA" | "OPERATION" | "BLOOD_TRANSFUSION";

export interface PermissionDocumentData {
  hospitalName?: string;
  regNumber?: string;
  generatedAt?: string;
  generatedBy?: string;
  isSigned?: boolean;
  status?: string;
  watermarkText?: string;
  selectedPermissions: PermissionType[];
  patient: {
    id: string;
    patientNumber: string;
    mrNumber: string;
    fullName: string;
    firstName: string;
    lastName: string;
    gender: string;
    ageYears: number;
    bloodGroup?: string | null;
    phone: string;
    cnic?: string | null;
    relationType?: string | null;
    relatedPersonName?: string | null;
    address?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    emergencyContactRelation?: string | null;
  };
  admission: {
    id: string;
    admissionNumber: string;
    admissionDate: string;
    admissionTime?: string | null;
    roomBedNo?: string | null;
    admissionSource: string;
    status: string;
    provisionalDiagnosis?: string | null;
    treatmentPlan?: string | null;
  };
  doctor?: {
    id: string;
    doctorNumber: string;
    fullName: string;
    firstName: string;
    lastName: string;
    specialization: string;
    departmentName?: string | null;
    roomNumber?: string | null;
  } | null;
}

interface PermissionDocumentViewProps {
  data: PermissionDocumentData;
  showWatermark?: boolean;
}

const URDU_FONT_STYLE: React.CSSProperties = {
  fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', Tahoma, 'Segoe UI', Arial, sans-serif",
  lineHeight: "2.2",
};

export default function PermissionDocumentView({
  data,
  showWatermark = true,
}: PermissionDocumentViewProps) {
  const { patient, admission, doctor, selectedPermissions } = data;

  // Order permissions logically: Anesthesia (1) -> Operation (2) -> Blood Transfusion (3)
  const orderedForms: PermissionType[] = [];
  if (selectedPermissions.includes("ANESTHESIA")) orderedForms.push("ANESTHESIA");
  if (selectedPermissions.includes("OPERATION")) orderedForms.push("OPERATION");
  if (selectedPermissions.includes("BLOOD_TRANSFUSION")) orderedForms.push("BLOOD_TRANSFUSION");

  const todayStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const formattedBloodGroup = patient.bloodGroup
    ? patient.bloodGroup.replace("_POSITIVE", "+").replace("_NEGATIVE", "-")
    : "Not Recorded";

  return (
    <div className="w-full space-y-10 print:space-y-0 text-slate-900">
      {orderedForms.map((formType, index) => {
        const isLastPage = index === orderedForms.length - 1;

        return (
          <div
            key={formType}
            className={`relative bg-white border border-slate-300 print:border-0 shadow-sm print:shadow-none p-8 sm:p-12 print:p-6 mx-auto max-w-[210mm] min-h-[297mm] flex flex-col justify-between ${
              !isLastPage ? "print:break-after-page" : ""
            }`}
            style={{ boxSizing: "border-box" }}
          >
            {/* Subtle Diagonal Watermark */}
            {showWatermark && (
              <div
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
              >
                <div className="transform -rotate-45 border-4 border-dashed border-rose-300/40 print:border-slate-300/60 rounded-3xl py-4 px-10 text-center">
                  <p className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-widest text-rose-300/45 print:text-slate-300/60 uppercase">
                    UNSIGNED / FOR SIGNATURE
                  </p>
                  <p className="text-xs font-bold text-rose-300/40 print:text-slate-300/50 mt-1 uppercase tracking-wider">
                    Official Hospital Document • Requires Physical Signature
                  </p>
                </div>
              </div>
            )}

            {/* Document Content */}
            <div className="relative z-10 flex flex-col flex-1 justify-between">
              {/* Top Hospital Header */}
              <div>
                <div className="border-b-2 border-teal-900 pb-3 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-teal-900 text-white font-bold text-2xl flex items-center justify-center shadow-xs">
                      +
                    </div>
                    <div>
                      <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                        GIAS HOSPITAL PHALIA
                      </h1>
                      <p className="text-xs font-bold uppercase tracking-wider text-teal-800">
                        REG NO. R-59488
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Inpatient &amp; Surgical Care Department • Helipad Road, Phalia
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <div className="inline-block bg-teal-50 border border-teal-200 text-teal-900 px-3 py-1 rounded font-bold text-xs uppercase tracking-wider">
                      Page {index + 1} of {orderedForms.length}
                    </div>
                    <p className="font-mono text-[11px] text-slate-500 mt-1">
                      Adm #: {admission.admissionNumber}
                    </p>
                  </div>
                </div>

                {/* Patient Information Strip */}
                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">MR Number</span>
                    <span className="font-black text-slate-900 font-mono text-sm">{patient.mrNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Patient Name</span>
                    <span className="font-bold text-slate-900">{patient.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Age / Gender / Blood</span>
                    <span className="font-semibold text-slate-800">
                      {patient.ageYears} yrs • {patient.gender} • {formattedBloodGroup}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Date &amp; Ward/Bed</span>
                    <span className="font-semibold text-slate-800">
                      {todayStr} • {admission.roomBedNo || "Not assigned"}
                    </span>
                  </div>
                </div>

                {/* Attending Physician Bar */}
                <div className="mt-2 flex flex-wrap items-center justify-between text-xs border-b border-slate-200 pb-2 px-1 text-slate-700">
                  <div>
                    <span className="font-bold">Attending Doctor:</span>{" "}
                    <span className="font-semibold text-slate-900">
                      {doctor ? doctor.fullName : "Hospital Physician"}
                    </span>{" "}
                    {doctor?.specialization ? `(${doctor.specialization})` : ""}
                  </div>
                  <div>
                    <span className="font-bold">Contact / Phone:</span>{" "}
                    <span className="font-mono">{patient.phone}</span>
                    {patient.cnic && <span className="ml-2 font-mono">| CNIC: {patient.cnic}</span>}
                  </div>
                </div>

                {/* Form Title */}
                <div className="mt-6 text-center">
                  {formType === "ANESTHESIA" && (
                    <>
                      <h2
                        dir="rtl"
                        className="text-2xl sm:text-3xl font-bold text-teal-950 tracking-wide pb-1 border-b-2 border-teal-700 inline-block px-4"
                        style={URDU_FONT_STYLE}
                      >
                        اجازت نامہ برائے بے ہوشی
                      </h2>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">
                        Permission for Unconsciousness / Anesthesia
                      </p>
                    </>
                  )}

                  {formType === "OPERATION" && (
                    <>
                      <h2
                        dir="rtl"
                        className="text-2xl sm:text-3xl font-bold text-teal-950 tracking-wide pb-1 border-b-2 border-teal-700 inline-block px-4"
                        style={URDU_FONT_STYLE}
                      >
                        اجازت نامہ برائے آپریشن
                      </h2>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">
                        Permission for Surgical Operation
                      </p>
                    </>
                  )}

                  {formType === "BLOOD_TRANSFUSION" && (
                    <>
                      <h2
                        dir="rtl"
                        className="text-2xl sm:text-3xl font-bold text-teal-950 tracking-wide pb-1 border-b-2 border-teal-700 inline-block px-4"
                        style={URDU_FONT_STYLE}
                      >
                        اجازت نامہ برائے انتقال خون (مریض)
                      </h2>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">
                        Permission for Blood Transfusion
                      </p>
                    </>
                  )}
                </div>

                {/* Form Urdu Consent Body */}
                <div className="mt-6 bg-slate-50/50 border border-slate-200 rounded-xl p-6 sm:p-7">
                  {formType === "ANESTHESIA" && (
                    <div
                      dir="rtl"
                      className="text-slate-800 text-sm sm:text-base text-justify leading-relaxed"
                      style={URDU_FONT_STYLE}
                    >
                      <p>
                        میں مسمی / مسمات{" "}
                        <span className="font-bold border-b border-dotted border-slate-800 px-2 text-slate-900">
                          {patient.relatedPersonName || "____________________"}
                        </span>{" "}
                        {patient.relationType || "ولد / زوجہ / دختر"}{" "}
                        <span className="font-bold border-b border-dotted border-slate-800 px-2 text-slate-900">
                          {patient.relatedPersonName ? patient.fullName : "____________________"}
                        </span>{" "}
                        شناختی کارڈ نمبر{" "}
                        <span className="font-mono font-bold border-b border-dotted border-slate-800 px-2 text-slate-900">
                          {patient.cnic || "____________________"}
                        </span>{" "}
                        ساکن{" "}
                        <span className="font-bold border-b border-dotted border-slate-800 px-2 text-slate-900">
                          {patient.address || "____________________"}
                        </span>{" "}
                        بقائمی ہوش و حواس بلا جبر و اکراہ ہسپتال ہذا کے ڈاکٹرز و اینستھیٹسٹ کو اجازت دیتا / دیتی ہوں کہ مجھ پر یا میرے زیرِ کفالت مریض{" "}
                        <span className="font-bold border-b border-dotted border-slate-800 px-2 text-slate-900">
                          {patient.fullName}
                        </span>{" "}
                        (ایم آر نمبر:{" "}
                        <span className="font-mono font-bold border-b border-dotted border-slate-800 px-1 text-slate-900">
                          {patient.mrNumber}
                        </span>
                        ) پر علاج / آپریشن کے پیشِ نظر حسبِ ضرورت لوکل / جنرل / سپائنل بے ہوشی کا طریقہ اختیار کریں۔
                      </p>
                      <p className="mt-3">
                        بے ہوشی کے طریقہ کار اور ممکنہ عوارضات و خطرات مجھے تفصیلاً سمجھا دیے گئے ہیں، جنہیں میں نے بخوبی سمجھ لیا ہے۔ دورانِ بے ہوشی یا بعد ازاں کسی بھی غیر متوقع ہنگامی صورتحال کے پیش آنے پر ہسپتال یا ڈاکٹر صاحبان پر کوئی قانونی دعویٰ نہ ہو گا۔
                      </p>
                    </div>
                  )}

                  {formType === "OPERATION" && (
                    <div
                      dir="rtl"
                      className="text-slate-800 text-sm sm:text-base text-justify leading-relaxed"
                      style={URDU_FONT_STYLE}
                    >
                      <p>
                        میں مسمی / مسمات{" "}
                        <span className="font-bold border-b border-dotted border-slate-800 px-2 text-slate-900">
                          {patient.relatedPersonName || "____________________"}
                        </span>{" "}
                        {patient.relationType || "ولد / زوجہ / دختر"}{" "}
                        <span className="font-bold border-b border-dotted border-slate-800 px-2 text-slate-900">
                          {patient.relatedPersonName ? patient.fullName : "____________________"}
                        </span>{" "}
                        بقائمی عقل و ہوش بلا خوف و دباؤ غیاث ہسپتال کے سرجن صاحبان کو اجازت دیتا / دیتی ہوں کہ وہ میرا / میرے زیرِ علاج مریض{" "}
                        <span className="font-bold border-b border-dotted border-slate-800 px-2 text-slate-900">
                          {patient.fullName}
                        </span>{" "}
                        کا تجویز کردہ آپریشن / سرجری بوجہ{" "}
                        <span className="font-bold border-b border-dotted border-slate-800 px-2 text-slate-900">
                          {admission.provisionalDiagnosis || admission.treatmentPlan || "طبی تشخیص و علاج"}
                        </span>{" "}
                        سرانجام دیں۔
                      </p>
                      <p className="mt-3">
                        آپریشن کی نوعیت، مقاصد، متبادل طریقہ ہائے علاج اور آپریشن سے وابستہ تمام ممکنہ خطرات، عوارضات و پیچیدگیاں ڈاکٹر صاحب نے مجھے اور میرے لواحقین کو مادری زبان میں سمجھا دی ہیں اور ہم مکمل رضا مندی سے یہ اجازت نامہ تحریر کر رہے ہیں۔
                      </p>
                    </div>
                  )}

                  {formType === "BLOOD_TRANSFUSION" && (
                    <div
                      dir="rtl"
                      className="text-slate-800 text-sm sm:text-base text-justify leading-relaxed"
                      style={URDU_FONT_STYLE}
                    >
                      <p>
                        میں مسمی / مسمات{" "}
                        <span className="font-bold border-b border-dotted border-slate-800 px-2 text-slate-900">
                          {patient.relatedPersonName || "____________________"}
                        </span>{" "}
                        مریض / ولیِ مریض{" "}
                        <span className="font-bold border-b border-dotted border-slate-800 px-2 text-slate-900">
                          {patient.fullName}
                        </span>{" "}
                        (بلڈ گروپ:{" "}
                        <span className="font-mono font-bold border-b border-dotted border-slate-800 px-2 text-slate-900">
                          {formattedBloodGroup}
                        </span>
                        ) ہوش و حواس میں بقائمی عقل اپنی رضامندی سے مریض کو ضرورت پڑنے پر انتقالِ خون (بلڈ یا بلڈ پراڈکٹس) لگانے کی اجازت دیتا / دیتی ہوں۔
                      </p>
                      <p className="mt-3">
                        مجھے انتقالِ خون کی طبی ضرورت، ممکنہ الرجی، ری ایکشنز اور فوائد و نقصانات کے بارے میں آگاہ کر دیا گیا ہے۔ میں نے تمام ہدایات سن و سمجھ لی ہیں اور یہ اجازت بلا جبر و اکراہ دے رہا / رہی ہوں۔
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Physical Blank Signatures & Witnesses Section */}
              <div className="mt-8 pt-4 border-t-2 border-slate-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
                  {/* Left Column: Patient / Guardian Blank Signatures */}
                  <div className="space-y-4">
                    <div className="border border-slate-200 rounded-lg p-3 bg-white">
                      <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-3">
                        مریض یا وارث کے دستخط / نشانِ انگوٹھا (Patient / Guardian)
                      </p>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">دستخط / انگوٹھا:</span>
                          <span className="w-48 border-b border-slate-400 inline-block"></span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">نام دستخط کنندہ:</span>
                          <span className="w-48 border-b border-slate-400 inline-block"></span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">رشتہ مع مریض:</span>
                          <span className="w-48 border-b border-slate-400 inline-block">
                            {patient.emergencyContactRelation || ""}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">شناختی کارڈ نمبر:</span>
                          <span className="w-48 border-b border-slate-400 inline-block font-mono"></span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">موبائل فون نمبر:</span>
                          <span className="w-48 border-b border-slate-400 inline-block font-mono">
                            {patient.emergencyContactPhone || patient.phone}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-lg p-3 bg-white">
                      <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                        گواہ اول (Witness 1)
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-slate-500 text-[10px] block">نام و ولدیت:</span>
                          <div className="border-b border-slate-400 h-5"></div>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">شناختی کارڈ / فون:</span>
                          <div className="border-b border-slate-400 h-5"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Attending Doctor / Surgeon Physical Signatures */}
                  <div className="space-y-4">
                    <div className="border border-slate-200 rounded-lg p-3 bg-white">
                      <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-3">
                        ڈاکٹر / سرجن کی توثیق (Doctor / Surgeon Attestation)
                      </p>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">ڈاکٹر کا نام:</span>
                          <span className="font-bold text-slate-900">
                            {doctor ? doctor.fullName : "Dr. __________________"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">ڈاکٹر کے دستخط:</span>
                          <span className="w-48 border-b border-slate-400 inline-block"></span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">تاریخ (Date):</span>
                          <span className="w-48 border-b border-slate-400 inline-block font-mono">
                            {todayStr}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">وقت (Time):</span>
                          <span className="w-48 border-b border-slate-400 inline-block font-mono">
                            ____:____ {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">کیفیت (Status):</span>
                          <span className="font-bold text-rose-700 uppercase tracking-wider">
                            UNSIGNED
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-lg p-3 bg-white">
                      <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                        گواہ دوم (Witness 2 / Hospital Staff)
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-slate-500 text-[10px] block">نام مع عہدہ:</span>
                          <div className="border-b border-slate-400 h-5"></div>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">دستخط مع تاریخ:</span>
                          <div className="border-b border-slate-400 h-5"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Legal Notice */}
                <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500">
                  <p>
                    Notice: This document was generated digitally for legal physical execution. It is invalid without original signatures and thumb impressions.
                  </p>
                  <p className="font-mono uppercase tracking-wider font-semibold text-slate-600">
                    GIAS-DOC-R59488-REV2
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
