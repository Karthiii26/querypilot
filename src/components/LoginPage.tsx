import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotNotice, setForgotNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Use localStorage so last-used email is device-local only (not shared across devices)
    const savedEmail = localStorage.getItem('querypilot_last_email');
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setForgotNotice(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, fullName);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };



  const handleForgotPassword = () => {
    setError(null);
    if (!email.trim()) {
      setForgotNotice('Enter your email address above to request password reset instructions.');
    } else {
      setForgotNotice(`Password reset instructions have been dispatched to ${email}. Check your inbox.`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans antialiased text-slate-900 animate-fade-in">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-2xl bg-white border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Optional Secondary Area: Desktop Left Column */}
        <div className="hidden lg:flex lg:col-span-5 bg-slate-50/70 border-r border-slate-200/80 p-8 flex-col justify-between animate-slide-in-left">
          <div className="space-y-6">
            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <Logo className="w-8 h-8 shrink-0 drop-shadow-xs" />
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                QueryPilot
              </span>
            </div>

            {/* Short Product Statement */}
            <div className="pt-4 space-y-2">
              <h2 className="text-lg font-semibold text-slate-900 leading-snug">
                Ask your database anything in plain English.
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Transform natural language into read-only analytical SQL queries with automatic self-correction and instant visualizations.
              </p>
            </div>

            {/* Subtle Product Highlights */}
            <ul className="space-y-3 pt-3 text-xs text-slate-600">
              <li className="flex items-center gap-2.5">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                <span>Connect to your database</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                <span>Ask questions in plain English</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                <span>Get answers backed by real data</span>
              </li>
            </ul>
          </div>

          {/* Database Info Pill */}
          <div className="pt-6 border-t border-slate-200/70">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">Supabase Cloud PostgreSQL</span>
            </div>
          </div>
        </div>

        {/* Right Column: Main Login Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center animate-slide-in-right">
          <div className="max-w-md w-full mx-auto space-y-6">
            {/* Header: Logo & Title */}
            <div className="space-y-2">
              {/* Mobile-only logo */}
              <div className="lg:hidden flex items-center gap-2.5 mb-4">
                <Logo className="w-8 h-8 shrink-0 drop-shadow-xs" />
                <span className="text-xl font-bold text-slate-900 tracking-tight">
                  QueryPilot
                </span>
              </div>

              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {mode === 'login' ? 'Welcome back' : 'Create an account'}
              </h1>
              <p className="text-xs text-slate-500">
                {mode === 'login'
                  ? 'Sign in to continue to QueryPilot'
                  : 'Get started with your database analytics workspace'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Info / Notice */}
            {forgotNotice && (
              <div
                role="status"
                className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5" />
                <span className="leading-snug">{forgotNotice}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="fullName"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Full name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-xs"
                  />
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-slate-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-xs"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full pl-3 pr-10 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Primary Submit Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                    </>
                  ) : (
                    <span>{mode === 'login' ? 'Sign in' : 'Create account'}</span>
                  )}
                </button>
              </div>
            </form>



            {/* Switch Mode: Don't have an account? Sign up */}
            <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
              {mode === 'login' ? (
                <span>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError(null);
                      setForgotNotice(null);
                    }}
                    className="font-medium text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                  >
                    Sign up
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                      setForgotNotice(null);
                    }}
                    className="font-medium text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                  >
                    Sign in
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
