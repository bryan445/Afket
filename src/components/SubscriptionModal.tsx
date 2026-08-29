import React, { useState } from 'react';
import { UserProfile, SubscriptionType, getSubscriptionFees, getUserSubscriptionInfo } from '../types';
import { db } from '../lib/supabase';
import { triggerPayChanguPayment, generatePayChanguTxRef, PayChanguChannel } from '../lib/paychangu';
import { X, Check, Lock, AlertCircle, CreditCard, ShieldCheck, Zap, Sparkles } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-2xl text-left relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-5 pb-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="h-11 w-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200 shadow-xs">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                {customTitle || 'Subscription Required'}
              </h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {customSubtitle || 'Activate or renew your subscription to access all trade features.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Notice */}
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 mb-5 text-xs text-amber-900">
          <div className="font-bold flex items-center mb-1">
            <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-amber-700 shrink-0" />
            <span className="capitalize">{customTitle || 'Subscription Required'}</span>
          </div>
          <p className="leading-relaxed font-medium">
            {customMessage
              ? customMessage
              : subInfo.isDue
              ? `Your 1-month free trial or previous subscription expired on ${subInfo.formattedDueDate}. Please renew your subscription to continue trade operations.`
              : `To access premium trade and communication features, please activate your ${fees.tierLabel} subscription below.`}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 mb-4 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 mb-4 flex items-center font-bold">
            <Check className="h-4 w-4 mr-2 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleProcessPayment} className="space-y-4">
          {/* Plan Selector */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-2">Select Subscription Billing Cycle</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedPlan('monthly')}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer relative ${
                  selectedPlan === 'monthly'
                    ? 'border-[#D97706] bg-amber-50/50 ring-1 ring-[#D97706]'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider">Monthly Plan</span>
                <span className="text-base font-black text-gray-900 font-mono block mt-0.5">
                  {fees.monthly.toLocaleString()} <span className="text-xs font-normal text-gray-500">MWK</span>
                </span>
                <span className="text-[10px] text-gray-500 font-medium block mt-1">30 Days Active Access</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan('annual')}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer relative ${
                  selectedPlan === 'annual'
                    ? 'border-[#D97706] bg-amber-50/50 ring-1 ring-[#D97706]'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center">
                  <Sparkles className="h-2.5 w-2.5 mr-0.5" /> Save 10k
                </div>
                <span className="text-[10px] font-bold text-emerald-700 block uppercase tracking-wider">Annual Plan</span>
                <span className="text-base font-black text-gray-900 font-mono block mt-0.5">
                  {fees.annual.toLocaleString()} <span className="text-xs font-normal text-gray-500">MWK</span>
                </span>
                <span className="text-[10px] text-gray-500 font-medium block mt-1">365 Days (Full Year)</span>
              </button>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-2">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('airtel')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center space-x-2.5 ${
                  paymentMethod === 'airtel'
                    ? 'border-red-500 bg-red-50/40 ring-1 ring-red-400'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="h-3 w-3 rounded-full bg-red-600 shrink-0"></span>
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Airtel Money</span>
                  <span className="text-[10px] text-gray-400 block">Instant push prompt</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('mpamba')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center space-x-2.5 ${
                  paymentMethod === 'mpamba'
                    ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-400'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="h-3 w-3 rounded-full bg-emerald-600 shrink-0"></span>
                <div>
                  <span className="text-xs font-bold text-gray-900 block">TNM Mpamba</span>
                  <span className="text-[10px] text-gray-400 block">USSD / Direct debit</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('bank')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center space-x-2.5 ${
                  paymentMethod === 'bank'
                    ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-400'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="h-3 w-3 rounded-full bg-blue-600 shrink-0"></span>
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Malawi Bank</span>
                  <span className="text-[10px] text-gray-400 block">National, Standard, FDH</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-center space-x-2.5 ${
                  paymentMethod === 'card'
                    ? 'border-purple-500 bg-purple-50/40 ring-1 ring-purple-400'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="h-3 w-3 rounded-full bg-purple-600 shrink-0"></span>
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Visa / Mastercard</span>
                  <span className="text-[10px] text-gray-400 block">Card / 3D Secure</span>
                </div>
              </button>
            </div>
          </div>

          {/* Phone Number / Account Input */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              {paymentMethod === 'airtel' ? 'Airtel Money Phone Number' : paymentMethod === 'mpamba' ? 'TNM Mpamba Phone Number' : 'Payer Contact / Phone'}
            </label>
            <input
              type="tel"
              placeholder="e.g. 0999 123 456 or +265 888 123 456"
              value={paymentPhone}
              onChange={(e) => setPaymentPhone(e.target.value)}
              className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs py-3 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-2 bg-[#D97706] hover:bg-[#b45309] disabled:opacity-60 text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer flex items-center justify-center space-x-2 shadow-md"
            >
              {isProcessing ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Pay {currentAmount.toLocaleString()} MWK</span>
                </>
              )}
            </button>
          </div>
        </form>

        {onNavigateTab && (
          <div className="mt-4 pt-3 border-t border-gray-100 text-center">
            <button
              onClick={() => {
                onClose();
                onNavigateTab('profile');
              }}
              className="text-xs text-gray-500 hover:text-gray-800 font-medium underline cursor-pointer"
            >
              Manage subscription from your Profile Settings →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionModal;
