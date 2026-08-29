import React from 'react';
import { UserProfile, getUserSubscriptionInfo, checkBuyerWhatsAppPermission, AFKET_SUPPORT } from '../types';
import { X, Sparkles, Check, ArrowRight, Zap, ShieldCheck, MessageCircle, Truck, PackageCheck } from 'lucide-react';
import { WhatsAppLogo } from './BrandIcons';

interface SubscriptionPromoPopupProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onOpenFullModal: () => void;
}

export const SubscriptionPromoPopup: React.FC<SubscriptionPromoPopupProps> = ({
  user,
  isOpen,
  onClose,
  onOpenFullModal,
}) => {
  if (!isOpen) return null;

  const subInfo = getUserSubscriptionInfo(user);
  const buyerWa = checkBuyerWhatsAppPermission(user);
  const isBuyer = user.role === 'buyer';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-2xl text-left relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Badge & Icon */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                AFKET Subscription
              </span>
              {subInfo.isTrialActive && (
                <span className="text-[10px] font-bold text-lime-800 bg-lime-100 px-2 py-0.5 rounded-full">
                  1-Month Free Usage ({subInfo.daysRemaining}d left)
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-sans font-black text-gray-900 tracking-tight mt-0.5">
              Power Up Your Agricultural Trade
            </h3>
          </div>
        </div>

        {/* Buyer-specific notice or general notice */}
        {isBuyer ? (
          <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed mb-4 ${
            buyerWa.isBlocked 
              ? 'bg-rose-50 border-rose-200 text-rose-900' 
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
          }`}>
            <div className="flex items-start space-x-2">
              <WhatsAppLogo className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">
                  {buyerWa.isBlocked 
                    ? '🔒 2-Week Free WhatsApp Seller Access Expired' 
                    : `💬 Buyer WhatsApp Access: ${buyerWa.daysRemaining} Days Remaining`}
                </strong>
                <span>
                  {buyerWa.isBlocked
                    ? 'Free buyer WhatsApp connection with sellers is limited to 2 weeks. Subscribe to your Monthly or Annual plan to unlock unlimited direct seller WhatsApp messaging.'
                    : `You can connect directly with sellers on WhatsApp during your first 2 weeks. Settle your subscription now to secure uninterrupted 24/7 access.`}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/70 text-xs text-amber-950 leading-relaxed mb-4">
            <div className="flex items-start space-x-2">
              <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">1-Month Free Usage Active</strong>
                <span>
                  Enjoy full access to publish harvest yields, access corridor freight, and connect across African border routes. Upgrade your plan to maintain verified listings.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Benefits Grid */}
        <div className="space-y-2 mb-5 bg-[#FAF9F6] p-4 rounded-2xl border border-gray-100">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
            Subscription Privileges:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="h-2.5 w-2.5" />
              </div>
              <span className="font-medium">Unlimited WhatsApp chat</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="h-2.5 w-2.5" />
              </div>
              <span className="font-medium">Unlimited produce listings</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="h-2.5 w-2.5" />
              </div>
              <span className="font-medium">Verified Merchant badge</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="h-2.5 w-2.5" />
              </div>
              <span className="font-medium">Priority freight dispatch</span>
            </div>
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="flex items-center justify-between p-3.5 bg-amber-50 rounded-2xl border border-amber-100 mb-5">
          <div>
            <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider block">
              {subInfo.tierLabel}
            </span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-xl font-black text-gray-900 font-mono">
                {subInfo.monthlyFee.toLocaleString()} MWK
              </span>
              <span className="text-xs text-gray-500 font-medium">/ month</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              Annual: Save {subInfo.annualSavings.toLocaleString()} MWK
            </span>
            <span className="text-[11px] text-gray-600 block mt-1 font-mono">
              {subInfo.annualFee.toLocaleString()} MWK / yr
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => {
              onClose();
              onOpenFullModal();
            }}
            className="w-full sm:flex-1 bg-[#D97706] hover:bg-[#b45309] text-white font-bold py-3 px-5 rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>Pay Your Subscription</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto text-xs font-bold text-gray-500 hover:text-gray-800 py-3 px-4 rounded-2xl hover:bg-gray-100 transition cursor-pointer"
          >
            Remind Me Later
          </button>
        </div>
      </div>
    </div>
  );
};
