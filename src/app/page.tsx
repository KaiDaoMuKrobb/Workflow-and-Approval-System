import Link from "next/link";
import { ArrowRight, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl bg-white p-10 rounded-2xl shadow-sm border border-slate-200">
        <div className="inline-flex items-center justify-center p-3 bg-blue-50 text-blue-600 rounded-xl mb-6">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-3">
          ExpenseFlow
        </h1>
        <p className="text-slate-600 mb-8 leading-relaxed">
          Corporate Expense Reimbursement & Approval Workflow System engineered with strict server-side authorization, verifiable audit logs, and automated business rule compliance.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <span>Sign In to Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm text-slate-900">BR-01 Enforcement</h3>
              <p className="text-xs text-slate-500 mt-0.5">Strict prohibition of reviewer self-approval.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm text-slate-900">Decimal Accuracy</h3>
              <p className="text-xs text-slate-500 mt-0.5">Exact monetary math via PostgreSQL Decimal(12,2).</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm text-slate-900">Immutable Audit</h3>
              <p className="text-xs text-slate-500 mt-0.5">Comprehensive audit trail on every review action.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

