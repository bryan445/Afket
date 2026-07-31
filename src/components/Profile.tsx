import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { db } from '../lib/supabase';
import { 
  User, 
  Building, 
  MapPin, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  Loader2,
  Briefcase,
  QrCode,
  Globe,
  Sparkles,
  Facebook,
  MessageCircle,
  UploadCloud,
  Copy,
  CheckCheck,
  Lock
} from 'lucide-react';

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
  if (!value) return true; // optional field
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
          const url = await db.auth.uploadLogo(user.id, blob, file.name);
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
              ? "Manage your AFKET trading credentials, business specs, and corporate identity."
              : "Manage your AFKET Ag-Trade business passport, trading credentials, and corporate identity."}
          </p>
        </div>
        {isDirty && (
          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5 flex items-center gap-1.5 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Unsaved changes
          </span>
        )}
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
                  {/* Logo Preview */}
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

                  {/* Inputs and Presets */}
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
                    {(logoSource === 'uploaded' || logoSource === 'preset') && (
                      <span className="text-[10px] text-gray-400 block">
                        Typing in the URL field above will replace your {logoSource === 'uploaded' ? 'uploaded file' : 'selected preset'}.
                      </span>
                    )}

                    {/* Presets Grid */}
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
                      placeholder="e.g. Abidjan, Ivory Coast"
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
                      placeholder="e.g. +225 07 123456"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706] pl-10"
                    />
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">WhatsApp Number / Link</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. +22507123456"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className={`w-full bg-[#FAF9F6] border rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-hidden focus:ring-2 pl-10 ${whatsappLooksOff ? 'border-amber-300 focus:ring-amber-400' : 'border-gray-200 focus:ring-[#D97706]'}`}
                    />
                    <MessageCircle className="absolute left-3.5 top-3 h-4 w-4 text-emerald-500" />
                  </div>
                  {whatsappLooksOff && (
                    <span className="text-[10px] text-amber-600 mt-1 block">This doesn't look like a phone number or wa.me link — double-check it.</span>
                  )}
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
                    <Facebook className="absolute left-3.5 top-3 h-4 w-4 text-blue-600" />
                  </div>
                  {facebookLooksOff && (
                    <span className="text-[10px] text-amber-600 mt-1 block">This doesn't look like a Facebook link or username — double-check it.</span>
                  )}
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
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-rose-500" />
                  </div>
                  {!emailValid && (
                    <span className="text-[10px] text-red-600 mt-1 block">This doesn't look like a valid email address.</span>
                  )}
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
                      <span>{user.role === 'seller' ? "Saving Profile..." : "Saving Passport..."}</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{user.role === 'seller' ? "Save Profile Details" : "Save Trade Passport"}</span>
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
          <div className="bg-[#1F2937] text-white rounded-3xl p-6 border border-gray-800 shadow-xl relative overflow-hidden text-left flex flex-col justify-between min-h-[340px] group transition-all duration-300 hover:shadow-2xl">
            {/* Ambient Background decoration */}
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
                <div className="bg-amber-500/10 text-amber-400 px-2 py-1 rounded-lg border border-amber-500/20 flex items-center space-x-1 shrink-0">
                  <Sparkles className="h-3 w-3" />
                  <span className="text-[9px] font-mono uppercase font-black tracking-wider">Active</span>
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
                <span className="text-gray-500 font-bold">COOPERATIVE:</span>
                <span className="text-gray-200 font-medium truncate max-w-[160px]">{businessName || 'INDEPENDENT TRADER'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">HQ/BASE:</span>
                <span className="text-gray-200 font-medium">{location || 'UNSPECIFIED'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">TELEPHONE:</span>
                <span className="text-gray-200 font-medium">{phone || 'N/A'}</span>
              </div>
              {whatsapp && (
                <div className="flex justify-between">
                  <span className="text-emerald-500 font-bold">WHATSAPP:</span>
                  <span className="text-gray-200 font-medium truncate max-w-[160px]">{whatsapp}</span>
                </div>
              )}
              {facebook && (
                <div className="flex justify-between">
                  <span className="text-blue-400 font-bold">FACEBOOK:</span>
                  <span className="text-gray-200 font-medium truncate max-w-[160px]">{facebook}</span>
                </div>
              )}
              {contactEmail && (
                <div className="flex justify-between">
                  <span className="text-rose-400 font-bold">CON. EMAIL:</span>
                  <span className="text-gray-200 font-medium truncate max-w-[160px]">{contactEmail}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">DIRECTORY:</span>
                <span className="text-amber-500 font-bold flex items-center">
                  <Globe className="h-3 w-3 mr-1 animate-pulse" />
                  LIVE SEARCHABLE
                </span>
              </div>
            </div>

            {/* Passport Footer */}
            <div className="border-t border-gray-800/60 pt-4 mt-4 flex items-center justify-between text-[10px] text-gray-500 font-mono relative">
              <span>AFKET CUSTOMS AUTHORITY</span>
              <QrCode className="h-6 w-6 text-gray-400" />
            </div>
          </div>

          {/* Trade Guidelines Card (single instance, shown to all roles) */}
          <div className="bg-[#ECFCCB]/60 text-[#365314] rounded-3xl p-6 border border-[#ECFCCB] text-left">
            <h4 className="font-sans font-black text-sm mb-2 uppercase tracking-tight">🌾 Trust & Verification Policy</h4>
            <p className="text-xs leading-relaxed opacity-90 font-medium">
              AFKET guarantees direct transactions between genuine growers and reliable bulk buyers. Keeping your HQ location and phone up-to-date enables quick logistics routing and seamless escrow setup.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}