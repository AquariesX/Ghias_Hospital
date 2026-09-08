"use client";

import React from "react";

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
  lineHeight: "2.1",
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
    consentDetails?.operationComplications || "خون بہنا، انفیکشن، الرجی";

  const operationAlternative =
    consentDetails?.operationAlternative || "ادویات و دیگر متبادل طریقہ علاج";

  const bloodComponents =
    consentDetails?.bloodComponents || "ہول بلڈ / ریڈ سیلز (Whole Blood / PRBC)";

  const bloodComplications =
    consentDetails?.bloodComplications || "بخار، الرجک ری ایکشن، لرزہ";

  const bloodAlternative =
    consentDetails?.bloodAlternative || "آئرن تھراپی / آئی وی فلوئڈز";

  return (
    <div className="w-full text-slate-900 bg-white">
      {/* Official Single-Sheet Form matching Paper Layout */}
      <div
        className="relative bg-white border-2 border-slate-900 shadow-sm print:shadow-none p-4 sm:p-5 print:p-4 mx-auto max-w-[210mm] flex flex-col justify-between"
        style={{ boxSizing: "border-box", minHeight: "280mm" }}
      >
        {/* Watermark (optional) */}
        {showWatermark && (
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
          >
            <div className="transform -rotate-45 border-4 border-dashed border-rose-300/30 print:border-slate-300/40 rounded-3xl py-4 px-8 text-center">
              <p className="text-4xl sm:text-5xl font-black tracking-widest text-rose-300/30 print:text-slate-300/40 uppercase">
                UNSIGNED / FOR SIGNATURE
              </p>
            </div>
          </div>
        )}

        <div className="relative z-10 flex flex-col flex-1 justify-between space-y-3 print:space-y-2">
          {/* Top Hospital Header matching Photo: 03 GHIAS HOSPITAL PHALIA REG NO. R-59488 */}
          <div>
            <div className="relative text-center pb-2">
              <span className="absolute left-0 top-0 font-bold text-sm text-slate-800">
                03
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                GHIAS HOSPITAL PHALIA
              </h1>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900 mt-0.5">
                REG NO.R-59488
              </p>
            </div>

            {/* MR Number & Date Box matching Photo */}
            <div className="border border-slate-900 grid grid-cols-2 text-xs font-semibold">
              <div className="border-r border-slate-900 px-3 py-1 flex items-center gap-2">
                <span className="font-bold text-slate-700">MR Number:</span>
                <span className="font-mono font-black text-slate-950 text-sm">
                  {patient.mrNumber}
                </span>
              </div>
              <div className="px-3 py-1 flex items-center gap-2">
                <span className="font-bold text-slate-700">Date:</span>
                <span className="font-mono font-bold text-slate-900">
                  {todayStr}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 1: Anesthesia Permission */}
          {orderedForms.includes("ANESTHESIA") && (
            <div className="border border-slate-900 rounded-none p-2.5 sm:p-3 print:p-2 bg-white space-y-2">
              <div className="text-center border-b border-slate-300 pb-1">
                <h2
                  dir="rtl"
                  className="text-base sm:text-lg font-black text-slate-950 inline-block px-3"
                  style={URDU_FONT_STYLE}
                >
                  اجازت نامہ برائے بیہوشی
                </h2>
              </div>

              {/* Exact Urdu text from photo */}
              <div
                dir="rtl"
                className="text-[12px] sm:text-[13px] text-slate-900 text-justify leading-relaxed"
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

              {/* Patient / Signer Line matching Photo */}
              <div
                dir="rtl"
                className="pt-1 text-[11px] sm:text-xs flex flex-wrap items-center justify-between gap-1 text-slate-900 font-medium"
                style={URDU_FONT_STYLE}
              >
                <div>
                  <span>نام: </span>
                  <span className="font-bold underline px-1 font-sans">
                    {giverName || "......................................."}
                  </span>
                </div>
                <div>
                  <span>ولدیت / بنت / زوجہ / مریض سے رشتہ: </span>
                  <span className="font-bold underline px-1 font-sans">
                    {relationPersonName ? `${relationPersonName} / ` : ""}
                    {relationToPatient || "......................................."}
                  </span>
                </div>
                <div>
                  <span>دستخط: </span>
                  <span className="px-3 border-b border-dotted border-slate-700 inline-block w-24 sm:w-32"></span>
                </div>
              </div>

              {/* Doctor Box matching Photo Table */}
              <div className="border border-slate-900 grid grid-cols-12 text-[10px] sm:text-[11px]">
                <div className="col-span-5 border-r border-slate-900 px-2 py-1 flex items-center gap-1">
                  <span className="font-bold text-slate-700">Doctor Name:</span>
                  <span className="font-bold text-slate-950 truncate">
                    {doctorName}
                  </span>
                </div>
                <div className="col-span-3 border-r border-slate-900 px-2 py-1 flex items-center gap-1">
                  <span className="font-bold text-slate-700">Sign:</span>
                  <span className="border-b border-slate-400 flex-1 h-3 inline-block"></span>
                </div>
                <div className="col-span-4 px-2 py-0.5 flex flex-col justify-center">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-700">Date:</span>
                    <span className="font-mono text-slate-900">{todayStr}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-700">Time:</span>
                    <span className="font-mono text-slate-900">{currentTime}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: Operation Permission */}
          {orderedForms.includes("OPERATION") && (
            <div className="border border-slate-900 rounded-none p-2.5 sm:p-3 print:p-2 bg-white space-y-2">
              <div className="text-center border-b border-slate-300 pb-1">
                <h2
                  dir="rtl"
                  className="text-base sm:text-lg font-black text-slate-950 inline-block px-3"
                  style={URDU_FONT_STYLE}
                >
                  اجازت نامہ برائے آپریشن
                </h2>
              </div>

              {/* Exact Urdu text from photo */}
              <div
                dir="rtl"
                className="text-[12px] sm:text-[13px] text-slate-900 text-justify leading-relaxed"
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
                  کو آپریشن کی اجازت دیتے ہیں۔
                </p>
              </div>

              {/* Patient / Signer Line matching Photo */}
              <div
                dir="rtl"
                className="pt-1 text-[11px] sm:text-xs flex flex-wrap items-center justify-between gap-1 text-slate-900 font-medium"
                style={URDU_FONT_STYLE}
              >
                <div>
                  <span>نام: </span>
                  <span className="font-bold underline px-1 font-sans">
                    {giverName || "......................................."}
                  </span>
                </div>
                <div>
                  <span>ولدیت / بنت / زوجہ / مریض سے رشتہ: </span>
                  <span className="font-bold underline px-1 font-sans">
                    {relationPersonName ? `${relationPersonName} / ` : ""}
                    {relationToPatient || "......................................."}
                  </span>
                </div>
                <div>
                  <span>دستخط: </span>
                  <span className="px-3 border-b border-dotted border-slate-700 inline-block w-24 sm:w-32"></span>
                </div>
              </div>

              {/* Doctor Box matching Photo Table */}
              <div className="border border-slate-900 grid grid-cols-12 text-[10px] sm:text-[11px]">
                <div className="col-span-5 border-r border-slate-900 px-2 py-1 flex items-center gap-1">
                  <span className="font-bold text-slate-700">Doctor Name:</span>
                  <span className="font-bold text-slate-950 truncate">
                    {doctorName}
                  </span>
                </div>
                <div className="col-span-3 border-r border-slate-900 px-2 py-1 flex items-center gap-1">
                  <span className="font-bold text-slate-700">Sign:</span>
                  <span className="border-b border-slate-400 flex-1 h-3 inline-block"></span>
                </div>
                <div className="col-span-4 px-2 py-0.5 flex flex-col justify-center">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-700">Date:</span>
                    <span className="font-mono text-slate-900">{todayStr}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-700">Time:</span>
                    <span className="font-mono text-slate-900">{currentTime}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: Blood Transfusion Permission */}
          {orderedForms.includes("BLOOD_TRANSFUSION") && (
            <div className="border border-slate-900 rounded-none p-2.5 sm:p-3 print:p-2 bg-white space-y-2">
              <div className="text-center border-b border-slate-300 pb-1">
                <h2
                  dir="rtl"
                  className="text-base sm:text-lg font-black text-slate-950 inline-block px-3"
                  style={URDU_FONT_STYLE}
                >
                  اجازت نامہ برائے انتقال خون (مریض)
                </h2>
              </div>

              {/* Exact Urdu text from photo */}
              <div
                dir="rtl"
                className="text-[12px] sm:text-[13px] text-slate-900 text-justify leading-relaxed"
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

              {/* Patient / Signer Line matching Photo */}
              <div
                dir="rtl"
                className="pt-1 text-[11px] sm:text-xs flex flex-wrap items-center justify-between gap-1 text-slate-900 font-medium"
                style={URDU_FONT_STYLE}
              >
                <div>
                  <span>نام: </span>
                  <span className="font-bold underline px-1 font-sans">
                    {giverName || "......................................."}
                  </span>
                </div>
                <div>
                  <span>ولدیت / بنت / زوجہ / مریض سے رشتہ: </span>
                  <span className="font-bold underline px-1 font-sans">
                    {relationPersonName ? `${relationPersonName} / ` : ""}
                    {relationToPatient || "......................................."}
                  </span>
                </div>
                <div>
                  <span>دستخط: </span>
                  <span className="px-3 border-b border-dotted border-slate-700 inline-block w-24 sm:w-32"></span>
                </div>
              </div>

              {/* Doctor Box matching Photo Table */}
              <div className="border border-slate-900 grid grid-cols-12 text-[10px] sm:text-[11px]">
                <div className="col-span-5 border-r border-slate-900 px-2 py-1 flex items-center gap-1">
                  <span className="font-bold text-slate-700">Doctor Name:</span>
                  <span className="font-bold text-slate-950 truncate">
                    {doctorName}
                  </span>
                </div>
                <div className="col-span-3 border-r border-slate-900 px-2 py-1 flex items-center gap-1">
                  <span className="font-bold text-slate-700">Sign:</span>
                  <span className="border-b border-slate-400 flex-1 h-3 inline-block"></span>
                </div>
                <div className="col-span-4 px-2 py-0.5 flex flex-col justify-center">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-700">Date:</span>
                    <span className="font-mono text-slate-900">{todayStr}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-700">Time:</span>
                    <span className="font-mono text-slate-900">{currentTime}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Hospital Footer matching Photo */}
          <div className="border-t-2 border-slate-900 pt-1.5 text-center">
            <p
              dir="rtl"
              className="text-xs sm:text-sm font-black text-slate-950 tracking-tight"
              style={URDU_FONT_STYLE}
            >
              گجرات روڈ نزد لیلی ڈین ایکسپو سنٹر پھالیہ / Ph: 0546-588567 / Mob: 0346-4049577
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
