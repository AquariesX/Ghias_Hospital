import Link from "next/link";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  backHref?: string;
  backLabel?: string;
}

export default function PageHeader({
  title,
  subtitle,
  actionLabel,
  actionHref,
  backHref,
  backLabel = "Back",
}: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 mb-2 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {backLabel}
          </Link>
        )}
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded hover:bg-teal-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
