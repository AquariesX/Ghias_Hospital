import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import prisma from "@/lib/prisma";
import {
  Stethoscope,
  Users,
  Calendar,
  ArrowRight,
  Play,
  CheckCircle2,
  Clock,
  Search,
} from "lucide-react";
import { AppointmentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Physician Workspace — GIAS Hospital",
};

export default async function DoctorDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "DOCTOR") {
    redirect("/login");
  }

  // Find linked doctor record
  const doctor = await prisma.doctor.findFirst({
    where: {
      OR: [{ userId: user.id }, { email: user.email }],
    },
    include: {
      department: true,
    },
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const whereDoctorToday = doctor
    ? {
        doctorId: doctor.id,
        appointmentDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      }
    : {
        appointmentDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      };

  const [
    todayTotal,
    waitingCount,
    inConsultationCount,
    completedCount,
    noShowCount,
    activeAppointments,
  ] = await Promise.all([
    prisma.appointment.count({ where: whereDoctorToday }),
    prisma.appointment.count({
      where: {
        ...whereDoctorToday,
        status: { in: [AppointmentStatus.WAITING, AppointmentStatus.SCHEDULED] },
      },
    }),
    prisma.appointment.count({
      where: { ...whereDoctorToday, status: AppointmentStatus.IN_CONSULTATION },
    }),
    prisma.appointment.count({
      where: { ...whereDoctorToday, status: AppointmentStatus.COMPLETED },
    }),
    prisma.appointment.count({
      where: { ...whereDoctorToday, status: AppointmentStatus.NO_SHOW },
    }),
    prisma.appointment.findMany({
      where: whereDoctorToday,
      take: 10,
      orderBy: [{ isEmergency: "desc" }, { appointmentTime: "asc" }],
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            patientNumber: true,
            mrNumber: true,
            gender: true,
            phone: true,
          },
        },
        consultation: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    }),
  ]);

  return (
    <DashboardLayout user={user}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome Banner */}
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <span className="w-3 h-3 rounded-full bg-teal-600 inline-block animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
              Physician Clinical Portal
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Welcome, Dr. {doctor ? `${doctor.firstName} ${doctor.lastName}` : `${user.firstName} ${user.lastName}`}
              </h1>
              <p className="text-slate-600 text-sm mt-1">
                {doctor?.specialization || "Clinical Physician"} • {doctor?.department?.name || "Outpatient Care"}
                {doctor?.roomNumber ? ` • Room: ${doctor.roomNumber}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/doctor/queue"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-sm transition"
              >
                <Stethoscope className="w-4 h-4" />
                <span>Today&apos;s Queue ({waitingCount})</span>
              </Link>
              <Link
                href="/doctor/appointments"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition"
              >
                <Calendar className="w-4 h-4 text-slate-600" />
                <span>Appointments</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
              Waiting in Queue
            </span>
            <p className="text-2xl font-bold text-amber-700 mt-1">{waitingCount}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs bg-blue-50/20">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
              In Consultation
            </span>
            <p className="text-2xl font-bold text-blue-700 mt-1">{inConsultationCount}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Completed
            </span>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{completedCount}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs bg-slate-50/40">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              No Show
            </span>
            <p className="text-2xl font-bold text-slate-700 mt-1">{noShowCount}</p>
          </div>
        </div>

        {/* Today's Queue Preview & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Queue Preview */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Today&apos;s Patient Queue
                </h2>
              </div>
              <Link
                href="/doctor/queue"
                className="text-xs font-bold text-teal-600 hover:text-teal-800"
              >
                View Full Queue ({todayTotal}) &rarr;
              </Link>
            </div>

            {activeAppointments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No appointments booked for today yet. Your queue is clear.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="py-3 flex items-center justify-between gap-4 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {apt.patient.firstName} {apt.patient.lastName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {apt.appointmentType}
                        </span>
                        {apt.isEmergency && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            Emergency
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        {apt.patient.mrNumber || apt.patient.patientNumber} • Time: {apt.appointmentTime} • {apt.reason}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          apt.status === "WAITING"
                            ? "bg-amber-100 text-amber-800"
                            : apt.status === "IN_CONSULTATION"
                            ? "bg-blue-100 text-blue-800"
                            : apt.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {apt.status}
                      </span>

                      {apt.status === "WAITING" || apt.status === "SCHEDULED" ? (
                        <Link
                          href={`/doctor/consultation/${apt.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Start</span>
                        </Link>
                      ) : apt.status === "IN_CONSULTATION" ? (
                        <Link
                          href={`/doctor/consultation/${apt.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition"
                        >
                          <Stethoscope className="w-3 h-3" />
                          <span>Continue</span>
                        </Link>
                      ) : apt.status === "COMPLETED" ? (
                        <Link
                          href={`/doctor/consultation/${apt.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>View</span>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions & Workspace Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Clinical Quick Actions
              </h3>
              <div className="space-y-2">
                <Link
                  href="/doctor/queue"
                  className="flex items-center justify-between p-3 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-900 text-xs font-semibold border border-teal-200 transition"
                >
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-teal-700" />
                    <span>Manage Clinical Queue</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-700" />
                </Link>

                <Link
                  href="/doctor/patients"
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200 transition"
                >
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-600" />
                    <span>Search &amp; Register Patient</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                </Link>

                <Link
                  href="/doctor/appointments"
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200 transition"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-600" />
                    <span>Doctor Appointments</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                </Link>

                <Link
                  href="/patients"
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200 transition"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-600" />
                    <span>Patient EMR Directory</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                </Link>
              </div>
            </div>

            {/* Configured Consultation Fee Summary */}
            {doctor && (
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Official Consultation Fee
                </span>
                <p className="font-mono text-2xl font-extrabold text-emerald-700">
                  PKR {Number(doctor.consultationFee).toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-500">
                  Managed by hospital administration. Applied automatically to all appointments booked with you.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
