# 🏥 GIAS Hospital Management System (GHMS)
### *A Modern, Enterprise-Grade Hospital Information & Clinical Management System*

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-7.10-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791?logo=postgresql)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

---

## 📋 Table of Contents
- [Overview](#-overview)
- [Key Features](#-key-features)
  - [Reception & Patient Registration](#1-reception--patient-registration)
  - [OPD & Appointment Scheduling](#2-opd--appointment-scheduling)
  - [Doctor Portal & Clinical Consultations](#3-doctor-portal--clinical-consultations)
  - [Nursing Care & Ward Operations](#4-nursing-care--ward-operations)
  - [Emergency Department & Rapid Triage](#5-emergency-department--rapid-triage)
  - [Inpatient (IPD) & Bed Allocation](#6-inpatient-ipd--bed-allocation)
  - [Official Bilingual Documents & Slips](#7-official-bilingual-documents--slips)
  - [Billing, Expenses & Day-End Reporting](#8-billing-expenses--day-end-reporting)
  - [System Administration & Audit Trail](#9-system-administration--audit-trail)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [Default Seed Accounts](#-default-seed-accounts)
- [Technology Stack](#-technology-stack)
- [System Architecture & Directory Structure](#-system-architecture--directory-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Environment Setup](#installation--environment-setup)
  - [Database Migration & Seeding](#database-migration--seeding)
  - [Running the Application](#running-the-application)
- [Scripts & Verification Utilities](#-scripts--verification-utilities)
- [Environment Variables Guide](#-environment-variables-guide)
- [Contributing & License](#-contributing--license)

---

## 🌟 Overview

**GIAS Hospital Management System (GHMS)** is a comprehensive, production-ready web application engineered to streamline the full clinical, operational, and administrative lifecycle of hospital management. 

Designed specifically for healthcare practices and hospitals operating with bilingual English and Urdu clinical workflows, GIAS Hospital delivers end-to-end patient tracking from registration and OPD token queues to emergency triage, digital doctor consultations, nursing care records, bed occupancy tracking, bilingual patient consent documentation, referrals, and daily financial reconciliation.

---

## 🚀 Key Features

### 1. Reception & Patient Registration
- **Unique Patient Identification**: Automatic generation of Medical Record Numbers (`MR-XXXXXX`) and Patient Identifiers (`PAT-XXXXXX`).
- **Comprehensive Demographic Profiles**: Full patient demographics, CNIC (`37405-XXXXXXX-X`), Guardian/Spouse relationships (`S/o`, `D/o`, `W/o`), blood group, address, and primary emergency contacts.
- **Duplicate Prevention**: Multi-layered real-time duplicate checks matching against CNIC, phone number, and name combinations to avoid duplicate files.
- **Longitudinal Patient Timeline**: Centralized event timeline recording registrations, vitals, admissions, consultations, and discharges.

### 2. OPD & Appointment Scheduling
- **Daily Token System**: Sequential daily queue tokens (reset daily per doctor/department) with live queue status monitoring.
- **Appointment Types**: Regular consultations, follow-ups, and urgent/emergency walk-ins.
- **Consultation Fee Snapshots**: Doctor fees are locked at the time of appointment booking to preserve historical accounting accuracy.
- **Printable Slips**: Dedicated thermal receipt slips (80mm) and formal A4 OPD appointment and prescription slips with barcode/QR placeholders.

### 3. Doctor Portal & Clinical Consultations
- **Live Consultation Queue**: Real-time patient queue view (Scheduled $\rightarrow$ Waiting $\rightarrow$ In Consultation $\rightarrow$ Completed / Cancelled / No-Show).
- **Electronic Medical Records (EMR)**: Structured clinical data recording for presenting complaints, past medical/surgical history, medication history, family history, physical examination, provisional diagnosis, and final ICD-style diagnoses.
- **Digital e-Prescriptions (`RX-XXXXXX`)**: Multi-item medication prescribing with medicine name, dosage, frequency, administration route, duration, and special dietary/intake instructions.
- **Bilingual Urdu & English Doctor Slips**: Prescriptions styled to Pakistani medical format featuring doctor credentials in Urdu (e.g., ماہر امراض اطفال) and English qualifications.

### 4. Nursing Care & Ward Operations
- **Department-Aware Nursing Dashboards**: Custom views for Outpatient Department (OPD), Emergency Room (ER), and Inpatient Department (IPD).
- **Vital Signs Monitoring**: Historical, append-only vitals logging (Pulse, Blood Pressure, Temperature, Respiratory Rate, Oxygen Saturation $\text{SpO}_2$, Weight, Height, Pain Score 0–10, and auto-calculated BMI).
- **Medication Administration Records (MAR)**: Nurse-verified drug dispensation tracking with statuses: `GIVEN`, `MISSED`, `REFUSED`, and `HELD`.
- **Nursing Progress Notes**: Timestamped observations, patient condition evaluations, nursing interventions, and treatment responses.

### 5. Emergency Department & Rapid Triage
- **Priority Triage Levels**: Rapid triage classification into `CRITICAL`, `URGENT`, and `NORMAL` with targeted response time benchmarks (e.g., immediate resuscitation vs. $\le 10$ minutes).
- **Emergency Encounter Logs**: Chief complaints, provisional diagnosis, emergency medication sheets, rapid vital signs, and immediate interventions.
- **Direct Emergency Admissions & Discharges**: Seamless transition from ER triage into IPD ward admission or emergency discharge documentation.

### 6. Inpatient (IPD) & Bed Allocation
- **Admission Workflows (`ADM-XXXXXX`)**: Admission origin tracking (OPD, Emergency, IPD transfer), admitting consultant assignment, and baseline admission vitals.
- **Room & Bed Management**: Real-time room and ward management with status tracking: `FREE`, `SCHEDULED`, and `OCCUPIED`.
- **Inpatient Care Management**: Daily clinical ward rounds, dietary advice, operative notes, and treatment plan updates.
- **Comprehensive Discharge Workflows**: Detailed discharge summaries, discharge medications, follow-up scheduling, condition evaluation (`Satisfactory`, `Fair`, `Poor`), and LAMA (Leave Against Medical Advice) management.

### 7. Official Bilingual Documents & Slips
- **Patient Legal Consent Forms (رضامندی فارم)**: Formal bilingual consent documents with Urdu legal declarations for:
  - Anesthesia Consent (بے ہوشی کا اقرار نامہ)
  - Surgical Operation Consent (آپریشن کی رضامندی)
  - Blood Transfusion Consent (انتقال خون کا اقرار نامہ)
- **Inter-Facility Patient Referral Letters (`REF-XXXXXX`)**: Formal referral documentation for transferring patients to specialized hospitals, detailing treatment provided, provisional diagnosis, and clinical transport condition.
- **Official Death Certificates (`DC-XXXXXX`)**: Hospital-certified death documentation capturing date, time, cause of death, diagnosis, and body release details with CNIC verification.

### 8. Billing, Expenses & Day-End Reporting
- **Expense Management**: Categorized hospital operational expenditure tracking (Supplies, Utilities, Salaries, Maintenance, Equipment, Pharmacy).
- **Day-End Cashier Reconciliation**: Daily financial summary combining token consultation fees collected, admission charges, daily expenses, and net cash balance.
- **Doctor Financial Summaries**: Doctor-wise patient volume and consultation fee earnings analytics.

### 9. System Administration & Audit Trail
- **Granular User & Staff Management**: CRUD controls for doctors, nursing staff, receptionists, and system operators.
- **Audit Logging (`AuditLog`)**: Immutable audit logs capturing the user, timestamp, IP address, action, and before/after JSON states for all sensitive operations.

---

## 👥 Role-Based Access Control (RBAC)

The system enforces strict route and API-level authorization based on authenticated user roles:

| Feature / Route Module | Admin | Doctor | Nurse | Receptionist | Staff |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **System Admin Dashboard** (`/admin`) | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Doctor Clinical Portal** (`/doctor`) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Nurse Clinical Portal** (`/staff`) | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Patient Registration** (`/patients/new`) | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Patient Directory** (`/patients`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Appointment Booking** (`/appointments/new`) | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Appointments List** (`/appointments`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Inpatient Admissions** (`/admissions`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Emergency Triage** (`/emergency`) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Consent & Legal Forms** (`/reception/permissions`) | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Referrals & Death Certs** | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Day-End Cashier Report** | ✅ | ❌ | ❌ | ✅ | ✅ |
| **Daily Expense Entry** | ✅ | ❌ | ❌ | ✅ | ✅ |
| **User & Doctor Management** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Audit Logs** | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🔑 Default Seed Accounts

The development database can be seeded with pre-configured accounts representing each key hospital role:

| Role | Username | Email | Password | Primary Dashboard |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | `admin_user` | `admin@ghias-hospital.com` | `Admin@1234` | `/admin` |
| **Medical Doctor** | `doctor_user` | `doctor@gias-hospital.com` | `Doctor@1234` | `/doctor` |
| **Nursing Staff** | `nurse_user` | `nurse@gias-hospital.com` | `Nurse@1234` | `/staff` |
| **Receptionist** | `recep_user` | `receptionist@gias-hospital.com` | `Recep@1234` | `/staff` (Reception Mode) |
| **General Staff** | `staff_user` | `staff@gias-hospital.com` | `Staff@1234` | `/staff` |

> ⚠️ **Security Notice**: Change all default passwords immediately before deploying to a production or public environment.

---

## 💻 Technology Stack

- **Frontend & App Framework**: [Next.js 16](https://nextjs.org/) (React 19, App Router, Server Components & Client Components)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/) (Strict typing across models, DTOs, and API responses)
- **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/), `@tailwindcss/postcss`, [Lucide React](https://lucide.dev/) icons
- **Database & Data Layer**: [PostgreSQL](https://www.postgresql.org/), [Prisma ORM 7](https://www.prisma.io/) with `@prisma/adapter-pg` driver adapter
- **Authentication**: JWT-based session tokens using [`jose`](https://github.com/panva/jose) stored in `HttpOnly`, `SameSite` secure cookies
- **Password Security**: [`bcryptjs`](https://github.com/dcodeIO/bcrypt.js) cryptographic hashing
- **Schema Validation**: [Zod](https://zod.dev/)

---

## 📂 System Architecture & Directory Structure

```text
ghias_hospital/
├── prisma/
│   ├── schema.prisma           # Complete PostgreSQL schema (Users, Patients, Consultations, Admissions, etc.)
│   └── seed.ts                 # Database seed script for roles, test doctors, nurses, and staff
├── public/                     # Static hospital assets, logos, and favicons
├── scripts/                    # End-to-end verification, testing, and maintenance scripts
│   ├── seed-rooms-beds.ts      # Seed default hospital rooms and beds
│   ├── sync-doctor-passwords.ts
│   ├── test-discharge-workflow.ts
│   ├── verify-phase1.ts        # Phase-wise test & verification suites
│   ├── verify-phase3-patients.ts
│   ├── verify-phase4-appointments.ts
│   ├── verify-doctor-phase5.ts
│   └── verify-staff-phase6.ts
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/              # Administrator portal (departments, doctors, staff, rooms, reports, audit)
│   │   ├── admissions/         # Inpatient admission booking, stay management, and discharge
│   │   ├── appointments/       # OPD booking wizard, token queues, and calendar
│   │   ├── doctor/             # Clinician dashboard, queue, clinical consultations, prescriptions
│   │   ├── emergency/          # ER triage, resuscitation priority, emergency treatment
│   │   ├── login/              # Unified authentication login page
│   │   ├── patients/           # Patient registration wizard and directory
│   │   ├── reception/          # Reception desk (consents, day-end, referrals, death certificates)
│   │   ├── reports/            # Hospital analytical reports and operational metrics
│   │   ├── staff/              # Nurse dashboard (vitals, MAR, nursing notes, ward management)
│   │   ├── api/                # REST API routes (auth, patients, appointments, triage, admissions, etc.)
│   │   ├── globals.css         # Global Tailwind and print layout styles
│   │   ├── layout.tsx          # Root HTML shell & fonts
│   │   └── page.tsx            # Root redirector based on authenticated role
│   ├── components/             # Reusable UI Components & Document Renderers
│   │   ├── admin/              # Administrative widgets and table components
│   │   ├── appointments/       # Thermal and A4 prescription & appointment slip views
│   │   ├── common/             # Hospital SVG logo, headers, buttons, badge components
│   │   ├── death-certificate/  # Printable Death Certificate A4 document
│   │   ├── discharge/          # Printable Discharge Summary A4 document
│   │   ├── emergency/          # Emergency triage sheets and discharge certificates
│   │   ├── inpatient/          # Bed allocation matrices and admission documents
│   │   ├── permissions/        # Urdu/English surgical & anesthesia consent documents
│   │   ├── referral/           # Official patient inter-hospital referral document
│   │   └── ui/                 # Core design system components (modals, tabs, cards)
│   ├── lib/                    # Core Utilities & Backend Services
│   │   ├── auth.ts             # JWT generation, cookie management, session verification
│   │   ├── prisma.ts           # Prisma 7 PostgreSQL singleton client
│   │   ├── rbac.ts             # Role-based route access controls and permissions helper
│   │   ├── audit.ts            # System audit logging utility
│   │   ├── password.ts         # Bcrypt hashing & verification
│   │   ├── patient-number.ts   # MR Number and Patient ID formatters
│   │   ├── appointment-number.ts
│   │   └── admission-number.ts
│   └── middleware.ts           # Global Edge Route Middleware protecting routes by role
├── .env.example                # Template for environment configuration
├── package.json                # Project dependencies and npm scripts
└── tsconfig.json               # TypeScript configuration
```

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **Package Manager**: `npm` (v10+), `pnpm`, or `yarn`
- **Database**: [PostgreSQL](https://www.postgresql.org/) (v14+ recommended)

### Installation & Environment Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/ghias_hospital.git
   cd ghias_hospital
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your PostgreSQL connection string and secrets:
   ```env
   # PostgreSQL database connection string
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/ghias_hospital?schema=public"

   # Authentication Secrets
   JWT_SECRET="replace-with-a-secure-random-256-bit-string-for-production"
   COOKIE_NAME="gias_auth_token"
   NODE_ENV="development"
   ```

### Database Migration & Seeding

1. **Generate the Prisma Client**:
   ```bash
   npx prisma generate
   ```

2. **Push the schema to your PostgreSQL database**:
   ```bash
   npx prisma db push
   ```

3. **Seed initial users and accounts**:
   ```bash
   npm run seed
   # or run directly:
   npx tsx prisma/seed.ts
   ```

4. *(Optional)* **Seed rooms and inpatient beds**:
   ```bash
   npx tsx scripts/seed-rooms-beds.ts
   ```

### Running the Application

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000). You will be automatically redirected to `/login`. Sign in using any of the [Default Seed Accounts](#-default-seed-accounts).

3. **Building for Production**:
   ```bash
   npm run build
   npm run start
   ```

---

## 🧪 Scripts & Verification Utilities

The `scripts/` directory contains automated verification suites built to test critical clinical workflows:

```bash
# Verify authentication, JWT tokens, and RBAC middleware
npx tsx scripts/verify-phase1.ts

# Test patient registration, MR number generation, and duplicate checks
npx tsx scripts/verify-phase3-patients.ts

# Test appointment scheduling, daily token resets, and consultation fees
npx tsx scripts/verify-phase4-appointments.ts

# Test doctor queue, EMR consultation notes, and prescription generation
npx tsx scripts/verify-doctor-phase5.ts

# Test nurse vitals logging, MAR medication administration, and nursing notes
npx tsx scripts/verify-staff-phase6.ts

# Test bed occupancy and discharge workflows
npx tsx scripts/test-discharge-workflow.ts
npx tsx scripts/test-room-bed-workflow.ts
```

---

## ⚙️ Environment Variables Guide

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string including user, password, host, port, database, and schema. |
| `JWT_SECRET` | **Yes** | *fallback dev secret* | Cryptographic key used to sign and verify JWT authentication cookies. Use a high-entropy string in production. |
| `COOKIE_NAME` | No | `gias_auth_token` | Name of the HTTP cookie storing the user session token. |
| `NODE_ENV` | No | `development` | Deployment environment (`development` or `production`). |

---

## 🖨️ Printing & Document Output

All official hospital documents in GIAS Hospital are designed with custom print styles (`@media print`):
- **Thermal Slips (80mm / Receipt Printer)**: OPD Tokens, Cash Receipts.
- **Standard A4 Documents**:
  - Doctor Prescriptions & Consultations
  - Inpatient Admission & Discharge Summaries
  - Operation, Anesthesia, and Blood Transfusion Consent Forms (with Urdu typography & legal sign-off lines)
  - Emergency Triage Summary Sheets
  - Inter-Hospital Referral Certificates
  - Death Certificates
- In print mode, sidebars, navigation bars, and action buttons are automatically hidden, leaving clean medical documentation with official hospital headers and footers.

---

## 📄 License & Maintainers

Developed for **GIAS Hospital** / **Ghias Hospital (غیاث ہسپتال)**.  
All rights reserved. Proprietary software for clinical and hospital operational management.
