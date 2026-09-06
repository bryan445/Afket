import React, { useState } from 'react';
import { 
  Product, 
  UserProfile, 
  formatLocalPrice, 
  getUserSubscriptionInfo, 
  checkBuyerWhatsAppPermission 
} from '../types';
import { 
  ArrowLeft, 
  MapPin, 
  Package, 
  Calendar, 
  ShieldCheck, 
  Building2, 
  User, 
  Lock, 
  Truck, 
  Share2, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Check,
  ShoppingCart,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { WhatsAppLogo, CallLogo, EmailLogo, FacebookLogo } from './BrandIcons';

interface ProductDetailsPageProps {
  product: Product;
  user: UserProfile;
  onBack: () => void;
  onBuy: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onRequireSubscription?: (message: string) => void;
  onSelectSeller?: (sellerId: string, sellerName: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export function ProductDetailsPage({
  product,
  user,
  onBack,
  onBuy,
  onEdit,
  onDelete,
  onRequireSubscription,
  onSelectSeller,
  onNavigateTab
}: ProductDetailsPageProps) {
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const subInfo = getUserSubscriptionInfo(user);
  const buyerWa = checkBuyerWhatsAppPermission(user);

  const getCategoryFallbackUrls = (cat: string): string[] => {
    switch (cat) {
      case 'crops':
        return [
          'https://images.unsplash.com/photo-1574316071802-0d684efa7bf5?auto=format&fit=crop&q=80&w=1000',
          'https://images.unsplash.com/photo-1530026405186-ed1ea060736f?auto=format&fit=crop&q=80&w=1000',
          'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1000'
        ];
      case 'minerals':
        return [
          'https://images.unsplash.com/photo-1605557626697-2e87166d88f9?auto=format&fit=crop&q=80&w=1000',
          'https://images.unsplash.com/photo-1599727497614-769993b88a70?auto=format&fit=crop&q=80&w=1000',
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1000'
        ];
      case 'fruits':
        return [
          'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&q=80&w=1000',
          'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?auto=format&fit=crop&q=80&w=1000',
          'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&q=80&w=1000'
        ];
      case 'legumes':
        return [
          'https://images.unsplash.com/photo-1585998080700-ee4b6f12122b?auto=format&fit=crop&q=80&w=1000',
          'https://images.unsplash.com/photo-1515942400420-2b98fed1f515?auto=format&fit=crop&q=80&w=1000',
          'https://images.unsplash.com/photo-1621961424579-f15568348247?auto=format&fit=crop&q=80&w=1000'
        ];
      case 'clothings':
        return [
          'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=1000',
          'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&q=80&w=1000',
          'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&q=80&w=1000'
        ];
      case 'meat':
        return [
          'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=1000',
          'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1000',
          'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&q=80&w=1000'
        ];
      case 'handicrafts':
        return [
          'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=1000',
          'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&q=80&w=1000',
          'https://images.unsplash.com/photo-1565192647048-f997ded87ab7?auto=format&fit=crop&q=80&w=1000'
        ];
      default:
        return [
          'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=1000',
          'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&q=80&w=1000'
        ];
    }
  };

  const buildAllImages = (): string[] => {
    let list = [
      product.imageUrl,
      ...(product.imageUrls || [])
    ].filter(url => typeof url === 'string' && url.trim().length > 0);

    if (list.length === 0) {
      list.push('https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&q=80&w=1000');
    }

    if (list.length < 3) {
      const fallbacks = getCategoryFallbackUrls(product.category);
      for (const url of fallbacks) {
        if (list.length >= 3) break;
        if (url && !list.includes(url)) {
          list.push(url);
        }
      }
    }
    return list;
  };

  const images = buildAllImages();
  const currentImage = images[activeImgIndex] || images[0];

  const handleWhatsAppAction = (e: React.MouseEvent) => {
    if (buyerWa.isBlocked) {
      e.preventDefault();
      e.stopPropagation();
      onRequireSubscription?.(buyerWa.reason);
    }
  };

  const handleGeneralContactAction = (e: React.MouseEvent) => {
    if (!subInfo.isPaid && !subInfo.isTrialActive) {
      e.preventDefault();
      e.stopPropagation();
      onRequireSubscription?.('Your 1-month free trial usage has expired. Please subscribe to your Monthly or Annual plan to connect with trade partners.');
    }
  };

  const handleCopyLink = () => {
    try {
      if (typeof window !== 'undefined') {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch (e) {
      console.error('Error copying link:', e);
    }
  };

  const sellerPhone = product.sellerWhatsapp || product.sellerPhone || '';
  const cleanPhone = sellerPhone.replace(/[^0-9]/g, '');
  const sellerDisplayName = product.sellerBusinessName || product.sellerName || 'Verified Supplier';
  const isOwner = product.sellerId === user.id;

  const waMessage = encodeURIComponent(
    `Hello ${sellerDisplayName}, I found your listing for "${product.title}" (${product.availableQuantity} ${product.unit}) on AFKET Marketplace. I would like to inquire about pricing, delivery, and trade specifications.`
  );

  return (
    <div className="py-2 sm:py-4 space-y-4 sm:space-y-6 text-left animate-fadeIn">
      {/* Top Bar: Back Button, Breadcrumbs, and Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="inline-flex items-center space-x-2 bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 px-3.5 py-2 rounded-xl border border-gray-200 shadow-xs transition font-bold text-xs sm:text-sm cursor-pointer"
            title="Return to marketplace catalog"
          >
            <ArrowLeft className="h-4 w-4 text-[#D97706]" />
            <span>Back to Marketplace</span>
          </button>

          <div className="hidden md:flex items-center space-x-1.5 text-xs text-gray-400 font-medium">
            <span>Marketplace</span>
            <span>/</span>
            <span className="capitalize text-gray-600">{product.category}</span>
            <span>/</span>
            <span className="text-gray-900 font-bold truncate max-w-[200px]">{product.title}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center space-x-1.5 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold transition shadow-xs cursor-pointer"
            title="Copy share link"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">Link Copied</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 text-gray-500" />
                <span>Share</span>
              </>
            )}
          </button>

          {isOwner && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onEdit?.(product)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
              >
                Edit Listing
              </button>
              <button
                onClick={() => onDelete?.(product)}
                className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: Image Showcase & Gallery (5 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Hero Image Container */}
          <div className="relative rounded-3xl overflow-hidden bg-gray-100 border border-gray-200 shadow-md aspect-4/3 max-h-[460px] group">
            <img
              src={currentImage}
              alt={product.title}
              onClick={() => setIsZoomOpen(true)}
              className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.02]"
              referrerPolicy="no-referrer"
            />

            {/* Badges on Hero Image */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
              <span className="bg-[#ECFCCB] text-[#365314] text-[10px] sm:text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded-full border border-lime-300 shadow-xs">
                {product.category.replace('_', ' ')}
              </span>

              {product.availableQuantity > 0 ? (
                <span className="bg-emerald-600 text-white text-[10px] sm:text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
                  <Check className="h-3 w-3" /> In Stock
                </span>
              ) : (
                <span className="bg-rose-600 text-white text-[10px] sm:text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded-full shadow-xs">
                  Out of Stock
                </span>
              )}
            </div>

            {/* Prev / Next Arrows if multiple pictures */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImgIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-xs transition cursor-pointer"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImgIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-xs transition cursor-pointer"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Image index counter */}
            {images.length > 1 && (
              <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-xs">
                {activeImgIndex + 1} / {images.length} Photos
              </div>
            )}
          </div>

          {/* Thumbnails Row */}
          {images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImgIndex(idx)}
                  className={`relative h-20 w-24 rounded-2xl overflow-hidden border-2 transition shrink-0 cursor-pointer ${
                    activeImgIndex === idx
                      ? 'border-[#D97706] ring-2 ring-[#D97706]/30 scale-105'
                      : 'border-gray-200 hover:border-gray-300 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Supplier / Seller Profile Card */}
          <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                Supplier & Origin Information
              </span>
              <span className="inline-flex items-center text-[11px] font-bold text-[#365314] bg-lime-100 px-2 py-0.5 rounded-md">
                <ShieldCheck className="h-3 w-3 mr-1 text-[#365314]" />
                Verified Seller
              </span>
            </div>

            <div className="flex items-start space-x-3.5 pt-1">
              {product.sellerLogoUrl ? (
                <img
                  src={product.sellerLogoUrl}
                  alt={sellerDisplayName}
                  className="w-12 h-12 rounded-2xl object-cover border border-gray-200 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-[#365314] text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-2xs">
                  {sellerDisplayName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h4 className="font-sans font-extrabold text-gray-900 text-sm sm:text-base truncate">
                  {sellerDisplayName}
                </h4>
                <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-[#D97706] shrink-0" />
                  <span>{product.location}</span>
                </p>
                {product.sellerNationality && (
                  <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">
                    Base: {product.sellerNationality}
                  </span>
                )}
              </div>
            </div>

            {onSelectSeller && (
              <button
                type="button"
                onClick={() => onSelectSeller(product.sellerId, sellerDisplayName)}
                className="w-full text-center py-2 px-3 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Building2 className="h-3.5 w-3.5 text-[#365314]" />
                <span>View All Products From This Supplier</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Title, Dual Pricing, Specifications & Contact Buttons (7 Cols) */}
        <div className="lg:col-span-6 space-y-5">
          {/* Header Title & Origin */}
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-gray-500 mb-1.5">
              <span className="flex items-center text-[#D97706]">
                <MapPin className="h-3.5 w-3.5 mr-1" />
                {product.location}
              </span>
              {product.harvestDate && (
                <>
                  <span>•</span>
                  <span className="flex items-center text-gray-600">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    Harvest: {product.harvestDate}
                  </span>
                </>
              )}
            </div>

            <h1 className="font-sans font-black text-xl sm:text-2xl md:text-3xl text-gray-900 tracking-tight leading-snug">
              {product.title}
            </h1>
          </div>

          {/* Pricing Highlight Card */}
          <div className="bg-gradient-to-br from-[#FFFBEB] via-amber-50/70 to-emerald-50/40 rounded-3xl p-5 sm:p-6 border border-amber-200/80 shadow-xs space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900/80">
              Direct Farm-Gate Trade Pricing
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Local Domestic Price */}
              <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-2xl border border-amber-200/60 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                  Local Domestic Price ({product.localCurrency || 'MWK'})
                </span>
                <div className="text-lg sm:text-xl font-black text-[#D97706] font-mono">
                  {formatLocalPrice(
                    product.localPrice || Math.round(product.price * 0.85),
                    product.sellerNationality,
                    product.localCurrency
                  )}
                </div>
                <span className="text-[10px] text-gray-500 font-medium">per {product.unit}</span>
              </div>

              {/* International USD Price */}
              <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-2xl border border-lime-200/60 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                  International Export (USD)
                </span>
                <div className="text-lg sm:text-xl font-black text-[#365314] font-mono">
                  ${(product.internationalPrice || product.price).toLocaleString()}
                </div>
                <span className="text-[10px] text-gray-500 font-medium">per {product.unit}</span>
              </div>
            </div>

            <p className="text-[11px] text-amber-950/80 font-medium leading-relaxed pt-1">
              Zero intermediary broker cuts. Connect directly with the verified harvester or supplier.
            </p>
          </div>

          {/* Direct Seller Contact Buttons (Prominent) */}
          {!isOwner ? (
            <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-sans font-black text-sm sm:text-base text-gray-900">
                    Contact Supplier Directly
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Choose your preferred communication channel to initiate trade negotiations:
                  </p>
                </div>
                {user.role === 'buyer' && !subInfo.isPaid && (
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                    buyerWa.isBlocked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-900'
                  }`}>
                    {buyerWa.isBlocked ? '2w WA trial ended' : `${buyerWa.daysRemaining}d WA trial left`}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* WhatsApp Button */}
                <a
                  href={`https://wa.me/${cleanPhone || '265987523475'}?text=${waMessage}`}
                  target={buyerWa.isBlocked ? undefined : "_blank"}
                  rel={buyerWa.isBlocked ? undefined : "noopener noreferrer"}
                  onClick={handleWhatsAppAction}
                  className={`p-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center space-x-2.5 transition shadow-xs cursor-pointer border ${
                    buyerWa.isBlocked
                      ? 'bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-700 border-gray-300'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border-emerald-700'
                  }`}
                  title={buyerWa.isBlocked ? buyerWa.reason : 'Chat with seller on WhatsApp'}
                >
                  {buyerWa.isBlocked ? (
                    <>
                      <Lock className="h-4 w-4 text-rose-500 shrink-0" />
                      <span>WhatsApp (Subscribe to Unlock)</span>
                    </>
                  ) : (
                    <>
                      <WhatsAppLogo className="h-5 w-5 shrink-0" />
                      <span>Chat on WhatsApp</span>
                    </>
                  )}
                </a>

                {/* Call Phone Button */}
                {(product.sellerPhone || product.sellerWhatsapp) && (
                  <a
                    href={`tel:${product.sellerPhone || product.sellerWhatsapp}`}
                    onClick={handleGeneralContactAction}
                    className="p-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center space-x-2.5 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-900 border border-emerald-300 transition shadow-2xs cursor-pointer"
                    title="Direct Phone Call"
                  >
                    <CallLogo className="h-5 w-5 shrink-0" />
                    <span>Call Supplier</span>
                  </a>
                )}

                {/* Email Inquiry Button */}
                {product.sellerEmail && (
                  <a
                    href={`mailto:${product.sellerEmail}?subject=${encodeURIComponent(`Inquiry about ${product.title} on AFKET`)}&body=${encodeURIComponent(`Hello ${sellerDisplayName},\n\nI am interested in placing an order for "${product.title}" listed on the AFKET platform.\n\nRequired Quantity:\nDelivery Destination:\nMy Contact Info:\n\nThank you.`)}`}
                    onClick={handleGeneralContactAction}
                    className="p-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center space-x-2.5 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-800 border border-red-300 transition shadow-2xs cursor-pointer"
                    title="Send Email Inquiry"
                  >
                    <EmailLogo className="h-5 w-5 shrink-0" />
                    <span>Email Supplier</span>
                  </a>
                )}

                {/* Facebook Page Button */}
                {product.sellerFacebook && (
                  <a
                    href={product.sellerFacebook.startsWith('http') ? product.sellerFacebook : `https://${product.sellerFacebook}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleGeneralContactAction}
                    className="p-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center space-x-2.5 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-800 border border-blue-300 transition shadow-2xs cursor-pointer"
                    title="Visit Supplier Facebook"
                  >
                    <FacebookLogo className="h-5 w-5 shrink-0" />
                    <span>Facebook Profile</span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs text-amber-900 font-medium">
              <span className="font-bold block mb-1">Your Listed Product</span>
              This commodity is listed under your account. Buyers can connect with you using your profile phone, WhatsApp, and email.
            </div>
          )}

          {/* Sourcing Order & Logistics CTAs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => onBuy(product)}
              className="w-full bg-[#D97706] hover:bg-[#b45309] active:bg-amber-800 text-white font-black text-xs sm:text-sm py-3.5 px-4 rounded-2xl transition shadow-md flex items-center justify-center space-x-2 cursor-pointer border border-amber-600"
            >
              <ShoppingCart className="h-4 w-4 shrink-0 text-amber-200" />
              <span>Place Sourcing Order</span>
            </button>

            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('logistics')}
                className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 font-extrabold text-xs sm:text-sm py-3.5 px-4 rounded-2xl transition shadow-xs flex items-center justify-center space-x-2 cursor-pointer border border-gray-300"
              >
                <Truck className="h-4 w-4 shrink-0 text-[#365314]" />
                <span>Request Cargo Logistics</span>
              </button>
            )}
          </div>

          {/* Specifications Matrix */}
          <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-4">
            <h3 className="font-sans font-black text-sm uppercase tracking-wider text-gray-700">
              Commodity Specifications
            </h3>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-gray-400 font-medium block text-[11px]">Available Stock</span>
                <span className="font-bold text-gray-900 font-mono text-sm block mt-0.5">
                  {product.availableQuantity.toLocaleString()} {product.unit}
                </span>
              </div>

              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-gray-400 font-medium block text-[11px]">Minimum Order</span>
                <span className="font-bold text-amber-800 font-mono text-sm block mt-0.5">
                  {product.minOrderQty ? `${product.minOrderQty} ${product.unit}` : `1 ${product.unit}`}
                </span>
              </div>

              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-gray-400 font-medium block text-[11px]">Condition / Grade</span>
                <span className="font-bold text-gray-900 text-sm block mt-0.5">
                  {product.condition || 'Verified Standard'}
                </span>
              </div>

              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-gray-400 font-medium block text-[11px]">Packaging Type</span>
                <span className="font-bold text-gray-900 text-sm block mt-0.5">
                  {product.packaging || 'Bulk Cargo'}
                </span>
              </div>

              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-gray-400 font-medium block text-[11px]">Location / Farm Origin</span>
                <span className="font-bold text-gray-900 text-sm block mt-0.5">
                  {product.location}
                </span>
              </div>

              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-gray-400 font-medium block text-[11px]">Harvest Date</span>
                <span className="font-bold text-gray-900 text-sm block mt-0.5">
                  {product.harvestDate || 'Current Season Harvest'}
                </span>
              </div>
            </div>

            {product.certifications && (
              <div className="pt-2 border-t border-gray-100">
                <span className="text-gray-400 font-medium text-[11px] block mb-1">Certifications:</span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg inline-block border border-emerald-200">
                  {product.certifications}
                </span>
              </div>
            )}
          </div>

          {/* Full Description */}
          <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-2">
            <h3 className="font-sans font-black text-sm uppercase tracking-wider text-gray-700">
              Detailed Description & Harvest Notes
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-medium whitespace-pre-line">
              {product.description || 'No detailed notes provided by supplier.'}
            </p>
          </div>
        </div>
      </div>

      {/* Lightbox / Zoom Modal */}
      {isZoomOpen && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsZoomOpen(false)}
        >
          <button
            onClick={() => setIsZoomOpen(false)}
            aria-label="Close image preview"
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={currentImage}
            alt={product.title}
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}
