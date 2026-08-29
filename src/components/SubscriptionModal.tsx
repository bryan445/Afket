import React, { useState } from 'react';
import { UserProfile, SubscriptionType, getSubscriptionFees, getUserSubscriptionInfo } from '../types';
import { db } from '../lib/supabase';
import { triggerPayChanguPayment, generatePayChanguTxRef, PayChanguChannel } from '../lib/paychangu';
import { X, Check, Lock, AlertCircle, CreditCard, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import { AirtelMoneyLogo, MpambaLogo, MalawiBanksLogo, VisaMastercardLogo } from './BrandIcons';

interface SubscriptionModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedUser: UserProfile) => void;
  onNavigateTab?: (tab: string) => void;
  customTitle?: string;
  customSubtitle?: string;
  customMessage?: string;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
  onNavigateTab,
  customTitle,
  customSubtitle,
  customMessage,
}) => {
  const subInfo = getUserSubscriptionInfo(user);
  const fees = getSubscriptionFees(user.role, user.accountType, user.businessName);

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionType>(user.subscriptionType || 'monthly');
  const [paymentMethod, setPaymentMethod] = useState<'airtel' | 'mpamba' | 'bank' | 'card'>('airtel');
  const [paymentPhone, setPaymentPhone] = useState(user.phone || '');
  const [paymentRef, setPaymentRef] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentAmount = selectedPlan === 'annual' ? fees.annual : fees.monthly;

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const channelLabel = paymentMethod === 'airtel' 
        ? 'Airtel Money (Malawi)' 
        : paymentMethod === 'mpamba' 
        ? 'TNM Mpamba (Malawi)' 
        : paymentMethod === 'bank' 
        ? 'Bank Transfer (Malawi)' 
        : 'Debit / Credit Card';
      
      const txRef = paymentRef.trim() || generatePayChanguTxRef('TX-AFKET');
      const planTitle = selectedPlan === 'annual' ? 'Annual Subscription (365 Days)' : 'Monthly Subscription (30 Days)';

      const paychanguRes = await triggerPayChanguPayment({
        tx_ref: txRef,
        amount: currentAmount,
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
          description: `Payment for ${currentAmount.toLocaleString()} MWK ${planTitle}`
        }
      });

      const finalRef = paychanguRes.tx_ref;

      const updated = await db.auth.processSubscriptionPayment(
        user.id,
        {
          paymentMethod: channelLabel,
          transactionRef: finalRef,
          amount: currentAmount,
          subscriptionType: selectedPlan,
          planType: selectedPlan,
        }
      );

      setSuccessMsg(`Subscription activated! ${selectedPlan === 'annual' ? 'Annual' : 'Monthly'} access granted (Ref: ${finalRef}). You can now upload products.`);
      if (onSuccess) {
        onSuccess(updated);
      }
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1600);
    } catch (err: any) {
      setError(err.message || 'Payment processing failed. Please try again or contact support.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-gray-100 shadow-2xl text-left relative animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-3 sm:mb-5 pb-2.5 sm:pb-4 border-b border-gray-100">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200 shadow-2xs">
              <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-xl font-bold text-gray-900 tracking-tight">
                {customTitle || 'Subscription Required'}
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-500 font-medium mt-0.5">
                {customSubtitle || 'Activate or renew your subscription to access all trade features.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-gray-700 hover:text-gray-950 bg-gray-100 hover:bg-gray-200 border border-gray-300 p-2 sm:p-2.5 rounded-full transition shadow-xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-amber-500 shrink-0"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Status Notice */}
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 mb-3 sm:mb-5 text-[11px] sm:text-xs text-amber-900">
          <div className="font-bold flex items-center mb-0.5 sm:mb-1">
            <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5 text-amber-700 shrink-0" />
            <span className="capitalize">{customTitle || 'Subscription Required'}</span>
          </div>
          <p className="leading-snug sm:leading-relaxed font-medium">
            {customMessage
              ? customMessage
              : subInfo.isDue
              ? `Your 1-month free trial or previous subscription expired on ${subInfo.formattedDueDate}. Please renew your subscription to continue trade operations.`
              : `To access premium trade and communication features, please activate your ${fees.tierLabel} subscription below.`}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] sm:text-xs rounded-xl p-2.5 sm:p-3 mb-3 sm:mb-4 flex items-center">
            <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] sm:text-xs rounded-xl p-2.5 sm:p-3 mb-3 sm:mb-4 flex items-center font-bold">
            <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleProcessPayment} className="space-y-2.5 sm:space-y-4">
          {/* Plan Selector */}
          <div>
            <label className="text-[11px] sm:text-xs font-bold text-gray-700 block mb-1.5 sm:mb-2">Select Subscription Billing Cycle</label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setSelectedPlan('monthly')}
                className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition cursor-pointer relative ${
                  selectedPlan === 'monthly'
                    ? 'border-[#D97706] bg-amber-50/50 ring-1 ring-[#D97706]'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 block uppercase tracking-wider">Monthly Plan</span>
                <span className="text-sm sm:text-base font-black text-gray-900 font-mono block mt-0.5">
                  {fees.monthly.toLocaleString()} <span className="text-[10px] sm:text-xs font-normal text-gray-500">MWK</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-gray-500 font-medium block mt-0.5 sm:mt-1">30 Days Active Access</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan('annual')}
                className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border text-left transition cursor-pointer relative ${
                  selectedPlan === 'annual'
                    ? 'border-[#D97706] bg-amber-50/50 ring-1 ring-[#D97706]'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-emerald-600 text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center">
                  <Sparkles className="h-2 w-2 sm:h-2.5 sm:w-2.5 mr-0.5" /> Save 10k
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 block uppercase tracking-wider">Annual Plan</span>
                <span className="text-sm sm:text-base font-black text-gray-900 font-mono block mt-0.5">
                  {fees.annual.toLocaleString()} <span className="text-[10px] sm:text-xs font-normal text-gray-500">MWK</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-gray-500 font-medium block mt-0.5 sm:mt-1">365 Days (Full Year)</span>
              </button>
            </div>
          </div>

          {/* Payment Method Selector - Compact Logos Only */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] sm:text-xs font-bold text-gray-700 block">
                Select Payment Channel
              </label>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
                {paymentMethod === 'airtel' && '🇲🇼 Airtel Money (*211#)'}
                {paymentMethod === 'mpamba' && '🇲🇼 TNM Mpamba (*444#)'}
                {paymentMethod === 'bank' && '🏦 Bank (NBM / Standard / NBS)'}
                {paymentMethod === 'card' && '💳 Card (Visa / Mastercard)'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {/* Airtel Logo Button */}
              <button
                type="button"
                onClick={() => setPaymentMethod('airtel')}
                title="Pay with Airtel Money"
                className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer flex items-center justify-center relative ${
                  paymentMethod === 'airtel'
                    ? 'border-red-600 bg-red-50/70 ring-2 ring-red-500/40 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                <AirtelMoneyLogo className="h-6 sm:h-7.5 w-auto max-w-full" />
                {paymentMethod === 'airtel' && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow-2xs">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
              </button>

              {/* TNM Mpamba Logo Button */}
              <button
                type="button"
                onClick={() => setPaymentMethod('mpamba')}
                title="Pay with TNM Mpamba"
                className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer flex items-center justify-center relative ${
                  paymentMethod === 'mpamba'
                    ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/40 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                <MpambaLogo className="h-6 sm:h-7.5 w-auto max-w-full" />
                {paymentMethod === 'mpamba' && (
                  <span className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white rounded-full p-0.5 shadow-2xs">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
              </button>

              {/* Bank Transfer Logo Button */}
              <button
                type="button"
                onClick={() => setPaymentMethod('bank')}
                title="Pay with Bank Transfer / Mo626"
                className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer flex items-center justify-center relative ${
                  paymentMethod === 'bank'
                    ? 'border-slate-800 bg-slate-100 ring-2 ring-slate-700/40 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                <MalawiBanksLogo className="h-6 sm:h-7.5 w-auto max-w-full" />
                {paymentMethod === 'bank' && (
                  <span className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white rounded-full p-0.5 shadow-2xs">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
              </button>

              {/* Card (Visa / Mastercard) Logo Button */}
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                title="Pay with Visa or Mastercard"
                className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer flex items-center justify-center relative ${
                  paymentMethod === 'card'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/40 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                }`}
              >
                <VisaMastercardLogo className="h-6 sm:h-7.5 w-auto max-w-full" />
                {paymentMethod === 'card' && (
                  <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white rounded-full p-0.5 shadow-2xs">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Phone Number / Account Input */}
          <div>
            <label className="text-[11px] sm:text-xs font-bold text-gray-700 block mb-1">
              {paymentMethod === 'airtel' ? 'Airtel Money Phone Number' : paymentMethod === 'mpamba' ? 'TNM Mpamba Phone Number' : 'Payer Contact / Phone'}
            </label>
            <input
              type="tel"
              placeholder="e.g. 0999 123 456 or +265 888 123 456"
              value={paymentPhone}
              onChange={(e) => setPaymentPhone(e.target.value)}
              className="w-full bg-[#FAF9F6] border border-gray-200 rounded-lg sm:rounded-xl px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-xs text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
            />
          </div>

          {/* Action Buttons - Distinct, High Contrast Pay & Cancel Buttons */}
          <div className="pt-2 sm:pt-4 flex gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 hover:border-gray-400 text-gray-800 font-extrabold text-xs sm:text-sm py-2.5 sm:py-3.5 rounded-xl transition cursor-pointer text-center shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-2 bg-gradient-to-r from-[#D97706] to-[#B45309] hover:from-[#B45309] hover:to-[#92400E] active:scale-[0.99] disabled:opacity-60 text-white font-black text-xs sm:text-sm py-2.5 sm:py-3.5 px-4 rounded-xl transition cursor-pointer flex items-center justify-center space-x-2 shadow-md border border-amber-600 ring-2 ring-amber-400/20"
            >
              {isProcessing ? (
                <>
                  <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="truncate">Processing Payment...</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 shrink-0 text-amber-200" />
                  <span className="truncate">Pay {currentAmount.toLocaleString()} MWK Now</span>
                </>
              )}
            </button>
          </div>
        </form>

        {onNavigateTab && (
          <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-gray-100 text-center">
            <button
              onClick={() => {
                onClose();
                onNavigateTab('profile');
              }}
              className="text-[11px] sm:text-xs text-gray-500 hover:text-gray-800 font-medium underline cursor-pointer"
            >
              Manage subscription from Profile Settings →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionModal;
