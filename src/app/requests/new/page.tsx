'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  Save,
  Send,
  Receipt,
} from 'lucide-react';

interface LineItem {
  id?: string;
  category: string;
  description: string;
  amount: string;
}

interface Reviewer {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

function NewRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { category: 'TRAVEL', description: '', amount: '' },
  ]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [selectedReviewerId, setSelectedReviewerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        // Fetch eligible reviewers
        const revRes = await fetch('/api/reviewers');
        if (revRes.ok) {
          const revData = await revRes.json();
          setReviewers(revData.data.reviewers);
          if (revData.data.reviewers.length > 0) {
            setSelectedReviewerId(revData.data.reviewers[0].id);
          }
        }

        // If editing existing draft
        if (editId) {
          const reqRes = await fetch(`/api/requests/${editId}`);
          if (reqRes.ok) {
            const reqData = await reqRes.json();
            const r = reqData.data.request;
            setTitle(r.title);
            setDescription(r.description || '');
            if (r.items && r.items.length > 0) {
              setItems(
                r.items.map((i: LineItem) => ({
                  category: i.category,
                  description: i.description,
                  amount: String(i.amount),
                }))
              );
            }
            if (r.assignedReviewerId) {
              setSelectedReviewerId(r.assignedReviewerId);
            }
          }
        }
      } catch (err) {
        setError('Failed to load form data');
      } finally {
        setFetching(false);
      }
    }
    init();
  }, [editId]);

  const addItem = () => {
    setItems([...items, { category: 'MEALS', description: '', amount: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      setError('A claim must have at least one line item.');
      return;
    }
    setError(null);
    setItems(items.filter((_, idx) => idx !== index));
  };

  const updateItem = (index: number, field: keyof LineItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const calculatePreviewTotal = () => {
    return items
      .reduce((sum, item) => {
        const val = parseFloat(item.amount) || 0;
        return sum + (val > 0 ? val : 0);
      }, 0)
      .toFixed(2);
  };

  const validateForm = () => {
    if (!title.trim()) {
      setError('Please provide a title for this expense claim.');
      return false;
    }
    if (items.length === 0) {
      setError('Please add at least one line item.');
      return false;
    }
    for (let i = 0; i < items.length; i++) {
      const amt = parseFloat(items[i].amount);
      if (isNaN(amt) || amt <= 0) {
        setError(`Line item #${i + 1} must have a positive amount greater than zero.`);
        return false;
      }
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setError(null);

    try {
      const payload = {
        title,
        description,
        items: items.map((i) => ({
          category: i.category,
          description: i.description,
          amount: parseFloat(i.amount),
        })),
      };

      const url = editId ? `/api/requests/${editId}` : '/api/requests';
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error?.message || 'Failed to save draft.');
        setLoading(false);
        return;
      }

      router.push('/requests');
    } catch {
      setError('A network error occurred while saving.');
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!selectedReviewerId) {
      setError('Please designate an authorized reviewer for submission.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. First save or update draft
      const payload = {
        title,
        description,
        items: items.map((i) => ({
          category: i.category,
          description: i.description,
          amount: parseFloat(i.amount),
        })),
      };

      const url = editId ? `/api/requests/${editId}` : '/api/requests';
      const method = editId ? 'PUT' : 'POST';

      const saveRes = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok || !saveData.success) {
        setError(saveData.error?.message || 'Failed to save claim before submission.');
        setLoading(false);
        return;
      }

      const targetId = editId || saveData.data.request.id;

      // 2. Submit request with designated reviewer
      const submitRes = await fetch(`/api/requests/${targetId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedReviewerId: selectedReviewerId }),
      });

      const submitData = await submitRes.json();
      if (!submitRes.ok || !submitData.success) {
        setError(submitData.error?.message || 'Failed to submit request for review.');
        setLoading(false);
        return;
      }

      router.push('/requests');
    } catch {
      setError('An error occurred during submission.');
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Back Link */}
        <Link
          href="/requests"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Claims
        </Link>

        {/* Card Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {editId ? 'Edit Expense Claim' : 'Create New Expense Claim'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Itemize out-of-pocket costs with exact category breakdown
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Content */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Claim Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Client Onsite Workshop Travel"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Description / Business Purpose
              </label>
              <textarea
                rows={2}
                placeholder="Explain the business reason for these expenses..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* Itemized Lines */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Itemized Expenses <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Line Item
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl flex flex-col sm:flex-row gap-3 items-start sm:items-center"
                  >
                    <div className="w-full sm:w-36">
                      <select
                        value={item.category}
                        onChange={(e) => updateItem(index, 'category', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="TRAVEL">TRAVEL</option>
                        <option value="MEALS">MEALS</option>
                        <option value="SUPPLIES">SUPPLIES</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </div>

                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        placeholder="Description (e.g. Train Ticket)"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="w-full sm:w-36 flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">฿</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={item.amount}
                        onChange={(e) => updateItem(index, 'amount', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition"
                        title="Delete item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Summary */}
              <div className="mt-4 flex justify-between items-center px-4 py-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <span className="text-xs font-bold text-slate-700 uppercase">Authoritative Sum Preview</span>
                <span className="text-base font-bold text-blue-900">฿{calculatePreviewTotal()}</span>
              </div>
            </div>

            {/* Reviewer Designation */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Designate Approver / Manager <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedReviewerId}
                onChange={(e) => setSelectedReviewerId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                {reviewers.map((rev) => (
                  <option key={rev.id} value={rev.id}>
                    {rev.name} ({rev.role} — {rev.department}) — {rev.email}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">
                Designated reviewer will inspect this request once submitted.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Save Draft
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Submit Claim for Review
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <NewRequestForm />
    </Suspense>
  );
}
