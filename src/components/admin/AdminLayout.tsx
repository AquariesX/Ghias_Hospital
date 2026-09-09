"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface AdminUser {
  id: string;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
}

interface AdminLayoutProps {
  user: AdminUser;
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function HomeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function DoctorIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function StaffIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function DeptIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function AuditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function PatientIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function AppointmentIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function BedIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: <HomeIcon /> },
    ],
  },
  {
    label: "Hospital Management",
    items: [
      { label: "Appointments (OPD)", href: "/appointments", icon: <AppointmentIcon /> },
      { label: "Admit Patient", href: "/admissions", icon: <BedIcon /> },
      { label: "Discharge Form", href: "/reception/discharge", icon: <BedIcon /> },
      { label: "Inpatients & Ward", href: "/doctor/inpatients", icon: <BedIcon /> },
      { label: "Patients", href: "/patients", icon: <PatientIcon /> },
      { label: "Doctors", href: "/admin/doctors", icon: <DoctorIcon /> },
      { label: "Staff", href: "/admin/staff", icon: <StaffIcon /> },
      { label: "Departments", href: "/admin/departments", icon: <DeptIcon /> },
    ],
  },
  {
    label: "System Management",
    items: [
      { label: "Users", href: "/admin/users", icon: <UsersIcon /> },
      { label: "Reports & Analytics", href: "/admin/reports", icon: <ReportIcon /> },
      { label: "Audit Logs", href: "/admin/audit-logs", icon: <AuditIcon /> },
    ],
  },
];

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
        isActive
          ? "bg-teal-700 text-white font-medium"
          : "text-slate-300 hover:bg-slate-800 hover:text-white font-normal"
      }`}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

function Sidebar({
  user,
  pathname,
  onLogout,
  isLoggingOut,
}: {
  user: AdminUser;
  pathname: string;
  onLogout: () => void;
  isLoggingOut: boolean;
}) {
  function isActive(href: string): boolean {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 text-slate-200">
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800 gap-3 flex-shrink-0">
        <div className="w-8 h-8 rounded bg-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
          +
        </div>
        <div className="min-w-0">
          <span className="font-bold text-white tracking-wide text-sm block truncate">GHIAS HOSPITAL</span>
          <span className="text-[10px] uppercase tracking-wider text-teal-400 font-medium block">
            Admin Panel
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} isActive={isActive(item.href)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-slate-800 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 bg-purple-900/50 text-purple-300 rounded border border-purple-700/40">
              Admin
            </span>
          </div>
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            title="Sign Out"
            className="p-2 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ user, children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      } else {
        setIsLoggingOut(false);
      }
    } catch {
      setIsLoggingOut(false);
    }
  };

  // Get current page title
  function getPageTitle(): string {
    if (pathname === "/admin") return "Dashboard";
    if (pathname.startsWith("/admin/doctors/new")) return "Add Doctor";
    if (pathname.startsWith("/admin/doctors") && pathname.includes("/edit")) return "Edit Doctor";
    if (pathname.startsWith("/admin/doctors") && pathname.split("/").length > 3) return "Doctor Details";
    if (pathname.startsWith("/admin/doctors")) return "Doctors";
    if (pathname.startsWith("/admin/staff/new")) return "Add Staff";
    if (pathname.startsWith("/admin/staff") && pathname.includes("/edit")) return "Edit Staff";
    if (pathname.startsWith("/admin/staff") && pathname.split("/").length > 3) return "Staff Details";
    if (pathname.startsWith("/admin/staff")) return "Staff";
    if (pathname.startsWith("/admin/departments/new")) return "Add Department";
    if (pathname.startsWith("/admin/departments") && pathname.includes("/edit")) return "Edit Department";
    if (pathname.startsWith("/admin/departments")) return "Departments";
    if (pathname.startsWith("/admin/users")) return "Users";
    if (pathname.startsWith("/admin/audit-logs")) return "Audit Logs";
    return "Admin";
  }

  return (
    <div className="min-h-screen flex font-inter bg-slate-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop: fixed left, mobile: sliding drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 md:relative md:translate-x-0 md:flex-shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          user={user}
          pathname={pathname}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-1.5 rounded text-slate-500 hover:bg-slate-100 transition-colors"
            >
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>

            <div>
              <h2 className="text-sm font-semibold text-slate-800">{getPageTitle()}</h2>
              <p className="text-[10px] text-slate-400 hidden sm:block">GHIAS Hospital Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-slate-900">{user.firstName} {user.lastName}</p>
              <p className="text-[10px] text-slate-500">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-xs font-medium text-slate-600 hover:text-rose-700 bg-slate-50 hover:bg-rose-50 border border-slate-200 px-3 py-1.5 rounded transition-colors"
            >
              {isLoggingOut ? "Signing out..." : "Logout"}
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
