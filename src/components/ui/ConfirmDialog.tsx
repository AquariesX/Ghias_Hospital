"use client";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog Panel */}
      <div className="relative z-10 bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-2">
            {title}
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-lg">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded transition-colors disabled:opacity-50 ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-teal-700 hover:bg-teal-800"
            }`}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
