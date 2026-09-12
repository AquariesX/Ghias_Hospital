"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  X,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";

interface ExpenseItem {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  date: string;
  category: string;
  addedBy: string;
  addedByEmail?: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

const CATEGORIES = [
  { value: "SUPPLIES", label: "Medical Supplies & Consumables" },
  { value: "UTILITIES", label: "Utilities & Electricity/Fuel" },
  { value: "SALARIES", label: "Staff Salaries & Honorariums" },
  { value: "MAINTENANCE", label: "Building & Facility Maintenance" },
  { value: "PHARMACY", label: "Pharmacy & Medicines Stock" },
  { value: "EQUIPMENT", label: "Bio-Medical & IT Equipment" },
  { value: "OTHER", label: "Miscellaneous / Other" },
];

export default function ExpensesClient() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 15,
    totalRecords: 0,
    totalPages: 1,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [modalTitle, setModalTitle] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [modalDate, setModalDate] = useState(new Date().toISOString().split("T")[0]);
  const [modalCategory, setModalCategory] = useState("SUPPLIES");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchExpenses = async (pageNumber: number = 1) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams({
        page: String(pageNumber),
        pageSize: String(pagination.pageSize),
      });

      if (search.trim()) params.set("search", search.trim());
      if (category && category !== "ALL") params.set("category", category);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/admin/expenses?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load expenses");
      }

      const data = await res.json();
      setExpenses(data.expenses || []);
      setTotalAmount(data.totalExpenseAmount || 0);
      setPagination(data.pagination);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load hospital expenses");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses(1);
  }, [category]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExpenses(1);
  };

  const handleResetFilter = () => {
    setSearch("");
    setCategory("ALL");
    setDateFrom("");
    setDateTo("");
    setTimeout(() => fetchExpenses(1), 0);
  };

  const openCreateModal = () => {
    setEditingExpense(null);
    setModalTitle("");
    setModalDescription("");
    setModalAmount("");
    setModalDate(new Date().toISOString().split("T")[0]);
    setModalCategory("SUPPLIES");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: ExpenseItem) => {
    setEditingExpense(item);
    setModalTitle(item.title);
    setModalDescription(item.description || "");
    setModalAmount(String(item.amount));
    setModalDate(item.date);
    setModalCategory(item.category);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) {
      setFormError("Expense title is required");
      return;
    }
    const num = parseFloat(modalAmount);
    if (isNaN(num) || num <= 0) {
      setFormError("Enter a valid positive expense amount");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        title: modalTitle.trim(),
        description: modalDescription.trim() || undefined,
        amount: num,
        date: modalDate,
        category: modalCategory,
      };

      const url = editingExpense ? `/api/admin/expenses/${editingExpense.id}` : "/api/admin/expenses";
      const method = editingExpense ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save expense record");
      }

      setIsModalOpen(false);
      setSuccessMessage(editingExpense ? "Expense updated successfully" : "Expense recorded successfully");
      setTimeout(() => setSuccessMessage(null), 3500);
      fetchExpenses(pagination.page);
    } catch (err: any) {
      setFormError(err.message || "Failed to save expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense record? This action is logged.")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete expense");
      }
      setSuccessMessage("Expense deleted successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchExpenses(pagination.page);
    } catch (err: any) {
      alert(err.message || "Failed to delete expense");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-teal-700 uppercase tracking-wider">
            <Link href="/admin/billing" className="hover:underline">
              Accounts &amp; Billing
            </Link>
            <span>•</span>
            <span>Expenses</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Hospital Operational Expenses
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log and categorize hospital operational overheads, utilities, salaries, and medical supplies.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/billing"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Billing</span>
          </Link>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Total Filtered Expense Banner */}
      <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-teal-500/10 border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Operational Outflow
          </span>
          <div className="text-3xl font-black text-rose-700">
            PKR {totalAmount.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-600">
            Computed from {pagination.totalRecords} matching expense vouchers in PostgreSQL
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchExpenses(pagination.page)}
          disabled={isLoading}
          className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl shadow-xs transition cursor-pointer"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filter Bar */}
      <form
        onSubmit={handleApplyFilter}
        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span>Search &amp; Filter Expenses</span>
          </div>
          <button
            type="button"
            onClick={handleResetFilter}
            className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search Keyword */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Search Keyword</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Title, description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Apply Filter</span>
          </button>
        </div>
      </form>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-sm font-bold text-slate-900">
            Recorded Expense Vouchers
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {expenses.length} of {pagination.totalRecords} entries
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600" />
            <p className="text-xs font-semibold">Loading expenses...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Receipt className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No expenses found</p>
            <p className="text-xs text-slate-500">Click &quot;+ Record Expense&quot; above to log the first expense.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10.5px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Title &amp; Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Recorded By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/75 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {item.date}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.title}</div>
                      {item.description && (
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {item.description}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                        {item.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-black text-sm text-rose-700">
                        PKR {item.amount.toLocaleString()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {item.addedBy}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition cursor-pointer"
                          title="Edit Expense"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={() => handleDeleteExpense(item.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer disabled:opacity-50"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.totalRecords} items)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => fetchExpenses(pagination.page - 1)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 font-semibold cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => fetchExpenses(pagination.page + 1)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 font-semibold cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingExpense ? "Edit Expense Voucher" : "Record New Operational Expense"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Entries are stored in PostgreSQL and audited automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-semibold">
                  {formError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Expense Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Generator Diesel (100 Liters)"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-900"
                />
              </div>

              {/* Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-900"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Amount in PKR <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-slate-400">Rs.</span>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      placeholder="e.g. 25000"
                      value={modalAmount}
                      onChange={(e) => setModalAmount(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Expense Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-900"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Description / Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Additional details, invoice/bill number, vendor name..."
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg font-bold text-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingExpense ? "Update Expense" : "Save Expense"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
