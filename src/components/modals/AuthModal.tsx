import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  KeyRound,
  Eye,
  EyeOff,
  Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isBengali: boolean;
  defaultMode?: 'login' | 'register' | 'recovery';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  isBengali,
  defaultMode = 'login',
}) => {
  const { login, register, googleLogin, forgotPassword, resetPassword, getBootstrapStatus, bootstrapOwner, error, clearError } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'recovery' | 'reset-new' | '2fa' | 'bootstrap'>(defaultMode);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Form Fields
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [bootstrapSecret, setBootstrapSecret] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [generatedResetCode, setGeneratedResetCode] = useState<string | null>(null);
  const [twoFactorCodeInput, setTwoFactorCodeInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [bootstrapInfo, setBootstrapInfo] = useState<{ canBootstrap: boolean; hasOwner: boolean; secretConfigured: boolean } | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      getBootstrapStatus().then((info) => setBootstrapInfo(info));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuickFillCreator = () => {
    clearError();
    setEmailOrUsername('fahim@zangi.app');
    setPassword('Fahim@2026!');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    clearError();
    const res = await login(emailOrUsername, password);
    setSubmitting(false);
    if (res.requires2FA) {
      setMode('2fa');
      return;
    }
    if (res.success) {
      onClose();
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    clearError();
    const res = await login(emailOrUsername, password, twoFactorCodeInput);
    setSubmitting(false);
    if (res.success) {
      onClose();
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (password !== confirmPassword) {
      setFormError(isBengali ? 'পাসওয়ার্ড দুটি মেলেনি!' : 'Passwords do not match');
      return;
    }
    setSubmitting(true);
    clearError();
    const res = await register({
      email,
      username,
      displayName: displayName || username,
      password,
    });
    setSubmitting(false);
    if (res.success) {
      setSuccessNotice(
        isBengali
          ? `🎉 অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! যাচাইকরণ কোড: ${res.verificationCode || '123456'}`
          : `🎉 Account created successfully! Verification code: ${res.verificationCode || '123456'}`
      );
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  const handleGoogleSubmit = async () => {
    const googleEmail = email.trim();
    if (!googleEmail || !googleEmail.includes('@') || !googleEmail.includes('.')) {
      setFormError(
        isBengali
          ? 'অনুগ্রহ করে প্রথমে আপনার গুগল অ্যাকাউন্ট ইমেইল লিখুন।'
          : 'Please enter your Google account email address to continue.'
      );
      return;
    }
    setSubmitting(true);
    clearError();
    const googleName = googleEmail.split('@')[0].replace(/[._]/g, ' ');
    const res = await googleLogin({
      email: googleEmail,
      displayName: displayName.trim() || (googleName.charAt(0).toUpperCase() + googleName.slice(1)),
      avatarUrl: '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
    });
    setSubmitting(false);
    if (res.success) {
      onClose();
    } else {
      setFormError(res.error || (isBengali ? 'গুগল সাইন-ইন সম্পন্ন করা যায়নি।' : 'Google authentication could not be completed.'));
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    clearError();
    const res = await forgotPassword(email);
    setSubmitting(false);
    if (res.success) {
      setGeneratedResetCode(res.resetCode || '123456');
      setRecoveryCode(res.resetCode || '123456');
      setMode('reset-new');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    clearError();
    const res = await resetPassword(recoveryCode, newPassword);
    setSubmitting(false);
    if (res.success) {
      setSuccessNotice(
        isBengali
          ? 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে! এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।'
          : 'Password reset successfully! Please sign in with your new password.'
      );
      setTimeout(() => {
        setMode('login');
        setPassword(newPassword);
        setSuccessNotice(null);
      }, 1800);
    }
  };

  const handleBootstrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!bootstrapSecret.trim()) {
      setFormError(isBengali ? 'সার্ভার সেটআপ সিক্রেট (OWNER_BOOTSTRAP_SECRET) দিন।' : 'Server setup secret (OWNER_BOOTSTRAP_SECRET) is required.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError(isBengali ? 'পাসওয়ার্ড দুটি মেলেনি!' : 'Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setFormError(isBengali ? 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।' : 'Password must be at least 8 characters long.');
      return;
    }
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasSpecialOrDigit = /[\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    if (!hasUpper || !hasLower || !hasSpecialOrDigit) {
      setFormError(
        isBengali
          ? 'পাসওয়ার্ডে বড় হাতের অক্ষর, ছোট হাতের অক্ষর এবং অন্তত একটি সংখ্যা বা বিশেষ চিহ্ন থাকতে হবে।'
          : 'Password must include uppercase, lowercase, and at least one number or special character.'
      );
      return;
    }
    setSubmitting(true);
    clearError();
    const res = await bootstrapOwner({
      secret: bootstrapSecret.trim(),
      email: email.trim(),
      username: username.trim(),
      displayName: displayName.trim(),
      password,
    });
    setSubmitting(false);
    if (res.success) {
      setSuccessNotice(isBengali ? '🎉 অভিনন্দন! ওনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে এবং লগইন সম্পন্ন হয়েছে।' : '🎉 Success! Primary Owner account bootstrapped and authenticated.');
      getBootstrapStatus().then((info) => setBootstrapInfo(info));
      setTimeout(() => onClose(), 1500);
    } else {
      setFormError(res.error || (isBengali ? 'ওনার সেটআপ ব্যর্থ হয়েছে।' : 'Bootstrap failed'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-violet-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {mode === 'login' && (isBengali ? 'Zan-Gi অ্যাকাউন্টে লগইন' : 'Sign in to Zan-Gi')}
                {mode === 'register' && (isBengali ? 'নতুন অ্যাকাউন্ট খুলুন' : 'Create Zan-Gi Account')}
                {mode === 'recovery' && (isBengali ? 'পাসওয়ার্ড উদ্ধার' : 'Account Recovery')}
                {mode === 'reset-new' && (isBengali ? 'নতুন পাসওয়ার্ড নির্ধারণ' : 'Set New Password')}
                {mode === '2fa' && (isBengali ? 'দ্বি-স্তরীয় নিরাপত্তা যাচাই (2FA)' : 'Two-Factor Verification')}
                {mode === 'bootstrap' && (isBengali ? '👑 Create First Owner' : '👑 Create First Owner')}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {mode === 'bootstrap'
                  ? (isBengali ? 'সার্ভার সিক্রেট সহ ওনার অ্যাকাউন্ট সেটআপ' : 'Initialize primary owner account via server secret')
                  : (isBengali ? 'নিরাপদ এনক্রিপ্টেড সেশন' : 'Secure Encrypted Session')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Top Tabs (Sign in, Register, and Create First Owner) */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 px-4 pt-2 gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              clearError();
              setFormError(null);
              setMode('login');
            }}
            className={`py-2 px-3 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              mode === 'login' || mode === '2fa'
                ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>{isBengali ? 'লগইন' : 'Sign In'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              clearError();
              setFormError(null);
              setMode('register');
            }}
            className={`py-2 px-3 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              mode === 'register'
                ? 'border-blue-600 text-blue-600 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>{isBengali ? 'রেজিস্টার' : 'Register'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              clearError();
              setFormError(null);
              setMode('bootstrap');
            }}
            className={`py-2 px-3 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              mode === 'bootstrap'
                ? 'border-amber-600 text-amber-700 bg-white shadow-xs'
                : !bootstrapInfo?.hasOwner
                ? 'border-amber-400/80 text-amber-800 hover:text-amber-900 bg-amber-500/15'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>👑</span>
            <span>{isBengali ? 'Create First Owner' : 'Create First Owner'}</span>
            {bootstrapInfo?.hasOwner ? (
              <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-mono font-medium">
                {isBengali ? 'বন্ধ' : 'Locked'}
              </span>
            ) : (
              <span className="text-[9px] bg-amber-200 text-amber-950 px-1.5 py-0.2 rounded font-mono font-bold animate-pulse">
                {isBengali ? 'সক্রিয়' : 'Active'}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Success Banner */}
          {successNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-start gap-2 animate-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="font-medium text-xs leading-relaxed">{successNotice}</p>
            </div>
          )}

          {/* Error Banner */}
          {(error || formError) && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-2 animate-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="font-medium text-xs leading-relaxed">{error || formError}</p>
            </div>
          )}

          {/* Prominent "Create First Owner" Option in Login view when no owner exists */}
          {mode === 'login' && !bootstrapInfo?.hasOwner && (
            <div className="p-3.5 bg-gradient-to-r from-amber-50 via-amber-100/60 to-orange-50 border-2 border-amber-400/80 rounded-2xl flex items-center justify-between shadow-xs animate-in slide-in-from-top-1">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-amber-950 font-extrabold text-xs">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>{isBengali ? 'সিস্টেমে কোনো Owner নেই!' : 'No Platform Owner Exists!'}</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  {isBengali ? 'প্রথম ওনার অ্যাকাউন্ট তৈরি ও বুটস্ট্র্যাপ করতে ট্যাপ করুন' : 'Click to initialize the primary owner account'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setFormError(null);
                  setMode('bootstrap');
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1 shrink-0"
              >
                <span>👑</span>
                <span>{isBengali ? 'Create First Owner' : 'Create First Owner'}</span>
              </button>
            </div>
          )}

          {/* Status if Owner already established */}
          {mode === 'login' && bootstrapInfo?.hasOwner && (
            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{isBengali ? 'প্ল্যাটফর্ম ওনার ইতিমধ্যে সক্রিয়' : 'Platform Owner Established'}</span>
              </div>
              <span className="text-[10px] bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded-full font-mono font-bold">
                {isBengali ? 'বুটস্ট্র্যাপ বন্ধ' : 'Bootstrap Locked'}
              </span>
            </div>
          )}

          {/* Quick Demo Credentials Helper */}
          {mode === 'login' && (
            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                <span>{isBengali ? '⚡ টেস্ট অ্যাকাউন্ট' : '⚡ Quick Test Account'}</span>
                {!bootstrapInfo?.hasOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setFormError(null);
                      setMode('bootstrap');
                    }}
                    className="text-amber-700 hover:text-amber-900 font-extrabold text-[10px] flex items-center gap-1 underline"
                  >
                    👑 {isBengali ? 'Create First Owner' : 'Create First Owner'}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleQuickFillCreator}
                  className="flex-1 py-1.5 px-2 bg-white hover:bg-violet-50 border border-slate-200 hover:border-violet-300 rounded-xl font-bold text-slate-700 hover:text-violet-700 transition-all text-center text-[10px]"
                >
                  🎨 Creator (Fahim)
                </button>
              </div>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isBengali ? 'ইমেইল বা ইউজারনেম' : 'Email or Username'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    placeholder="fahim@zangi.app"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-semibold">
                    {isBengali ? 'পাসওয়ার্ড' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setMode('recovery');
                    }}
                    className="text-blue-600 hover:text-blue-800 font-medium text-[11px]"
                  >
                    {isBengali ? 'ভুলে গেছেন?' : 'Forgot?'}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
              >
                {submitting
                  ? (isBengali ? 'যাচাই করা হচ্ছে...' : 'Signing in...')
                  : (isBengali ? 'লগইন করুন' : 'Sign In')}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="relative my-3 flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2 text-[10px] text-slate-400 font-semibold uppercase absolute">
                  {isBengali ? 'অথবা' : 'or'}
                </span>
              </div>

              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleSubmit}
                disabled={submitting}
                className="w-full py-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-2xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isBengali ? 'গুগল দিয়ে সাইন ইন' : 'Continue with Google'}</span>
              </button>

              <div className="text-center pt-2">
                <span className="text-slate-500">
                  {isBengali ? 'অ্যাকাউন্ট নেই? ' : "Don't have an account? "}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    setMode('register');
                  }}
                  className="font-bold text-blue-600 hover:text-blue-800"
                >
                  {isBengali ? 'নতুন খুলুন' : 'Create one'}
                </button>
              </div>

              {!bootstrapInfo?.hasOwner && (
                <div className="pt-2 text-center border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setFormError(null);
                      setMode('bootstrap');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-[11px] transition-all shadow-xs"
                  >
                    <span>👑</span>
                    <span>{isBengali ? 'প্ল্যাটফর্ম ওনার সেটআপ করুন (Create First Owner)' : 'Initialize Platform (Create First Owner)'}</span>
                  </button>
                </div>
              )}
            </form>
          )}

          {/* TWO-FACTOR AUTHENTICATION CHALLENGE FORM */}
          {mode === '2fa' && (
            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl space-y-1">
                <p className="font-bold text-blue-900 text-xs">
                  {isBengali ? '🛡️ নিরাপত্তা কোড আবশ্যক' : '🛡️ Security Code Required'}
                </p>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  {isBengali
                    ? 'আপনার অ্যাকাউন্টে ২এফএ সক্রিয় রয়েছে। গুগল প্রমাণক অ্যাপের ৬-সংখ্যার কোড অথবা আপনার ৮-সংখ্যার রিকভারি কোড প্রবেশ করান।'
                    : 'Two-factor authentication is active on your account. Enter the 6-digit code from your authenticator app or an 8-character recovery backup code.'}
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isBengali ? 'ভেরিফিকেশন বা রিকভারি কোড' : 'Verification or Recovery Code'}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={twoFactorCodeInput}
                    onChange={(e) => setTwoFactorCodeInput(e.target.value)}
                    required
                    placeholder="123456 or ABCD-EFGH"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center font-mono tracking-widest text-sm font-bold text-slate-900 focus:outline-blue-500 focus:bg-white transition-all uppercase"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !twoFactorCodeInput.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
              >
                {submitting
                  ? (isBengali ? 'যাচাই করা হচ্ছে...' : 'Verifying...')
                  : (isBengali ? 'কোড যাচাই ও লগইন' : 'Verify & Sign In')}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    setMode('login');
                  }}
                  className="font-medium text-slate-500 hover:text-slate-800 text-[11px]"
                >
                  {isBengali ? '← লগইন ফর্মে ফিরে যান' : '← Back to Login'}
                </button>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isBengali ? 'পুরো নাম' : 'Full Name'}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Tanvir Hossain"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isBengali ? 'ইউজারনেম (@username)' : 'Username'}
                </label>
                <div className="relative">
                  <span className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 font-bold">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="tanvir_creative"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isBengali ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tanvir@example.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isBengali ? 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)' : 'Password (min 6 chars)'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isBengali ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
              >
                {submitting
                  ? (isBengali ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'Creating Account...')
                  : (isBengali ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account')}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-2">
                <span className="text-slate-500">
                  {isBengali ? 'আগে থেকেই অ্যাকাউন্ট আছে? ' : 'Already have an account? '}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    setMode('login');
                  }}
                  className="font-bold text-blue-600 hover:text-blue-800"
                >
                  {isBengali ? 'লগইন করুন' : 'Sign in'}
                </button>
              </div>
            </form>
          )}

          {/* RECOVERY (FORGOT PASSWORD) FORM */}
          {mode === 'recovery' && (
            <form onSubmit={handleRecoverySubmit} className="space-y-3">
              <p className="text-slate-600">
                {isBengali
                  ? 'আপনার অ্যাকাউন্টের ইমেইল ঠিকানা দিন। আমরা পাসওয়ার্ড রিসেট করার একটি কোড প্রদান করব।'
                  : 'Enter your registered email address to receive an account recovery code.'}
              </p>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isBengali ? 'রেজিস্টার্ড ইমেইল' : 'Registered Email'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@zangi.app"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5"
              >
                {submitting ? '...' : (isBengali ? 'কোড পাঠান' : 'Send Recovery Code')}
              </button>

              <button
                type="button"
                onClick={() => {
                  clearError();
                  setMode('login');
                }}
                className="w-full text-center text-slate-500 hover:text-slate-700 font-semibold"
              >
                {isBengali ? 'লগইনে ফিরে যান' : 'Back to Login'}
              </button>
            </form>
          )}

          {/* RESET PASSWORD FORM */}
          {mode === 'reset-new' && (
            <form onSubmit={handleResetSubmit} className="space-y-3">
              {generatedResetCode && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
                  <p className="font-semibold text-[11px]">
                    {isBengali ? 'যাচাইকরণ রিকভারি কোড:' : 'Your recovery reset code:'}{' '}
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-blue-300 font-bold">
                      {generatedResetCode}
                    </span>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isBengali ? 'রিকভারি কোড' : 'Recovery Code'}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isBengali ? 'নতুন পাসওয়ার্ড' : 'New Password'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 hover:opacity-95 transition-all"
              >
                {submitting
                  ? (isBengali ? 'সংরক্ষণ হচ্ছে...' : 'Saving...')
                  : (isBengali ? 'নতুন পাসওয়ার্ড সেট করুন' : 'Reset Password')}
              </button>
            </form>
          )}

          {/* FIRST-OWNER BOOTSTRAP FORM */}
          {mode === 'bootstrap' && (
            <div className="space-y-3">
              {bootstrapInfo?.hasOwner ? (
                /* Locked State: When an owner already exists */
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-3xl space-y-3 text-rose-900 animate-in fade-in">
                  <div className="flex items-center gap-2 font-black text-sm text-rose-800">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>{isBengali ? 'নতুন ওনার অ্যাকাউন্ট তৈরি বন্ধ' : 'New Owner Creation Disabled'}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-rose-700">
                    {isBengali
                      ? 'এই প্ল্যাটফর্মে ইতিমধ্যে একজন অনুমোদিত ওনার অ্যাকাউন্ট সক্রিয় রয়েছে। সিস্টেম নিরাপত্তা নীতি অনুযায়ী একাধিক ওনার বুটস্ট্র্যাপ করা স্থায়ীভাবে নিষিদ্ধ।'
                      : 'An Owner account is already established on this platform. Pursuant to platform security policies, creating another owner via bootstrap is permanently blocked.'}
                  </p>
                  <div className="p-3 bg-white/90 border border-rose-200 rounded-2xl text-[11px] text-slate-700 space-y-1">
                    <p className="font-bold text-slate-900">
                      {isBengali ? '🔑 ওনার ক্রেডেনশিয়াল রিকভারি:' : '🔑 Owner Credential Recovery:'}
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      {isBengali
                        ? 'বিদ্যমান ওনার পাসওয়ার্ড রিসেট করতে চাইলে সার্ভারের OWNER_RECOVERY_SECRET ব্যবহার করে অডিটেড রিকভারি প্রসেস সম্পন্ন করুন।'
                        : 'If you need to rotate or reset existing owner credentials, use the audited recovery process with OWNER_RECOVERY_SECRET configured in your server environment.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setFormError(null);
                      setMode('login');
                    }}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
                  >
                    {isBengali ? '← সাধারণ লগইন ফর্মে যান' : '← Return to Sign In'}
                  </button>
                </div>
              ) : (
                /* Active Bootstrap State: When no owner exists */
                <form onSubmit={handleBootstrapSubmit} className="space-y-3">
                  <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl text-[11px] text-amber-950 space-y-1">
                    <p className="font-extrabold flex items-center gap-1.5 text-amber-950">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      {isBengali ? 'এককালীন প্রথম ওনার অ্যাকাউন্ট সেটআপ' : 'One-Time Primary Owner Setup'}
                    </p>
                    <p className="leading-relaxed text-amber-900">
                      {isBengali
                        ? 'এটি শুধুমাত্র ফ্রেশ প্ল্যাটফর্মের প্রথম ওনার তৈরির জন্য। সার্ভারের environment-এ কনফিগার করা OWNER_BOOTSTRAP_SECRET এবং একটি শক্তিশালী পাসওয়ার্ড দিন।'
                        : 'Initialize the primary owner account for a fresh deployment. Requires OWNER_BOOTSTRAP_SECRET from server environment and a strong password.'}
                    </p>
                  </div>

                  {!bootstrapInfo?.secretConfigured && (
                    <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 space-y-1">
                      <p className="font-bold flex items-center gap-1 text-xs">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        {isBengali ? 'সার্ভারে OWNER_BOOTSTRAP_SECRET কনফিগার করা নেই!' : 'OWNER_BOOTSTRAP_SECRET Not Configured on Server!'}
                      </p>
                      <p className="text-[11px] leading-relaxed text-rose-800">
                        {isBengali
                          ? 'সার্ভারের .env ফাইলে OWNER_BOOTSTRAP_SECRET=YourSecret যোগ করে সার্ভার রিস্টার্ট করুন।'
                          : 'Please configure OWNER_BOOTSTRAP_SECRET in your server environment variables or .env file.'}
                      </p>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-700 font-semibold text-xs">
                        {isBengali ? 'সার্ভার সেটআপ সিক্রেট (OWNER_BOOTSTRAP_SECRET) *' : 'Server Setup Secret (OWNER_BOOTSTRAP_SECRET) *'}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setBootstrapSecret('your_super_secret_bootstrap_key_here_2026');
                          clearError();
                          setFormError(null);
                        }}
                        className="text-[10px] text-amber-700 hover:text-amber-900 font-bold bg-amber-100 hover:bg-amber-200/80 px-2 py-0.5 rounded-md transition-colors"
                      >
                        ⚡ {isBengali ? 'টেস্ট সিক্রেট অটো-ফিল' : 'Auto-fill Dev Secret'}
                      </button>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={bootstrapSecret}
                        onChange={(e) => setBootstrapSecret(e.target.value)}
                        placeholder="your_super_secret_bootstrap_key_here_2026"
                        className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:border-amber-500 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {isBengali
                        ? '💡 সার্ভারে .env ফাইলে OWNER_BOOTSTRAP_SECRET ভেরিয়েবলে এটি নিরাপদে রাখা থাকে।'
                        : '💡 Configured securely on the server in .env via OWNER_BOOTSTRAP_SECRET.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 text-xs">
                        {isBengali ? 'পুরো নাম' : 'Full Name'}
                      </label>
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Platform Owner"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1 text-xs">
                        {isBengali ? 'ইউজারনেম' : 'Username'}
                      </label>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="owner"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 text-xs">
                      {isBengali ? 'ওনার ইমেইল অ্যাড্রেস' : 'Owner Email Address'}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="owner@yourdomain.com"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 text-xs">
                      {isBengali ? 'শক্তিশালী পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর, বড় ও ছোট হাতের অক্ষর, সংখ্যা)' : 'Strong Password (min 8 chars, mixed case, numbers)'}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 text-xs">
                      {isBengali ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-extrabold rounded-xl shadow-md shadow-amber-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 text-xs"
                  >
                    {submitting
                      ? (isBengali ? 'ওনার অ্যাকাউন্ট তৈরি হচ্ছে...' : 'Creating Owner Account...')
                      : (isBengali ? '👑 Create First Owner (প্রথম ওনার তৈরি করুন)' : '👑 Create First Owner')}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        clearError();
                        setFormError(null);
                        setMode('login');
                      }}
                      className="font-medium text-slate-500 hover:text-slate-800 text-xs"
                    >
                      {isBengali ? '← সাধারণ লগইনে ফিরে যান' : '← Back to standard login'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Android Google Sign-In Architecture Notice */}
          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-start gap-1.5 leading-relaxed">
            <Globe className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
            <p>
              {isBengali
                ? 'অ্যান্ড্রয়েড APK প্রোডাকশন সেটআপ: Google Sign-In ক্লায়েন্ট আইডি, SHA-1 ফিঙ্গারপ্রিন্ট এবং com.zangi.app প্যাকেজ নাম প্লে কনসোলে কনফিগার করা আবশ্যক।'
                : 'Production Android APK: Google Sign-In requires SHA-1 certificate fingerprint and OAuth client ID bound to package com.zangi.app.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
