import React, { useState, useEffect } from 'react';
import { db, isSupabaseConfigured, supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';
import { 
  Sprout, 
  Lock, 
  Mail, 
  User, 
  Building2, 
  MapPin, 
  Phone, 
  ArrowRight, 
  Globe, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  UploadCloud,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  Truck,
  ShoppingBag,
  Store,
  Sparkles
} from 'lucide-react';
import afketLogo from '../assets/images/afket_logo_1782851553801.jpg';

const resizeImage = (base64Str: string, maxWidth = 300, maxHeight = 300): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
    img.src = base64Str;
  });
};

interface AuthProps {
  onAuthSuccess: (user: UserProfile) => void;
  initialError?: string;
}

export default function Auth({ onAuthSuccess, initialError }: AuthProps) {
  const [isLogin, setIsLogin] = useState(false); // Default to Create Account if arriving here or toggleable
  const [role, setRole] = useState<UserRole>('buyer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [countryCode, setCountryCode] = useState('+265');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [location, setLocation] = useState('');
  const [nationality, setNationality] = useState('Malawi');
  const [error, setError] = useState(initialError || '');
  const [loading, setLoading] = useState(false);
  const [registrationPending, setRegistrationPending] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<UserProfile | null>(null);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [logoUrl, setLogoUrl] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    setError('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        try {
          const resized = await resizeImage(base64, 300, 300);
          setLogoUrl(resized);
        } catch (err: any) {
          console.error("Logo resizing failed", err);
          setError("Failed to process the logo image.");
        } finally {
          setIsUploadingLogo(false);
        }
      }
    };
    reader.onerror = () => {
      setError("Failed to read the selected file.");
      setIsUploadingLogo(false);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email) {
      setError('Please fill in your email address.');
      setLoading(false);
      return;
    }

    if (!password) {
      setError('Please fill in your password.');
      setLoading(false);
      return;
    }

    if (!isLogin && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const user = await db.auth.signIn(email, password);
        onAuthSuccess(user);
      } else {
        if (!firstName.trim() || !surname.trim() || !location.trim()) {
          setError('First Name, Surname, and Operational Location are required.');
          setLoading(false);
          return;
        }
        const fullPhone = phoneNumber.trim() ? `${countryCode} ${phoneNumber.trim()}` : '';
        const result = await db.auth.signUp(
          email,
          password,
          firstName,
          surname,
          role,
          businessName,
          fullPhone,
          location,
          nationality,
          logoUrl
        );
        
        if (result.user) {
          onAuthSuccess(result.user);
        }
      }
    } catch (err: any) {
      const errMsg = err.message || 'An error occurred. Please try again.';
      if (errMsg.toLowerCase().includes('duplicate key') || 
          errMsg.toLowerCase().includes('already registered') || 
          errMsg.toLowerCase().includes('already exists') || 
          errMsg.toLowerCase().includes('unique constraint') ||
          errMsg.toLowerCase().includes('profiles_pkey') ||
          errMsg.toLowerCase().includes('profiles_email_key')) {
        setError('An account with this email address already exists. Please sign in instead.');
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || resendStatus === 'sending') return;
    
    setResendStatus('sending');
    setError('');
    
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: email.trim(),
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (resendError) throw new Error(resendError.message);
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      setResendStatus('sent');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend confirmation email.');
      setResendStatus('idle');
    }
  };

  const handleSimulateConfirmation = () => {
    setError('');
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        setError('You are connected to a database environment. Please check your real email client to activate your account.');
      } else {
        const userToLog = registeredUser;
        if (userToLog) {
          localStorage.setItem('afket_session', userToLog.id);
          onAuthSuccess(userToLog);
        } else {
          setError('User profile context was not found. Please try registering again.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Verification simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FAF9F6] font-sans">
      {/* Banner / Left Side */}
      <div className="md:w-5/12 bg-[#1F2937] text-white p-8 md:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Abstract background decorative overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#365314]/50 via-[#1F2937] to-[#111827] z-0"></div>
        
        {/* Artistic overlay dots/grid */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] z-0"></div>

        <div className="relative z-10 text-left">
          <div className="flex items-center space-x-3 mb-12">
            <img 
              src={afketLogo} 
              alt="AFKET Logo" 
              className="h-14 w-14 rounded-full border border-amber-500/20 shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <div>
              <span className="font-sans font-black text-3xl tracking-tight text-white">AF<span className="text-[#D97706]">KET</span></span>
              <span className="block text-[10px] font-mono tracking-widest text-[#D97706] font-bold uppercase leading-none mt-1">African Market Network</span>
            </div>
          </div>

          <h2 className="text-4xl md:text-5xl font-sans font-black tracking-tight leading-tight mb-6">
            Connecting African Farms with Global Demand
          </h2>
          <p className="text-gray-300 text-base font-medium leading-relaxed max-w-md">
            AFKET brings buyers, sellers, and logistics companies under a single, secure trading network to buy, sell, and transport high-yield African crops.
          </p>
        </div>

        <div className="relative z-10 pt-12 border-t border-white/10 mt-12 text-left">
          <span className="text-[#D97706] font-mono text-[10px] uppercase tracking-wider block mb-4 font-bold">🌍 Network Integrity Pillars</span>
          <div className="space-y-4 font-medium">
            <div className="flex items-start space-x-3 text-sm text-gray-300">
              <span className="text-[#D97706] font-bold text-base">•</span>
              <div>
                <strong className="text-white block text-xs uppercase tracking-tight">Direct Farm Sourcing</strong>
                <span className="text-xs text-gray-400">Standardized moisture and Out-Turn specifications for transparent, high-yield grain and cash-crop trades.</span>
              </div>
            </div>
            <div className="flex items-start space-x-3 text-sm text-gray-300">
              <span className="text-[#D97706] font-bold text-base">•</span>
              <div>
                <strong className="text-white block text-xs uppercase tracking-tight">Frictionless Logistics Quotes</strong>
                <span className="text-xs text-gray-400">Instant transit routing coordinates local cargo carriers to transport grains across regional borders.</span>
              </div>
            </div>
            <div className="flex items-start space-x-3 text-sm text-gray-300">
              <span className="text-[#D97706] font-bold text-base">•</span>
              <div>
                <strong className="text-white block text-xs uppercase tracking-tight">Real-Time State Tracking</strong>
                <span className="text-xs text-gray-400">PostgreSQL triggers immediately notify traders on delivery checkpoints and stock updates.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="md:w-7/12 flex items-center justify-center p-6 sm:p-12 md:p-16">
        <div className="w-full max-w-md">
          {/* DB Status Badge Removed */}

          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xs">
            {registrationPending ? (
              <div className="py-2 text-left">
                {/* Visual Header */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="h-14 w-14 bg-amber-50 rounded-2xl flex items-center justify-center text-[#D97706] border border-amber-100 shadow-xs shrink-0 animate-bounce">
                    <Mail className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="text-2.5xl font-sans font-black tracking-tight text-[#1F2937] leading-none mb-1.5">
                      Verify Your Email
                    </h1>
                    <span className="text-xs font-mono bg-amber-100 text-[#92400E] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Activation Pending
                    </span>
                  </div>
                </div>

                <p className="text-gray-600 font-medium text-sm leading-relaxed mb-6">
                  We have dispatched a secure registration confirmation link to your inbox at <strong className="text-gray-900 font-bold">{email}</strong>. Please confirm your address to activate your trade dashboard.
                </p>

                {error && (
                  <div className="bg-[#FEF2F2] border border-[#FEE2E2] text-red-800 text-xs rounded-xl p-3.5 mb-4 font-semibold">
                    {error}
                  </div>
                )}

                {/* Structured Activation Instructions */}
                <div className="bg-[#FAF9F6] border border-gray-100 rounded-2xl p-5 space-y-4 mb-6">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">How to complete your activation:</h3>
                  
                  <div className="flex items-start space-x-3.5">
                    <span className="h-6 w-6 rounded-full bg-amber-100 border border-amber-200 text-[#92400E] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="space-y-0.5">
                      <strong className="text-gray-800 text-sm block">Check Your Inbox</strong>
                      <span className="text-xs text-gray-500 font-medium block">Look for a message titled "Activate your AFKET agricultural trading account" from security@afket.com.</span>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3.5">
                    <span className="h-6 w-6 rounded-full bg-amber-100 border border-amber-200 text-[#92400E] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="space-y-0.5">
                      <strong className="text-gray-800 text-sm block">Click Activation Link</strong>
                      <span className="text-xs text-gray-500 font-medium block">Click on the "Activate Account" button inside to authorize your network profile.</span>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3.5">
                    <span className="h-6 w-6 rounded-full bg-amber-100 border border-amber-200 text-[#92400E] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="space-y-0.5">
                      <strong className="text-gray-800 text-sm block">Auto-Launch Dashboard</strong>
                      <span className="text-xs text-gray-500 font-medium block">This window will automatically detect your email verification and launch your dashboard immediately.</span>
                    </div>
                  </div>
                </div>

                {/* Email Client Quicklinks */}
                <div className="mb-6">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2.5">Quick-Access Client Shortcuts</span>
                  <div className="grid grid-cols-3 gap-2">
                    <a
                      id="link-gmail"
                      href="https://mail.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-center text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-2xs"
                    >
                      <span>Gmail</span>
                      <ExternalLink className="h-3 w-3 text-gray-400" />
                    </a>
                    <a
                      id="link-outlook"
                      href="https://outlook.live.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-center text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-2xs"
                    >
                      <span>Outlook</span>
                      <ExternalLink className="h-3 w-3 text-gray-400" />
                    </a>
                    <a
                      id="link-yahoomail"
                      href="https://mail.yahoo.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-center text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-2xs"
                    >
                      <span>Yahoo!</span>
                      <ExternalLink className="h-3 w-3 text-gray-400" />
                    </a>
                  </div>
                </div>

                {/* Interactive Sandbox/Simulated Mailbox Drawer */}
                <div className="mt-8 border border-amber-200/70 rounded-2xl bg-amber-50/15 overflow-hidden shadow-xs">
                  <div className="bg-[#FFFBEB] px-4 py-2.5 border-b border-amber-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-xs font-mono font-bold text-amber-800 uppercase tracking-wider">AFKET Sandbox Mailbox</span>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md font-mono uppercase">Simulation Engine</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-[#D97706] font-extrabold text-xs shrink-0">
                        AF
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-800 block truncate">AFKET Accounts Office</span>
                          <span className="text-[10px] font-mono text-gray-400">Just now</span>
                        </div>
                        <span className="text-[10px] text-gray-400 block truncate">To: {email}</span>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl p-4 border border-gray-100 text-[11px] text-gray-600 space-y-2.5 font-medium shadow-2xs">
                      <p className="font-extrabold text-gray-800 text-xs">Subject: Verify your email to activate your AFKET agricultural trading account</p>
                      <div className="border-t border-gray-100 my-1.5 pt-1.5"></div>
                      <p>Hello <span className="font-bold text-gray-800">{firstName || 'Trader'}</span>,</p>
                      <p>
                        Thank you for registering on the <strong>AFKET Network</strong>! We are excited to connect you with agricultural buyers, sellers, and logistics providers across Africa.
                      </p>
                      <p className="py-2.5 text-center">
                        <button
                          id="btn-simulate-confirm"
                          onClick={handleSimulateConfirmation}
                          className="inline-flex items-center justify-center bg-[#D97706] hover:bg-[#b45309] text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-all cursor-pointer text-[11px]"
                        >
                          <span>Activate Account & Launch Dashboard</span>
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </button>
                      </p>
                      <div className="border-t border-gray-100 my-1.5 pt-1.5"></div>
                      <p className="text-[9px] text-gray-400 leading-tight">
                        {isSupabaseConfigured 
                          ? "Note: Since database validation is active, you should open your real email client to activate. This button can be used for local/offline mock testing in sandboxed mode."
                          : "Simulation Mode Active. Clicking the activation button above will securely simulate the verified login immediately."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions / Resend and Go Back */}
                <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      id="btn-resend-verification"
                      onClick={handleResendEmail}
                      disabled={resendCooldown > 0 || resendStatus === 'sending'}
                      className={`inline-flex items-center justify-center px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        resendCooldown > 0 || resendStatus === 'sending'
                          ? 'bg-gray-100 text-gray-400 border border-gray-200'
                          : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-2xs'
                      }`}
                    >
                      {resendStatus === 'sending' ? (
                        <>
                          <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin text-gray-400" />
                          <span>Sending email...</span>
                        </>
                      ) : resendStatus === 'sent' && resendCooldown > 0 ? (
                        <>
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                          <span>Resent! Cooldown: {resendCooldown}s</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-1.5 h-3.5 w-3.5 text-gray-400" />
                          <span>Resend Activation Email</span>
                        </>
                      )}
                    </button>

                    <button
                      id="btn-back-to-login"
                      onClick={() => {
                        setRegistrationPending(false);
                        setIsLogin(true);
                        setError('');
                      }}
                      className="text-xs text-gray-500 hover:text-gray-800 font-bold transition cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Auth Mode Tabs */}
                <div className="flex border-b border-gray-100 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false);
                      setError('');
                    }}
                    className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition cursor-pointer ${
                      !isLogin
                        ? 'border-[#D97706] text-[#D97706]'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Create Account
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setError('');
                    }}
                    className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition cursor-pointer ${
                      isLogin
                        ? 'border-[#D97706] text-[#D97706]'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Sign In
                  </button>
                </div>

                <div className="text-left mb-6">
                  <h1 className="text-2xl sm:text-3xl font-sans font-black tracking-tight text-[#1F2937] mb-1.5">
                    {isLogin ? 'Welcome Back to AFKET' : 'Create Trade Account'}
                  </h1>
                  <p className="text-gray-500 font-medium text-xs sm:text-sm">
                    {isLogin 
                      ? 'Sign in to access your agricultural trades, order listings, and shipping logs.' 
                      : 'Join Africa\'s largest agricultural market network for direct crop sourcing and logistics.'}
                  </p>
                </div>

                {error && (
                  <div className="bg-[#FEF2F2] border border-[#FEE2E2] text-red-800 text-xs rounded-xl p-3.5 mb-5 font-semibold text-left flex items-start space-x-2">
                    <span className="text-red-500 font-bold shrink-0 mt-0.5">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <>
                      {/* Step 1: Select Role (First Step for Registration) */}
                      <div className="text-left space-y-2">
                        <label className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                          Select Your Trade Role <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {/* Buyer Card */}
                          <button
                            id="role-buyer"
                            type="button"
                            onClick={() => setRole('buyer')}
                            className={`p-3 rounded-2xl border text-left transition cursor-pointer relative flex flex-col justify-between ${
                              role === 'buyer'
                                ? 'border-[#D97706] bg-[#FFFBEB] ring-2 ring-[#D97706]/20'
                                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xl">🛒</span>
                                {role === 'buyer' && (
                                  <span className="h-4 w-4 rounded-full bg-[#D97706] text-white flex items-center justify-center text-[10px]">
                                    ✓
                                  </span>
                                )}
                              </div>
                              <span className="block font-bold text-xs text-gray-900">Buyer</span>
                              <span className="text-[10px] text-gray-500 block leading-tight mt-0.5">
                                Sourcing & Procurement
                              </span>
                            </div>
                          </button>

                          {/* Seller Card */}
                          <button
                            id="role-seller"
                            type="button"
                            onClick={() => setRole('seller')}
                            className={`p-3 rounded-2xl border text-left transition cursor-pointer relative flex flex-col justify-between ${
                              role === 'seller'
                                ? 'border-[#D97706] bg-[#FFFBEB] ring-2 ring-[#D97706]/20'
                                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xl">🌾</span>
                                {role === 'seller' && (
                                  <span className="h-4 w-4 rounded-full bg-[#D97706] text-white flex items-center justify-center text-[10px]">
                                    ✓
                                  </span>
                                )}
                              </div>
                              <span className="block font-bold text-xs text-gray-900">Seller / Producer</span>
                              <span className="text-[10px] text-gray-500 block leading-tight mt-0.5">
                                Crop Farms & Co-ops
                              </span>
                            </div>
                          </button>

                          {/* Logistics Card */}
                          <button
                            id="role-logistics"
                            type="button"
                            onClick={() => setRole('logistics_provider')}
                            className={`p-3 rounded-2xl border text-left transition cursor-pointer relative flex flex-col justify-between ${
                              role === 'logistics_provider'
                                ? 'border-[#D97706] bg-[#FFFBEB] ring-2 ring-[#D97706]/20'
                                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xl">🚚</span>
                                {role === 'logistics_provider' && (
                                  <span className="h-4 w-4 rounded-full bg-[#D97706] text-white flex items-center justify-center text-[10px]">
                                    ✓
                                  </span>
                                )}
                              </div>
                              <span className="block font-bold text-xs text-gray-900">Logistics</span>
                              <span className="text-[10px] text-gray-500 block leading-tight mt-0.5">
                                Cargo & Haulage Carriers
                              </span>
                            </div>
                          </button>
                        </div>

                        {/* Role Description Helper */}
                        <div className="bg-[#FAF9F6] border border-gray-200/80 rounded-xl p-2.5 flex items-center space-x-2">
                          <Sparkles className="h-4 w-4 text-[#D97706] shrink-0" />
                          <p className="text-[11px] text-gray-600 font-medium">
                            {role === 'buyer' && 'Access direct farm listings, place bulk crop purchase orders, and request logistics shipping quotes.'}
                            {role === 'seller' && 'Publish agricultural inventory, set Out-Turn moisture specs, and connect with verified regional buyers.'}
                            {role === 'logistics_provider' && 'Provide freight transport quotes, manage fleet cargo routes, and record delivery checkpoints.'}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Account Credentials (Email & Password) */}
                  <div className="text-left space-y-3 pt-1">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                          <Mail className="h-4 w-4" />
                        </div>
                        <input
                          id="auth-email"
                          type="email"
                          placeholder="e.g. trader@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F6] border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] focus:bg-white transition-all font-medium"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-gray-700 block">
                          Password <span className="text-red-500">*</span>
                        </label>
                        {!isLogin && (
                          <span className="text-[10px] font-mono font-medium text-gray-400">
                            Min. 6 characters
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                          <Lock className="h-4 w-4" />
                        </div>
                        <input
                          id="auth-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 bg-[#FAF9F6] border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] focus:bg-white transition-all font-medium"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {!isLogin && (
                    <>
                      {/* Name Fields */}
                      <div className="grid grid-cols-2 gap-3 text-left">
                        <div>
                          <label className="text-xs font-bold text-gray-700 block mb-1">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                              <User className="h-4 w-4" />
                            </div>
                            <input
                              id="auth-firstname"
                              type="text"
                              placeholder="e.g. Kwame"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              className="w-full pl-10 pr-3 py-2.5 bg-[#FAF9F6] border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] focus:bg-white transition-all font-medium"
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-700 block mb-1">
                            Surname <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                              <User className="h-4 w-4" />
                            </div>
                            <input
                              id="auth-surname"
                              type="text"
                              placeholder="e.g. Mensah"
                              value={surname}
                              onChange={(e) => setSurname(e.target.value)}
                              className="w-full pl-10 pr-3 py-2.5 bg-[#FAF9F6] border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] focus:bg-white transition-all font-medium"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* Business Name Field (Tailored label by role) */}
                      <div className="text-left">
                        <label className="text-xs font-bold text-gray-700 block mb-1">
                          {role === 'seller' && 'Farm, Cooperative or Enterprise Name'}
                          {role === 'buyer' && 'Sourcing Company or Organization Name'}
                          {role === 'logistics_provider' && 'Haulage / Cargo Transport Company Name'}
                          <span className="text-gray-400 font-normal ml-1">(Optional)</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <input
                            id="auth-business"
                            type="text"
                            placeholder={
                              role === 'seller' ? 'e.g. Sahel Cocoa Producers Cooperative' :
                              role === 'logistics_provider' ? 'e.g. Trans-African Grain Express' :
                              'e.g. West Coast Millers Ltd'
                            }
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F6] border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] focus:bg-white transition-all font-medium"
                          />
                        </div>
                      </div>

                      {/* Phone Number Input with Country Dial Code */}
                      <div className="text-left">
                        <label className="text-xs font-bold text-gray-700 block mb-1">Phone Number</label>
                        <div className="flex gap-2">
                          <div className="w-2/5 relative">
                            <select
                              id="auth-country-code"
                              value={countryCode}
                              onChange={(e) => setCountryCode(e.target.value)}
                              className="w-full px-2.5 py-2.5 bg-[#FAF9F6] border border-gray-200 rounded-xl text-gray-800 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] focus:bg-white transition-all font-medium appearance-none cursor-pointer text-center"
                            >
                              <option value="+265">🇲🇼 +265 (MW)</option>
                              <option value="+234">🇳🇬 +234 (NG)</option>
                              <option value="+233">🇬🇭 +233 (GH)</option>
                              <option value="+254">🇰🇪 +254 (KE)</option>
                              <option value="+256">🇺🇬 +256 (UG)</option>
                              <option value="+250">🇷🇼 +250 (RW)</option>
                              <option value="+27">🇿🇦 +27 (ZA)</option>
                              <option value="+226">🇧🇫 +226 (BF)</option>
                              <option value="+255">🇹🇿 +255 (TZ)</option>
                              <option value="+260">🇿🇲 +260 (ZM)</option>
                              <option value="+263">🇿🇼 +263 (ZW)</option>
                            </select>
                          </div>
                          <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                              <Phone className="h-4 w-4" />
                            </div>
                            <input
                              id="auth-phone"
                              type="tel"
                              placeholder="e.g. 888 123456"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F6] border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] focus:bg-white transition-all font-medium"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Operational Location & Country */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                        <div>
                          <label className="text-xs font-bold text-gray-700 block mb-1">
                            Base / City Location <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                              <MapPin className="h-4 w-4" />
                            </div>
                            <input
                              id="auth-location"
                              type="text"
                              placeholder="e.g. Lilongwe, Malawi"
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              className="w-full pl-10 pr-3 py-2.5 bg-[#FAF9F6] border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] focus:bg-white transition-all font-medium"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-700 block mb-1">
                            Country / Nationality <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                              <Globe className="h-4 w-4" />
                            </div>
                            <select
                              id="auth-nationality"
                              value={nationality}
                              onChange={(e) => setNationality(e.target.value)}
                              className="w-full pl-9 pr-6 py-2.5 bg-[#FAF9F6] border border-gray-200 rounded-xl text-gray-800 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] focus:bg-white transition-all font-medium appearance-none cursor-pointer"
                              required
                            >
                              <option value="Malawi">Malawi (MWK)</option>
                              <option value="Ghana">Ghana (GHS)</option>
                              <option value="Kenya">Kenya (KES)</option>
                              <option value="Nigeria">Nigeria (NGN)</option>
                              <option value="Rwanda">Rwanda (RWF)</option>
                              <option value="South Africa">South Africa (ZAR)</option>
                              <option value="Tanzania">Tanzania (TZS)</option>
                              <option value="Uganda">Uganda (UGX)</option>
                              <option value="Zambia">Zambia (ZMW)</option>
                              <option value="Zimbabwe">Zimbabwe (ZWD)</option>
                              <option value="Burkina Faso">Burkina Faso (XOF)</option>
                              <option value="Cote d’Ivoire">Cote d’Ivoire (XOF)</option>
                              <option value="Egypt">Egypt (EGP)</option>
                              <option value="Ethiopia">Ethiopia (ETB)</option>
                              <option value="Senegal">Senegal (XOF)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Optional Brand/Company Logo Upload for Sellers & Logistics */}
                      {(role === 'logistics_provider' || role === 'seller') && (
                        <div className="text-left bg-amber-50/20 border border-amber-200/40 rounded-2xl p-4 space-y-3">
                          <label className="text-xs font-bold text-gray-700 block">
                            {role === 'seller' ? 'Farm / Enterprise Logo' : 'Logistics Company Logo'}
                            <span className="text-gray-400 font-normal ml-1">(Optional)</span>
                          </label>
                          
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-xl border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0 relative shadow-2xs">
                              {logoUrl ? (
                                <img src={logoUrl} alt="Preview Logo" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-lg">{role === 'seller' ? '🌾' : '🚚'}</span>
                              )}
                            </div>
                            
                            <div className="flex-1 space-y-1">
                              <label className="inline-flex items-center justify-center bg-white hover:bg-[#FAF9F6] border border-gray-200 text-gray-700 font-bold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer space-x-1.5 shadow-2xs">
                                <UploadCloud className="h-3.5 w-3.5 text-gray-400" />
                                <span>{isUploadingLogo ? 'Processing...' : 'Upload Brand Logo'}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleLogoChange}
                                  className="hidden"
                                />
                              </label>
                              {logoUrl && (
                                <button
                                  type="button"
                                  onClick={() => setLogoUrl('')}
                                  className="text-[10px] font-bold text-red-600 hover:underline ml-3"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Main Action Submit Button */}
                  <div className="pt-2">
                    <button
                      id="btn-auth-submit"
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#D97706] hover:bg-[#b45309] active:bg-[#92400E] text-white py-3.5 px-4 rounded-xl font-bold shadow-xs transition-all duration-150 flex items-center justify-center cursor-pointer text-sm font-sans"
                    >
                      {loading ? (
                        <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full h-4 w-4"></span>
                      ) : (
                        <>
                          <span>
                            {isLogin 
                              ? 'Sign In to Trade Dashboard' 
                              : `Create Account as ${role === 'buyer' ? 'Buyer' : role === 'seller' ? 'Seller' : 'Logistics Partner'}`}
                          </span>
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>

                  <div className="pt-2 text-center flex items-center justify-center space-x-1 text-[11px] text-gray-400 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>256-Bit SSL Encrypted & Authenticated via Supabase Engine</span>
                  </div>
                </form>

                <div className="mt-6 pt-5 border-t border-gray-100 text-center">
                  <button
                    id="toggle-auth-mode"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError('');
                    }}
                    className="text-xs text-[#D97706] hover:text-[#b45309] font-bold transition cursor-pointer"
                  >
                    {isLogin 
                      ? "Don't have an account? Create an AFKET Trade Account" 
                      : 'Already registered on AFKET? Sign in to your account'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
