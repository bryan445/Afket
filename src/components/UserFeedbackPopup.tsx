import React, { useState } from 'react';
import { UserProfile, UserFeedback } from '../types';
import { db } from '../lib/supabase';
import { X, Star, MessageSquareHeart, CheckCircle2, Send, Sparkles, AlertCircle } from 'lucide-react';

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

  if (!isOpen) return null;

  const categories = [
    'Marketplace & Products',
    'WhatsApp & Seller Contact',
    'Freight & Trucking Logistics',
    'Subscription & Payments',
    'General Experience & Suggestions',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      setError('Please provide a short description of your experience or suggestion.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await db.feedback.submit({
        userId: user.id,
        userName: user.fullName || `${user.firstName} ${user.surname}`.trim() || 'AFKET Trader',
        userEmail: user.email || '',
        userRole: user.role,
        rating,
        category,
        feedback: feedbackText.trim(),
      });

      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setFeedbackText('');
      }, 2200);
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-2xl text-left relative animate-in fade-in zoom-in-95 duration-200 font-sans">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition cursor-pointer"
          aria-label="Close feedback modal"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs animate-bounce">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-sans font-black text-gray-900">Thank You for Your Feedback!</h3>
              <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed">
                Your input helps the AFKET engineering and agricultural operations team improve trade corridors across Africa.
              </p>
            </div>
            <div className="pt-2">
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Feedback Recorded
              </span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header */}
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-[#365314] text-white flex items-center justify-center shadow-md shadow-emerald-900/10 shrink-0">
                <MessageSquareHeart className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-[#365314] px-2 py-0.5 rounded-full border border-emerald-200">
                  User Feedback
                </span>
                <h3 className="text-lg sm:text-xl font-sans font-black text-gray-900 tracking-tight mt-0.5">
                  How is your AFKET Experience?
                </h3>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              We value your insights as an active <span className="font-bold text-gray-800 capitalize">{user.role}</span>. Let us know how we can make agricultural buying, selling, and logistics better for you.
            </p>

            {/* Star Rating */}
            <div className="bg-[#FAF9F6] p-4 rounded-2xl border border-gray-100 text-center space-y-2">
              <label className="text-xs font-bold text-gray-700 block">
                Overall Satisfaction Rating:
              </label>
              <div className="flex items-center justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const currentFill = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-hidden cursor-pointer"
                      aria-label={`${star} star rating`}
                    >
                      <Star
                        className={`h-7 w-7 transition-colors ${
                          currentFill
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-[11px] font-bold text-gray-500 block">
                {rating === 5 ? '⭐⭐⭐⭐⭐ Exceptional (5/5)' :
                 rating === 4 ? '⭐⭐⭐⭐ Great Experience (4/5)' :
                 rating === 3 ? '⭐⭐⭐ Average (3/5)' :
                 rating === 2 ? '⭐⭐ Needs Improvement (2/5)' : '⭐ Unsatisfied (1/5)'}
              </span>
            </div>

            {/* Category Selector */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">
                Feedback Topic:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`text-xs font-bold p-2 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                      category === cat
                        ? 'bg-[#ECFCCB] text-[#365314] border-lime-400'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    {category === cat && <Sparkles className="h-3.5 w-3.5 text-[#365314] shrink-0 ml-1" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback textarea */}
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Your Feedback or Suggestions:
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Share your thoughts on produce quality, seller response times, WhatsApp connectivity, payment ease, or features you would like added..."
                rows={3}
                className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl p-3 text-xs text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-[#D97706] placeholder-gray-400 leading-relaxed resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-2.5 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit & Cancel */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:flex-1 bg-[#365314] hover:bg-[#224411] text-white font-bold py-3 px-5 rounded-2xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Sending Feedback...</span>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Submit Feedback</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto text-xs font-bold text-gray-500 hover:text-gray-800 py-3 px-4 rounded-2xl hover:bg-gray-100 transition cursor-pointer"
              >
                Maybe Later
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
