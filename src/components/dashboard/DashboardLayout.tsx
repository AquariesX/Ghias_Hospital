"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getRoleDisplayName } from "@/lib/rbac";

interface DashboardUser {
  id: string;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
}

interface DashboardLayoutProps {
  user: DashboardUser;
  children: React.ReactNode;
}

export default function DashboardLayout({ user, children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (res.ok) {
        router.push("/login");
        router.refresh();
      } else {
        console.error("Logout request failed");
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "DOCTOR":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "NURSE":
      case "RECEPTIONIST":
      case "STAFF":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-100 font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-r border-slate-800">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="w-8 h-8 rounded bg-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            +
          </div>
          <div>
            <span className="font-bold text-white tracking-wide text-sm block">
              GIAS HOSPITAL
            </span>
            <span className="text-[10px] uppercase tracking-wider text-teal-400 font-medium block">
              Management System
            </span>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto">
          {/* Main Navigation */}
          <div>
            <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Main Menu
            </div>
            <ul className="space-y-1">
              <li>
                <Link
                  href={user.role === "DOCTOR" ? "/doctor" : "/staff"}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname === "/doctor" || pathname === "/staff"
                      ? "bg-teal-700 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/appointments"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname === "/appointments"
                      ? "bg-teal-700 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Appointments (OPD)
                </Link>
              </li>
              {(user.role === "RECEPTIONIST" || user.role === "STAFF" || user.role === "ADMIN") && (
                <li>
                  <Link
                    href="/appointments/new"
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      pathname === "/appointments/new"
                        ? "bg-teal-700 text-white shadow-sm"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Book Appointment
                  </Link>
                </li>
              )}
              {(user.role === "RECEPTIONIST" || user.role === "STAFF" || user.role === "ADMIN") && (
                <li>
                  <Link
                    href="/patients/new"
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      pathname === "/patients/new"
                        ? "bg-teal-700 text-white shadow-sm"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Admit Patient
                  </Link>
                </li>
              )}
              {(user.role === "DOCTOR" || user.role === "ADMIN") && (
                <li>
                  <Link
                    href="/doctor/queue"
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      pathname === "/doctor/queue"
                        ? "bg-teal-700 text-white shadow-sm"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Doctor Queue
                  </Link>
                </li>
              )}
              <li>
                <Link
                  href="/patients"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname === "/patients" || (pathname.startsWith("/patients") && pathname !== "/patients/new")
                      ? "bg-teal-700 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Patients Directory
                </Link>
              </li>
            </ul>
          </div>

          {/* Hospital Modules */}
          <div>
            <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
              <span>Upcoming Modules</span>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                Later Phases
              </span>
            </div>
            <ul className="space-y-1 text-slate-400 text-sm">
              {[
                { name: "Emergency & Triage", phase: "Phase 5" },
                { name: "Medication & MAR", phase: "Phase 5" },
                { name: "Pharmacy & Labs", phase: "Phase 6" },
                { name: "Billing & Reports", phase: "Phase 7" },
              ].map((item) => (
                <li key={item.name}>
                  <div className="flex items-center justify-between px-3 py-1.5 rounded text-xs text-slate-400 cursor-not-allowed opacity-60">
                    <span>{item.name}</span>
                    <span className="text-[10px] text-slate-400">{item.phase}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* System Settings */}
          <div>
            <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              System
            </div>
            <ul className="space-y-1">
              <li>
                <button
                  type="button"
                  disabled
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs text-slate-400 rounded cursor-not-allowed opacity-60"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Settings (Phase 5)
                </button>
              </li>
            </ul>
          </div>
        </nav>

        {/* Sidebar Footer / User Profile & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-xs font-semibold text-white truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-slate-800">
              GIAS Hospital Management System
            </h1>
            <span className="hidden sm:inline-block text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium border border-slate-200">
              Phase 1 Active
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-900">
                Welcome, {user.firstName} {user.lastName}
              </p>
              <p className="text-[11px] text-slate-500">
                Role: <span className="font-medium text-slate-700">{user.role}</span>
              </p>
            </div>

            <span
              className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${getRoleBadgeColor(
                user.role
              )}`}
            >
              {getRoleDisplayName(user.role)}
            </span>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-xs font-medium text-slate-600 hover:text-rose-700 bg-slate-50 hover:bg-rose-50 border border-slate-200 px-3 py-1.5 rounded transition-colors"
            >
              {isLoggingOut ? "Signing out..." : "Logout"}
            </button>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
