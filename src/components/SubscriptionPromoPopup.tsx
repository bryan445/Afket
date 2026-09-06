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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-gray-100 shadow-2xl text-left relative animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-5 sm:right-5 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        {/* Badge & Icon */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 mb-3 sm:mb-4">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-xs shrink-0">
            <Zap className="h-4 w-4 sm:h-6 sm:w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap gap-y-1">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                AFKET Subscription
              </span>
              {subInfo.isTrialActive && (
                <span className="text-[9px] sm:text-[10px] font-bold text-lime-800 bg-lime-100 px-2 py-0.5 rounded-full">
                  1-Mo Free ({subInfo.daysRemaining}d left)
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-xl font-sans font-black text-gray-900 tracking-tight mt-0.5 leading-snug">
              Power Up Your Agricultural Trade
            </h3>
          </div>
        </div>

        {/* Buyer-specific notice or general notice */}
        {isBuyer ? (
          <div className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border text-[11px] sm:text-xs leading-relaxed mb-3 sm:mb-4 ${
            buyerWa.isBlocked 
              ? 'bg-rose-50 border-rose-200 text-rose-900' 
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
          }`}>
            <div className="flex items-start space-x-2">
              <WhatsAppLogo className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-xs sm:text-[13px]">
                  {buyerWa.isBlocked 
                    ? '🔒 2-Week Free WhatsApp Seller Access Expired' 
                    : `💬 Buyer WhatsApp Access: ${buyerWa.daysRemaining} Days Remaining`}
                </strong>
                <span>
                  {buyerWa.isBlocked
                    ? 'Free buyer WhatsApp connection is limited to 2 weeks. Settle subscription for unlimited direct WhatsApp.'
                    : `Connect directly with sellers on WhatsApp during your 2-week trial. Subscribe now for uninterrupted access.`}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-amber-200 bg-amber-50/70 text-[11px] sm:text-xs text-amber-950 leading-relaxed mb-3 sm:mb-4">
            <div className="flex items-start space-x-2">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">1-Month Free Usage Active</strong>
                <span>
                  Enjoy full access to publish harvest yields, access freight, and connect across African border routes.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Benefits Grid */}
        <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-5 bg-[#FAF9F6] p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100">
          <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
            Subscription Privileges:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-gray-700">
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="h-2.5 w-2.5" />
              </div>
              <span className="font-medium">Unlimited WhatsApp chat</span>
            </div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="h-2.5 w-2.5" />
              </div>
              <span className="font-medium">Unlimited produce listings</span>
            </div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="h-2.5 w-2.5" />
              </div>
              <span className="font-medium">Verified Merchant badge</span>
            </div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="h-2.5 w-2.5" />
              </div>
              <span className="font-medium">Priority freight dispatch</span>
            </div>
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="flex items-center justify-between p-2.5 sm:p-3.5 bg-amber-50 rounded-xl sm:rounded-2xl border border-amber-100 mb-3 sm:mb-5">
          <div>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase text-amber-800 tracking-wider block">
              {subInfo.tierLabel}
            </span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-base sm:text-xl font-black text-gray-900 font-mono">
                {subInfo.monthlyFee.toLocaleString()} MWK
              </span>
              <span className="text-[10px] sm:text-xs text-gray-500 font-medium">/ mo</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              Save {subInfo.annualSavings.toLocaleString()} MWK
            </span>
            <span className="text-[10px] sm:text-[11px] text-gray-600 block mt-0.5 font-mono">
              {subInfo.annualFee.toLocaleString()} MWK/yr
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              onClose();
              onOpenFullModal();
            }}
            className="w-full sm:flex-1 bg-[#D97706] hover:bg-[#b45309] text-white font-bold py-2.5 sm:py-3 px-4 sm:px-5 rounded-xl sm:rounded-2xl shadow-xs transition-all flex items-center justify-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm cursor-pointer"
          >
            <span>Pay Subscription</span>
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto text-xs font-bold text-gray-500 hover:text-gray-800 py-2 sm:py-3 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl hover:bg-gray-100 transition cursor-pointer"
          >
            Remind Me Later
          </button>
        </div>
      </div>
    </div>
  );
};
