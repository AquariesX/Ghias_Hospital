"use client";

import React from "react";
import GhiasHospitalLogo from "@/components/common/GhiasHospitalLogo";

export interface DischargeMedicationItem {
  id?: string;
  srNo?: number;
  medicineName: string;
  dosage?: string;
  route?: string;
  frequency?: string;
  timing?: string;
  duration?: string;
  instructions?: string;
}

export interface EmergencyDischargeDocumentData {
  patient: {
    id?: string;
    mrNumber?: string | null;
    patientNumber?: string;
    firstName: string;
    lastName?: string;
    gender?: string;
    dateOfBirth?: string;
    age?: string | number;
    phone?: string;
    cnic?: string | null;
    relationType?: string | null;
    relatedPersonName?: string | null;
    address?: string | null;
  };
  triage: {
    id?: string;
    admissionDateTime?: string | null;
    triagedAt?: string;
    triagedByName?: string;
    systolicBP?: number | null;
    diastolicBP?: number | null;
    pulse?: number | null;
    temperature?: number | string | null;
    weight?: number | string | null;
    oxygenSaturation?: number | null;
    respiratoryRate?: number | null;
    chiefComplaint?: string;
    provisionalDiagnosis?: string | null;
    finalDiagnosis?: string | null;
    observations?: string | null;
  };
  discharge: {
    dischargeDateTime?: string | null;
    dischargeCondition?: string | null;
    dischargeSummary?: string | null;
    dischargeInstructions?: string | null;
    dischargeMedications?: string | DischargeMedicationItem[] | null;
    outcome?: string | null;
  };
}

// Helper: render a "field with underline" row (like a printed form)
function VitalRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", marginBottom: "5px", fontSize: "11px" }}>
      <span style={{ width: "52px", fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, borderBottom: "1px solid #000", minWidth: "60px", paddingLeft: "4px", fontWeight: 700, lineHeight: "1.4" }}>
        {value}
      </span>
    </div>
  );
}

// Helper: render ruled lines for handwritten sections
function RuledLines({ count = 4, text = "" }: { count?: number; text?: string }) {
  if (text) {
    // Split text into lines and render each on a rule
    const lines = text.split("\n");
    return (
      <div>
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              borderBottom: "1px solid #000",
              minHeight: "18px",
              marginBottom: "4px",
              fontSize: "11px",
              paddingLeft: "2px",
              paddingBottom: "1px",
            }}
          >
            {line || "\u00A0"}
          </div>
        ))}
        {/* Fill remaining lines if text has fewer than count lines */}
        {Array.from({ length: Math.max(0, count - lines.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            style={{
              borderBottom: "1px solid #000",
              minHeight: "18px",
              marginBottom: "4px",
            }}
          />
        ))}
      </div>
    );
  }
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            borderBottom: "1px solid #000",
            minHeight: "18px",
            marginBottom: "4px",
          }}
        />
      ))}
    </div>
  );
}

export default function EmergencyDischargeDocument({
  data,
}: {
  data: EmergencyDischargeDocumentData;
}) {
  const { patient, triage, discharge } = data;

  // Format Admission Time
  const rawAdmissionDate = triage.admissionDateTime || triage.triagedAt;
  const admissionTimeFormatted = rawAdmissionDate
    ? new Date(rawAdmissionDate).toLocaleString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

  // Patient Name
  const patientFullName = [patient.firstName, patient.lastName].filter(Boolean).join(" ");

  // Guardian
  const guardianRelation = patient.relationType ? `${patient.relationType}:` : "S/O:";
  const guardianName = patient.relatedPersonName || "—";

  // Calculate age
  let ageDisplay = patient.age ? String(patient.age) : "";
  if (!ageDisplay && patient.dateOfBirth) {
    const birthYear = new Date(patient.dateOfBirth).getFullYear();
    const currentYear = new Date().getFullYear();
    if (!isNaN(birthYear)) {
      ageDisplay = String(currentYear - birthYear);
    }
  }
  const genderDisplay = patient.gender
    ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1).toLowerCase()
    : "Male";
  const ageGenderDisplay = ageDisplay ? `${ageDisplay}yrs ${genderDisplay}` : genderDisplay;

  // Vitals
  const bpDisplay =
    triage.systolicBP && triage.diastolicBP
      ? `${triage.systolicBP}/${triage.diastolicBP}`
      : triage.systolicBP
      ? `${triage.systolicBP}`
      : "—";
  const pulseDisplay = triage.pulse ? String(triage.pulse) : "—";
  const tempDisplay = triage.temperature ? String(triage.temperature) : "—";
  const weightDisplay = triage.weight ? `${triage.weight}kg` : "—";

  // Outcome text
  const outcomeText =
    discharge.outcome ||
    discharge.dischargeCondition ||
    discharge.dischargeSummary ||
    "";

  // Presenting Complaint text
  const complaintText = [
    triage.chiefComplaint,
    triage.provisionalDiagnosis ? `Prov. Dx: ${triage.provisionalDiagnosis}` : "",
    triage.finalDiagnosis ? `Final Dx: ${triage.finalDiagnosis}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // Parse Discharge Medications
  let parsedMedications: DischargeMedicationItem[] = [];
  let freeformMedicationsText = "";

  if (discharge.dischargeMedications) {
    if (Array.isArray(discharge.dischargeMedications)) {
      parsedMedications = discharge.dischargeMedications;
    } else if (typeof discharge.dischargeMedications === "string") {
      try {
        const json = JSON.parse(discharge.dischargeMedications);
        if (Array.isArray(json)) {
          parsedMedications = json;
        } else {
          freeformMedicationsText = discharge.dischargeMedications;
        }
      } catch {
        freeformMedicationsText = discharge.dischargeMedications;
      }
    }
  }

  // Special instructions text
  const adviceText = discharge.dischargeInstructions || "";

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: "#ffffff",
        color: "#000000",
        fontFamily: "'Inter', Arial, sans-serif",
        fontSize: "12px",
        boxSizing: "border-box",
      }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm 8mm 10mm;
          }
          html,
          body {
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Inter', Arial, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print,
          .print\\:hidden {
            display: none !important;
          }
          #emergency-discharge-document {
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

      {/* A4 Document */}
      <div
        id="emergency-discharge-document"
        style={{
          width: "100%",
          maxWidth: "210mm",
          margin: "0 auto",
          padding: "24px 28px 16px 28px",
          boxSizing: "border-box",
          minHeight: "277mm",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#fff",
        }}
      >
        {/* ── TOP SECTION ─────────────────────────────────────────── */}
        <div>
          {/* HEADER: Logo left, Urdu + Discharge Form center */}
          <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "8px" }}>
            {/* Logo */}
            <div style={{ flexShrink: 0, marginRight: "12px" }}>
              <GhiasHospitalLogo size={64} />
            </div>
            {/* Center Title */}
            <div style={{ flex: 1, textAlign: "center", paddingRight: "76px" }}>
              <div
                style={{
                  fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif",
                  fontSize: "32px",
                  fontWeight: 700,
                  lineHeight: 1.25,
                  color: "#000",
                  direction: "rtl",
                }}
              >
                غیاث ہسپتال
              </div>
              <div
                style={{
                  width: "32px",
                  height: "2px",
                  backgroundColor: "#000",
                  margin: "3px auto",
                  borderRadius: "2px",
                }}
              />
              <div style={{ fontSize: "20px", fontWeight: 900, letterSpacing: "-0.3px", color: "#000" }}>
                Discharge Form
              </div>
            </div>
          </div>

          {/* DEMOGRAPHICS ──────────────────────────────────────────── */}
          {/* Row 1 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderTop: "1.5px solid #000",
              borderBottom: "1px solid #888",
              padding: "5px 0 4px",
              fontSize: "11.5px",
              fontWeight: 600,
              gap: "8px",
            }}
          >
            <span>
              <strong>MR # :</strong> {patient.mrNumber || patient.patientNumber || "—"}
            </span>
            <span>
              <strong>REG NO.</strong> R-59488
            </span>
            <span>
              <strong>Admission Time :</strong> {admissionTimeFormatted}
            </span>
            <span>
              <strong>Triaged by:</strong> {triage.triagedByName || "Triage Officer"}
            </span>
          </div>

          {/* Row 2 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              borderBottom: "1.5px solid #000",
              padding: "5px 0 4px",
              fontSize: "11.5px",
              fontWeight: 600,
              gap: "8px",
            }}
          >
            <span>
              <strong>Name:</strong> {patientFullName || "—"}
            </span>
            <span>
              <strong>{guardianRelation}</strong> {guardianName}
            </span>
            <span>
              <strong>Contact # :</strong> {patient.phone || "—"}
            </span>
            <span>
              <strong>Age/Gender :</strong> {ageGenderDisplay}
            </span>
            <span>
              <strong>Address:</strong> {patient.address || "—"}
            </span>
          </div>

          {/* ── TWO-COLUMN BODY with vertical divider ─────────────── */}
          <div style={{ display: "flex", minHeight: "175mm" }}>
            {/* LEFT COLUMN */}
            <div
              style={{
                flex: "0 0 38%",
                borderRight: "1.5px solid #000",
                paddingRight: "14px",
                paddingTop: "10px",
                boxSizing: "border-box",
              }}
            >
              {/* Clinical Notes heading */}
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "11.5px",
                  textDecoration: "underline",
                  marginBottom: "8px",
                  letterSpacing: "0.2px",
                }}
              >
                Clinical Notes
              </div>

              {/* Vitals with underline values */}
              <VitalRow label="B.P :" value={bpDisplay} />
              <VitalRow label="Pulse :" value={pulseDisplay} />
              <VitalRow label="Temp :" value={tempDisplay} />
              <VitalRow label="Weight :" value={weightDisplay} />
              {triage.oxygenSaturation && (
                <VitalRow label="SpO2 :" value={`${triage.oxygenSaturation}%`} />
              )}
              {triage.respiratoryRate && (
                <VitalRow label="R. Rate :" value={`${triage.respiratoryRate}/min`} />
              )}

              {/* PRESENTING COMPLAINT */}
              <div style={{ marginTop: "14px" }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "11.5px",
                    textDecoration: "underline",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                    letterSpacing: "0.2px",
                  }}
                >
                  PRESENTING COMPLAINT:
                </div>
                <RuledLines count={5} text={complaintText} />
              </div>

              {/* OUTCOME */}
              <div style={{ marginTop: "14px" }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "11.5px",
                    textDecoration: "underline",
                    textTransform: "uppercase",
                    marginBottom: "6px",
                    letterSpacing: "0.2px",
                  }}
                >
                  OUTCOME:
                </div>
                <RuledLines count={5} text={outcomeText} />
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div
              style={{
                flex: 1,
                paddingLeft: "16px",
                paddingTop: "10px",
                boxSizing: "border-box",
              }}
            >
              {/* Discharge Medications heading */}
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "12px",
                  textDecoration: "underline",
                  textAlign: "center",
                  marginBottom: "10px",
                  letterSpacing: "0.3px",
                }}
              >
                Discharge Medications
              </div>

              {parsedMedications.length > 0 ? (
                /* Structured medication list with numbered ruled lines */
                <div>
                  {parsedMedications.map((med, idx) => {
                    const details = [
                      med.dosage ? `${med.dosage}` : "",
                      med.route || "",
                      med.frequency || "",
                      med.timing || "",
                      med.duration ? `× ${med.duration}` : "",
                    ]
                      .filter(Boolean)
                      .join("  •  ");

                    return (
                      <div key={med.id || idx} style={{ marginBottom: "8px" }}>
                        {/* Medicine name line */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            borderBottom: "1px solid #000",
                            paddingBottom: "1px",
                            marginBottom: "3px",
                            fontSize: "11.5px",
                            fontWeight: 700,
                          }}
                        >
                          <span style={{ flexShrink: 0, marginRight: "6px", color: "#000" }}>
                            {idx + 1}.
                          </span>
                          <span style={{ flex: 1 }}>{med.medicineName}</span>
                          {med.duration && (
                            <span style={{ flexShrink: 0, fontSize: "10.5px", color: "#333", marginLeft: "8px" }}>
                              × {med.duration}
                            </span>
                          )}
                        </div>
                        {/* Details line */}
                        {details && (
                          <div
                            style={{
                              borderBottom: "1px solid #000",
                              paddingBottom: "1px",
                              marginBottom: "1px",
                              fontSize: "10.5px",
                              color: "#333",
                              paddingLeft: "14px",
                            }}
                          >
                            {details}
                          </div>
                        )}
                        {/* Instruction line */}
                        {med.instructions && (
                          <div
                            style={{
                              borderBottom: "1px solid #000",
                              paddingBottom: "1px",
                              fontSize: "10px",
                              color: "#555",
                              paddingLeft: "14px",
                              fontStyle: "italic",
                            }}
                          >
                            {med.instructions}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Extra blank ruled lines for handwriting */}
                  {parsedMedications.length < 10 &&
                    Array.from({ length: Math.max(0, 6 - parsedMedications.length) }).map((_, i) => (
                      <div
                        key={`blank-${i}`}
                        style={{
                          borderBottom: "1px solid #000",
                          minHeight: "18px",
                          marginBottom: "6px",
                        }}
                      />
                    ))}
                </div>
              ) : freeformMedicationsText ? (
                /* Free-form text on ruled lines */
                <RuledLines count={10} text={freeformMedicationsText} />
              ) : (
                /* All blank ruled lines for handwriting */
                <RuledLines count={12} />
              )}

              {/* Special Advice & Instructions section */}
              {adviceText ? (
                <div style={{ marginTop: "12px" }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "11px",
                      textDecoration: "underline",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    Special Advice &amp; Instructions:
                  </div>
                  <RuledLines count={4} text={adviceText} />
                </div>
              ) : (
                <div style={{ marginTop: "12px" }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "11px",
                      textDecoration: "underline",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    Special Advice &amp; Instructions:
                  </div>
                  <RuledLines count={3} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── BOTTOM: SIGNATURES + FOOTER ───────────────────────── */}
        <div style={{ marginTop: "auto", paddingTop: "16px" }}>
          {/* Signature Row */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            {/* Left Signature */}
            <div style={{ textAlign: "center", width: "42%" }}>
              <div
                style={{
                  borderTop: "1.5px solid #000",
                  width: "80%",
                  margin: "0 auto 4px",
                }}
              />
              <div style={{ fontSize: "10.5px", fontWeight: 700 }}>
                Triage Nurse / Officer Signature
              </div>
            </div>
            {/* Right Signature */}
            <div style={{ textAlign: "center", width: "42%" }}>
              <div
                style={{
                  borderTop: "1.5px solid #000",
                  width: "80%",
                  margin: "0 auto 4px",
                }}
              />
              <div style={{ fontSize: "10.5px", fontWeight: 700 }}>
                Attending Medical Officer Signature
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              borderTop: "1.5px solid #000",
              paddingTop: "6px",
              fontSize: "10.5px",
              fontWeight: 600,
            }}
          >
            Ghias Hospital Near Bypass / Main Road, Phalia • Emergency Hotline: (0546) 59488 • 24/7 Trauma Care
          </div>
        </div>
      </div>
    </div>
  );
}
