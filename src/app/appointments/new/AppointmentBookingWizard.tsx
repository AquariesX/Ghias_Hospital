"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  User,
  Phone,
  Stethoscope,
  Calendar,
  Clock,
  CheckCircle2,
  Printer,
  RotateCcw,
  Search,
  Check,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  BedDouble,
  Hash,
  Activity,
  Layers,
  TestTube2,
  DollarSign,
  FileText,
} from "lucide-react";
import AppointmentPrintSlip, { AppointmentSlipData } from "@/components/appointments/AppointmentPrintSlip";

export type ServiceCategory = "OPD" | "ULTRASOUND" | "XRAY" | "LAB_TEST";

const DIAGNOSTIC_PRESETS: Record<"ULTRASOUND" | "XRAY" | "LAB_TEST", Array<{ name: string; fee: number }>> = {
  ULTRASOUND: [
    { name: "Abdomen Ultrasound", fee: 1500 },
    { name: "Pelvic Ultrasound", fee: 1500 },
    { name: "KUB Ultrasound", fee: 1500 },
    { name: "Obstetric / Pregnancy USG", fee: 1500 },
    { name: "Doppler Ultrasound", fee: 3000 },
    { name: "Thyroid Ultrasound", fee: 2000 },
    { name: "Breast Ultrasound", fee: 2000 },
    { name: "Soft Tissue Ultrasound", fee: 1500 },
  ],
  XRAY: [
    { name: "Chest PA View", fee: 1000 },
    { name: "Spine AP & Lateral", fee: 1500 },
    { name: "Pelvis AP View", fee: 1000 },
    { name: "Extremity (Arm / Leg / Foot)", fee: 1000 },
    { name: "X-Ray Skull AP/Lat", fee: 1200 },
    { name: "X-Ray Abdomen Plain", fee: 1000 },
    { name: "X-Ray Knee Joint", fee: 1000 },
  ],
  LAB_TEST: [
    { name: "CBC (Complete Blood Count)", fee: 600 },
    { name: "Blood Sugar Fasting / Random", fee: 200 },
    { name: "LFT (Liver Function Test)", fee: 1500 },
    { name: "RFT / Serum Creatinine & Urea", fee: 1000 },
    { name: "Urine Complete Examination (R/E)", fee: 400 },
    { name: "Lipid Profile", fee: 1600 },
    { name: "Serum Uric Acid", fee: 500 },
    { name: "Typhoid / Widal Test", fee: 700 },
    { name: "Hepatitis B & C Screening", fee: 1200 },
    { name: "HbA1c (Glycated Hemoglobin)", fee: 1200 },
    { name: "Serum Electrolytes", fee: 1200 },
  ],
};

interface Doctor {
  id: string;
  doctorNumber: string;
  firstName: string;
  lastName: string;
  specialization: string;
  roomNumber: string | null;
  consultationFee: number | string;
  regularFee?: number | string | null;
  followUpFee?: number | string | null;
  emergencyFee?: number | string | null;
  qualifications?: string | null;
  nameUrdu?: string | null;
  specializationUrdu?: string | null;
  qualificationsUrdu?: string | null;
  subSpecialtyUrdu?: string | null;
  designationEnglish?: string | null;
  availability: string;
  status: string;
}

interface Department {
  id: string;
  code: string;
  name: string;
  doctors: Doctor[];
}

interface PatientSearchMatch {
  id: string;
  patientNumber: string;
  mrNumber: string | null;
  firstName: string;
  lastName: string;
  phone: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  relationType?: string | null;
  relatedPersonName?: string | null;
}

interface SuccessData extends AppointmentSlipData {
  id: string;
  queuePosition: number;
}

export default function AppointmentBookingWizard() {
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId");

  // Form State - MR Number & Patient Information
  const [patientMR, setPatientMR] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [patientRelationType, setPatientRelationType] = useState("S/O");
  const [patientGuardianName, setPatientGuardianName] = useState("");
  const [patientAddress, setPatientAddress] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientMR, setSelectedPatientMR] = useState<string | null>(null);
  const [isLookingUpMR, setIsLookingUpMR] = useState(false);
  const [mrLookupStatus, setMrLookupStatus] = useState<{ found: boolean; message: string } | null>(null);
  const [suggestingMR, setSuggestingMR] = useState(false);

  // Service Selection: OPD | ULTRASOUND | XRAY | LAB_TEST
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>("OPD");
  const [testName, setTestName] = useState<string>("Abdomen Ultrasound");
  const [testFee, setTestFee] = useState<string>("1500");

  // Doctor & Department State
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [isLoadingDepts, setIsLoadingDepts] = useState(true);

  // Schedule & Optional notes
  const [appointmentDate, setAppointmentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [appointmentType, setAppointmentType] = useState<"REGULAR" | "FOLLOW_UP" | "EMERGENCY">("REGULAR");
  const [reason, setReason] = useState<string>("");

  // Live Patient Search Dropdown
  const [patientMatches, setPatientMatches] = useState<PatientSearchMatch[]>([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Submission & Success
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  // Load Departments & Doctors on mount
  useEffect(() => {
    async function loadDepts() {
      try {
        setIsLoadingDepts(true);
        const res = await fetch("/api/appointments/departments");
        if (res.ok) {
          const data = await res.json();
          setDepartments(data.departments || []);
        }
      } catch (err) {
        console.error("Failed to load departments:", err);
      } finally {
        setIsLoadingDepts(false);
      }
    }
    loadDepts();
  }, []);

  // If patientId preselected in URL (e.g. from patient profile)
  useEffect(() => {
    if (!preselectedPatientId) return;
    async function loadPatient() {
      try {
        const res = await fetch(`/api/patients/${preselectedPatientId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.patient) {
            setSelectedPatientId(data.patient.id);
            setPatientName(`${data.patient.firstName} ${data.patient.lastName}`);
            setPatientPhone(data.patient.phone || "");
            const mr = data.patient.mrNumber || data.patient.patientNumber;
            setSelectedPatientMR(mr);
            setPatientMR(mr);
            if (data.patient.dateOfBirth) {
              const diffMs = Date.now() - new Date(data.patient.dateOfBirth).getTime();
              const a = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
              if (!isNaN(a) && a >= 0) setPatientAge(String(a));
            }
            if (data.patient.gender) setPatientGender(data.patient.gender);
            if (data.patient.address) setPatientAddress(data.patient.address);
            if (data.patient.relationType) setPatientRelationType(data.patient.relationType);
            if (data.patient.relatedPersonName) setPatientGuardianName(data.patient.relatedPersonName);
            setMrLookupStatus({ found: true, message: `Verified Registered Patient: ${data.patient.firstName} ${data.patient.lastName}` });
          }
        }
      } catch (err) {
        console.error("Failed to load preselected patient:", err);
      }
    }
    loadPatient();
  }, [preselectedPatientId]);

  // Flattened list of active doctors with department info
  const allDoctors = useMemo(() => {
    const list: Array<Doctor & { departmentName: string; departmentId: string }> = [];
    for (const dept of departments) {
      for (const doc of dept.doctors) {
        list.push({
          ...doc,
          departmentName: dept.name,
          departmentId: dept.id,
        });
      }
    }
    return list;
  }, [departments]);

  // Selected doctor object
  const selectedDoctor = allDoctors.find((d) => d.id === selectedDoctorId);

  // Dynamic fee calculation based on Doctor's 3 fees (Regular, Follow-up, Emergency)
  const doctorFees = useMemo(() => {
    if (!selectedDoctor) {
      return { regular: 1000, followUp: 500, emergency: 2000, active: 1000 };
    }
    const reg = selectedDoctor.regularFee != null ? Number(selectedDoctor.regularFee) : Number(selectedDoctor.consultationFee);
    const fol = selectedDoctor.followUpFee != null ? Number(selectedDoctor.followUpFee) : Math.round(reg * 0.5);
    const emg = selectedDoctor.emergencyFee != null ? Number(selectedDoctor.emergencyFee) : Math.round(reg * 1.5);
    const active = appointmentType === "EMERGENCY" ? emg : appointmentType === "FOLLOW_UP" ? fol : reg;
    return { regular: reg, followUp: fol, emergency: emg, active };
  }, [selectedDoctor, appointmentType]);

  // Handle service category switch
  const handleSelectServiceCategory = (cat: ServiceCategory) => {
    setServiceCategory(cat);
    if (cat === "ULTRASOUND") {
      setTestName(DIAGNOSTIC_PRESETS.ULTRASOUND[0].name);
      setTestFee(String(DIAGNOSTIC_PRESETS.ULTRASOUND[0].fee));
    } else if (cat === "XRAY") {
      setTestName(DIAGNOSTIC_PRESETS.XRAY[0].name);
      setTestFee(String(DIAGNOSTIC_PRESETS.XRAY[0].fee));
    } else if (cat === "LAB_TEST") {
      setTestName(DIAGNOSTIC_PRESETS.LAB_TEST[0].name);
      setTestFee(String(DIAGNOSTIC_PRESETS.LAB_TEST[0].fee));
    }
  };

  // Live patient search as user types name or phone
  useEffect(() => {
    const query = patientName.trim();
    if (selectedPatientId || query.length < 2) {
      setPatientMatches([]);
      setShowPatientDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingPatients(true);
        const res = await fetch(`/api/patients?search=${encodeURIComponent(query)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          const items: PatientSearchMatch[] = data.data || data.patients || [];
          setPatientMatches(items);
          setShowPatientDropdown(items.length > 0);
        }
      } catch {
        // ignore live search network errors
      } finally {
        setIsSearchingPatients(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [patientName, selectedPatientId]);

  // Select an existing patient from autocomplete
  const handleSelectExistingPatient = (p: PatientSearchMatch) => {
    setSelectedPatientId(p.id);
    setPatientName(`${p.firstName} ${p.lastName}`);
    setPatientPhone(p.phone);
    const mr = p.mrNumber || p.patientNumber;
    setSelectedPatientMR(mr);
    setPatientMR(mr);
    if (p.dateOfBirth) {
      const diffMs = Date.now() - new Date(p.dateOfBirth).getTime();
      const a = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
      if (!isNaN(a) && a >= 0) setPatientAge(String(a));
    }
    if (p.gender && (p.gender === "MALE" || p.gender === "FEMALE" || p.gender === "OTHER")) {
      setPatientGender(p.gender as any);
    }
    if (p.address) setPatientAddress(p.address);
    if (p.relationType) setPatientRelationType(p.relationType);
    if (p.relatedPersonName) setPatientGuardianName(p.relatedPersonName);

    setMrLookupStatus({ found: true, message: `Registered patient verified: ${p.firstName} ${p.lastName}` });
    setShowPatientDropdown(false);
  };

  const handleClearSelectedPatient = () => {
    setSelectedPatientId(null);
    setSelectedPatientMR(null);
    setPatientMR("");
    setPatientName("");
    setPatientPhone("");
    setPatientAge("");
    setPatientGender("MALE");
    setPatientAddress("");
    setPatientRelationType("S/O");
    setPatientGuardianName("");
    setMrLookupStatus(null);
  };

  // Lookup Patient by MR Number directly
  const handleLookupMR = async (overrideMR?: string) => {
    const val = (overrideMR !== undefined ? overrideMR : patientMR).trim();
    if (!val) {
      setMrLookupStatus(null);
      return;
    }
    setIsLookingUpMR(true);
    try {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(val)}&limit=5`);
      if (res.ok) {
        const json = await res.json();
        const list: PatientSearchMatch[] = json.patients || json.data || [];
        const match = list.find((p) =>
          (p.mrNumber && p.mrNumber.toLowerCase() === val.toLowerCase()) ||
          (p.patientNumber && p.patientNumber.toLowerCase() === val.toLowerCase())
        );

        if (match) {
          setSelectedPatientId(match.id);
          setPatientName(`${match.firstName} ${match.lastName}`);
          setPatientPhone(match.phone || "");
          const cleanMR = match.mrNumber || match.patientNumber;
          setSelectedPatientMR(cleanMR);
          setPatientMR(cleanMR);
          if (match.dateOfBirth) {
            const diffMs = Date.now() - new Date(match.dateOfBirth).getTime();
            const a = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
            if (!isNaN(a) && a >= 0) setPatientAge(String(a));
          }
          if (match.gender && (match.gender === "MALE" || match.gender === "FEMALE" || match.gender === "OTHER")) {
            setPatientGender(match.gender as any);
          }
          if (match.address) setPatientAddress(match.address);
          if (match.relationType) setPatientRelationType(match.relationType);
          if (match.relatedPersonName) setPatientGuardianName(match.relatedPersonName);
          setMrLookupStatus({
            found: true,
            message: `Found registered patient: ${match.firstName} ${match.lastName} (${match.phone || "No phone"})`,
          });
          return;
        }
      }
      setSelectedPatientId(null);
      setSelectedPatientMR(null);
      setMrLookupStatus({
        found: false,
        message: `MR #${val} is unregistered. Enter demographics below to book & register walk-in patient.`,
      });
    } catch (err) {
      console.error("Failed to lookup MR number:", err);
    } finally {
      setIsLookingUpMR(false);
    }
  };

  // Suggest Next MR Number
  const handleSuggestMR = async () => {
    setSuggestingMR(true);
    try {
      const res = await fetch("/api/patients/next-number");
      if (res.ok) {
        const data = await res.json();
        const nextMR = data.mrNumber || data.data?.mrNumber;
        if (nextMR) {
          setPatientMR(nextMR);
          setSelectedPatientId(null);
          setSelectedPatientMR(null);
          setMrLookupStatus({
            found: false,
            message: `Suggested new MR #${nextMR}. Enter patient demographics below.`,
          });
        }
      }
    } catch (err) {
      console.error("Failed to suggest MR:", err);
    } finally {
      setSuggestingMR(false);
    }
  };

  // Submit appointment / diagnostic token
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientName.trim()) {
      setSubmitError("Please enter the patient's name.");
      return;
    }

    if (!patientPhone.trim()) {
      setSubmitError("Please enter the patient's contact phone number.");
      return;
    }

    const isDiag = serviceCategory !== "OPD";

    if (serviceCategory === "OPD" && !selectedDoctorId) {
      setSubmitError("Please select an attending doctor for the OPD appointment.");
      return;
    }

    if (isDiag && !testName.trim()) {
      setSubmitError("Please enter or select a test/investigation name.");
      return;
    }

    if (isDiag && (isNaN(Number(testFee)) || Number(testFee) < 0)) {
      setSubmitError("Please enter a valid fee amount.");
      return;
    }

    // Determine target doctor
    const effectiveDoctorId = selectedDoctorId || (allDoctors.length > 0 ? allDoctors[0].id : "");
    if (!effectiveDoctorId) {
      setSubmitError("No doctors are available in the system.");
      return;
    }

    const chosenDoc = allDoctors.find((d) => d.id === effectiveDoctorId);

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const catLabel =
        serviceCategory === "ULTRASOUND"
          ? "Ultrasound"
          : serviceCategory === "XRAY"
          ? "X-Ray"
          : serviceCategory === "LAB_TEST"
          ? "Lab Test"
          : "OPD";

      const finalReason = isDiag
        ? `${catLabel}: ${testName.trim()}`
        : reason.trim() || "Doctor Consultation";

      const payload = {
        mrNumber: patientMR.trim() || undefined,
        patientId: selectedPatientId || undefined,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        age: patientAge.trim() || undefined,
        gender: patientGender,
        address: patientAddress.trim() || undefined,
        relationType: patientRelationType.trim() || undefined,
        relatedPersonName: patientGuardianName.trim() || undefined,
        doctorId: effectiveDoctorId,
        departmentId: chosenDoc?.departmentId,
        appointmentDate,
        reason: finalReason,
        serviceCategory,
        testName: isDiag ? testName.trim() : undefined,
        fee: isDiag ? Number(testFee) : undefined,
        appointmentType: isDiag ? "REGULAR" : appointmentType,
        isEmergency: !isDiag && appointmentType === "EMERGENCY",
      };

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setIsSubmitting(false);
        setSubmitError(data.error || "Failed to book appointment.");
        return;
      }

      const effectiveFee = isDiag ? String(testFee) : String(data.appointment.consultationFee || doctorFees.active);
      const serviceDisplay = isDiag ? `${catLabel}: ${testName.trim()}` : (reason.trim() || chosenDoc?.specialization || "OPD");

      setSuccessData({
        id: data.appointment.id,
        appointmentNumber: data.appointment.appointmentNumber,
        tokenNumber: data.appointment.tokenNumber ?? data.queuePosition ?? 1,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientAge: patientAge.trim() || (data.appointment.patient?.dateOfBirth ? (() => {
          const diffMs = Date.now() - new Date(data.appointment.patient.dateOfBirth).getTime();
          const a = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
          return !isNaN(a) && a >= 0 ? a : null;
        })() : null),
        patientGender: patientGender || data.appointment.patient?.gender || "MALE",
        patientNumber: data.appointment.patient?.patientNumber || "PAT-NEW",
        mrNumber: data.appointment.patient?.mrNumber || patientMR.trim() || null,
        guardianName: patientGuardianName.trim() || data.appointment.patient?.relatedPersonName || data.appointment.patient?.emergencyContactName || null,
        relationType: patientRelationType.trim() || data.appointment.patient?.relationType || data.appointment.patient?.emergencyContactRelation || "S/O",
        address: patientAddress.trim() || data.appointment.patient?.address || null,
        doctorName: chosenDoc ? (chosenDoc.firstName.startsWith("Dr") ? `${chosenDoc.firstName} ${chosenDoc.lastName}` : `Dr. ${chosenDoc.firstName} ${chosenDoc.lastName}`) : "Attending Doctor",
        specialization: chosenDoc?.specialization,
        departmentName: isDiag ? (catLabel === "Lab Test" ? "Pathology / Lab" : "Radiology & Imaging") : (chosenDoc?.departmentName || "General OPD"),
        roomNumber: chosenDoc?.roomNumber || null,
        qualificationsEnglish: chosenDoc?.qualifications,
        designationEnglish: chosenDoc?.designationEnglish,
        doctorNameUrdu: chosenDoc?.nameUrdu || data.appointment.doctor?.nameUrdu,
        specializationUrdu: chosenDoc?.specializationUrdu || data.appointment.doctor?.specializationUrdu,
        qualificationsUrdu: chosenDoc?.qualificationsUrdu || data.appointment.doctor?.qualificationsUrdu,
        subSpecialtyUrdu: chosenDoc?.subSpecialtyUrdu || data.appointment.doctor?.subSpecialtyUrdu,
        appointmentDate,
        appointmentTime: data.appointment.appointmentTime || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
        appointmentType: isDiag ? "REGULAR" : appointmentType,
        serviceType: serviceDisplay,
        consultationFee: effectiveFee,
        amount: effectiveFee,
        reason: finalReason,
        queuePosition: data.queuePosition || 1,
      });
    } catch {
      setSubmitError("Network error while booking appointment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPatientMR("");
    setPatientName("");
    setPatientPhone("");
    setPatientAge("");
    setPatientGender("MALE");
    setPatientAddress("");
    setPatientRelationType("S/O");
    setPatientGuardianName("");
    setSelectedPatientId(null);
    setSelectedPatientMR(null);
    setMrLookupStatus(null);
    setSelectedDoctorId("");
    setAppointmentType("REGULAR");
    setReason("");
    setServiceCategory("OPD");
    setTestName("Abdomen Ultrasound");
    setTestFee("1500");
    setSuccessData(null);
    setSubmitError(null);
  };

  // Handle print with auto-return back to appointment booking form
  const handlePrintAndReturn = () => {
    const onAfterPrint = () => {
      window.removeEventListener("afterprint", onAfterPrint);
      resetForm();
    };
    window.addEventListener("afterprint", onAfterPrint);
    window.print();
  };

  // --------------------------------------------------------------------------
  // SUCCESS / TOKEN SLIP VIEW
  // --------------------------------------------------------------------------
  if (successData) {
    const isDiagSuccess = successData.serviceType?.includes("Ultrasound") ||
      successData.serviceType?.includes("X-Ray") ||
      successData.serviceType?.includes("Lab Test") ||
      serviceCategory !== "OPD";

    return (
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Navigation Actions (Hidden during print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs print:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintAndReturn}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip (Auto-Return to Booking)</span>
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Book Another</span>
            </button>
          </div>

          <Link
            href="/appointments"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
          >
            <span>All Appointments List →</span>
          </Link>
        </div>

        {/* Official Printable Slip Component (defaults to Thermal for fast diagnostic tokens, or A4) */}
        <AppointmentPrintSlip
          data={successData}
          defaultLayout={isDiagSuccess ? "THERMAL" : "A4"}
        />
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // MAIN PATIENT BOOKING & REGISTRATION FORM
  // --------------------------------------------------------------------------
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-700 uppercase tracking-wider">
            <span>Hospital Frontdesk</span>
            <span>•</span>
            <span>Patient Registration &amp; Token</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Book Patient Token
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Single unified registration for OPD, Ultrasound, X-Ray, and Lab Tests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/patients/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition"
            title="Hospital Patient Admission & Intake"
          >
            <BedDouble className="w-3.5 h-3.5" />
            <span>Admit Patient</span>
          </Link>
          <Link
            href="/appointments"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </Link>
        </div>
      </div>

      {/* Module Banner */}
      <div className="bg-sky-50 border border-sky-200 rounded-lg p-3.5 flex items-center justify-between text-xs text-sky-900">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
          <span>
            <strong>Inpatient Care:</strong> Need to admit a patient to the ward or ICU? Inpatient admission is handled in{" "}
            <Link href="/patients/new" className="font-bold underline text-sky-800 hover:text-sky-950">
              Admit Patient →
            </Link>
          </span>
        </div>
      </div>

      {/* Error banner */}
      {submitError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <p className="font-medium">{submitError}</p>
        </div>
      )}

      {/* Booking Form */}
      <form onSubmit={handleBookAppointment} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Section 1: Basic Patient Details & Primary MR Number */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">1</span>
              Patient Identification (MR Number)
            </h2>
            {selectedPatientId && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <Check className="w-3 h-3" /> Registered Patient ({selectedPatientMR})
                <button
                  type="button"
                  onClick={handleClearSelectedPatient}
                  className="ml-1 text-slate-400 hover:text-rose-600 font-bold cursor-pointer"
                  title="Clear selection"
                >
                  ×
                </button>
              </span>
            )}
          </div>

          {/* Primary Patient MR Number input with live lookup & auto-suggest */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-teal-600" />
                <span>Patient MR Number (Medical Record #)</span>
              </label>
              <button
                type="button"
                onClick={handleSuggestMR}
                disabled={suggestingMR}
                className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-md border border-teal-200 transition cursor-pointer disabled:opacity-50"
                title="Auto-suggest the next sequential hospital MR number"
              >
                {suggestingMR ? "Generating..." : "+ Next Available MR"}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="e.g. MR-2026-0001 or type existing MR #"
                  value={patientMR}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setPatientMR(val);
                    if (selectedPatientId) setSelectedPatientId(null);
                    setMrLookupStatus(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleLookupMR();
                    }
                  }}
                  className="w-full text-sm font-mono font-bold uppercase pl-3 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                />
              </div>

              <button
                type="button"
                onClick={() => handleLookupMR()}
                disabled={isLookingUpMR || !patientMR.trim()}
                className="px-3.5 py-2 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs shrink-0"
              >
                {isLookingUpMR ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Lookup MR</span>
              </button>
            </div>

            {/* MR Lookup Feedback */}
            {mrLookupStatus && (
              <div className={`text-xs p-2 rounded-lg flex items-center gap-2 ${
                mrLookupStatus.found
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-amber-50 text-amber-800 border border-amber-200"
              }`}>
                {mrLookupStatus.found ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                )}
                <span className="font-medium">{mrLookupStatus.message}</span>
              </div>
            )}
            <p className="text-[11px] text-slate-500">
              The MR Number stays consistent throughout all modules (OPD, Ultrasound, X-Ray, Lab, Inpatient, and Billing).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Patient Name with Autocomplete */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Muhammad Ali"
                  value={patientName}
                  onChange={(e) => {
                    setPatientName(e.target.value);
                    if (selectedPatientId) setSelectedPatientId(null);
                  }}
                  className="w-full text-sm font-medium pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {showPatientDropdown && patientMatches.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                  <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                    <span>Matching Registered Patients</span>
                    {isSearchingPatients && <span className="text-teal-600 animate-pulse">Searching...</span>}
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {patientMatches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => handleSelectExistingPatient(match)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-teal-50 flex items-center justify-between group transition cursor-pointer"
                      >
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-teal-900">
                            {match.firstName} {match.lastName}
                          </p>
                          <p className="text-slate-500 text-[11px] font-mono">
                            Phone: {match.phone}
                          </p>
                        </div>
                        <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded group-hover:bg-teal-100 group-hover:text-teal-800">
                          {match.mrNumber || match.patientNumber}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 03001234567"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="w-full text-sm font-medium pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Patient Demographics: Age & Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Age */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Age
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. 25"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  className="w-full text-sm font-medium px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white pr-14"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">
                  Years
                </span>
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gender
              </label>
              <select
                value={patientGender}
                onChange={(e) => setPatientGender(e.target.value as "MALE" | "FEMALE" | "OTHER")}
                className="w-full text-sm font-medium px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          {/* Patient Demographics: S/o D/o W/o (Guardian) & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* S/o D/o W/o Guardian Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                S/o D/o W/o (Relation & Relative Name)
              </label>
              <div className="flex gap-2">
                <select
                  value={patientRelationType}
                  onChange={(e) => setPatientRelationType(e.target.value)}
                  className="w-24 text-sm font-medium px-2 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white shrink-0"
                >
                  <option value="S/O">S/o</option>
                  <option value="D/O">D/o</option>
                  <option value="W/O">W/o</option>
                  <option value="Guardian">Guardian</option>
                </select>
                <input
                  type="text"
                  placeholder="Father / Husband / Guardian Name"
                  value={patientGuardianName}
                  onChange={(e) => setPatientGuardianName(e.target.value)}
                  className="flex-1 text-sm font-medium px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Address
              </label>
              <input
                type="text"
                placeholder="e.g. Makhna Wali, Phalia, Gujrat"
                value={patientAddress}
                onChange={(e) => setPatientAddress(e.target.value)}
                className="w-full text-sm font-medium px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Service Selection (OPD, Ultrasound, X-Ray, Lab Test) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">2</span>
              Select Service Category
            </h2>
            <span className="text-xs font-bold text-teal-700">
              {serviceCategory === "OPD"
                ? "OPD Doctor Consultation"
                : serviceCategory === "ULTRASOUND"
                ? "Ultrasound (USG)"
                : serviceCategory === "XRAY"
                ? "Digital X-Ray"
                : "Clinical Lab Test"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: "OPD", label: "OPD", sub: "Doctor Consultation", icon: Stethoscope },
              { id: "ULTRASOUND", label: "Ultrasound", sub: "Sonography / USG", icon: Activity },
              { id: "XRAY", label: "X-Ray", sub: "Digital Radiology", icon: Layers },
              { id: "LAB_TEST", label: "Lab Test", sub: "Pathology / Blood", icon: TestTube2 },
            ].map((item) => {
              const isSelected = serviceCategory === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectServiceCategory(item.id as ServiceCategory)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? "bg-teal-700 text-white border-teal-700 shadow-sm ring-2 ring-teal-500/30"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`w-4 h-4 ${isSelected ? "text-teal-200" : "text-slate-400"}`} />
                    {isSelected && <Check className="w-3.5 h-3.5 text-teal-200" />}
                  </div>
                  <div className="mt-2">
                    <span className="font-extrabold text-sm block leading-tight">{item.label}</span>
                    <span className={`text-[10px] block mt-0.5 leading-tight ${isSelected ? "text-teal-100" : "text-slate-500"}`}>
                      {item.sub}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CONDITIONAL SECTION: IF OPD IS SELECTED */}
        {/* ========================================================================= */}
        {serviceCategory === "OPD" && (
          <>
            {/* Section 3: Doctor Selection & 3-Tier Fee Schedule */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">3</span>
                  Select Doctor
                </h2>
                {selectedDoctor && (
                  <span className="text-xs font-bold text-emerald-700">
                    Active Fee: PKR {Number(doctorFees.active).toLocaleString()}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attending Physician <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Stethoscope className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    required
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    disabled={isLoadingDepts}
                    className="w-full text-sm font-medium pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white disabled:bg-slate-50"
                  >
                    <option value="">-- Choose Doctor --</option>
                    {allDoctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.firstName} {doc.lastName} — {doc.specialization} {doc.roomNumber ? `(Room: ${doc.roomNumber})` : (doc.departmentName ? `(${doc.departmentName})` : "")} • Reg: PKR {Number(doc.regularFee ?? doc.consultationFee).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Selected Doctor Summary Card with 3 Fee Tiers */}
              {selectedDoctor && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-teal-900">
                    <div>
                      <p className="font-extrabold text-sm text-teal-950">
                        Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}
                      </p>
                      <p className="text-teal-800 font-medium">
                        {selectedDoctor.specialization} {selectedDoctor.departmentName ? `• ${selectedDoctor.departmentName}` : ""}
                      </p>
                      {selectedDoctor.roomNumber ? (
                        <p className="text-teal-700 mt-0.5 font-bold">📍 Room: {selectedDoctor.roomNumber}</p>
                      ) : (
                        <p className="text-slate-400 mt-0.5 text-[11px]">No room assigned</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-teal-700 block">Current Visit Fee</span>
                      <span className="text-lg font-black text-emerald-800">
                        PKR {Number(doctorFees.active).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* 3 Fee Tiers breakdown */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-teal-200/60 text-center">
                    <div className={`p-2 rounded-lg border text-xs ${appointmentType === "REGULAR" ? "bg-white border-teal-600 shadow-xs ring-1 ring-teal-500" : "bg-teal-50/60 border-teal-200 text-teal-800"}`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-600">The Regular Fee</span>
                      <span className="font-bold text-slate-900 text-xs">PKR {Number(doctorFees.regular).toLocaleString()}</span>
                    </div>
                    <div className={`p-2 rounded-lg border text-xs ${appointmentType === "FOLLOW_UP" ? "bg-white border-sky-600 shadow-xs ring-1 ring-sky-500" : "bg-teal-50/60 border-teal-200 text-teal-800"}`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-600">Follow UP Fee</span>
                      <span className="font-bold text-slate-900 text-xs">PKR {Number(doctorFees.followUp).toLocaleString()}</span>
                    </div>
                    <div className={`p-2 rounded-lg border text-xs ${appointmentType === "EMERGENCY" ? "bg-white border-rose-600 shadow-xs ring-1 ring-rose-500" : "bg-teal-50/60 border-teal-200 text-rose-800"}`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider block text-rose-700">Emergency Fee</span>
                      <span className="font-bold text-rose-900 text-xs">PKR {Number(doctorFees.emergency).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Appointment Type & Schedule */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">4</span>
                  Appointment Type &amp; Schedule
                </h2>
                <span className="text-[11px] font-semibold text-slate-500 uppercase">
                  {appointmentType === "EMERGENCY" ? "Emergency Priority" : appointmentType === "FOLLOW_UP" ? "Follow-up Visit" : "Regular Consultation"}
                </span>
              </div>

              {/* Appointment Type Options with dynamic fees */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Appointment Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setAppointmentType("REGULAR")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      appointmentType === "REGULAR"
                        ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>Regular</span>
                    <span className={`text-[10px] font-semibold ${appointmentType === "REGULAR" ? "text-teal-100" : "text-slate-500"}`}>
                      PKR {Number(doctorFees.regular).toLocaleString()}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAppointmentType("FOLLOW_UP")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      appointmentType === "FOLLOW_UP"
                        ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>Follow-up</span>
                    <span className={`text-[10px] font-semibold ${appointmentType === "FOLLOW_UP" ? "text-sky-100" : "text-slate-500"}`}>
                      PKR {Number(doctorFees.followUp).toLocaleString()}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAppointmentType("EMERGENCY")}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      appointmentType === "EMERGENCY"
                        ? "bg-rose-600 text-white border-rose-600 shadow-sm animate-pulse"
                        : "bg-white border-rose-200 text-rose-700 hover:bg-rose-50"
                    }`}
                  >
                    <span>Emergency</span>
                    <span className={`text-[10px] font-semibold ${appointmentType === "EMERGENCY" ? "text-rose-100" : "text-rose-600"}`}>
                      PKR {Number(doctorFees.emergency).toLocaleString()}
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Appointment Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full text-sm font-medium pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setAppointmentDate(new Date().toISOString().split("T")[0])}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded border transition ${
                        appointmentDate === new Date().toISOString().split("T")[0]
                          ? "bg-teal-600 text-white border-teal-600"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        setAppointmentDate(d.toISOString().split("T")[0]);
                      }}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded border transition ${
                        appointmentDate !== new Date().toISOString().split("T")[0]
                          ? "bg-teal-600 text-white border-teal-600"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      Tomorrow
                    </button>
                  </div>
                </div>

                {/* Appointment Time (Automatic) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Appointment Time
                    </label>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                      Auto-Recorded
                    </span>
                  </div>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-teal-600 absolute left-3 top-3" />
                    <div className="w-full text-sm font-medium pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-between">
                      <span>Current Booking Time</span>
                      <span className="text-xs text-slate-400 font-normal">Auto-set</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Token # and exact timestamp are assigned automatically upon booking.
                  </p>
                </div>
              </div>

              {/* Simple Notes / Presenting Complaint (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Presenting Complaint / Reason <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Routine checkup, Fever, Chest discomfort, Follow-up"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full text-sm font-medium px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                />
              </div>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* CONDITIONAL SECTION: IF ULTRASOUND, X-RAY, OR LAB TEST IS SELECTED */}
        {/* ========================================================================= */}
        {serviceCategory !== "OPD" && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">3</span>
                {serviceCategory === "ULTRASOUND"
                  ? "Ultrasound Test & Fee Details"
                  : serviceCategory === "XRAY"
                  ? "X-Ray Investigation & Fee Details"
                  : "Laboratory Test & Fee Details"}
              </h2>
              <span className="text-xs font-bold text-emerald-700 font-mono">
                Total Fee: PKR {Number(testFee || 0).toLocaleString()}
              </span>
            </div>

            {/* Test / Investigation Name Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Investigation / Test Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder={`e.g. ${serviceCategory === "ULTRASOUND" ? "Abdomen Ultrasound" : serviceCategory === "XRAY" ? "Chest PA View" : "Complete Blood Count (CBC)"}`}
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full text-sm font-bold pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                />
              </div>

              {/* 1-Click Popular Presets */}
              <div className="mt-2.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1.5">
                  Popular {serviceCategory === "ULTRASOUND" ? "Ultrasound" : serviceCategory === "XRAY" ? "X-Ray" : "Lab"} Presets (1-Click Fill):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(DIAGNOSTIC_PRESETS[serviceCategory] || []).map((preset) => {
                    const isPicked = testName.toLowerCase() === preset.name.toLowerCase();
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setTestName(preset.name);
                          setTestFee(String(preset.fee));
                        }}
                        className={`text-xs px-2.5 py-1 rounded-md font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                          isPicked
                            ? "bg-teal-700 text-white border-teal-700 shadow-2xs"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                        }`}
                      >
                        <span>{preset.name}</span>
                        <span className={`text-[10.5px] font-mono font-bold ${isPicked ? "text-teal-200" : "text-emerald-700"}`}>
                          PKR {preset.fee}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Fee Input & Attending Doctor Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Fee Input (Editable) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Investigation Fee (PKR) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={testFee}
                    onChange={(e) => setTestFee(e.target.value)}
                    className="w-full text-base font-mono font-black pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white text-emerald-800"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Standard hospital fee is auto-filled. You can edit or discount as needed.
                </p>
              </div>

              {/* Referring / Reporting Doctor Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reporting / Referring Doctor
                </label>
                <div className="relative">
                  <Stethoscope className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full text-sm font-medium pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                  >
                    <option value="">-- On-Duty Specialist / Hospital Default --</option>
                    {allDoctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        Dr. {doc.firstName} {doc.lastName} ({doc.specialization})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Doctor on slip (defaults to on-duty specialist if unselected).
                </p>
              </div>
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Investigation
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full text-sm font-medium pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Investigation Time
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-teal-600 absolute left-3 top-3" />
                  <div className="w-full text-sm font-medium pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 flex items-center justify-between">
                    <span>Immediate / Walk-in</span>
                    <span className="text-xs text-slate-400 font-normal">Auto-timestamped</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <Link
            href="/appointments"
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating Token &amp; Slip...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {serviceCategory === "OPD"
                    ? "Book Appointment & Issue Token"
                    : `Issue ${serviceCategory === "ULTRASOUND" ? "Ultrasound" : serviceCategory === "XRAY" ? "X-Ray" : "Lab Test"} Token & Slip`}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
