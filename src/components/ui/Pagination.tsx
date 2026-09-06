import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  basePath: string;
  searchParams?: Record<string, string>;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  basePath,
  searchParams = {},
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  function buildHref(page: number) {
    const params = new URLSearchParams({
      ...searchParams,
      page: String(page),
    });
    return `${basePath}?${params.toString()}`;
  }

  // Build page numbers to display
  const pages: (number | "...")[] = [];
  const delta = 2;
  let prev = 0;
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      if (prev && i - prev > 1) pages.push("...");
      pages.push(i);
      prev = i;
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200">
      <p className="text-xs text-slate-500">
        Showing <span className="font-medium text-slate-700">{start}–{end}</span>{" "}
        of <span className="font-medium text-slate-700">{totalItems}</span> results
      </p>

      <nav className="flex items-center gap-1">
        {currentPage > 1 ? (
          <Link
            href={buildHref(currentPage - 1)}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            Previous
          </Link>
        ) : (
          <span className="px-2.5 py-1.5 text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded cursor-not-allowed">
            Previous
          </span>
        )}

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-xs text-slate-400">
              ...
            </span>
          ) : (
            <Link
              key={p}
              href={buildHref(p as number)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded border transition-colors ${
                p === currentPage
                  ? "bg-teal-700 text-white border-teal-700"
                  : "text-slate-600 bg-white border-slate-300 hover:bg-slate-50"
              }`}
            >
              {p}
            </Link>
          )
        )}

        {currentPage < totalPages ? (
          <Link
            href={buildHref(currentPage + 1)}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors"
          >
            Next
          </Link>
        ) : (
          <span className="px-2.5 py-1.5 text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded cursor-not-allowed">
            Next
          </span>
        )}
      </nav>
    </div>
  );
}
