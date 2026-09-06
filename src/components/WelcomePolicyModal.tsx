import React, { useState } from 'react';
import { UserProfile } from '../types';
import { db } from '../lib/supabase';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Calendar, 
  MessageSquare, 
  Package, 
  ArrowRight, 
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import afketLogo from '../assets/images/afket_logo_1782851553801.jpg';

interface WelcomePolicyModalProps {
  user: UserProfile;
  isOpen: boolean;
  onAgree: (updatedUser: UserProfile) => void;
}

export function WelcomePolicyModal({ user, isOpen, onAgree }: WelcomePolicyModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirmAgree = async () => {
    if (!agreed) {
      setError('Please check the agreement box below to confirm you accept the AFKET Usage Policies.');
      return;
    }

    setLoading(true);
    setError('');

    const now = new Date().toISOString();
    const updated: UserProfile = {
      ...user,
      policyAgreed: true,
      policyAgreedAt: now
    };

    try {
      if (user.id) {
        await db.auth.updateProfile(user.id, {
          policyAgreed: true,
          policyAgreedAt: now
        });
      }
    } catch (err) {
      console.warn('Could not persist policy agreement to remote DB, applying locally:', err);
    } finally {
      setLoading(false);
      onAgree(updated);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-black/70 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-auto"
        >
          {/* Top Header Banner */}
          <div className="bg-[#1F2937] text-white p-6 sm:p-7 relative overflow-hidden text-left">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#365314]/60 via-[#1F2937] to-[#111827] z-0"></div>
            <div className="relative z-10 flex items-center space-x-3.5">
              <img 
                src={afketLogo} 
                alt="AFKET Logo" 
                className="h-12 w-12 rounded-full border border-amber-500/30 shadow-lg shrink-0" 
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#D97706] font-bold px-2 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20">
                    Welcome to AFKET
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                    Trade Platform Policy
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                  Platform Terms & Usage Policy
                </h2>
                <p className="text-xs sm:text-sm text-gray-300 font-medium mt-0.5">
                  Welcome, <strong className="text-white">{user.fullName || user.email}</strong>! Please review and agree to our trading policies before entering the market.
                </p>
              </div>
            </div>
          </div>

          {/* Policy Clauses Body */}
          <div className="p-5 sm:p-7 space-y-4 max-h-[62vh] overflow-y-auto text-left">
            <div className="grid grid-cols-1 gap-3">
              {/* Clause 1: 1-Month Free Account Trial */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/70 flex items-start space-x-3.5">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-200 shrink-0 mt-0.5">
                  <Calendar className="h-5 w-5 text-[#D97706]" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                      1. 1-Month Free Account Usage (30 Days)
                    </h4>
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      30-Day Free Trial
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed font-medium">
                    All new trade accounts enjoy a full <strong>30-day free trial</strong> across the AFKET network. If subscription fees are not settled after the 30-day period ends, the account will be automatically deactivated to preserve trade network integrity.
                  </p>
                </div>
              </div>

              {/* Clause 2: Buyer WhatsApp Direct Policy (2-Week Limit) */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/70 flex items-start space-x-3.5">
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200 shrink-0 mt-0.5">
                  <MessageSquare className="h-5 w-5 text-emerald-700" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                      2. Buyer Direct WhatsApp Policy (2-Week Limit)
                    </h4>
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      14-Day Direct Chat
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed font-medium">
                    Buyers on the free tier can contact sellers directly via <strong>WhatsApp for the first 2 weeks (14 days)</strong>. After 2 weeks, direct WhatsApp chat is locked until a Monthly or Annual subscription is activated.
                  </p>
                </div>
              </div>

              {/* Clause 3: Seller Product Listings Policy (3 Products Limit) */}
              <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-200/70 flex items-start space-x-3.5">
                <div className="p-2.5 rounded-xl bg-orange-100 text-orange-900 border border-orange-200 shrink-0 mt-0.5">
                  <Package className="h-5 w-5 text-orange-700" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                      3. Seller Listing Policy (Maximum 3 Products on Free Tier)
                    </h4>
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-200">
                      3 Free Listings
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed font-medium">
                    Sellers can list and sell up to <strong>three (3) products for sale</strong> during the free trial period. Attempting to add a 4th product will require activating a subscription to unlock unlimited listings.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-3.5 font-semibold flex items-center space-x-2 animate-fadeIn">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Interactive Agreement Checkbox */}
            <div className="pt-2">
              <label 
                id="label-policy-agreement-checkbox"
                className={`flex items-start space-x-3 p-3.5 rounded-2xl border transition cursor-pointer ${
                  agreed 
                    ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-2xs' 
                    : 'bg-[#FAF9F6] border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  id="checkbox-policy-agreement"
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    if (e.target.checked) setError('');
                  }}
                  className="mt-1 h-4 w-4 text-[#365314] rounded-md border-gray-300 focus:ring-[#365314] cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-gray-900 block">
                    I have read, understood, and agree to the AFKET Platform Terms & Usage Policy
                  </span>
                  <span className="text-[11px] text-gray-500 font-medium block">
                    I agree to the 30-day trial terms, buyer WhatsApp limits, and seller 3-product listing policy.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="p-4 sm:p-6 bg-gray-50/90 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] font-semibold text-gray-500 flex items-center space-x-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>AFKET Verified Agricultural Network</span>
            </span>

            <button
              id="btn-confirm-agree-policy"
              type="button"
              onClick={handleConfirmAgree}
              disabled={loading}
              className={`w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold text-xs shadow-md transition-all duration-150 cursor-pointer gap-2 ${
                agreed 
                  ? 'bg-[#365314] hover:bg-[#283e0f] text-white shadow-emerald-900/10 hover:scale-[1.02] active:scale-[0.98]' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full h-3.5 w-3.5"></span>
                  <span>Saving Agreement...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>I Agree & Continue to Trading</span>
                  <ArrowRight className="h-4 w-4 ml-0.5" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
