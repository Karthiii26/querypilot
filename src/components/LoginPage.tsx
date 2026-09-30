import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Lock,
  Mail,
  User,
  ArrowRight
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
      setForgotNotice('Please enter your email address above to receive reset instructions.');
    } else {
      setForgotNotice(`Password reset instructions have been sent to ${email}.`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans antialiased text-slate-900 relative overflow-hidden animate-fade-in">
      {/* Dynamic Light Background Glow Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        {/* Card Container */}
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xl rounded-3xl p-6 sm:p-8 text-slate-900 transition-all duration-300">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center space-y-3 mb-6">
            <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100/80 shadow-xs flex items-center justify-center transition-transform hover:scale-105 duration-300">
              <Logo className="w-10 h-10 shrink-0 drop-shadow-xs" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                QueryPilot
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {mode === 'login' ? 'Sign in to access your workspace' : 'Create a new account'}
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-xl mb-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setForgotNotice(null);
              }}
              className={`py-2 rounded-lg transition-all duration-200 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-indigo-600 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setForgotNotice(null);
              }}
              className={`py-2 rounded-lg transition-all duration-200 cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-indigo-600 shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Register
            </button>
          </div>

          {/* Error Notice */}
          {error && (
            <div
              role="alert"
              className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-start gap-2.5 animate-fade-slide-down"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span className="leading-snug font-medium">{error}</span>
            </div>
          )}

          {/* Forgot Password Notice */}
          {forgotNotice && (
            <div
              role="status"
              className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs flex items-start gap-2.5 animate-fade-slide-down"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span className="leading-snug font-medium">{forgotNotice}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate key={mode}>
            {mode === 'register' && (
              <div className="space-y-1.5 animate-fade-slide-down">
                <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all duration-200"
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all duration-200"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Primary Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:from-indigo-800 active:to-violet-800 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

