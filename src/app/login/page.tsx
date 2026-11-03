'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('alice.req@test.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error?.message || 'Failed to login');
        setLoading(false);
        return;
      }

      // Navigate based on role
      if (data.data.user.role === 'REVIEWER') {
        router.push('/reviewer/dashboard');
      } else {
        router.push('/requests');
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Sign in to ExpenseFlow</h1>
          <p className="text-sm text-slate-500 mt-1">Enterprise Expense Reimbursement Portal</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Corporate Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="name@test.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Quick Fill Demo Accounts (Password: Password123!)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setEmail('alice.req@test.com');
                setPassword('Password123!');
              }}
              className="p-2 text-left bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-slate-700"
            >
              <div className="font-medium">Alice (Requester)</div>
              <div className="text-slate-400">Engineering</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('carol.rev@test.com');
                setPassword('Password123!');
              }}
              className="p-2 text-left bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-slate-700"
            >
              <div className="font-medium">Carol (Reviewer)</div>
              <div className="text-slate-400">Engineering</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('david.both@test.com');
                setPassword('Password123!');
              }}
              className="p-2 text-left bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-slate-700"
            >
              <div className="font-medium">David (Dual Role)</div>
              <div className="text-slate-400">BR-01 Test</div>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('bob.req@test.com');
                setPassword('Password123!');
              }}
              className="p-2 text-left bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-slate-700"
            >
              <div className="font-medium">Bob (Requester)</div>
              <div className="text-slate-400">Marketing</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

