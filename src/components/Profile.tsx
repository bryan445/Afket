import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, getUserSubscriptionInfo, SubscriptionType, AFKET_SUPPORT } from '../types';
import { db } from '../lib/supabase';
import { 
  User, 
  Building, 
  MapPin, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  Loader2,
  Briefcase,
  QrCode,
  Globe,
  Sparkles,
  UploadCloud,
  Copy,
  CheckCheck,
  Lock,
  Coins,
  Receipt,
  Wallet,
  CreditCard,
  CheckCircle2,
  X,
  Calendar,
  Zap,
  Tag
} from 'lucide-react';
import { WhatsAppLogo, CallLogo, EmailLogo, FacebookLogo } from './BrandIcons';
import { triggerPayChanguPayment, generatePayChanguTxRef, PayChanguChannel } from '../lib/paychangu';

const LOGO_PRESETS = [
  { name: 'Sprout Green', icon: '🌿', url: 'https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?auto=format&fit=crop&q=80&w=200' },
  { name: 'Golden Harvest', icon: '🌾', url: 'https://images.unsplash.com/photo-1530026405186-ed1ea060736f?auto=format&fit=crop&q=80&w=200' },
  { name: 'Eco Earth', icon: '🌍', url: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=200' },
  { name: 'Agri-Logistics', icon: '🚚', url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=200' },
  { name: 'Savannah Sun', icon: '☀️', url: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&q=80&w=200' },
];

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

const dataURLtoBlob = (dataurl: string): Blob => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

const isLikelyValidEmail = (value: string): boolean => {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

const isLikelyValidFacebookLink = (value: string): boolean => {
  if (!value) return true;
  return /facebook\.com|fb\.com/i.test(value.trim()) || /^@?[\w.]+$/.test(value.trim());
};

const isLikelyValidWhatsapp = (value: string): boolean => {
  if (!value) return true;
  return /^\+?[\d\s-]{6,}$/.test(value.trim()) || /wa\.me|whatsapp\.com/i.test(value.trim());
};

interface ProfileProps {
  user: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
}

export default function Profile({ user, onUpdateProfile }: ProfileProps) {
  const [fullName, setFullName] = useState(user.fullName);
  const [businessName, setBusinessName] = useState(user.businessName || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [location, setLocation] = useState(user.location);
  const [whatsapp, setWhatsapp] = useState(user.whatsapp || '');
  const [facebook, setFacebook] = useState(user.facebook || '');
  const [contactEmail, setContactEmail] = useState(user.contactEmail || '');
  const [logoUrl, setLogoUrl] = useState(user.logoUrl || '');
  const [logoSource, setLogoSource] = useState<'existing' | 'uploaded' | 'url' | 'preset'>('existing');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [logoSuccess, setLogoSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType>(user.subscriptionType || 'monthly');
  const [paymentMethod, setPaymentMethod] = useState<'airtel' | 'mpamba' | 'bank' | 'card'>('airtel');
  const [paymentPhone, setPaymentPhone] = useState(user.phone || '');
  const [paymentRef, setPaymentRef] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);

  // Derived account fee and subscription info
  const subInfo = getUserSubscriptionInfo(user);
  const isCompany = user.accountType === 'company' || Boolean(user.businessName);
  const effectiveFee = selectedPlan === 'annual' ? subInfo.annualFee : subInfo.monthlyFee;
  const annualSavings = (subInfo.monthlyFee * 12) - subInfo.annualFee;
  const registrationStatus = user.registrationStatus || 'paid';
  const subscriptionStatus = user.subscriptionStatus || 'not paid';

  // Snapshot of the last-saved values, used to detect unsaved changes.
  const baseline = useRef({
    fullName: user.fullName,
    businessName: user.businessName || '',
    phone: user.phone || '',
    location: user.location,
    whatsapp: user.whatsapp || '',
    facebook: user.facebook || '',
    contactEmail: user.contactEmail || '',
    logoUrl: user.logoUrl || '',
  });

  useEffect(() => {
    setFullName(user.fullName);
    setBusinessName(user.businessName || '');
    setPhone(user.phone || '');
    setLocation(user.location);
    setWhatsapp(user.whatsapp || '');
    setFacebook(user.facebook || '');
    setContactEmail(user.contactEmail || '');
    setLogoUrl(user.logoUrl || '');
    setLogoSource('existing');
    setError(null);
    setSuccess(false);

    baseline.current = {
      fullName: user.fullName,
      businessName: user.businessName || '',
      phone: user.phone || '',
      location: user.location,
      whatsapp: user.whatsapp || '',
      facebook: user.facebook || '',
      contactEmail: user.contactEmail || '',
      logoUrl: user.logoUrl || '',
    };
  }, [user]);

  const isDirty =
    fullName !== baseline.current.fullName ||
    businessName !== baseline.current.businessName ||
    phone !== baseline.current.phone ||
    location !== baseline.current.location ||
    whatsapp !== baseline.current.whatsapp ||
    facebook !== baseline.current.facebook ||
    contactEmail !== baseline.current.contactEmail ||
    logoUrl !== baseline.current.logoUrl;

  // Warn on tab close / refresh if there are unsaved changes.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        try {
          const resized = await resizeImage(base64, 400, 400);
          const blob = dataURLtoBlob(resized);
          const url = await db.storage.uploadProfileImage(user.id, blob, file.name || 'profile-image.jpg');
          setLogoUrl(url);
          setLogoSource('uploaded');
          setLogoSuccess(true);
          setTimeout(() => setLogoSuccess(false), 3000);
        } catch (err: any) {
          console.error("Logo upload failed", err);
          setError(err.message || "Failed to upload logo.");
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

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      setError('Could not copy ID to clipboard.');
    }
  };

  const handleProcessPayment = async () => {
    setIsProcessingPayment(true);
    setError(null);
    setPaymentSuccessMsg(null);

    try {
      const channelLabel = paymentMethod === 'airtel' 
        ? 'PayChangu (Airtel Money Malawi)' 
        : paymentMethod === 'mpamba' 
        ? 'PayChangu (TNM Mpamba Malawi)' 
        : paymentMethod === 'bank' 
        ? 'PayChangu (Malawi Bank Transfer)' 
        : 'PayChangu (Debit / Credit Card)';
      
      const txRef = paymentRef.trim() || generatePayChanguTxRef('PC-AFKET');
      const planTitle = selectedPlan === 'annual' ? 'Annual Subscription (365 Days)' : 'Monthly Subscription (30 Days)';

      const paychanguRes = await triggerPayChanguPayment({
        tx_ref: txRef,
        amount: effectiveFee,
        currency: 'MWK',
        channel: paymentMethod as PayChanguChannel,
        customer: {
          email: user.email,
          first_name: user.firstName || user.fullName.split(' ')[0] || 'Trader',
          last_name: user.surname || user.fullName.split(' ').slice(1).join(' ') || 'AFKET',
          phone_number: paymentPhone.trim() || user.phone || undefined,
        },
        customization: {
          title: `AFKET Trade ${planTitle}`,
          description: `PayChangu Payment for ${effectiveFee.toLocaleString()} MWK ${planTitle}`
        }
      });

      const finalRef = paychanguRes.tx_ref;

      const updated = await db.auth.processSubscriptionPayment(
        user.id,
        {
          paymentMethod: channelLabel,
          transactionRef: finalRef,
          amount: effectiveFee,
          subscriptionType: selectedPlan,
          planType: selectedPlan,
        }
      );

      onUpdateProfile(updated);
      setPaymentSuccessMsg(`${selectedPlan === 'annual' ? 'Annual' : 'Monthly'} subscription fee of ${effectiveFee.toLocaleString()} MWK successfully verified via PayChangu Gateway! (Ref: ${finalRef})`);
      setTimeout(() => {
        setShowPaymentModal(false);
        setPaymentSuccessMsg(null);
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'PayChangu payment processing failed.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'seller': return 'bg-[#ECFCCB] text-[#365314] border-[#D9F99D]';
      case 'buyer': return 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]';
      case 'logistics_provider': return 'bg-gray-800 text-white border-transparent';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'seller': return 'Verified African Seller';
      case 'buyer': return 'Verified International Buyer';
      case 'logistics_provider': return 'Verified Logistics Coordinator';
      default: return role;
    }
  };

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const emailValid = isLikelyValidEmail(contactEmail);
  const whatsappLooksOff = !isLikelyValidWhatsapp(whatsapp);
  const facebookLooksOff = !isLikelyValidFacebookLink(facebook);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Trader Full Name is required.');
      return;
    }
    if (!location.trim()) {
      setError('HQ / Base Location is required.');
      return;
    }
    if (!emailValid) {
      setError('Business Contact Email doesn\'t look like a valid email address.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);

      const updatedUser = await db.auth.updateProfile(user.id, {
        fullName: fullName.trim(),
        businessName: businessName.trim() || undefined,
        phone: phone.trim() || undefined,
        location: location.trim(),
        whatsapp: whatsapp.trim() || undefined,
        facebook: facebook.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
      });

      onUpdateProfile(updatedUser);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="py-6 font-sans max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="text-left flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-black text-[#1F2937] tracking-tight">Your Trader Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            {user.role === 'seller'
              ? "Manage your AFKET trading credentials, business specs, and registration status."
              : "Manage your AFKET Ag-Trade business passport, trading credentials, and registration status."}
          </p>
        </div>
        {isDirty && (
          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5 flex items-center gap-1.5 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Unsaved changes
          </span>
        )}
      </div>

      {/* REGISTRATION & SUBSCRIPTION STATUS BANNER CARD */}
      <div className={`rounded-3xl p-5 sm:p-6 border text-left transition-all ${
        subInfo.isPaid
          ? 'bg-gradient-to-r from-[#F0FDF4] to-[#ECFCCB] border-emerald-200 shadow-xs'
          : subInfo.isTrialActive
          ? 'bg-gradient-to-r from-[#F7FEE7] via-[#ECFCCB]/40 to-white border-lime-300 shadow-xs'
          : 'bg-gradient-to-r from-[#FFFBEB] to-[#FEF3C7] border-amber-300 shadow-xs'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-500">
                AFKET Membership & Subscription
              </span>
              <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full border bg-emerald-600 text-white border-emerald-700">
                REGISTRATION: FREE (ACTIVE)
              </span>
              {subInfo.isPaid ? (
                <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 inline" />
                  SUBSCRIPTION FEE: {user.subscriptionType === 'annual' ? 'PAID (ANNUAL PLAN)' : 'PAID (MONTHLY PLAN)'}
                </span>
              ) : subInfo.isTrialActive ? (
                <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full border bg-amber-100 text-amber-900 border-amber-300 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-700 inline" />
                  SUBSCRIPTION FEE: NOT PAID (14-DAY TRIAL - {subInfo.daysRemaining}D LEFT)
                </span>
              ) : (
                <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full border bg-rose-600 text-white border-rose-700 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 inline" />
                  SUBSCRIPTION FEE: NOT PAID (PAYMENT DUE)
                </span>
              )}
              <span className="text-[10px] font-mono font-bold text-[#365314] bg-lime-100 px-2 py-0.5 rounded-md border border-lime-200">
                {subInfo.tierLabel}
              </span>
            </div>

            <h3 className="text-lg font-black text-[#1F2937]">
              {subInfo.isPaid
                ? `Active ${user.subscriptionType === 'annual' ? 'Annual' : 'Monthly'} Trade Subscription (${user.subscriptionType === 'annual' ? subInfo.annualFee.toLocaleString() + ' MWK/yr' : subInfo.monthlyFee.toLocaleString() + ' MWK/mo'})`
                : subInfo.isTrialActive
                ? `14-Day Free Trial Period Active (${subInfo.daysRemaining} ${subInfo.daysRemaining === 1 ? 'day' : 'days'} remaining)`
                : `Subscription Fee Due: Choose Monthly (${subInfo.monthlyFee.toLocaleString()} MWK) or Annual (${subInfo.annualFee.toLocaleString()} MWK)`}
            </h3>

            <p className="text-xs text-gray-600 max-w-2xl font-medium">
              {subInfo.isPaid ? (
                <span>
                  Subscription renewed via <strong>{user.lastSubscriptionPaymentMethod || user.registrationPaymentMethod || 'PayChangu Gateway'}</strong>.
                  {user.lastSubscriptionPaymentRef && <> Ref: <code className="bg-white/80 px-1.5 py-0.5 rounded text-[11px] font-bold">{user.lastSubscriptionPaymentRef}</code>.</>}
                  {' '}Valid until <strong>{subInfo.formattedDueDate}</strong> ({user.subscriptionType === 'annual' ? '365 Days Plan' : '30 Days Plan'}). Your account has complete access to cross-border matchmaking, escrow contracts, and logistics dispatch.
                </span>
              ) : subInfo.isTrialActive ? (
                <span>
                  You are currently enjoying your <strong>14-day free trial</strong> with full enterprise privileges! You can subscribe on a monthly plan (<strong>{subInfo.monthlyFee.toLocaleString()} MWK/month</strong>) or save money on our discounted annual plan (<strong>{subInfo.annualFee.toLocaleString()} MWK/year</strong>). Your payment is due on <strong>{subInfo.formattedDueDate}</strong>.
                </span>
              ) : (
                <span>
                  Your 14-day free trial has concluded. Settle your subscription ({subInfo.monthlyFee.toLocaleString()} MWK/mo or save with {subInfo.annualFee.toLocaleString()} MWK/yr) via PayChangu to keep your trade listings and freight operations active.
                </span>
              )}
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              id="btn-profile-pay-subscription"
              onClick={() => setShowPaymentModal(true)}
              className="bg-[#D97706] hover:bg-[#b45309] active:bg-[#92400E] text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Coins className="h-4 w-4" />
              <span>
                {subInfo.isPaid 
                  ? 'Renew / Switch Plan' 
                  : subInfo.isTrialActive
                  ? 'Subscribe (Monthly / Annual)'
                  : 'Pay Now & Activate'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Form: Edit Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs text-left relative overflow-hidden">
            
            <h2 className="text-lg font-bold text-[#1F2937] mb-6 flex items-center">
              <ShieldCheck className="h-5 w-5 text-[#D97706] mr-2" />
              Trade Base Specifications
            </h2>

            {error && (
              <div className="bg-[#FEF2F2] border border-[#FEE2E2] text-red-800 text-xs rounded-xl p-3.5 mb-4 flex items-center font-medium animate-fade-in">
                <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-[#ECFCCB] border border-[#D9F99D] text-[#365314] text-xs rounded-xl p-3.5 mb-4 flex items-center font-medium animate-fade-in">
                <Check className="h-4 w-4 mr-2 shrink-0" />
                <span>Trade credentials successfully updated! Changes are live in the Pan-African directory.</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Email Address (Read-only)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={user.email}
                      disabled
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-400 cursor-not-allowed font-mono pl-10"
                    />
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">Account credentials are permanently locked to this email address.</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Assigned Platform Role</label>
                  <div className={`w-full border rounded-xl px-3 py-2.5 flex items-center justify-between ${getRoleColor(user.role)}`}>
                    <span className="text-xs font-bold uppercase tracking-wider">{getRoleLabel(user.role)}</span>
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">Role definitions can only be altered by AFKET customs.</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <label className="text-xs font-bold text-gray-700 block mb-1">Trader Full Name *</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Kwame Mensah"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706] pl-10 font-medium"
                    required
                  />
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Business / Cooperative / Company Name</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. West African Cocoa Cooperative"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706] pl-10"
                  />
                  <Building className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                </div>
                <span className="text-[10px] text-gray-400 mt-1 block">Your registered company name displayed on listings, invoices, and trade routes.</span>
              </div>

              <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100/60 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 block">Company / Business Logo</label>
                  {logoUrl && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                      {logoSource === 'uploaded' && 'Using uploaded file'}
                      {logoSource === 'url' && 'Using custom URL'}
                      {logoSource === 'preset' && 'Using preset'}
                      {logoSource === 'existing' && 'Current logo'}
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-5">
                  <div className="relative shrink-0">
                    {isUploadingLogo ? (
                      <div className="w-16 h-16 rounded-xl border border-gray-200 bg-white flex items-center justify-center shadow-2xs">
                        <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
                      </div>
                    ) : logoUrl ? (
                      <div className="w-16 h-16 rounded-xl border border-gray-200 bg-white overflow-hidden flex items-center justify-center group relative shadow-2xs">
                        <img 
                          src={logoUrl} 
                          alt="Company Logo" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => { setLogoUrl(''); setLogoSource('existing'); }}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition-opacity cursor-pointer duration-150"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-400">
                        <Building className="h-5 w-5" />
                        <span className="text-[9px] mt-1 font-medium">No Logo</span>
                      </div>
                    )}
                    {logoSuccess && (
                      <span className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-0.5 shadow-sm">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>

                  <div className="flex-grow space-y-3 w-full">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <label className={`bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300 font-bold text-xs px-3 py-2 rounded-xl transition flex items-center justify-center space-x-1.5 shadow-3xs shrink-0 ${isUploadingLogo ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
                        {isUploadingLogo ? (
                          <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
                        ) : (
                          <UploadCloud className="h-4 w-4 text-gray-500" />
                        )}
                        <span>{isUploadingLogo ? 'Uploading Logo...' : 'Upload Custom Logo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={isUploadingLogo}
                          className="hidden"
                        />
                      </label>
                      <input
                        type="url"
                        placeholder="Or paste direct image URL..."
                        value={logoSource === 'url' || logoSource === 'existing' ? logoUrl : ''}
                        onChange={(e) => { setLogoUrl(e.target.value); setLogoSource('url'); }}
                        disabled={isUploadingLogo}
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706] disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Or Select a Premium Agricultural Preset:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {LOGO_PRESETS.map((preset, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => { setLogoUrl(preset.url); setLogoSource('preset'); }}
                            className={`px-2.5 py-1 rounded-lg border text-[10px] font-semibold transition flex items-center space-x-1 cursor-pointer ${
                              logoUrl === preset.url
                                ? 'bg-amber-50 text-[#D97706] border-amber-300 ring-1 ring-amber-300 font-bold'
                                : 'bg-white text-gray-600 border-gray-100 hover:border-gray-200'
                            }`}
                          >
                            <span>{preset.icon}</span>
                            <span>{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">HQ / Base Location *</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Lilongwe, Malawi"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706] pl-10"
                      required
                    />
                    <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Contact Phone Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. +265 999 123456"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706] pl-10"
                    />
                    <div className="absolute left-3.5 top-3 flex items-center justify-center">
                      <CallLogo className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">WhatsApp Number / Link</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. +265999123456"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className={`w-full bg-[#FAF9F6] border rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-hidden focus:ring-2 pl-10 ${whatsappLooksOff ? 'border-amber-300 focus:ring-amber-400' : 'border-gray-200 focus:ring-[#D97706]'}`}
                    />
                    <div className="absolute left-3.5 top-3 flex items-center justify-center">
                      <WhatsAppLogo className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Facebook Profile Link</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. facebook.com/username"
                      value={facebook}
                      onChange={(e) => setFacebook(e.target.value)}
                      className={`w-full bg-[#FAF9F6] border rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-hidden focus:ring-2 pl-10 ${facebookLooksOff ? 'border-amber-300 focus:ring-amber-400' : 'border-gray-200 focus:ring-[#D97706]'}`}
                    />
                    <div className="absolute left-3.5 top-3 flex items-center justify-center">
                      <FacebookLogo className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Business Contact Email</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. sales@yourbusiness.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className={`w-full bg-[#FAF9F6] border rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-hidden focus:ring-2 pl-10 ${!emailValid ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-[#D97706]'}`}
                    />
                    <div className="absolute left-3.5 top-3 flex items-center justify-center">
                      <EmailLogo className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
                {isDirty && !isSaving && (
                  <span className="text-[11px] text-gray-400 font-medium">You have unsaved changes</span>
                )}
                <button
                  type="submit"
                  disabled={isSaving || !isDirty}
                  className="bg-[#D97706] hover:bg-[#b45309] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold text-sm px-6 py-3 rounded-xl transition cursor-pointer flex items-center justify-center space-x-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving Profile Details...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Save Profile Details</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Digital Passport Preview & Meta */}
        <div className="space-y-6">
          
          {/* Virtual Ag-Trade Passport Card */}
          <div className="bg-[#1F2937] text-white rounded-3xl p-6 border border-gray-800 shadow-xl relative overflow-hidden text-left flex flex-col justify-between min-h-[360px] group transition-all duration-300 hover:shadow-2xl">
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-[#D97706]/15 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-[#365314]/25 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-500" />
            
            {/* Passport Header */}
            <div className="relative">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-mono text-amber-500 font-bold block">AFKET Ag-Trade Passport</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="text-xs text-gray-400 font-mono flex items-center gap-1 hover:text-gray-200 transition cursor-pointer group/copy"
                    title="Copy full ID"
                  >
                    <span className="truncate max-w-[160px]">ID: {user.id}</span>
                    {copiedId ? (
                      <CheckCheck className="h-3 w-3 text-emerald-400 shrink-0" />
                    ) : (
                      <Copy className="h-3 w-3 shrink-0 opacity-60 group-hover/copy:opacity-100" />
                    )}
                  </button>
                </div>
                <div className={`px-2 py-1 rounded-lg border flex items-center space-x-1 shrink-0 ${
                  registrationStatus === 'paid'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  <Sparkles className="h-3 w-3" />
                  <span className="text-[9px] font-mono uppercase font-black tracking-wider">
                    {registrationStatus === 'paid' ? 'Verified Member' : 'Unpaid Member'}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 flex items-center space-x-4">
                {logoUrl ? (
                  <div className="w-14 h-14 rounded-2xl bg-white border border-amber-500 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
                    <img 
                      src={logoUrl} 
                      alt="Company Logo" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-[#365314] border border-amber-500 flex items-center justify-center text-white font-black text-xl shadow-md font-sans shrink-0">
                    {initials}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg leading-tight text-white">{fullName || 'Unknown Trader'}</h3>
                  <div className="flex items-center space-x-1.5 mt-1">
                    <Briefcase className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="text-xs text-gray-300 font-medium capitalize">{user.role.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Passport Info Specs */}
            <div className="border-t border-gray-800 pt-4 mt-6 space-y-2 text-xs font-mono relative">
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">REG. STATUS:</span>
                <span className="font-bold text-emerald-400">
                  FREE / 100% SUBSIDIZED
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">SUBSCRIPTION:</span>
                <span className={`font-bold ${subscriptionStatus === 'paid' ? 'text-emerald-400' : subInfo.isTrialActive ? 'text-amber-400' : 'text-rose-400'}`}>
                  {subscriptionStatus === 'paid' ? 'PAID / ACTIVE' : subInfo.isTrialActive ? `NOT PAID (14D TRIAL - ${subInfo.daysRemaining}D)` : 'NOT PAID (PAYMENT DUE)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">PLAN TYPE:</span>
                <span className="text-gray-200 font-medium uppercase">
                  {user.subscriptionType === 'annual' ? 'Annual Plan (365 Days)' : 'Monthly Plan (30 Days)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">EXPIRES / DUE:</span>
                <span className="text-gray-200 font-medium">{subInfo.formattedDueDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">ENTITY TIER:</span>
                <span className="text-gray-200 font-medium truncate max-w-[160px]">
                  {subInfo.tierLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">HQ/BASE:</span>
                <span className="text-gray-200 font-medium">{location || 'UNSPECIFIED'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">TELEPHONE:</span>
                <span className="text-gray-200 font-medium">{phone || 'N/A'}</span>
              </div>
            </div>

            {/* Passport Footer */}
            <div className="border-t border-gray-800/60 pt-4 mt-4 flex items-center justify-between text-[10px] text-gray-500 font-mono relative">
              <span>AFKET CUSTOMS AUTHORITY</span>
              <QrCode className="h-6 w-6 text-gray-400" />
            </div>
          </div>

          {/* Trade Guidelines & Support Card */}
          <div className="bg-[#ECFCCB]/70 text-[#365314] rounded-3xl p-6 border border-[#D9F99D] text-left space-y-3">
            <h4 className="font-sans font-black text-sm uppercase tracking-tight flex items-center gap-1.5">
              <span>🌾 Malawian Ag-Trade Rates & Support</span>
            </h4>
            <p className="text-xs leading-relaxed opacity-95 font-medium">
              Registration on AFKET is 100% free with a 14-day trial. Settle your subscription to maintain active verified listings:
            </p>
            <div className="bg-white/80 rounded-2xl p-3 border border-[#D9F99D] text-xs space-y-1.5">
              <div className="flex justify-between font-bold text-gray-800">
                <span>Companies & Logistics:</span>
                <span>15,000 MWK/mo <span className="text-[#365314]">or 150,000 MWK/yr</span></span>
              </div>
              <div className="flex justify-between font-bold text-gray-800">
                <span>Solo Traders & Cooperatives:</span>
                <span>10,000 MWK/mo <span className="text-[#365314]">or 110,000 MWK/yr</span></span>
              </div>
              <div className="text-[10px] text-[#365314] font-extrabold pt-0.5">
                ★ Annual subscription grants 365 days access and saves up to 30,000 MWK.
              </div>
            </div>

            {/* Contact support inside guidelines */}
            <div className="pt-2 border-t border-[#D9F99D] flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-[#1F2937]">Need help? Contact Malawian Support:</span>
              <div className="flex items-center space-x-1.5">
                <a
                  href={`mailto:${AFKET_SUPPORT.email}`}
                  className="h-7 w-7 rounded-lg bg-white hover:bg-red-50 border border-lime-300 flex items-center justify-center transition shadow-2xs cursor-pointer p-1"
                  title="Email AFKET Support"
                  aria-label="Email Support"
                >
                  <EmailLogo className="h-4 w-4" />
                </a>
                <a
                  href={AFKET_SUPPORT.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-7 w-7 rounded-lg bg-white hover:bg-emerald-50 border border-emerald-300 flex items-center justify-center transition shadow-2xs cursor-pointer p-1"
                  title="Chat on WhatsApp"
                  aria-label="WhatsApp Support"
                >
                  <WhatsAppLogo className="h-4 w-4" />
                </a>
                <a
                  href={AFKET_SUPPORT.phoneTel}
                  className="h-7 w-7 rounded-lg bg-white hover:bg-emerald-50 border border-emerald-300 flex items-center justify-center transition shadow-2xs cursor-pointer p-1"
                  title="Call Support Helpline"
                  aria-label="Phone Call Support"
                >
                  <CallLogo className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* REGISTRATION & SUBSCRIPTION PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full text-left shadow-2xl relative border border-gray-100 animate-scale-up max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-[#365314] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                PC
              </div>
              <div>
                <h3 className="text-xl font-black text-[#1F2937]">AFKET Subscription Checkout</h3>
                <span className="text-xs text-gray-500 font-medium">
                  {subInfo.tierLabel} • Powered by PayChangu Malawi Gateway
                </span>
              </div>
            </div>

            {paymentSuccessMsg ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl p-4 mb-4 flex items-center space-x-3 font-bold">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                <span>{paymentSuccessMsg}</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Plan Selection Toggle (Monthly vs Annual) */}
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
                    Choose Subscription Billing Plan
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Monthly Plan Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('monthly')}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer relative ${
                        selectedPlan === 'monthly'
                          ? 'border-[#365314] bg-[#F7FEE7] ring-2 ring-[#365314]/30'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-gray-900">Monthly Plan</span>
                        <Calendar className="h-3.5 w-3.5 text-gray-500" />
                      </div>
                      <div className="text-base font-black text-[#1F2937]">
                        {subInfo.monthlyFee.toLocaleString()} <span className="text-[11px] font-bold text-gray-500">MWK/mo</span>
                      </div>
                      <span className="text-[10px] text-gray-500 block mt-0.5">30-day active cycle</span>
                    </button>

                    {/* Annual Plan Option */}
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('annual')}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer relative ${
                        selectedPlan === 'annual'
                          ? 'border-[#D97706] bg-[#FFFBEB] ring-2 ring-[#D97706]/30'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <span className="absolute -top-2.5 right-2 bg-[#D97706] text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full shadow-2xs">
                        Save {annualSavings.toLocaleString()} MWK
                      </span>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-[#92400E]">Annual Plan</span>
                        <Zap className="h-3.5 w-3.5 text-[#D97706]" />
                      </div>
                      <div className="text-base font-black text-[#1F2937]">
                        {subInfo.annualFee.toLocaleString()} <span className="text-[11px] font-bold text-[#D97706]">MWK/yr</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">365-day full year access</span>
                    </button>
                  </div>
                </div>

                {/* Pricing Summary Card */}
                <div className="bg-gradient-to-br from-[#FAF9F6] to-[#FFFBEB] border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500 block">
                      {selectedPlan === 'annual' ? 'Annual Subscription Total (365 Days):' : 'Monthly Subscription Total (30 Days):'}
                    </span>
                    <strong className="text-2xl sm:text-3xl font-black text-[#1F2937]">
                      {effectiveFee.toLocaleString()} <span className="text-sm font-bold text-[#D97706]">MWK</span>
                    </strong>
                    {selectedPlan === 'annual' && (
                      <span className="text-[11px] text-emerald-700 font-bold block">
                        ✓ Discount applied (Save {annualSavings.toLocaleString()} MWK vs monthly)
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold bg-amber-100 text-[#92400E] px-3 py-1.5 rounded-full border border-amber-200 shrink-0">
                    PayChangu Gateway
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                      PayChangu Payment Channel
                    </label>
                    <span className="text-[10px] text-gray-500 font-medium">Airtel • Mpamba • Card • Bank</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('airtel')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        paymentMethod === 'airtel'
                          ? 'border-[#D97706] bg-red-50/40 ring-2 ring-[#D97706]/20'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-red-600">Airtel Money</span>
                        <Wallet className="h-3.5 w-3.5 text-red-500" />
                      </div>
                      <span className="text-[10px] text-gray-500 block">Instant *211# Mobile Push</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('mpamba')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        paymentMethod === 'mpamba'
                          ? 'border-[#D97706] bg-green-50/40 ring-2 ring-[#D97706]/20'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-emerald-600">TNM Mpamba</span>
                        <Wallet className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                      <span className="text-[10px] text-gray-500 block">Instant *444# Push</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bank')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        paymentMethod === 'bank'
                          ? 'border-[#D97706] bg-blue-50/40 ring-2 ring-[#D97706]/20'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-blue-700">Bank / Mo626</span>
                        <Building className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <span className="text-[10px] text-gray-500 block">NBM, Standard Bank, NBS</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        paymentMethod === 'card'
                          ? 'border-[#D97706] bg-amber-50/40 ring-2 ring-[#D97706]/20'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-gray-900">Visa / Mastercard</span>
                        <CreditCard className="h-3.5 w-3.5 text-gray-600" />
                      </div>
                      <span className="text-[10px] text-gray-500 block">PayChangu 3D Secure</span>
                    </button>
                  </div>
                </div>

                <div className="bg-[#FAF9F6] border border-gray-200 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-gray-700 font-bold border-b border-gray-200/80 pb-1.5">
                    <span>
                      {paymentMethod === 'airtel' && '🇲🇼 PayChangu Airtel Money Gateway'}
                      {paymentMethod === 'mpamba' && '🇲🇼 PayChangu TNM Mpamba Gateway'}
                      {paymentMethod === 'bank' && '🏦 PayChangu Bank Rails & Mo626'}
                      {paymentMethod === 'card' && '💳 PayChangu Secure Card Rails'}
                    </span>
                    <span className="text-[10px] font-mono text-[#365314] font-bold uppercase bg-lime-100 px-2 py-0.5 rounded">
                      PayChangu Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-gray-600 block mb-1">
                        Payer Phone / Account Number
                      </label>
                      <input
                        type="text"
                        placeholder="+265 999 000 000"
                        value={paymentPhone}
                        onChange={(e) => setPaymentPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-[#D97706]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-gray-600 block">
                          PayChangu Reference ID
                        </label>
                        <button
                          type="button"
                          onClick={() => setPaymentRef(generatePayChanguTxRef('PC-AFKET'))}
                          className="text-[9px] font-bold text-[#D97706] hover:underline cursor-pointer"
                        >
                          Generate
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. PC-AFKET-849201-382910"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono font-medium focus:ring-1 focus:ring-[#D97706]"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold text-xs hover:bg-gray-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-submit-profile-payment"
                    type="button"
                    onClick={handleProcessPayment}
                    disabled={isProcessingPayment}
                    className="bg-[#365314] hover:bg-[#224411] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm flex items-center space-x-1.5 cursor-pointer"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Connecting to PayChangu ({effectiveFee.toLocaleString()} MWK)...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Pay {effectiveFee.toLocaleString()} MWK ({selectedPlan === 'annual' ? 'Annual Plan' : 'Monthly Plan'})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
