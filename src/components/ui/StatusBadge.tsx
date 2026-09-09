interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

const statusConfig: Record<string, { label: string; className: string }> = {
  // User / Doctor / Staff status
  ACTIVE: {
    label: "Active",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  INACTIVE: {
    label: "Inactive",
    className: "bg-slate-100 text-slate-600 border-slate-300",
  },
  SUSPENDED: {
    label: "Suspended",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  ON_LEAVE: {
    label: "On Leave",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  SHIFT_OFF: {
    label: "Shift Off",
    className: "bg-slate-100 text-slate-500 border-slate-200",
  },
  // Doctor availability
  AVAILABLE: {
    label: "Available",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  BUSY: {
    label: "Busy",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  OFFLINE: {
    label: "Offline",
    className: "bg-slate-100 text-slate-500 border-slate-200",
  },
  // Admission & Inpatient Statuses
  ADMITTED: {
    label: "Admitted",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  UNDER_TREATMENT: {
    label: "Under Treatment",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  DISCHARGE_PENDING: {
    label: "Discharge Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  DISCHARGED: {
    label: "Discharged",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-500 border-slate-300",
  },
  TRANSFERRED: {
    label: "Transferred",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  REFERRED: {
    label: "Referred",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold",
  },
  DECEASED: {
    label: "Deceased (Death)",
    className: "bg-slate-900 text-white border-slate-950 font-bold",
  },
  EXPIRED: {
    label: "Expired (Death)",
    className: "bg-slate-900 text-white border-slate-950 font-bold",
  },
  DEATH: {
    label: "Death",
    className: "bg-slate-900 text-white border-slate-950 font-bold",
  },
};

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-slate-100 text-slate-600 border-slate-300",
  };

  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center font-medium rounded border ${sizeClass} ${config.className}`}
    >
      {config.label}
    </span>
  );
}
