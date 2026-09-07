import { UserRole } from "@prisma/client";

/**
 * Maps each hospital user role to its designated primary dashboard route.
 */
export function getDashboardPath(role: UserRole | string): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "DOCTOR":
      return "/doctor";
    case "NURSE":
    case "RECEPTIONIST":
    case "STAFF":
      return "/staff";
    default:
      return "/login";
  }
}

/**
 * Determines whether a user with the given role is authorized to access the specified route.
 * Enforces strict role boundaries:
 * - /admin is strictly for ADMIN
 * - /doctor is strictly for DOCTOR
 * - /staff is strictly for NURSE, RECEPTIONIST, and STAFF
 */
export function isAuthorizedForPath(role: UserRole | string, pathname: string): boolean {
  if (pathname.startsWith("/admin")) {
    return role === "ADMIN";
  }

  if (pathname.startsWith("/doctor")) {
    return role === "DOCTOR";
  }

  if (pathname.startsWith("/staff")) {
    return role === "NURSE" || role === "RECEPTIONIST" || role === "STAFF";
  }

  if (pathname.startsWith("/patients")) {
    return canViewPatients(role);
  }

  if (pathname.startsWith("/appointments")) {
    return canViewAppointments(role);
  }

  // General routes
  return true;
}

/**
 * Checks if a user role can manage (create/edit) patients
 */
export function canManagePatients(role: UserRole | string): boolean {
  return role === "ADMIN" || role === "RECEPTIONIST" || role === "STAFF";
}

/**
 * Checks if a user role can view patient directory and profiles
 */
export function canViewPatients(role: UserRole | string): boolean {
  return (
    role === "ADMIN" ||
    role === "RECEPTIONIST" ||
    role === "STAFF" ||
    role === "DOCTOR" ||
    role === "NURSE"
  );
}

/**
 * Checks if a user role can create, reschedule, or cancel appointments
 */
export function canManageAppointments(role: UserRole | string): boolean {
  return role === "ADMIN" || role === "RECEPTIONIST" || role === "STAFF";
}

/**
 * Checks if a user role can view appointments and queues
 */
export function canViewAppointments(role: UserRole | string): boolean {
  return (
    role === "ADMIN" ||
    role === "RECEPTIONIST" ||
    role === "STAFF" ||
    role === "DOCTOR" ||
    role === "NURSE"
  );
}

/**
 * Checks if a user role can manage doctor clinical queues
 */
export function canManageDoctorQueue(role: UserRole | string): boolean {
  return role === "ADMIN" || role === "DOCTOR";
}

/**
 * Human-readable role display names for the UI
 */
export function getRoleDisplayName(role: UserRole | string): string {
  switch (role) {
    case "ADMIN":
      return "Hospital Administrator";
    case "DOCTOR":
      return "Medical Doctor / Clinician";
    case "NURSE":
      return "Nursing Staff";
    case "RECEPTIONIST":
      return "Frontdesk Receptionist";
    case "STAFF":
      return "Hospital Staff";
    default:
      return role;
  }
}
