"use client";

import React from "react";
import GhiasHospitalLogo from "@/components/common/GhiasHospitalLogo";

export type PermissionType = "ANESTHESIA" | "OPERATION" | "BLOOD_TRANSFUSION";

export interface ConsentFormFields {
  // Signer / Person giving permission
  giverName?: string; // نام
  relationToPatient?: string; // مریض سے رشتہ
  relationPersonName?: string; // ولدیت / بنت / زوجہ

  // Operation & Anesthesia
  procedureName?: string; // کو آپریشن کے لیے / کے ___ کا آپریشن
  organOrBodyPart?: string; // کس عضو کا
  doctorName?: string; // ڈاکٹر کا نام
  anesthetistName?: string; // بیہوشی کے ڈاکٹر کا نام
  operationComplications?: string; // ممکنہ پیچیدگیاں مثلاً
  operationAlternative?: string; // متبادل

  // Blood Transfusion
  bloodComponents?: string; // خون / خون کے اجزاء مثلاً
  bloodComplications?: string; // انتقال خون کے مضر اثرات پیچیدگیاں مثلاً
  bloodAlternative?: string; // اور متبادل

  // Common
  consentDate?: string; // Date
  consentTime?: string; // Time
}

export interface PermissionDocumentData {
  hospitalName?: string;
  regNumber?: string;
  generatedAt?: string;
  generatedBy?: string;
  isSigned?: boolean;
  status?: string;
  watermarkText?: string;
  selectedPermissions: PermissionType[];
  consentDetails?: ConsentFormFields;
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
  lineHeight: "2.3",
};

export default function PermissionDocumentView({
  data,
  showWatermark = false,
}: PermissionDocumentViewProps) {
  const { patient, admission, doctor, selectedPermissions, consentDetails } = data;

  // Order permissions logically: Anesthesia (1) -> Operation (2) -> Blood Transfusion (3)
  const orderedForms: PermissionType[] = [];
  if (selectedPermissions.includes("ANESTHESIA")) orderedForms.push("ANESTHESIA");
  if (selectedPermissions.includes("OPERATION")) orderedForms.push("OPERATION");
  if (selectedPermissions.includes("BLOOD_TRANSFUSION")) orderedForms.push("BLOOD_TRANSFUSION");

  // Format today's date
  const todayStr =
    consentDetails?.consentDate ||
    new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const currentTime =
    consentDetails?.consentTime ||
    new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  // Default values from patient & admission
  const defaultDoctorName = doctor ? doctor.fullName : "Dr. Ghias Hospital";
  const doctorName = consentDetails?.doctorName || defaultDoctorName;
  const anesthetistName = consentDetails?.anesthetistName || doctorName;

  const giverName =
    consentDetails?.giverName ||
    patient.relatedPersonName ||
    patient.fullName;

  const relationToPatient =
    consentDetails?.relationToPatient ||
    patient.relationType ||
    "خود / مریض";

  const relationPersonName =
    consentDetails?.relationPersonName ||
    patient.relatedPersonName ||
    "";

  const procedureName =
    consentDetails?.procedureName ||
    consentDetails?.organOrBodyPart ||
    admission.provisionalDiagnosis ||
    admission.treatmentPlan ||
    "علاج و سرجری";

  const operationComplications =
    consentDetails?.operationComplications || "خون بہنا، انفیکشن، الرجی، اینستھیزیا کے اثرات";

  const operationAlternative =
    consentDetails?.operationAlternative || "ادویات و دیگر متبادل طریقہ علاج";

  const bloodComponents =
    consentDetails?.bloodComponents || "ہول بلڈ / ریڈ سیلز (Whole Blood / PRBC)";

  const bloodComplications =
    consentDetails?.bloodComplications || "بخار، الرجک ری ایکشن، لرزہ، غیر متوقع ردعمل";

  const bloodAlternative =
    consentDetails?.bloodAlternative || "آئرن تھراپی / آئی وی فلوئڈز";

  return (
    <div className="w-full text-slate-900 bg-white">
      {/* Printable A4 Paper Container - Clean letterhead, no chunky outer boxes */}
      <div
        id="official-consent-paper"
        className="relative bg-white shadow-md print:shadow-none p-6 sm:p-8 print:p-6 mx-auto max-w-[210mm] min-h-[297mm] flex flex-col justify-between"
        style={{ boxSizing: "border-box" }}
      >
        {/* Subtle Watermark for unsigned official records */}
        {showWatermark && (
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
          >
            <div className="transform -rotate-30 border-2 border-dashed border-slate-300/30 print:border-slate-300/25 rounded-2xl py-3 px-8 text-center">
              <p className="text-3xl sm:text-4xl font-extrabold tracking-widest text-slate-400/25 print:text-slate-400/20 uppercase font-sans">
                UNSIGNED • FOR OFFICIAL SIGNATURE
              </p>
            </div>
          </div>
        )}

        <div className="relative z-10 flex flex-col flex-1 justify-between space-y-4 print:space-y-3">
          {/* TOP HEADER: Clean Letterhead Header (NO heavy black box) */}
          <div className="text-center pb-2 border-b border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
              <span className="font-mono tracking-wider">DOC: GHIAS-MED-CONSENT</span>
              <span className="font-bold text-slate-800 uppercase tracking-wider">
                REG NO. R-59488
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 uppercase font-sans">
              GHIAS HOSPITAL PHALIA
            </h1>
            
            <p
              dir="rtl"
              className="text-sm sm:text-base font-bold text-slate-800 mt-0.5"
              style={URDU_FONT_STYLE}
            >
              غیاث ہسپتال پھالیہ — باضابطہ قانونی اجازت نامہ برائے علاج و سرجری
            </p>

            <div className="mt-1 inline-block px-3 py-0.5 rounded-full bg-slate-100 print:bg-transparent">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-slate-800">
                PATIENT INFORMED CONSENT FORM
              </span>
            </div>
          </div>

          {/* PATIENT & ADMISSION RECORD STRIP: Clean, crisp typographic layout (No extra lines or boxes) */}
          <div className="py-2 px-1 border-b border-slate-300 text-xs text-slate-900">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Patient Name:</span>
                <span className="font-bold text-slate-950 text-sm">{patient.fullName}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">MR Number:</span>
                <span className="font-mono font-bold text-slate-950 text-sm">{patient.mrNumber}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Age / Gender:</span>
                <span className="font-semibold text-slate-900">
                  {patient.ageYears} Yrs • {patient.gender}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Date & Time:</span>
                <span className="font-mono font-bold text-slate-900">{todayStr} • {currentTime}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Admission / Bed:</span>
                <span className="font-semibold text-slate-900">
                  {admission.admissionNumber} {admission.roomBedNo ? `(Bed: ${admission.roomBedNo})` : ""}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Phone / CNIC:</span>
                <span className="font-mono text-slate-800">
                  {patient.phone} {patient.cnic ? `• ${patient.cnic}` : ""}
                </span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Attending Doctor / Dept:</span>
                <span className="font-bold text-slate-900 truncate block">
                  {doctorName} {doctor?.specialization ? `(${doctor.specialization})` : ""}
                </span>
              </div>
            </div>
          </div>

          {/* CONSENT SECTIONS CONTAINER: Clean typographic flow, no nested border-boxes */}
          <div className="space-y-4 print:space-y-3 flex-1">
            {/* SECTION 1: Anesthesia Consent */}
            {orderedForms.includes("ANESTHESIA") && (
              <div className="py-2 space-y-2 border-b border-slate-200 print:border-slate-300 pb-3 break-inside-avoid">
                <div className="flex items-center justify-between border-b border-slate-300/80 pb-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 font-sans">
                    1. Informed Consent for Anesthesia
                  </span>
                  <h2
                    dir="rtl"
                    className="text-base sm:text-lg font-black text-slate-950"
                    style={URDU_FONT_STYLE}
                  >
                    اجازت نامہ برائے بیہوشی
                  </h2>
                </div>

                {/* Urdu text */}
                <div
                  dir="rtl"
                  className="text-[12.5px] sm:text-[13.5px] text-slate-950 text-justify leading-relaxed"
                  style={URDU_FONT_STYLE}
                >
                  <p>
                    میں / میرا مریض{" "}
                    <span className="font-bold underline px-1 text-slate-950 font-sans">
                      {giverName || "......................................."}
                    </span>{" "}
                    کو آپریشن کے لیے{" "}
                    <span className="font-bold underline px-1 text-slate-950 font-sans">
                      {procedureName || "......................................."}
                    </span>{" "}
                    بیہوشی / جسم کو سن کرنا ضروری ہے اور ڈاکٹر نے مجھے اس کا طریقہ کار فوائد نقصانات ممکنہ پیچیدگیوں اور متبادل سے آگاہ کر دیا ہے کہ بیہوشی کا عمل خطرات سے خالی نہیں جس میں دوا کے برے اثرات دانت ٹوٹنے سے لے کر موت تک واقع ہو سکتی ہے۔ دوران آپریشن ڈاکٹر ضرورت پڑنے پر بیہوشی کا متبادل طریقہ بھی اختیار کر سکتا ہے۔ یہ تمام چیزیں سمجھنے اور سننے کے بعد ڈاکٹر{" "}
                    <span className="font-bold underline px-1 text-slate-950 font-sans">
                      {anesthetistName || doctorName || "......................................."}
                    </span>{" "}
                    سے آپریشن کے لئے بیہوشی کروانے کے لئے تیار ہوں۔
                  </p>
                </div>

                {/* Professional Signatures Row */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Signer Block */}
                  <div dir="rtl" className="space-y-1 text-slate-900" style={URDU_FONT_STYLE}>
                    <p className="font-bold text-slate-950 border-b border-slate-300 pb-0.5">
                      مریض یا ولی / وارث کے دستخط و نشان انگوٹھا:
                    </p>
                    <div className="text-[11.5px] text-slate-800 space-y-0.5 pt-0.5">
                      <p>
                        نام: <span className="font-bold font-sans underline">{giverName}</span>
                      </p>
                      <p>
                        ولدیت / زوجہ / رشتہ:{" "}
                        <span className="font-semibold font-sans">
                          {relationPersonName ? `${relationPersonName} / ` : ""}
                          {relationToPatient}
                        </span>
                      </p>
                      <div className="pt-2 flex items-center gap-2">
                        <span>دستخط / انگوٹھا:</span>
                        <span className="border-b border-dotted border-slate-600 inline-block flex-1 min-w-[120px]"></span>
                      </div>
                    </div>
                  </div>

                  {/* Doctor Block */}
                  <div className="space-y-1 text-slate-900">
                    <p className="font-bold text-slate-950 border-b border-slate-300 pb-0.5 text-right sm:text-left">
                      Attending Doctor / Anesthetist:
                    </p>
                    <div className="text-[11.5px] text-slate-800 space-y-0.5 pt-0.5">
                      <p>
                        Doctor: <span className="font-bold">{anesthetistName || doctorName}</span>
                      </p>
                      <p className="font-mono text-[11px] text-slate-600">
                        Date &amp; Time: {todayStr} • {currentTime}
                      </p>
                      <div className="pt-2 flex items-center gap-2">
                        <span>Doctor's Sign &amp; Stamp:</span>
                        <span className="border-b border-dotted border-slate-600 inline-block flex-1 min-w-[120px]"></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: Operation / Surgery Consent */}
            {orderedForms.includes("OPERATION") && (
              <div className="py-2 space-y-2 border-b border-slate-200 print:border-slate-300 pb-3 break-inside-avoid">
                <div className="flex items-center justify-between border-b border-slate-300/80 pb-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 font-sans">
                    2. Informed Consent for Surgery / Operation
                  </span>
                  <h2
                    dir="rtl"
                    className="text-base sm:text-lg font-black text-slate-950"
                    style={URDU_FONT_STYLE}
                  >
                    اجازت نامہ برائے آپریشن
                  </h2>
                </div>

                {/* Urdu text */}
                <div
                  dir="rtl"
                  className="text-[12.5px] sm:text-[13.5px] text-slate-950 text-justify leading-relaxed"
                  style={URDU_FONT_STYLE}
                >
                  <p>
                    میں / میرا مریض{" "}
                    <span className="font-bold underline px-1 text-slate-950 font-sans">
                      {giverName || "......................................."}
                    </span>{" "}
                    کے{" "}
                    <span className="font-bold underline px-1 text-slate-950 font-sans">
                      {procedureName || "......................................."}
                    </span>{" "}
                    کا آپریشن کروانے کے لئے تیار ہوں / ہے۔ مجھے آپریشن کے فوائد نقصانات ممکنہ پیچیدگیاں مثلاً{" "}
                    <span className="font-bold underline px-1 text-slate-950 font-sans">
                      {operationComplications || "......................................."}
                    </span>{" "}
                    اور متبادل{" "}
                    <span className="font-bold underline px-1 text-slate-950 font-sans">
                      {operationAlternative || "......................................."}
                    </span>{" "}
                    کے بارے میں مکمل طور پر آگاہ کر دیا گیا ہے۔ یہ کہ آپریشن کا عمل خطرے سے خالی نہیں ہے۔ دوران آپریشن غیر متوقع صورتحال پیدا ہو سکتی ہے۔ آپریشن کے بعد قدرتی سانس بحال نہ ہونے کی صورت میں مصنوعی سانس دلانے والی مشین (Ventilator) پر بھی ڈالا جا سکتا ہے۔ ہم ڈاکٹر{" "}
                    <span className="font-bold underline px-1 text-slate-950 font-sans">
                      {doctorName || "......................................."}
                    </span>{" "}
                    کو آپریشن کی باضابطہ اجازت دیتے ہیں۔
                  </p>
                </div>

                {/* Professional Signatures Row */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Signer Block */}
                  <div dir="rtl" className="space-y-1 text-slate-900" style={URDU_FONT_STYLE}>
                    <p className="font-bold text-slate-950 border-b border-slate-300 pb-0.5">
                      مریض یا ولی / وارث کے دستخط و نشان انگوٹھا:
                    </p>
                    <div className="text-[11.5px] text-slate-800 space-y-0.5 pt-0.5">
                      <p>
                        نام: <span className="font-bold font-sans underline">{giverName}</span>
                      </p>
                      <p>
                        ولدیت / زوجہ / رشتہ:{" "}
                        <span className="font-semibold font-sans">
                          {relationPersonName ? `${relationPersonName} / ` : ""}
                          {relationToPatient}
                        </span>
                      </p>
                      <div className="pt-2 flex items-center gap-2">
                        <span>دستخط / انگوٹھا:</span>
                        <span className="border-b border-dotted border-slate-600 inline-block flex-1 min-w-[120px]"></span>
                      </div>
                    </div>
                  </div>

                  {/* Doctor Block */}
                  <div className="space-y-1 text-slate-900">
                    <p className="font-bold text-slate-950 border-b border-slate-300 pb-0.5 text-right sm:text-left">
                      Operating Surgeon / Consultant:
                    </p>
                    <div className="text-[11.5px] text-slate-800 space-y-0.5 pt-0.5">
                      <p>
                        Surgeon: <span className="font-bold">{doctorName}</span>
                      </p>
                      <p className="font-mono text-[11px] text-slate-600">
                        Date &amp; Time: {todayStr} • {currentTime}
                      </p>
                      <div className="pt-2 flex items-center gap-2">
                        <span>Surgeon's Sign &amp; Stamp:</span>
                        <span className="border-b border-dotted border-slate-600 inline-block flex-1 min-w-[120px]"></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: Blood Transfusion Consent */}
            {orderedForms.includes("BLOOD_TRANSFUSION") && (
              <div className="py-2 space-y-2 border-b border-slate-200 print:border-slate-300 pb-3 break-inside-avoid">
                <div className="flex items-center justify-between border-b border-slate-300/80 pb-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 font-sans">
                    3. Informed Consent for Blood Transfusion
                  </span>
                  <h2
                    dir="rtl"
                    className="text-base sm:text-lg font-black text-slate-950"
                    style={URDU_FONT_STYLE}
                  >
                    اجازت نامہ برائے انتقالِ خون (مریض)
                  </h2>
                </div>

                {/* Urdu text */}
                <div
                  dir="rtl"
                  className="text-[12.5px] sm:text-[13.5px] text-slate-950 text-justify leading-relaxed"
                  style={URDU_FONT_STYLE}
                >
                  <p>
                    مجھے / میرے مریض{" "}
                    <span className="font-bold underline px-1 text-slate-950 font-sans">
                      {patient.fullName || "......................................."}
                    </span>{" "}
                    ولد / بنت / زوجہ{" "}
                    <span className="font-bold underline px-1 text-slate-950 font-sans">
                      {relationPersonName || patient.relatedPersonName || "......................................."}
                    </span>{" "}
                    کو انتقال خون کی ضرورت کے بارے میں مطلع کر دیا گیا ہے۔ ڈاکٹر نے مجھے انتقال خون کے مضر اثرات ، فوائد نقصانات پیچیدگیاں مثلاً{" "}
                    <span className="font-bold underline px-1 text-slate-950 font-sans">
                      {bloodComplications || "......................................."}
                    </span>{" "}
                    اور متبادل{" "}
                    <span className="font-bold underline px-1 text-slate-950 font-sans">
                      {bloodAlternative || "......................................."}
                    </span>{" "}
                    کے بارے میں آگاہ کر دیا ہے اور میرے سوالوں کا تسلی بخش جواب دے دیا ہے۔ میں خون / خون کے اجزاء کی منتقلی مثلاً{" "}
                    <span className="font-bold underline px-1 text-slate-950 font-sans">
                      {bloodComponents || "......................................."}
                    </span>{" "}
                    کی اجازت دیتا / دیتی ہوں۔
                  </p>
                </div>

                {/* Professional Signatures Row */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Signer Block */}
                  <div dir="rtl" className="space-y-1 text-slate-900" style={URDU_FONT_STYLE}>
                    <p className="font-bold text-slate-950 border-b border-slate-300 pb-0.5">
                      مریض یا ولی / وارث کے دستخط و نشان انگوٹھا:
                    </p>
                    <div className="text-[11.5px] text-slate-800 space-y-0.5 pt-0.5">
                      <p>
                        نام: <span className="font-bold font-sans underline">{giverName}</span>
                      </p>
                      <p>
                        ولدیت / زوجہ / رشتہ:{" "}
                        <span className="font-semibold font-sans">
                          {relationPersonName ? `${relationPersonName} / ` : ""}
                          {relationToPatient}
                        </span>
                      </p>
                      <div className="pt-2 flex items-center gap-2">
                        <span>دستخط / انگوٹھا:</span>
                        <span className="border-b border-dotted border-slate-600 inline-block flex-1 min-w-[120px]"></span>
                      </div>
                    </div>
                  </div>

                  {/* Doctor Block */}
                  <div className="space-y-1 text-slate-900">
                    <p className="font-bold text-slate-950 border-b border-slate-300 pb-0.5 text-right sm:text-left">
                      Prescribing Doctor / Medical Officer:
                    </p>
                    <div className="text-[11.5px] text-slate-800 space-y-0.5 pt-0.5">
                      <p>
                        Doctor: <span className="font-bold">{doctorName}</span>
                      </p>
                      <p className="font-mono text-[11px] text-slate-600">
                        Date &amp; Time: {todayStr} • {currentTime}
                      </p>
                      <div className="pt-2 flex items-center gap-2">
                        <span>Doctor's Sign &amp; Stamp:</span>
                        <span className="border-b border-dotted border-slate-600 inline-block flex-1 min-w-[120px]"></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM FOOTER: Hospital Logo & Hospital Address on Footer (Professional Paper Layout) */}
          <div className="border-t border-slate-400/90 pt-3 mt-auto">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Official Ghias Hospital Logo */}
              <div className="flex items-center gap-3 shrink-0">
                <GhiasHospitalLogo size={46} className="text-slate-900" />
                <div className="text-left">
                  <span className="font-black text-xs sm:text-sm tracking-wider uppercase text-slate-950 font-sans block">
                    GHIAS HOSPITAL
                  </span>
                  <span className="text-[10px] font-semibold text-slate-600 tracking-wide uppercase block">
                    Phalia, District M.B.Din
                  </span>
                </div>
              </div>

              {/* Center / Right: Hospital Address in Urdu & Contact Details */}
              <div className="text-right flex-1">
                <p
                  dir="rtl"
                  className="text-xs sm:text-[13px] font-bold text-slate-950"
                  style={URDU_FONT_STYLE}
                >
                  غیاث ہسپتال، مین گجرات روڈ پھالیہ نزد ٹیلی فون ایکسچینج / لیلی ڈین ایکسپو سنٹر
                </p>
                <p className="text-[10px] sm:text-[11px] font-mono font-semibold text-slate-700 tracking-tight mt-0.5">
                  Ph: 0546-588567 | Mob: 0346-4049577, 0346-4949577 | 24/7 Emergency &amp; Surgery
                </p>
              </div>
            </div>

            {/* Micro legal footnote */}
            <div className="mt-2 pt-1.5 border-t border-dotted border-slate-300 flex items-center justify-between text-[9px] text-slate-500 font-sans">
              <span>This document is a confidential medical record valid upon completion and physical signatures.</span>
              <span>Hospital Reg: R-59488 • Printed via Ghias HMS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

