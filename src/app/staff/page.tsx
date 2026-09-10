import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { getRoleDisplayName, canManagePatients, canManageAppointments } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import NurseDashboardView from "./NurseDashboardView";
import {
  UserPlus,
  Search,
  ArrowRight,
  Calendar,
  Clock,
  Stethoscope,
  Plus,
  BedDouble,
  FileCheck2,
  Flame,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff & Nursing Workspace — GHIAS Hospital" };

export default async function StaffDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const allowedRoles = ["NURSE", "RECEPTIONIST", "STAFF", "ADMIN"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/login");
  }

  // Find linked staff profile
  const staff = await prisma.staff.findFirst({
    where: { OR: [{ userId: user.id }, { email: user.email }] },
    include: { department: true },
  });

  const isNurse =
    user.role === "NURSE" ||
    staff?.role === "HEAD_NURSE" ||
    staff?.role === "STAFF_NURSE";

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // If the user is a Nurse, load nursing-specific dashboard data
  if (isNurse) {
    const isEmergency = staff?.nurseDepartment === "EMERGENCY";

    if (isEmergency) {
      const [
        totalEmergencyAppointments,
        totalTriageToday,
        criticalCount,
        highCount,
        urgentCount,
        normalCount,
        erQueue,
        erAdmissions,
      ] = await Promise.all([
        prisma.appointment.count({
          where: { appointmentDate: { gte: todayStart, lte: todayEnd }, isEmergency: true },
        }),
        prisma.emergencyTriage.count({
          where: { triagedAt: { gte: todayStart, lte: todayEnd } },
        }),
        prisma.emergencyTriage.count({
          where: { triagedAt: { gte: todayStart, lte: todayEnd }, priority: "CRITICAL" },
        }),
        prisma.emergencyTriage.count({
          where: { triagedAt: { gte: todayStart, lte: todayEnd }, priority: "HIGH" },
        }),
        prisma.emergencyTriage.count({
          where: { triagedAt: { gte: todayStart, lte: todayEnd }, priority: "URGENT" },
        }),
        prisma.emergencyTriage.count({
          where: { triagedAt: { gte: todayStart, lte: todayEnd }, priority: "NORMAL" },
        }),
        prisma.emergencyTriage.findMany({
          where: {
            OR: [
              { dischargeDateTime: null },
              { triagedAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) } },
            ],
          },
          orderBy: { triagedAt: "desc" },
          take: 16,
          include: {
            patient: {
              select: {
                id: true,
                patientNumber: true,
                mrNumber: true,
                firstName: true,
                lastName: true,
                gender: true,
                dateOfBirth: true,
                phone: true,
                bloodGroup: true,
                allergies: true,
                vitalSigns: { orderBy: { recordedAt: "desc" }, take: 1 },
              },
            },
            admission: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        }),
        prisma.admission.findMany({
          where: {
            admissionSource: "EMERGENCY",
            status: { in: ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"] },
          },
          orderBy: { admissionDate: "desc" },
          take: 10,
          include: {
            patient: {
              select: {
                id: true,
                patientNumber: true,
                mrNumber: true,
                firstName: true,
                lastName: true,
                gender: true,
                dateOfBirth: true,
                phone: true,
                bloodGroup: true,
                allergies: true,
                vitalSigns: { orderBy: { recordedAt: "desc" }, take: 1 },
              },
            },
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                specialization: true,
              },
            },
          },
        }),
      ]);

      return (
        <DashboardLayout
          user={{
            ...user,
            nurseDepartment: staff?.nurseDepartment || null,
            staffRole: staff?.role || null,
          }}
        >
          <div className="max-w-6xl mx-auto">
            <NurseDashboardView
              nurseName={`${user.firstName} ${user.lastName}`}
              department="EMERGENCY"
              role={staff?.role || "STAFF_NURSE"}
              shift={staff?.shift || null}
              admittedInpatients={erAdmissions}
              erMetrics={{
                totalCases: Math.max(totalEmergencyAppointments, totalTriageToday) + erAdmissions.length,
                critical: criticalCount + erAdmissions.filter((a) => a.status === "ADMITTED").length,
                high: highCount,
                urgent: urgentCount,
                normal: normalCount,
              }}
              queue={[
                ...erAdmissions.map((adm) => ({
                  id: adm.id,
                  triageId: null,
                  admissionId: adm.id,
                  dischargeDateTime: null,
                  triageLevel: "RESUSCITATION",
                  isAdmission: true,
                  patient: adm.patient,
                  priority: "CRITICAL",
                  chiefComplaint: adm.provisionalDiagnosis || "Emergency Inpatient Admission",
                  triagedAt: new Date(adm.admissionDate),
                  roomBedNo: adm.roomBedNo,
                })),
                ...erQueue.map((item) => ({
                  id: item.id,
                  triageId: item.id,
                  admissionId: item.admission?.id || null,
                  dischargeDateTime: item.dischargeDateTime ? item.dischargeDateTime.toISOString() : null,
                  triageLevel: item.triageLevel || "EMERGENCY",
                  isAdmission: false,
                  patient: item.patient,
                  priority: item.priority,
                  chiefComplaint: item.chiefComplaint,
                  triagedAt: item.triagedAt,
                  roomBedNo: null,
                })),
              ]}
            />
          </div>
        </DashboardLayout>
      );
    } else {
      // OPD Nursing Dashboard
      const [
        totalOpdPatients,
        waitingCount,
        inConsultationCount,
        completedCount,
        opdQueue,
        opdAdmissions,
      ] = await Promise.all([
        prisma.appointment.count({
          where: { appointmentDate: { gte: todayStart, lte: todayEnd }, isEmergency: false },
        }),
        prisma.appointment.count({
          where: { appointmentDate: { gte: todayStart, lte: todayEnd }, status: "WAITING", isEmergency: false },
        }),
        prisma.appointment.count({
          where: { appointmentDate: { gte: todayStart, lte: todayEnd }, status: "IN_CONSULTATION", isEmergency: false },
        }),
        prisma.appointment.count({
          where: { appointmentDate: { gte: todayStart, lte: todayEnd }, status: "COMPLETED", isEmergency: false },
        }),
        prisma.appointment.findMany({
          where: { appointmentDate: { gte: todayStart, lte: todayEnd }, isEmergency: false },
          orderBy: [{ appointmentTime: "asc" }, { createdAt: "asc" }],
          take: 8,
          include: {
            patient: {
              select: {
                id: true,
                patientNumber: true,
                mrNumber: true,
                firstName: true,
                lastName: true,
                gender: true,
                dateOfBirth: true,
                phone: true,
                bloodGroup: true,
                allergies: true,
                vitalSigns: { orderBy: { recordedAt: "desc" }, take: 1 },
              },
            },
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                specialization: true,
                roomNumber: true,
              },
            },
            department: {
              select: {
                name: true,
              },
            },
          },
        }),
        prisma.admission.findMany({
          where: {
            admissionSource: "OPD",
            status: { in: ["ADMITTED", "UNDER_TREATMENT", "DISCHARGE_PENDING"] },
          },
          orderBy: { admissionDate: "desc" },
          take: 10,
          include: {
            patient: {
              select: {
                id: true,
                patientNumber: true,
                mrNumber: true,
                firstName: true,
                lastName: true,
                gender: true,
                dateOfBirth: true,
                phone: true,
                bloodGroup: true,
                allergies: true,
                vitalSigns: { orderBy: { recordedAt: "desc" }, take: 1 },
              },
            },
            doctor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                specialization: true,
              },
            },
          },
        }),
      ]);

      return (
        <DashboardLayout
          user={{
            ...user,
            nurseDepartment: staff?.nurseDepartment || "OPD",
            staffRole: staff?.role || null,
          }}
        >
          <div className="max-w-6xl mx-auto">
            <NurseDashboardView
              nurseName={`${user.firstName} ${user.lastName}`}
              department="OPD"
              role={staff?.role || "STAFF_NURSE"}
              shift={staff?.shift || null}
              admittedInpatients={opdAdmissions}
              opdMetrics={{
                totalPatients: totalOpdPatients + opdAdmissions.length,
                waiting: waitingCount + opdAdmissions.filter((a) => a.status === "ADMITTED").length,
                inConsultation: inConsultationCount + opdAdmissions.filter((a) => a.status === "UNDER_TREATMENT").length,
                completed: completedCount,
              }}
              queue={[
                ...opdAdmissions.map((adm) => ({
                  id: adm.id,
                  isAdmission: true,
                  patient: adm.patient,
                  doctor: adm.doctor ? {
                    firstName: adm.doctor.firstName,
                    lastName: adm.doctor.lastName,
                    specialization: adm.doctor.specialization,
                    roomNumber: adm.roomBedNo,
                  } : null,
                  department: {
                    name: adm.roomBedNo || "OPD Inpatient Ward",
                  },
                  appointmentTime: adm.admissionTime || "Inpatient Ward",
                  status: adm.status,
                  roomBedNo: adm.roomBedNo,
                })),
                ...opdQueue.map((item) => ({
                  id: item.id,
                  isAdmission: false,
                  patient: item.patient,
                  doctor: item.doctor,
                  department: item.department,
                  appointmentTime: item.appointmentTime,
                  status: item.status,
                  roomBedNo: null,
                })),
              ]}
            />
          </div>
        </DashboardLayout>
      );
    }
  }

  // Otherwise, render Receptionist / Staff Operations Dashboard
  const [
    patientCount,
    todayAppointmentsCount,
    todayWaitingCount,
    todayEmergencyCount,
    todayCompletedCount,
    todayAppointments,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.appointment.count({ where: { appointmentDate: todayStart } }),
    prisma.appointment.count({
      where: { appointmentDate: todayStart, status: { in: ["WAITING", "SCHEDULED"] } },
    }),
    prisma.appointment.count({
      where: { appointmentDate: todayStart, isEmergency: true },
    }),
    prisma.appointment.count({
      where: { appointmentDate: todayStart, status: "COMPLETED" },
    }),
    prisma.appointment.findMany({
      where: { appointmentDate: todayStart },
      take: 6,
      orderBy: [{ isEmergency: "desc" }, { appointmentTime: "asc" }],
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            patientNumber: true,
            mrNumber: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            specialization: true,
          },
        },
        department: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const canRegister = canManagePatients(user.role);
  const canBook = canManageAppointments(user.role);

  return (
    <DashboardLayout
      user={{
        ...user,
        nurseDepartment: staff?.nurseDepartment || null,
        staffRole: staff?.role || null,
      }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome Banner */}
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Frontdesk Reception &amp; Staff Operations
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Welcome, {user.firstName} {user.lastName}
              </h1>
              <p className="text-slate-600 text-sm mt-1">
                Role: <strong className="text-slate-900">{getRoleDisplayName(user.role)}</strong> • Account Status: {user.status}
              </p>
            </div>

            {canBook && (
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/emergency?new=true"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition"
                >
                  <Flame className="w-4 h-4" />
                  <span>+ Emergency Patient</span>
                </Link>
                {canBook && (
                  <Link
                    href="/appointments/new"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-sm transition"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>New Appointment</span>
                  </Link>
                )}
                {canRegister && (
                  <>
                    <Link
                      href="/patients/new"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-sm shadow-xs transition"
                    >
                      <UserPlus className="w-4 h-4 text-teal-700" />
                      <span>Register Patient</span>
                    </Link>
                    <Link
                      href="/admissions"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white font-bold text-sm shadow-sm transition"
                    >
                      <BedDouble className="w-4 h-4" />
                      <span>Admit Patient</span>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live Reception Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Today&apos;s Appointments
            </span>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{todayAppointmentsCount}</p>
            <p className="text-xs text-slate-400 mt-1">Scheduled for today</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
              Waiting / Queued
            </span>
            <p className="text-3xl font-extrabold text-amber-700 mt-1">{todayWaitingCount}</p>
            <p className="text-xs text-amber-600 mt-1">Patients in clinic waiting area</p>
          </div>

          <Link
            href="/emergency"
            className="bg-white p-5 rounded-xl border border-rose-200 bg-rose-50/30 shadow-xs hover:border-rose-400 hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                Emergency Triage
              </span>
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
            </div>
            <p className="text-3xl font-extrabold text-rose-700 mt-1">{todayEmergencyCount}</p>
            <p className="text-xs text-rose-600 font-medium mt-1 group-hover:underline flex items-center gap-1">
              <span>View Emergency Queue</span>
              <ArrowRight className="w-3 h-3" />
            </p>
          </Link>

          <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Completed Encounters
            </span>
            <p className="text-3xl font-extrabold text-emerald-700 mt-1">{todayCompletedCount}</p>
            <p className="text-xs text-emerald-600 mt-1">Consultations finished</p>
          </div>
        </div>

        {/* Quick Receptionist Action Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Emergency Triage Quick Action */}
          <Link
            href="/emergency"
            className="bg-gradient-to-br from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white p-5 rounded-xl shadow-md hover:shadow-lg transition flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-white/15 w-fit text-white">
                  <Flame className="w-5 h-5 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded">
                  24/7 ER
                </span>
              </div>
              <h2 className="text-base font-bold">Emergency &amp; Triage</h2>
              <p className="text-xs text-rose-100 mt-1">
                Register emergency patients, select 5-tier triage level, record vitals &amp; dispatch to nurse.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold mt-4 text-rose-100 group-hover:translate-x-1 transition">
              <span>Launch Emergency Station</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
          {canBook && (
            <Link
              href="/appointments/new"
              className="bg-gradient-to-br from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white p-5 rounded-xl shadow-sm transition flex flex-col justify-between group"
            >
              <div>
                <div className="p-2.5 rounded-lg bg-white/10 w-fit mb-3 text-white">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </div>
                <h2 className="text-base font-bold">Book Appointment</h2>
                <p className="text-xs text-teal-100 mt-1">
                  Search or register patient, choose doctor, and assign into queue.
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold mt-4 text-teal-100 group-hover:translate-x-1 transition">
                <span>Start Booking</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          )}

          <Link
            href="/appointments"
            className="bg-white border border-slate-200 hover:border-teal-500 p-5 rounded-xl shadow-xs transition flex flex-col justify-between group"
          >
            <div>
              <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700 w-fit mb-3">
                <Calendar className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Today&apos;s Appointments</h2>
              <p className="text-xs text-slate-500 mt-1">
                Filter by doctor, department, or status, check-in, and manage slips.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold mt-4 text-teal-600 group-hover:translate-x-1 transition">
              <span>View All Appointments</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/patients"
            className="bg-white border border-slate-200 hover:border-teal-500 p-5 rounded-xl shadow-xs transition flex flex-col justify-between group"
          >
            <div>
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 w-fit mb-3">
                <Search className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Search Patient</h2>
              <p className="text-xs text-slate-500 mt-1">
                Lookup by MR#, CNIC, Name, or Mobile Phone ({patientCount} registered).
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold mt-4 text-blue-600 group-hover:translate-x-1 transition">
              <span>Patients Directory</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/doctor/queue"
            className="bg-white border border-slate-200 hover:border-teal-500 p-5 rounded-xl shadow-xs transition flex flex-col justify-between group"
          >
            <div>
              <div className="p-2.5 rounded-lg bg-purple-50 text-purple-700 w-fit mb-3">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Doctor Queues</h2>
              <p className="text-xs text-slate-500 mt-1">
                Monitor waiting patients and active consultation rooms in real-time.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold mt-4 text-purple-600 group-hover:translate-x-1 transition">
              <span>View Queue Board</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          <Link
            href="/reception/permissions"
            className="bg-white border border-slate-200 hover:border-teal-500 p-5 rounded-xl shadow-xs transition flex flex-col justify-between group"
          >
            <div>
              <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700 w-fit mb-3">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Patient Consents</h2>
              <p className="text-xs text-slate-500 mt-1">
                Generate official Urdu consent forms (Anesthesia, Operation, Blood).
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold mt-4 text-teal-600 group-hover:translate-x-1 transition">
              <span>Open Consents Wizard</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* Today's Appointments Schedule Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-bold text-slate-900">
                Today&apos;s Patient Appointments ({todayAppointmentsCount})
              </h2>
            </div>
            <Link
              href="/appointments?date=today"
              className="text-xs font-bold text-teal-600 hover:text-teal-800"
            >
              View Full Appointments List &rarr;
            </Link>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-medium text-slate-600">No appointments scheduled for today yet.</p>
              {canBook && (
                <Link
                  href="/appointments/new"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Book First Appointment</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Apt #</th>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Physician &amp; Dept</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {todayAppointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-teal-800">
                        <Link href={`/appointments/${apt.id}`} className="hover:underline">
                          {apt.appointmentNumber}
                        </Link>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">
                          {apt.patient.firstName} {apt.patient.lastName}
                        </span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          {apt.patient.mrNumber || apt.patient.patientNumber}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">
                          Dr. {apt.doctor.firstName} {apt.doctor.lastName}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          {apt.department.name}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-slate-700 font-medium">
                        {apt.appointmentTime}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                          {apt.appointmentType}
                        </span>
                        {apt.isEmergency && (
                          <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            Emergency
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            apt.status === "WAITING"
                              ? "bg-amber-100 text-amber-800"
                              : apt.status === "IN_CONSULTATION"
                              ? "bg-blue-100 text-blue-800"
                              : apt.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {apt.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/appointments/${apt.id}`}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition"
                        >
                          View Slip
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
