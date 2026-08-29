import React, { useState } from 'react';
import { UserProfile, AFKET_SUPPORT } from '../types';
import { db } from '../lib/supabase';
import { X, Star, MessageSquareHeart, CheckCircle2, Send, Sparkles, AlertCircle, Mail } from 'lucide-react';
import { WhatsAppLogo } from './BrandIcons';

interface UserFeedbackPopupProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const UserFeedbackPopup: React.FC<UserFeedbackPopupProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<string>('Marketplace & Products');
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailMailtoUrl, setEmailMailtoUrl] = useState<string>('');

  if (!isOpen) return null;

  const categories = [
    'Marketplace & Products',
    'WhatsApp & Seller Contact',
    'Freight & Trucking Logistics',
    'Subscription & Payments',
    'General Experience & Suggestions',
  ];

  const userName = user.fullName || `${user.firstName || ''} ${user.surname || ''}`.trim() || 'AFKET Trader';
  const whatsappChatUrl = `https://wa.me/265987523475?text=${encodeURIComponent(
    `Hello AFKET Support, I am logged in as ${userName} (${user.role}${user.businessName ? ` - ${user.businessName}` : ''}) and would like to speak directly with customer support.`
  )}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      setError('Please provide a short description of your experience or suggestion.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const nowStr = new Date().toLocaleString();
    const emailSubject = `[AFKET Feedback] ${rating}/5 Stars - ${category} from ${userName}`;
    const emailBody = [
      `AFKET PLATFORM USER FEEDBACK`,
      `------------------------------------`,
      `Date & Time: ${nowStr}`,
      `Customer Name: ${userName}`,
      `Account Email: ${user.email || 'N/A'}`,
      `Phone Number: ${user.phone || 'N/A'}`,
      `Account Role: ${user.role.toUpperCase()}`,
      `Account Type: ${user.accountType === 'company' ? 'Company/Business' : 'Individual/Solo'}`,
      user.businessName ? `Business Name: ${user.businessName}` : '',
      `Location: ${user.location || 'N/A'}`,
      ``,
      `FEEDBACK DETAILS`,
      `------------------------------------`,
      `Category: ${category}`,
      `Satisfaction Rating: ${rating}/5 Stars`,
      ``,
      `Feedback & Suggestions:`,
      `${feedbackText.trim()}`,
      ``,
      `------------------------------------`,
      `Submitted via AFKET African Market Platform`
    ].filter(line => line !== null && line !== undefined).join('\n');

    const mailtoLink = `mailto:${AFKET_SUPPORT.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    setEmailMailtoUrl(mailtoLink);

    try {
      // 1. Submit to database & local records
      await db.feedback.submit({
        userId: user.id,
        userName,
        userEmail: user.email || '',
        userRole: user.role,
        rating,
        category,
        feedback: feedbackText.trim(),
      });

      // Mark feedback as completed once per customer
      localStorage.setItem(`afket_feedback_completed_${user.id}`, 'true');

      // 2. Dispatch answers to email client
      try {
        const mailAnchor = document.createElement('a');
        mailAnchor.href = mailtoLink;
        mailAnchor.target = '_blank';
        mailAnchor.rel = 'noopener noreferrer';
        document.body.appendChild(mailAnchor);
        mailAnchor.click();
        document.body.removeChild(mailAnchor);
      } catch (mailErr) {
        console.warn('Mailto link trigger fallback:', mailErr);
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl p-4 sm:p-7 border border-gray-100 shadow-2xl text-left relative animate-in fade-in zoom-in-95 duration-200 font-sans my-auto max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 sm:top-5 right-3.5 sm:right-5 text-gray-400 hover:text-gray-600 p-1.5 sm:p-2 rounded-full hover:bg-gray-100 transition cursor-pointer"
          aria-label="Close feedback modal"
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        {submitted ? (
          <div className="py-4 sm:py-6 text-center space-y-3 sm:space-y-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-sans font-black text-gray-900">Thank You for Your Feedback!</h3>
              <p className="text-[11px] sm:text-xs text-gray-600 max-w-sm mx-auto leading-relaxed">
                Your answers have been saved and sent to our support team at <strong className="text-gray-900">{AFKET_SUPPORT.email}</strong>.
              </p>
            </div>

            <div className="p-3 sm:p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl sm:rounded-2xl text-left space-y-1.5 sm:space-y-2">
              <div className="flex items-center space-x-2 text-emerald-800 text-[11px] sm:text-xs font-bold">
                <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-emerald-600" />
                <span>Email dispatched to {AFKET_SUPPORT.email}</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-gray-600 leading-snug">
                If your email client did not open automatically, you can also send it directly with one click:
              </p>
              {emailMailtoUrl && (
                <a
                  href={emailMailtoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-[#365314] hover:underline"
                >
                  <Send className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <span>Click here to open email client</span>
                </a>
              )}
            </div>

            {/* Direct WhatsApp Option on confirmation */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-[11px] sm:text-xs text-gray-600 mb-2 font-medium">Need immediate assistance or direct support?</p>
              <a
                href={whatsappChatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#25D366] hover:bg-[#1ebd5b] text-white font-bold py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl shadow-xs transition flex items-center justify-center space-x-2 text-xs sm:text-sm cursor-pointer"
              >
                <WhatsAppLogo className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Speak to Us Directly on WhatsApp</span>
              </a>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-full text-[11px] sm:text-xs font-bold text-gray-600 hover:text-gray-900 py-2 sm:py-2.5 px-4 rounded-xl sm:rounded-2xl bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Header */}
            <div className="flex items-center space-x-2.5 sm:space-x-3 mb-1 sm:mb-2 pr-6">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-600 to-[#365314] text-white flex items-center justify-center shadow-md shadow-emerald-900/10 shrink-0">
                <MessageSquareHeart className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-[#365314] px-1.5 py-0.5 rounded-full border border-emerald-200">
                  User Feedback
                </span>
                <h3 className="text-base sm:text-lg sm:text-xl font-sans font-black text-gray-900 tracking-tight leading-tight mt-0.5">
                  How is your AFKET Experience?
                </h3>
              </div>
            </div>

            <p className="text-[11px] sm:text-xs text-gray-600 leading-relaxed">
              We value your insights as an active <span className="font-bold text-gray-800 capitalize">{user.role}</span>. Your feedback helps improve trade corridors.
            </p>

            {/* Direct WhatsApp Callout Option */}
            <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0">
                  <WhatsAppLogo className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-bold text-gray-900 leading-tight">Need instant help?</p>
                  <p className="text-[10px] sm:text-[11px] text-gray-600 truncate">Chat with our support team</p>
                </div>
              </div>
              <a
                href={whatsappChatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#25D366] hover:bg-[#1ebd5b] text-white text-[10px] sm:text-[11px] font-bold py-1 sm:py-1.5 px-2.5 sm:px-3 rounded-lg sm:rounded-xl transition shrink-0 flex items-center gap-1 shadow-2xs"
              >
                <span>WhatsApp</span>
              </a>
            </div>

            {/* Star Rating */}
            <div className="bg-[#FAF9F6] p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-gray-100 text-center space-y-1">
              <label className="text-[11px] sm:text-xs font-bold text-gray-700 block">
                Overall Satisfaction Rating:
              </label>
              <div className="flex items-center justify-center space-x-1.5 sm:space-x-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const currentFill = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-0.5 sm:p-1 text-xl sm:text-2xl transition-transform hover:scale-125 focus:outline-hidden cursor-pointer"
                      aria-label={`${star} star rating`}
                    >
                      <Star
                        className={`h-5 w-5 sm:h-7 sm:w-7 transition-colors ${
                          currentFill
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 block">
                {rating === 5 ? '⭐⭐⭐⭐⭐ Exceptional (5/5)' :
                 rating === 4 ? '⭐⭐⭐⭐ Great Experience (4/5)' :
                 rating === 3 ? '⭐⭐⭐ Average (3/5)' :
                 rating === 2 ? '⭐⭐ Needs Improvement (2/5)' : '⭐ Unsatisfied (1/5)'}
              </span>
            </div>

            {/* Category Selector */}
            <div>
              <label className="text-[11px] sm:text-xs font-bold text-gray-700 block mb-1">
                Feedback Topic:
              </label>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`text-[10px] sm:text-xs font-bold p-1.5 sm:p-2 rounded-lg sm:rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                      category === cat
                        ? 'bg-[#ECFCCB] text-[#365314] border-lime-400'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    {category === cat && <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#365314] shrink-0 ml-0.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback textarea */}
            <div>
              <label className="text-[11px] sm:text-xs font-bold text-gray-700 block mb-1">
                Your Feedback or Suggestions:
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Share your thoughts on produce quality, seller response, payment ease, or suggestions..."
                rows={2}
                className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl p-2.5 sm:p-3 text-[11px] sm:text-xs text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-[#D97706] placeholder-gray-400 leading-relaxed resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] sm:text-xs rounded-xl p-2 sm:p-2.5 flex items-center">
                <AlertCircle className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit & Cancel */}
            <div className="flex flex-row items-center gap-2 pt-1 sm:pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-[#365314] hover:bg-[#224411] text-white font-bold py-2.5 sm:py-3 px-3 sm:px-5 rounded-xl sm:rounded-2xl shadow-md transition flex items-center justify-center space-x-1.5 text-xs sm:text-sm cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="truncate">Send Feedback</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-[11px] sm:text-xs font-bold text-gray-500 hover:text-gray-800 py-2.5 sm:py-3 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl hover:bg-gray-100 transition cursor-pointer shrink-0"
              >
                Later
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

