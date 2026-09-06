"use client";

import React from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

interface LayoutUser {
  id: string;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
}

interface PatientLayoutProps {
  user: LayoutUser;
  children: React.ReactNode;
}

/**
 * Renders the patient management views within the appropriate navigation layout
 * based on the logged in user's role (AdminLayout for ADMIN, DashboardLayout for clinicians & staff).
 */
export default function PatientLayout({ user, children }: PatientLayoutProps) {
  if (user.role === "ADMIN") {
    return <AdminLayout user={user}>{children}</AdminLayout>;
  }

  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}
