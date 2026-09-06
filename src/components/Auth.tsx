import React, { useState, useEffect } from 'react';
import { db, isSupabaseConfigured, supabase } from '../lib/supabase';
import { UserProfile, UserRole, AccountType, PaymentStatus } from '../types';
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
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Wallet,
  Building,
  AlertCircle,
  Coins,
  Receipt,
  KeyRound,
  UserPlus,
  Calendar,
  MessageSquare,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import afketLogo from '../assets/images/afket_logo_1782851553801.jpg';
import { triggerPayChanguPayment, generatePayChanguTxRef, PayChanguChannel } from '../lib/paychangu';

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
  isRecoveryMode?: boolean;
}

export default function Auth({ onAuthSuccess, initialError, isRecoveryMode }: AuthProps) {
  const [isLogin, setIsLogin] = useState(isRecoveryMode ? true : false);
  const [role, setRole] = useState<UserRole>('buyer');
  const [accountType, setAccountType] = useState<AccountType>('individual');
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
  const [regStep, setRegStep] = useState<number>(1);
  const [isMagicLinkMode, setIsMagicLinkMode] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(isRecoveryMode ? true : false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [noAccountFound, setNoAccountFound] = useState(false);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);

  const nextStep = () => {
    setError('');
    if (regStep === 1) {
      setRegStep(2);
    } else if (regStep === 2) {
      setRegStep(3);
    } else if (regStep === 3) {
      if (!email.trim()) {
        setError('Please enter your email address.');
        return;
      }
      if (!email.includes('@') || !email.includes('.')) {
        setError('Please enter a valid email address.');
        return;
      }
      if (!password) {
        setError('Please enter a password.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      setRegStep(4);
    } else if (regStep === 4) {
      if (!firstName.trim()) {
        setError('Please enter your First Name.');
        return;
      }
      if (!surname.trim()) {
        setError('Please enter your Surname.');
        return;
      }
      setRegStep(5);
    }
  };

  const prevStep = () => {
    setError('');
    if (regStep > 1) {
      setRegStep(regStep - 1);
    }
  };

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
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (hash.includes('type=recovery') || search.includes('type=recovery')) {
      setIsUpdatingPassword(true);
      setIsLogin(true);
    }
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Handle sending password reset email
  const handleSendPasswordReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setNoAccountFound(false);

    if (!email.trim()) {
      setError('Please enter your account email address.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await db.auth.resetPasswordForEmail(email.trim());
      setResetEmailSent(true);
      setResendCooldown(60);
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg.includes('NO_ACCOUNT_FOUND') || errMsg.toLowerCase().includes('no account') || errMsg.toLowerCase().includes('user not found')) {
        setNoAccountFound(true);
        setError('No account found for this email address. Please open an account first.');
      } else {
        setError(errMsg || 'Failed to send password reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle setting new password after clicking reset link
  const handleUpdateNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match. Please check and try again.');
      return;
    }

    setLoading(true);
    try {
      await db.auth.updatePassword(newPassword);
      setPasswordUpdated(true);
      setTimeout(async () => {
        const currentUser = await db.auth.getCurrentUser();
        if (currentUser) {
          onAuthSuccess(currentUser);
        } else {
          setIsUpdatingPassword(false);
          setIsForgotPasswordMode(false);
          setIsLogin(true);
        }
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try requesting a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Initial Form Submission (Sign In or Move to Payment Step)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailNotConfirmed(false);
    setNoAccountFound(false);

    if (isLogin) {
      if (!email.trim()) {
        setError('Please enter your email address.');
        return;
      }

      if (isMagicLinkMode) {
        setLoading(true);
        try {
          await db.auth.sendSignInLink(email);
          setMagicLinkSent(true);
          setResendCooldown(60);
        } catch (err: any) {
          const errMsg = err.message || '';
          if (errMsg.includes('NO_ACCOUNT_FOUND') || errMsg.toLowerCase().includes('no account') || errMsg.toLowerCase().includes('user not found')) {
            setNoAccountFound(true);
            setError('No account found for this email address. Signing in with an email link is only available for registered users. Please open an account first.');
          } else {
            setError(errMsg || 'Failed to send dashboard sign-in email link.');
          }
        } finally {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      if (!password) {
        setError('Please enter your password.');
        setLoading(false);
        return;
      }
      try {
        const user = await db.auth.signIn(email, password);
        onAuthSuccess(user);
      } catch (err: any) {
        const errMsg = err.message || 'An error occurred. Please try again.';
        if (errMsg.toLowerCase().includes('email not confirmed')) {
          setError('Your email address has not been confirmed yet. A confirmation link has been sent to your email — please click it to verify your account and open your dashboard.');
          setEmailNotConfirmed(true);
        } else if (errMsg.toLowerCase().includes('invalid login credentials') || errMsg.toLowerCase().includes('user not found')) {
          try {
            const exists = await db.auth.checkAccountExists(email.trim());
            if (!exists) {
              setNoAccountFound(true);
              setError('No account found for this email address. Please open an account to get started on AFKET.');
            } else {
              setError('Invalid email or password. If you forgot your password, you can sign in with an email link or reset your password.');
            }
          } catch {
            setError('Invalid email or password. If you forgot your password, please use the reset link below.');
          }
        } else {
          setError(errMsg);
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    if (regStep < 5) {
      nextStep();
      return;
    }
  };

  // Process Free Registration with 1-Month Free Trial
  const handleCompleteRegistration = async () => {
    setError('');

    if (!agreedToPolicy) {
      setError('Please read and check the agreement box for the AFKET Platform Terms & Usage Policy to open your account.');
      return;
    }

    if (!firstName.trim() || !surname.trim() || !location.trim()) {
      setError('First Name, Surname, and Operational Location are required.');
      return;
    }

    setLoading(true);

    const fullPhone = phoneNumber.trim() ? `${countryCode} ${phoneNumber.trim()}` : '';
    const activeAccountType: AccountType = accountType === 'company' || Boolean(businessName.trim()) ? 'company' : 'individual';
    const subMonthlyFee = role === 'logistics_provider' ? 15000 : (activeAccountType === 'company' ? 15000 : 10000);
    const regStatus: PaymentStatus = 'paid'; // Free registration is immediately active
    const subStatus: PaymentStatus = 'not paid'; // Monthly subscription starts after 14-day trial

    try {
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
        logoUrl,
        activeAccountType,
        regStatus,
        subStatus,
        0, // Registration is 100% Free
        undefined,
        undefined
      );

      if (result.user) {
        setRegisteredUser(result.user);
        if (result.needsEmailConfirmation) {
          setRegistrationPending(true);
        } else {
          onAuthSuccess(result.user);
        }
      }
    } catch (err: any) {
      const errMsg = err.message || 'An error occurred during account registration. Please try again.';
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
      await db.auth.resendConfirmationEmail(email.trim());
      setResendStatus('sent');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend confirmation email.');
      setResendStatus('idle');
    }
  };

  return (
    <div className="min-h-screen flex flex-row bg-[#FAF9F6] font-sans">
      {/* Banner / Left Side (The Bar) - Side-by-Side on all screen sizes including mobile phones */}
      <div className="w-14 xs:w-16 sm:w-20 md:w-5/12 shrink-0 bg-[#1F2937] text-white p-2.5 xs:p-3 sm:p-5 md:p-14 flex flex-col justify-between relative overflow-hidden border-r border-gray-800 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#365314]/50 via-[#1F2937] to-[#111827] z-0"></div>
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] z-0"></div>

        {/* Mobile Compact Branding Bar (visible < md) */}
        <div className="relative z-10 md:hidden flex flex-col items-center justify-between h-full py-2">
          {/* Logo & Brand */}
          <div className="flex flex-col items-center gap-1.5">
            <img 
              src={afketLogo} 
              alt="AFKET Logo" 
              className="h-8 w-8 xs:h-9 xs:w-9 sm:h-11 sm:w-11 rounded-full border border-amber-500/30 shadow-md"
              referrerPolicy="no-referrer"
            />
            <span className="font-sans font-black text-[11px] xs:text-xs tracking-tight text-white">
              AF<span className="text-[#D97706]">KET</span>
            </span>
          </div>

          {/* Trade Network Feature Icons */}
          <div className="my-auto flex flex-col items-center gap-3.5 py-4">
            <div className="p-2 rounded-xl bg-white/10 text-amber-400 shadow-2xs" title="African Agriculture Trade">
              <Sprout className="h-4 w-4" />
            </div>
            <div className="p-2 rounded-xl bg-white/10 text-emerald-400 shadow-2xs" title="Verified Trade Counterparties">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="p-2 rounded-xl bg-white/10 text-sky-400 shadow-2xs" title="Freight & Haulage Dispatch">
              <Truck className="h-4 w-4" />
            </div>
            <div className="p-2 rounded-xl bg-white/10 text-amber-300 shadow-2xs" title="Direct Farm Sourcing">
              <Globe className="h-4 w-4" />
            </div>
          </div>

          {/* Bottom badge */}
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-mono uppercase tracking-widest text-[#D97706] font-bold text-center">
              AFRICA
            </span>
          </div>
        </div>

        {/* Desktop Detailed Branding (visible >= md) */}
        <div className="relative z-10 text-left hidden md:block">
          <div className="flex items-center space-x-3 mb-10">
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

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-sans font-black tracking-tight leading-tight mb-5">
            Connecting African Farms with Global Demand
          </h2>
          <p className="text-gray-300 text-sm md:text-base font-medium leading-relaxed max-w-md">
            AFKET brings buyers, sellers, and logistics companies under a single, secure trading network to buy, sell, and transport high-yield African crops.
          </p>
        </div>

        <div className="relative z-10 pt-8 border-t border-white/10 mt-8 text-left hidden md:block">
          <span className="text-[#D97706] font-mono text-[10px] uppercase tracking-wider block mb-3 font-bold">🌍 Network Trade Verification</span>
          <div className="space-y-3 font-medium">
            <div className="flex items-start space-x-2.5 text-xs text-gray-300">
              <span className="text-[#D97706] font-bold text-sm">•</span>
              <div>
                <strong className="text-white block text-xs uppercase tracking-tight">Open Free Account Today</strong>
                <span className="text-[11px] text-gray-400">Instant registration with full access to African buyers, growers, commodity aggregators, and freight dispatch.</span>
              </div>
            </div>
            <div className="flex items-start space-x-2.5 text-xs text-gray-300">
              <span className="text-[#D97706] font-bold text-sm">•</span>
              <div>
                <strong className="text-white block text-xs uppercase tracking-tight">Direct Farm Sourcing & Haulage Bidding</strong>
                <span className="text-[11px] text-gray-400">Moisture and Out-Turn specifications for transparent, high-yield grain, cash-crop trades, and freight dispatch.</span>
              </div>
            </div>
            <div className="flex items-start space-x-2.5 text-xs text-gray-300">
              <span className="text-[#D97706] font-bold text-sm">•</span>
              <div>
                <strong className="text-white block text-xs uppercase tracking-tight">Verified Trade Network</strong>
                <span className="text-[11px] text-gray-400">Secure counterparties, escrow agreement tracking, and verified cross-border supply chains.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form (The Open Account Site) */}
      <div className="flex-1 min-w-0 flex items-center justify-center p-2.5 xs:p-4 sm:p-8 md:p-12">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-gray-100 shadow-sm">
            {registrationPending ? (
              <div className="py-2 text-left">
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
                  We have dispatched a secure registration confirmation link to your inbox at <strong className="text-gray-900 font-bold">{email}</strong>.
                </p>

                {error && (
                  <div className="bg-[#FEF2F2] border border-[#FEE2E2] text-red-800 text-xs rounded-xl p-3.5 mb-4 font-semibold">
                    {error}
                  </div>
                )}

                <div className="bg-[#FAF9F6] border border-gray-100 rounded-2xl p-5 space-y-4 mb-6">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">How to complete your activation:</h3>
                  
                  <div className="flex items-start space-x-3.5">
                    <span className="h-6 w-6 rounded-full bg-amber-100 border border-amber-200 text-[#92400E] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="space-y-0.5">
                      <strong className="text-gray-800 text-sm block">Check Your Inbox</strong>
                      <span className="text-xs text-gray-500 font-medium block">Look for a message titled "Confirm your signup" or "Activate your AFKET trading account".</span>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3.5">
                    <span className="h-6 w-6 rounded-full bg-amber-100 border border-amber-200 text-[#92400E] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="space-y-0.5">
                      <strong className="text-gray-800 text-sm block">Click Confirmation Link</strong>
                      <span className="text-xs text-gray-500 font-medium block">Click the confirmation button/link in the email sent to your inbox.</span>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3.5">
                    <span className="h-6 w-6 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="space-y-0.5">
                      <strong className="text-gray-800 text-sm block">Open Dashboard Instantly</strong>
                      <span className="text-xs text-gray-500 font-medium block">The link will automatically verify your account and open your trading dashboard with your 1-month free trial (30 days) active!</span>
                    </div>
                  </div>
                </div>

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
                      setIsForgotPasswordMode(false);
                      setIsUpdatingPassword(false);
                      setRegStep(1);
                      setError('');
                    }}
                    className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition cursor-pointer ${
                      !isLogin
                        ? 'border-[#D97706] text-[#D97706]'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Open Free Account Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setIsForgotPasswordMode(false);
                      setIsUpdatingPassword(false);
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
                    {isForgotPasswordMode
                      ? 'Reset Your Password'
                      : isUpdatingPassword
                      ? 'Set New Password'
                      : isLogin
                      ? (isMagicLinkMode ? 'Sign In with Email Link' : 'Welcome Back to AFKET')
                      : 'Open Free Account Today'}
                  </h1>
                  <p className="text-gray-500 font-medium text-xs sm:text-sm">
                    {isForgotPasswordMode
                      ? 'Enter your registered email address to receive a secure password reset link.'
                      : isUpdatingPassword
                      ? 'Create and confirm a new secure password for your trade account.'
                      : isLogin
                      ? (isMagicLinkMode 
                          ? 'For existing users who forgot their password or prefer passwordless sign-in. If you don\'t have an account, please open one.'
                          : 'Sign in to access your agricultural trades, order listings, and shipping logs.')
                      : 'Open your free trade account today with instant access to direct agricultural trade & logistics.'}
                  </p>
                </div>

                {noAccountFound ? (
                  <div className="bg-amber-50 border border-amber-300 text-amber-950 rounded-2xl p-4 mb-5 space-y-3 text-left animate-fadeIn shadow-2xs">
                    <div className="flex items-start space-x-3">
                      <div className="h-9 w-9 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
                        <UserPlus className="h-5 w-5 text-amber-900" />
                      </div>
                      <div>
                        <strong className="block text-sm font-black text-amber-950">No Account Found</strong>
                        <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                          We couldn't find an existing AFKET trade account registered to <strong className="text-gray-900 font-bold">{email || 'this email'}</strong>. Email link sign-in and password resets are only available for users who already have an account.
                        </p>
                      </div>
                    </div>
                    <div className="pt-1 flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        id="btn-switch-to-register-cta"
                        onClick={() => {
                          setIsLogin(false);
                          setIsMagicLinkMode(false);
                          setIsForgotPasswordMode(false);
                          setRegStep(1);
                          setError('');
                          setNoAccountFound(false);
                        }}
                        className="flex-1 bg-[#D97706] hover:bg-[#b45309] active:bg-[#92400E] text-white py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Open Free Account Today</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNoAccountFound(false);
                          setError('');
                        }}
                        className="px-3 py-2 text-xs font-bold text-amber-800 hover:text-amber-950 transition text-center cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ) : error ? (
                  <div className="bg-[#FEF2F2] border border-[#FEE2E2] text-red-800 text-xs rounded-xl p-3.5 mb-5 font-semibold text-left flex items-start space-x-2 animate-fadeIn">
                    <span className="text-red-500 font-bold shrink-0 mt-0.5">⚠️</span>
                    <span>{error}</span>
                  </div>
                ) : null}

                {/* REGISTRATION FORM */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* FORGOT PASSWORD VIEW */}
                  {isLogin && isForgotPasswordMode && (
                    <motion.div
                      key="forgot-password-card"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4 text-left"
                    >
                      {resetEmailSent ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-left space-y-4">
                          <div className="flex items-center space-x-2.5 text-emerald-900 font-black text-sm">
                            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                              <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                              <span className="block text-sm font-extrabold text-emerald-950">Password Reset Link Dispatched!</span>
                              <span className="text-[11px] font-medium text-emerald-700">Check your email inbox</span>
                            </div>
                          </div>

                          <p className="text-xs text-gray-700 font-medium leading-relaxed">
                            We have sent a secure password reset link to <strong className="text-gray-900 font-bold">{email}</strong>. Click the link in your email to choose a new password.
                          </p>

                          <div>
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Quick Email Client Shortcuts</span>
                            <div className="grid grid-cols-3 gap-2">
                              <a
                                href="https://mail.google.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-center text-xs font-bold transition flex items-center justify-center space-x-1 shadow-2xs"
                              >
                                <span>Gmail</span>
                                <ExternalLink className="h-3 w-3 text-gray-400" />
                              </a>
                              <a
                                href="https://outlook.live.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-center text-xs font-bold transition flex items-center justify-center space-x-1 shadow-2xs"
                              >
                                <span>Outlook</span>
                                <ExternalLink className="h-3 w-3 text-gray-400" />
                              </a>
                              <a
                                href="https://mail.yahoo.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-center text-xs font-bold transition flex items-center justify-center space-x-1 shadow-2xs"
                              >
                                <span>Yahoo!</span>
                                <ExternalLink className="h-3 w-3 text-gray-400" />
                              </a>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-emerald-100 flex items-center justify-between">
                            <button
                              id="btn-resend-reset-link"
                              type="button"
                              onClick={() => handleSendPasswordReset()}
                              disabled={resendCooldown > 0 || loading}
                              className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer flex items-center space-x-1"
                            >
                              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                              <span>{resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Reset Link'}</span>
                            </button>

                            <button
                              id="btn-back-to-signin-from-sent"
                              type="button"
                              onClick={() => {
                                setIsForgotPasswordMode(false);
                                setResetEmailSent(false);
                                setError('');
                              }}
                              className="text-xs font-bold text-gray-600 hover:text-gray-900 underline"
                            >
                              Back to Sign In
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-amber-50/60 border border-amber-200/70 rounded-2xl p-4 flex items-start space-x-3">
                            <div className="h-9 w-9 rounded-xl bg-amber-100 text-[#D97706] flex items-center justify-center shrink-0">
                              <KeyRound className="h-5 w-5" />
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <strong className="text-gray-900 block font-bold text-xs">Reset Your Account Password</strong>
                              <p className="leading-snug">Enter the email address registered with your AFKET trading account. We'll send you a password reset link.</p>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1">
                              Registered Email Address
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                <Mail className="h-4 w-4" />
                              </div>
                              <input
                                id="forgot-email-input"
                                type="email"
                                placeholder="e.g. trader@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] focus:bg-white transition-all font-medium"
                                required
                              />
                            </div>
                          </div>

                          <div className="pt-2 space-y-2">
                            <button
                              id="btn-submit-forgot-password"
                              type="button"
                              onClick={() => handleSendPasswordReset()}
                              disabled={loading}
                              className="w-full bg-[#D97706] hover:bg-[#b45309] active:bg-[#92400E] text-white py-3.5 px-4 rounded-xl font-bold shadow-xs transition-all duration-150 flex items-center justify-center cursor-pointer text-sm font-sans"
                            >
                              {loading ? (
                                <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full h-4 w-4"></span>
                              ) : (
                                <>
                                  <KeyRound className="mr-2 h-4 w-4" />
                                  <span>Send Password Reset Link</span>
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                              )}
                            </button>

                            <div className="text-center pt-1">
                              <button
                                id="btn-back-to-signin-from-forgot"
                                type="button"
                                onClick={() => {
                                  setIsForgotPasswordMode(false);
                                  setError('');
                                }}
                                className="text-xs text-gray-500 hover:text-gray-800 font-bold hover:underline cursor-pointer"
                              >
                                ← Remember your password? Sign In
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* SET NEW PASSWORD VIEW (AFTER RECOVERY LINK CLICK) */}
                  {isLogin && isUpdatingPassword && (
                    <motion.div
                      key="update-password-card"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4 text-left"
                    >
                      {passwordUpdated ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
                          <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto animate-bounce" />
                          <h3 className="font-bold text-gray-900 text-base">Password Updated Successfully!</h3>
                          <p className="text-xs text-gray-600">Redirecting to your AFKET trading dashboard...</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-amber-50/60 border border-amber-200/70 rounded-2xl p-4 flex items-start space-x-3">
                            <div className="h-9 w-9 rounded-xl bg-amber-100 text-[#D97706] flex items-center justify-center shrink-0">
                              <Lock className="h-5 w-5" />
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <strong className="text-gray-900 block font-bold text-xs">Set Your New Password</strong>
                              <p className="leading-snug">Choose a strong password with at least 6 characters.</p>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1">
                              New Password
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                <Lock className="h-4 w-4" />
                              </div>
                              <input
                                id="new-password-input"
                                type={showNewPassword ? 'text' : 'password'}
                                placeholder="•••••••• (min 6 characters)"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full pl-10 pr-10 py-3 bg-[#FAF9F6] border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] focus:bg-white transition-all font-medium"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition cursor-pointer"
                              >
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1">
                              Confirm New Password
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                <Lock className="h-4 w-4" />
                              </div>
                              <input
                                id="confirm-new-password-input"
                                type={showNewPassword ? 'text' : 'password'}
                                placeholder="•••••••• (re-enter password)"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] focus:bg-white transition-all font-medium"
                                required
                              />
                            </div>
                          </div>

                          <div className="pt-2 space-y-2">
                            <button
                              id="btn-save-new-password"
                              type="button"
                              onClick={handleUpdateNewPassword}
                              disabled={loading}
                              className="w-full bg-[#D97706] hover:bg-[#b45309] active:bg-[#92400E] text-white py-3.5 px-4 rounded-xl font-bold shadow-xs transition-all duration-150 flex items-center justify-center cursor-pointer text-sm font-sans"
                            >
                              {loading ? (
                                <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full h-4 w-4"></span>
                              ) : (
                                <>
                                  <span>Save New Password & Continue</span>
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                              )}
                            </button>

                            <div className="text-center pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsUpdatingPassword(false);
                                  setIsForgotPasswordMode(false);
                                  setError('');
                                }}
                                className="text-xs text-gray-500 hover:text-gray-800 font-bold hover:underline cursor-pointer"
                              >
                                ← Cancel and return to Sign In
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* SIGN IN VIEW */}
                  {isLogin && !isForgotPasswordMode && !isUpdatingPassword && (
                    <motion.div
                      key="login-card"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4 text-left"
                    >
                      {magicLinkSent ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-left space-y-3">
                          <div className="flex items-center space-x-2 text-emerald-800 font-black text-sm">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                            <span>Sign-In Link Sent!</span>
                          </div>
                          <p className="text-xs text-gray-700 font-medium leading-relaxed">
                            A secure access link has been sent to <strong className="text-gray-900">{email}</strong>. Clicking that link will open your trading dashboard directly.
                          </p>

                          <div className="pt-2">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Quick Shortcuts</span>
                            <div className="grid grid-cols-3 gap-2">
                              <a
                                href="https://mail.google.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-center text-xs font-bold transition flex items-center justify-center space-x-1"
                              >
                                <span>Gmail</span>
                                <ExternalLink className="h-3 w-3 text-gray-400" />
                              </a>
                              <a
                                href="https://outlook.live.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-center text-xs font-bold transition flex items-center justify-center space-x-1"
                              >
                                <span>Outlook</span>
                                <ExternalLink className="h-3 w-3 text-gray-400" />
                              </a>
                              <a
                                href="https://mail.yahoo.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-center text-xs font-bold transition flex items-center justify-center space-x-1"
                              >
                                <span>Yahoo!</span>
                                <ExternalLink className="h-3 w-3 text-gray-400" />
                              </a>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-emerald-100 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={handleResendEmail}
                              disabled={resendCooldown > 0 || resendStatus === 'sending'}
                              className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer flex items-center space-x-1"
                            >
                              <RefreshCw className={`h-3 w-3 ${resendStatus === 'sending' ? 'animate-spin' : ''}`} />
                              <span>{resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Link'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setMagicLinkSent(false);
                                setIsMagicLinkMode(false);
                              }}
                              className="text-xs font-bold text-gray-500 hover:text-gray-800"
                            >
                              Use Password Instead
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {emailNotConfirmed && (
                            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3.5 space-y-2 font-medium">
                              <p>
                                ⚠️ <strong>Confirmation Required:</strong> Please confirm your email address to access your trading dashboard. A confirmation link was sent to <strong className="text-black">{email}</strong>.
                              </p>
                              <button
                                type="button"
                                onClick={handleResendEmail}
                                disabled={resendCooldown > 0 || resendStatus === 'sending'}
                                className="inline-flex items-center space-x-1.5 bg-[#D97706] hover:bg-[#b45309] text-white font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                              >
                                <RefreshCw className={`h-3 w-3 ${resendStatus === 'sending' ? 'animate-spin' : ''}`} />
                                <span>{resendCooldown > 0 ? `Wait ${resendCooldown}s to Resend` : 'Resend Confirmation Email Link'}</span>
                              </button>
                            </div>
                          )}

                          {isMagicLinkMode && (
                            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 space-y-1.5 text-left text-xs">
                              <div className="flex items-center space-x-1.5 font-bold text-[#92400E]">
                                <KeyRound className="h-4 w-4 text-[#D97706] shrink-0" />
                                <span>Sign-In for Existing Accounts</span>
                              </div>
                              <p className="text-gray-600 text-[11px] leading-relaxed">
                                Signing in with an email link is for registered users who forgot their password. If you don't have an account yet, please{' '}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsLogin(false);
                                    setIsMagicLinkMode(false);
                                    setIsForgotPasswordMode(false);
                                    setRegStep(1);
                                    setError('');
                                    setNoAccountFound(false);
                                  }}
                                  className="font-bold text-[#D97706] underline hover:text-[#92400E] cursor-pointer"
                                >
                                  open an account here
                                </button>.
                              </p>
                            </div>
                          )}

                          <div>
                            <label className="text-xs font-bold text-gray-700 block mb-1">
                              {isMagicLinkMode ? 'Registered Account Email' : 'Email Address'}
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
                                className="w-full pl-10 pr-4 py-3 bg-[#FAF9F6] border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] focus:bg-white transition-all font-medium"
                                required
                              />
                            </div>
                          </div>

                          {!isMagicLinkMode && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold text-gray-700 block">
                                  Password
                                </label>
                                <button
                                  id="btn-forgot-password-link"
                                  type="button"
                                  onClick={() => {
                                    setIsForgotPasswordMode(true);
                                    setResetEmailSent(false);
                                    setError('');
                                  }}
                                  className="text-xs font-bold text-[#D97706] hover:text-[#b45309] hover:underline cursor-pointer transition"
                                >
                                  Forgot password?
                                </button>
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
                                  className="w-full pl-10 pr-10 py-3 bg-[#FAF9F6] border border-gray-200 rounded-xl text-gray-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] focus:bg-white transition-all font-medium"
                                  required={!isMagicLinkMode}
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
                          )}

                          <div className="pt-2 space-y-2">
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
                                  <span>{isMagicLinkMode ? 'Send Dashboard Access Link ✉️' : 'Sign In to Trade Dashboard'}</span>
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                              )}
                            </button>

                            <div className="text-center pt-2 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-xs">
                              <button
                                id="btn-forgot-password-bottom"
                                type="button"
                                onClick={() => {
                                  setIsForgotPasswordMode(true);
                                  setResetEmailSent(false);
                                  setError('');
                                }}
                                className="text-gray-500 hover:text-gray-900 font-bold hover:underline cursor-pointer flex items-center space-x-1"
                              >
                                <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                                <span>Forgot password?</span>
                              </button>
                              <span className="hidden sm:inline text-gray-300">•</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsMagicLinkMode(!isMagicLinkMode);
                                  setError('');
                                }}
                                className="text-[#D97706] hover:text-[#b45309] font-bold hover:underline cursor-pointer"
                              >
                                {isMagicLinkMode 
                                  ? '← Back to password sign in' 
                                  : '✨ Or sign in with email link'}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* REGISTRATION STEP FLASH CARDS (1 to 5) */}
                  {!isLogin && (
                    <AnimatePresence mode="wait">
                      {/* FLASHCARD STEP 1: TYPE OF ACCOUNT */}
                      {regStep === 1 && (
                        <motion.div
                          key="flashcard-step-1"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-4 text-left"
                        >
                          <div className="bg-amber-50/40 border border-amber-200/50 rounded-2xl p-3 sm:p-5 space-y-3 sm:space-y-4">
                            <div>
                              <label className="text-[11px] sm:text-xs font-black text-gray-900 uppercase tracking-wider block mb-1">
                                Select Type of Account
                              </label>
                              <p className="text-[11px] sm:text-xs text-gray-500 mb-2.5 sm:mb-3">
                                Please specify whether this is a personal trader account or an officially registered commercial business / union.
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                {/* Individual Account Option */}
                                <button
                                  id="account-type-individual"
                                  type="button"
                                  onClick={() => setAccountType('individual')}
                                  className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition cursor-pointer relative ${
                                    accountType === 'individual'
                                      ? 'border-[#D97706] bg-white ring-2 ring-[#D97706]/20 shadow-xs'
                                      : 'border-gray-200 bg-white/70 hover:bg-white text-gray-600'
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-1 sm:mb-1.5">
                                    <div className="flex items-center space-x-2">
                                      <div className={`p-1 sm:p-1.5 rounded-lg ${accountType === 'individual' ? 'bg-amber-100 text-[#D97706]' : 'bg-gray-100 text-gray-500'}`}>
                                        <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                      </div>
                                      <div>
                                        <span className="font-black text-xs sm:text-sm text-gray-900 block leading-tight">Individual Account</span>
                                        <span className="text-[9px] sm:text-[10px] text-gray-400 font-semibold uppercase">Personal / Solo Trader</span>
                                      </div>
                                    </div>
                                    {accountType === 'individual' && (
                                      <span className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-[#D97706] text-white flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0">
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] sm:text-[11px] text-gray-500 leading-tight sm:leading-snug font-medium">
                                    For individual farmers, solo traders, independent aggregators, or individual hauliers.
                                  </p>
                                </button>

                                {/* Company / Business Account Option */}
                                <button
                                  id="account-type-company"
                                  type="button"
                                  onClick={() => setAccountType('company')}
                                  className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition cursor-pointer relative ${
                                    accountType === 'company'
                                      ? 'border-[#D97706] bg-white ring-2 ring-[#D97706]/20 shadow-xs'
                                      : 'border-gray-200 bg-white/70 hover:bg-white text-gray-600'
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-1 sm:mb-1.5">
                                    <div className="flex items-center space-x-2">
                                      <div className={`p-1 sm:p-1.5 rounded-lg ${accountType === 'company' ? 'bg-amber-100 text-[#D97706]' : 'bg-gray-100 text-gray-500'}`}>
                                        <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                      </div>
                                      <div>
                                        <span className="font-black text-xs sm:text-sm text-gray-900 block leading-tight">Company / Business</span>
                                        <span className="text-[9px] sm:text-[10px] text-gray-400 font-semibold uppercase">Corporate / Cooperative</span>
                                      </div>
                                    </div>
                                    {accountType === 'company' && (
                                      <span className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-[#D97706] text-white flex items-center justify-center text-[9px] sm:text-[10px] font-bold shrink-0">
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] sm:text-[11px] text-gray-500 leading-tight sm:leading-snug font-medium">
                                    For registered agribusinesses, cooperative unions, processors, commercial buyers & fleet companies.
                                  </p>
                                </button>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={nextStep}
                            className="w-full bg-[#D97706] hover:bg-[#b45309] text-white font-bold py-2.5 sm:py-3.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center space-x-2 text-xs sm:text-sm cursor-pointer mt-1 sm:mt-2"
                          >
                            <span>Next: Select Primary Role</span>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </motion.div>
                      )}

                      {/* FLASHCARD STEP 2: PRIMARY TRADE ROLE */}
                      {regStep === 2 && (
                        <motion.div
                          key="flashcard-step-2"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-3 sm:space-y-4 text-left"
                        >
                          <div className="bg-amber-50/40 border border-amber-200/50 rounded-2xl p-3 sm:p-5 space-y-3 sm:space-y-4">
                            <div>
                              <label className="text-[11px] sm:text-xs font-black text-gray-900 uppercase tracking-wider block mb-1">
                                Select Primary Trade Role
                              </label>
                              <p className="text-[11px] sm:text-xs text-gray-500 mb-2.5 sm:mb-3">
                                Choose the primary activity you will be conducting on the AFKET trade network.
                              </p>

                              <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
                                {/* Buyer Card */}
                                <button
                                  id="role-buyer"
                                  type="button"
                                  onClick={() => setRole('buyer')}
                                  className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition cursor-pointer relative flex items-center justify-between ${
                                    role === 'buyer'
                                      ? 'border-[#D97706] bg-white ring-2 ring-[#D97706]/20 shadow-xs'
                                      : 'border-gray-200 bg-white/80 hover:bg-white text-gray-600'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 pr-2">
                                    <span className="text-xl sm:text-2xl p-1.5 sm:p-2 rounded-xl bg-amber-100/60 shrink-0">🛒</span>
                                    <div className="min-w-0">
                                      <span className="block font-black text-xs sm:text-sm text-gray-900 leading-tight">Buyer / Commodity Offtaker</span>
                                      <span className="text-[10px] sm:text-xs text-gray-500 block leading-tight truncate sm:whitespace-normal">
                                        Source bulk crops, compare specs, request haulage
                                      </span>
                                    </div>
                                  </div>
                                  {role === 'buyer' && (
                                    <span className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-[#D97706] text-white flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">
                                      ✓
                                    </span>
                                  )}
                                </button>

                                {/* Seller Card */}
                                <button
                                  id="role-seller"
                                  type="button"
                                  onClick={() => setRole('seller')}
                                  className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition cursor-pointer relative flex items-center justify-between ${
                                    role === 'seller'
                                      ? 'border-[#D97706] bg-white ring-2 ring-[#D97706]/20 shadow-xs'
                                      : 'border-gray-200 bg-white/80 hover:bg-white text-gray-600'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 pr-2">
                                    <span className="text-xl sm:text-2xl p-1.5 sm:p-2 rounded-xl bg-emerald-100/60 shrink-0">🌾</span>
                                    <div className="min-w-0">
                                      <span className="block font-black text-xs sm:text-sm text-gray-900 leading-tight">Seller / Producer / Cooperative</span>
                                      <span className="text-[10px] sm:text-xs text-gray-500 block leading-tight truncate sm:whitespace-normal">
                                        List crop harvests, set pricing specs, get orders
                                      </span>
                                    </div>
                                  </div>
                                  {role === 'seller' && (
                                    <span className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-[#D97706] text-white flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">
                                      ✓
                                    </span>
                                  )}
                                </button>

                                {/* Logistics Card */}
                                <button
                                  id="role-logistics"
                                  type="button"
                                  onClick={() => setRole('logistics_provider')}
                                  className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition cursor-pointer relative flex items-center justify-between ${
                                    role === 'logistics_provider'
                                      ? 'border-[#D97706] bg-white ring-2 ring-[#D97706]/20 shadow-xs'
                                      : 'border-gray-200 bg-white/80 hover:bg-white text-gray-600'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 pr-2">
                                    <span className="text-xl sm:text-2xl p-1.5 sm:p-2 rounded-xl bg-blue-100/60 shrink-0">🚚</span>
                                    <div className="min-w-0">
                                      <span className="block font-black text-xs sm:text-sm text-gray-900 leading-tight">Logistics Carrier & Haulage</span>
                                      <span className="text-[10px] sm:text-xs text-gray-500 block leading-tight truncate sm:whitespace-normal">
                                        Browse freight requests & submit haulage bids
                                      </span>
                                    </div>
                                  </div>
                                  {role === 'logistics_provider' && (
                                    <span className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-[#D97706] text-white flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">
                                      ✓
                                    </span>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 sm:space-x-3 pt-0.5 sm:pt-1">
                            <button
                              type="button"
                              onClick={prevStep}
                              className="px-3 sm:px-4 py-2.5 sm:py-3.5 border border-gray-200 rounded-xl text-gray-700 font-bold text-xs hover:bg-gray-50 transition cursor-pointer flex items-center space-x-1"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              <span>Back</span>
                            </button>
                            <button
                              type="button"
                              onClick={nextStep}
                              className="flex-1 bg-[#D97706] hover:bg-[#b45309] text-white font-bold py-2.5 sm:py-3.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center space-x-2 text-xs sm:text-sm cursor-pointer"
                            >
                              <span>Next: Set Credentials</span>
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* FLASHCARD STEP 3: CREDENTIALS */}
                      {regStep === 3 && (
                        <motion.div
                          key="flashcard-step-3"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-3 sm:space-y-4 text-left"
                        >
                          <div className="bg-[#FAF9F6] border border-gray-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-3 sm:space-y-4">
                            <div>
                              <label className="text-[11px] sm:text-xs font-bold text-gray-700 block mb-1">
                                Email Address <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-3.5 flex items-center pointer-events-none text-gray-400">
                                  <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </div>
                                <input
                                  id="auth-email"
                                  type="email"
                                  placeholder="e.g. trader@company.com"
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 bg-white border border-gray-200 rounded-xl text-gray-800 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] transition-all font-medium"
                                  required
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] sm:text-xs font-bold text-gray-700 block">
                                  Password <span className="text-red-500">*</span>
                                </label>
                                <span className="text-[9px] sm:text-[10px] font-mono font-medium text-gray-400">
                                  Min. 6 characters
                                </span>
                              </div>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-3.5 flex items-center pointer-events-none text-gray-400">
                                  <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </div>
                                <input
                                  id="auth-password"
                                  type={showPassword ? 'text' : 'password'}
                                  placeholder="••••••••"
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  className="w-full pl-8 sm:pl-10 pr-9 sm:pr-10 py-2 sm:py-3 bg-white border border-gray-200 rounded-xl text-gray-800 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] transition-all font-medium"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition cursor-pointer"
                                >
                                  {showPassword ? <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 sm:space-x-3 pt-0.5 sm:pt-1">
                            <button
                              type="button"
                              onClick={prevStep}
                              className="px-3 sm:px-4 py-2.5 sm:py-3.5 border border-gray-200 rounded-xl text-gray-700 font-bold text-xs hover:bg-gray-50 transition cursor-pointer flex items-center space-x-1"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              <span>Back</span>
                            </button>
                            <button
                              type="button"
                              onClick={nextStep}
                              className="flex-1 bg-[#D97706] hover:bg-[#b45309] text-white font-bold py-2.5 sm:py-3.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center space-x-2 text-xs sm:text-sm cursor-pointer"
                            >
                              <span>Next: Personal Details</span>
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* FLASHCARD STEP 4: PERSONAL & BUSINESS DETAILS */}
                      {regStep === 4 && (
                        <motion.div
                          key="flashcard-step-4"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-3 sm:space-y-4 text-left"
                        >
                          <div className="bg-[#FAF9F6] border border-gray-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                              <div>
                                <label className="text-[11px] sm:text-xs font-bold text-gray-700 block mb-1">
                                  First Name <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-gray-400">
                                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </div>
                                  <input
                                    id="auth-firstname"
                                    type="text"
                                    placeholder="e.g. Kwame"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full pl-8 sm:pl-9 pr-2.5 sm:pr-3 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] transition-all font-medium"
                                    required
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-[11px] sm:text-xs font-bold text-gray-700 block mb-1">
                                  Surname <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-gray-400">
                                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </div>
                                  <input
                                    id="auth-surname"
                                    type="text"
                                    placeholder="e.g. Mensah"
                                    value={surname}
                                    onChange={(e) => setSurname(e.target.value)}
                                    className="w-full pl-8 sm:pl-9 pr-2.5 sm:pr-3 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] transition-all font-medium"
                                    required
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Business Name Field */}
                            <div>
                              <label className="text-[11px] sm:text-xs font-bold text-gray-700 block mb-1">
                                {accountType === 'company' ? 'Registered Company / Cooperative Name *' : 'Farm / Enterprise Name (Optional)'}
                              </label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-gray-400">
                                  <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </div>
                                <input
                                  id="auth-business"
                                  type="text"
                                  placeholder={
                                    role === 'seller' ? 'e.g. Lilongwe Farmers Cooperative Union' :
                                    role === 'logistics_provider' ? 'e.g. Trans-African Freight Ltd' :
                                    'e.g. West Coast Millers Ltd'
                                  }
                                  value={businessName}
                                  onChange={(e) => setBusinessName(e.target.value)}
                                  className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] transition-all font-medium"
                                />
                              </div>
                            </div>

                            {/* Phone Number Input */}
                            <div>
                              <label className="text-[11px] sm:text-xs font-bold text-gray-700 block mb-1">Phone Number</label>
                              <div className="flex gap-1.5 sm:gap-2">
                                <div className="w-2/5 relative">
                                  <select
                                    id="auth-country-code"
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    className="w-full px-1.5 sm:px-2 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-[11px] sm:text-xs focus:outline-hidden focus:ring-2 focus:ring-[#D97706] transition-all font-medium cursor-pointer text-center"
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
                                  <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </div>
                                  <input
                                    id="auth-phone"
                                    type="tel"
                                    placeholder="e.g. 999 123456"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] transition-all font-medium"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 sm:space-x-3 pt-0.5 sm:pt-1">
                            <button
                              type="button"
                              onClick={prevStep}
                              className="px-3 sm:px-4 py-2.5 sm:py-3.5 border border-gray-200 rounded-xl text-gray-700 font-bold text-xs hover:bg-gray-50 transition cursor-pointer flex items-center space-x-1"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              <span>Back</span>
                            </button>
                            <button
                              type="button"
                              onClick={nextStep}
                              className="flex-1 bg-[#D97706] hover:bg-[#b45309] text-white font-bold py-2.5 sm:py-3.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center space-x-2 text-xs sm:text-sm cursor-pointer"
                            >
                              <span>Next: Location & Terms</span>
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* FLASHCARD STEP 5: LOCATION & BRAND LOGO & TERMS */}
                      {regStep === 5 && (
                        <motion.div
                          key="flashcard-step-5"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-3 sm:space-y-4 text-left"
                        >
                          <div className="bg-[#FAF9F6] border border-gray-200/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                              <div>
                                <label className="text-[11px] sm:text-xs font-bold text-gray-700 block mb-1">
                                  Base / City Location <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-gray-400">
                                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </div>
                                  <input
                                    id="auth-location"
                                    type="text"
                                    placeholder="e.g. Lilongwe, Malawi"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full pl-8 sm:pl-9 pr-2.5 sm:pr-3 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#D97706] transition-all font-medium"
                                    required
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-[11px] sm:text-xs font-bold text-gray-700 block mb-1">
                                  Country / Market Base <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </div>
                                  <select
                                    id="auth-nationality"
                                    value={nationality}
                                    onChange={(e) => setNationality(e.target.value)}
                                    className="w-full pl-8 sm:pl-9 pr-5 sm:pr-6 py-2 sm:py-2.5 bg-white border border-gray-200 rounded-xl text-gray-800 text-[11px] sm:text-xs focus:outline-hidden focus:ring-2 focus:ring-[#D97706] transition-all font-medium appearance-none cursor-pointer"
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

                            {/* Optional Logo Upload */}
                            <div className="bg-white border border-gray-200 rounded-xl p-2.5 sm:p-3.5 space-y-2 sm:space-y-2.5">
                              <label className="text-[11px] sm:text-xs font-bold text-gray-700 block">
                                {role === 'seller' ? 'Farm / Enterprise Logo' : role === 'logistics_provider' ? 'Logistics Fleet Logo' : 'Company Logo'}
                                <span className="text-gray-400 font-normal ml-1">(Optional)</span>
                              </label>
                              
                              <div className="flex items-center space-x-2.5 sm:space-x-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl border border-gray-200 bg-[#FAF9F6] flex items-center justify-center overflow-hidden shrink-0 relative shadow-2xs">
                                  {logoUrl ? (
                                    <img src={logoUrl} alt="Preview Logo" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-sm sm:text-base">{role === 'seller' ? '🌾' : role === 'logistics_provider' ? '🚚' : '🛒'}</span>
                                  )}
                                </div>
                                
                                <div className="flex-1 flex items-center justify-between">
                                  <label className="inline-flex items-center justify-center bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition cursor-pointer space-x-1.5">
                                    <UploadCloud className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-400" />
                                    <span>{isUploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
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
                                      className="text-[10px] font-bold text-red-600 hover:underline"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* AFKET Platform Terms & Usage Policy Summary Card */}
                          <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-2 sm:space-y-3">
                            <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-gray-100">
                              <div className="flex items-center space-x-1.5 sm:space-x-2">
                                <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#365314]" />
                                <span className="text-[10px] sm:text-xs font-black text-gray-900 uppercase tracking-wider">
                                  Platform Terms & Usage Policy
                                </span>
                              </div>
                              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                30-Day Free Trial
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-1.5 sm:gap-2 text-left">
                              {/* Policy Item 1: 1-Month Free Period */}
                              <div className="flex items-start space-x-2 p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-amber-50/60 border border-amber-200/60">
                                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#D97706] shrink-0 mt-0.5" />
                                <p className="text-[10px] sm:text-[11px] text-gray-700 leading-snug font-medium">
                                  <strong>1-Month Free Account Trial:</strong> All accounts receive 30 days of full platform access. Accounts not subscribed after trial ends will be deactivated.
                                </p>
                              </div>

                              {/* Policy Item 2: Buyer WhatsApp Limit */}
                              <div className="flex items-start space-x-2 p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-emerald-50/60 border border-emerald-200/60">
                                <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-700 shrink-0 mt-0.5" />
                                <p className="text-[10px] sm:text-[11px] text-gray-700 leading-snug font-medium">
                                  <strong>Buyer WhatsApp Policy (2-Week Limit):</strong> Free buyers can message sellers directly on WhatsApp for 14 days; locks after 2 weeks until subscribed.
                                </p>
                              </div>

                              {/* Policy Item 3: Seller 3 Products Limit */}
                              <div className="flex items-start space-x-2 p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-orange-50/60 border border-orange-200/60">
                                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-700 shrink-0 mt-0.5" />
                                <p className="text-[10px] sm:text-[11px] text-gray-700 leading-snug font-medium">
                                  <strong>Seller Listing Policy (Max 3 Products):</strong> Sellers can list up to 3 products during the free period. Adding a 4th product requires subscribing to continue uploading.
                                </p>
                              </div>
                            </div>

                            {/* Interactive Agreement Checkbox */}
                            <label 
                              id="auth-policy-agreement-label"
                              className={`flex items-start space-x-2.5 sm:space-x-3 p-2.5 sm:p-3 rounded-xl border transition cursor-pointer mt-1 ${
                                agreedToPolicy 
                                  ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20' 
                                  : 'bg-[#FAF9F6] border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                id="auth-checkbox-agree-policy"
                                type="checkbox"
                                checked={agreedToPolicy}
                                onChange={(e) => {
                                  setAgreedToPolicy(e.target.checked);
                                  if (e.target.checked) setError('');
                                }}
                                className="mt-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#365314] rounded-md border-gray-300 focus:ring-[#365314] cursor-pointer"
                              />
                              <div className="space-y-0.5 text-left">
                                <span className="text-[11px] sm:text-xs font-black text-gray-900 block">
                                  I agree to the AFKET Platform Terms & Usage Policy <span className="text-red-500">*</span>
                                </span>
                                <span className="text-[9px] sm:text-[10px] text-gray-500 font-medium block">
                                  I accept the 30-day trial terms, buyer WhatsApp limits, and seller 3-product listing policy.
                                </span>
                              </div>
                            </label>
                          </div>

                          <div className="space-y-2 pt-1 sm:pt-2">
                            <button
                              id="btn-complete-free-registration"
                              type="button"
                              onClick={handleCompleteRegistration}
                              disabled={loading || !agreedToPolicy}
                              className={`w-full font-bold py-2.5 sm:py-3.5 px-4 rounded-xl shadow-md transition flex items-center justify-center space-x-2 text-xs sm:text-sm cursor-pointer ${
                                agreedToPolicy
                                  ? 'bg-[#365314] hover:bg-[#283e0f] text-white hover:scale-[1.01] active:scale-[0.99]'
                                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              {loading ? (
                                <>
                                  <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4"></span>
                                  <span>Opening Your Free Account...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>Agree & Open Free Account Today</span>
                                  <ArrowRight className="h-4 w-4" />
                                </>
                              )}
                            </button>

                            <div className="flex items-center justify-between pt-0.5 sm:pt-1">
                              <button
                                type="button"
                                onClick={prevStep}
                                className="px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center space-x-1 cursor-pointer"
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                                <span>Back</span>
                              </button>

                              <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-700">
                                100% Free • No Payment Required Now
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </form>

                <div className="mt-6 pt-5 border-t border-gray-100 text-center">
                  <button
                    id="toggle-auth-mode"
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setRegStep(1);
                      setError('');
                    }}
                    className="text-xs text-[#D97706] hover:text-[#b45309] font-bold transition cursor-pointer"
                  >
                    {isLogin 
                      ? "Don't have an account? Open Free Account Today" 
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
