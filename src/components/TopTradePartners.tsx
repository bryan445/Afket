import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Product, Order } from '../types';
import { db } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ArrowRight, Search, Sparkles, Building2, Users } from 'lucide-react';

interface TradePartnerItem {
  id: string;
  name: string;
  location: string;
  interest: string;
  role: 'seller' | 'buyer';
  logoUrl?: string;
}

interface TopTradePartnersProps {
  user: UserProfile;
  allProfiles: UserProfile[];
  marketplaceProducts: Product[];
  orders: Order[];
  dashSearch?: string;
  dashCategory?: string;
  onExploreSupplier: (sellerId: string, supplierName: string) => void;
  onOpenPitchModal: (targetName: string, role: string) => void;
}

function CompanyLogo({ name, logoUrl, role }: { name: string; logoUrl?: string; role: 'seller' | 'buyer' }) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [logoUrl]);

  const initials = useMemo(() => {
    const cleanName = name.replace(/\(You\)/i, '').trim();
    const parts = cleanName.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return cleanName.slice(0, 2).toUpperCase() || 'AF';
  }, [name]);

  if (logoUrl && !imgFailed) {
    return (
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shrink-0 border border-gray-200/90 shadow-xs bg-white flex items-center justify-center p-0.5">
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className="w-full h-full object-cover rounded-xl"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center shrink-0 border border-black/5 shadow-xs text-white ${
        role === 'seller'
          ? 'bg-gradient-to-br from-[#365314] to-[#224411]'
          : 'bg-gradient-to-br from-[#D97706] to-[#b45309]'
      }`}
    >
      <span className="font-sans font-black text-sm sm:text-base tracking-wider">{initials}</span>
      <span className="text-[9px] opacity-80 uppercase tracking-tight font-semibold mt-0.5">
        {role === 'seller' ? 'Co-op' : 'Corp'}
      </span>
    </div>
  );
}

function getSellerInterest(seller: UserProfile, products: Product[]): string {
  const sellerProds = products.filter(
    p => p.sellerId === seller.id ||
      (seller.businessName && p.sellerName?.toLowerCase() === seller.businessName.toLowerCase()) ||
      (seller.fullName && p.sellerName?.toLowerCase() === seller.fullName.toLowerCase())
  );

  if (sellerProds.length > 0) {
    const uniqueTitles = Array.from(new Set(sellerProds.map(p => p.title.trim())));
    return uniqueTitles.slice(0, 3).join(', ');
  }

  const loc = (seller.location || seller.nationality || '').toLowerCase();
  if (loc.includes('malawi') || loc.includes('mchinji') || loc.includes('neno') || loc.includes('thyolo') || loc.includes('blantyre') || loc.includes('lilongwe')) {
    return 'White Maize, Soya Beans, Groundnuts & Sugar Beans';
  }
  if (loc.includes('ghana')) return 'Cocoa Beans, Shea Butter & Raw Cashew Nuts';
  if (loc.includes('kenya')) return 'Milling Wheat, Yellow Corn & Dry Beans';
  if (loc.includes('burkina')) return 'Raw Cashews, Sesame Seeds & Shea';
  if (loc.includes('nigeria')) return 'Soybeans, Sesame, Sorghum & Cassava Flour';

  return 'Cereals, Grain Legumes & Export Cash Crops';
}

function getBuyerInterest(buyer: UserProfile, orders: Order[]): string {
  const buyerOrders = orders.filter(
    o => o.buyerId === buyer.id ||
      (buyer.businessName && o.buyerName?.toLowerCase() === buyer.businessName.toLowerCase()) ||
      (buyer.fullName && o.buyerName?.toLowerCase() === buyer.fullName.toLowerCase())
  );

  if (buyerOrders.length > 0) {
    const uniqueProds = Array.from(new Set(buyerOrders.map(o => o.productTitle.trim())));
    return uniqueProds.slice(0, 3).join(', ');
  }

  const loc = (buyer.location || buyer.nationality || '').toLowerCase();
  if (loc.includes('malawi') || loc.includes('zomba') || loc.includes('blantyre') || loc.includes('lilongwe')) {
    return 'Bulk Maize, Soya Beans, Groundnuts & Pulses';
  }
  if (loc.includes('kenya') || loc.includes('nairobi')) return 'Raw Cashews, Bulk Maize & Grade-A Cocoa';
  if (loc.includes('nigeria') || loc.includes('lagos')) return 'Unrefined Shea Butter, Sesame & Yellow Maize';
  if (loc.includes('ghana')) return 'Bulk Grains, Soya Beans & Dry Legumes';

  return 'Bulk Agricultural Commodities, Grains & Oilseeds';
}

export function TopTradePartners({
  user,
  allProfiles,
  marketplaceProducts,
  orders,
  dashSearch = '',
  dashCategory = 'all',
  onExploreSupplier,
  onOpenPitchModal
}: TopTradePartnersProps) {
  // Default active tab: if user is seller, default to buyers; otherwise default to sellers
  const [activeTab, setActiveTab] = useState<'sellers' | 'buyers'>(
    user.role === 'seller' ? 'buyers' : 'sellers'
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flashTrigger, setFlashTrigger] = useState(false);
  const [internalProfiles, setInternalProfiles] = useState<UserProfile[]>(allProfiles || []);

  // Direct database query fallback to ensure live profiles are always present immediately
  useEffect(() => {
    if (allProfiles && allProfiles.length > 0) {
      setInternalProfiles(allProfiles);
    } else {
      db.auth.listProfiles()
        .then(profiles => {
          if (profiles && profiles.length > 0) {
            setInternalProfiles(profiles);
          }
        })
        .catch(err => {
          console.warn('TopTradePartners direct profiles load warning:', err);
        });
    }
  }, [allProfiles]);

  const effectiveProfiles = useMemo(() => {
    return internalProfiles.length > 0 ? internalProfiles : (allProfiles || []);
  }, [internalProfiles, allProfiles]);

  // Buyer interest keywords for matching
  const buyerInterestKeywords = useMemo(() => {
    const keywords = new Set<string>();

    orders.forEach(o => {
      if (o.productTitle) {
        o.productTitle.toLowerCase().split(/\s+/).forEach(w => {
          if (w.length > 2) keywords.add(w);
        });
      }
    });

    if (dashSearch.trim()) {
      dashSearch.toLowerCase().split(/\s+/).forEach(w => {
        if (w.length > 2) keywords.add(w);
      });
    }

    if (dashCategory && dashCategory !== 'all') {
      keywords.add(dashCategory.toLowerCase());
    }

    if (keywords.size === 0) {
      keywords.add('maize');
      keywords.add('soya');
      keywords.add('cashew');
      keywords.add('groundnuts');
      keywords.add('beans');
    }

    return Array.from(keywords);
  }, [orders, dashSearch, dashCategory]);

  // List of sellers from database (profiles + marketplace products)
  const allSellerItems: TradePartnerItem[] = useMemo(() => {
    const sellerMap = new Map<string, TradePartnerItem>();

    // 1. From database profiles
    effectiveProfiles
      .filter(p => p.role === 'seller')
      .forEach(p => {
        const rawName = p.businessName?.trim() || p.fullName?.trim() || 'Agricultural Supplier';
        const displayName = p.id === user.id ? `${rawName} (You)` : rawName;
        sellerMap.set(p.id, {
          id: p.id,
          name: displayName,
          location: p.location?.trim() || p.nationality?.trim() || 'Malawi',
          interest: getSellerInterest(p, marketplaceProducts),
          role: 'seller',
          logoUrl: p.logoUrl
        });
      });

    // 2. From database marketplace products (ensures sellers with listed products always show)
    marketplaceProducts.forEach(prod => {
      if (prod.sellerId && !sellerMap.has(prod.sellerId)) {
        const rawName = prod.sellerBusinessName?.trim() || prod.sellerName?.trim() || 'Verified Seller';
        const displayName = prod.sellerId === user.id ? `${rawName} (You)` : rawName;
        sellerMap.set(prod.sellerId, {
          id: prod.sellerId,
          name: displayName,
          location: prod.location?.trim() || prod.sellerNationality?.trim() || 'Malawi',
          interest: prod.title ? prod.title : 'Agricultural Commodities',
          role: 'seller',
          logoUrl: prod.sellerLogoUrl
        });
      }
    });

    const list = Array.from(sellerMap.values());
    return list.sort((a, b) => {
      const aText = `${a.interest} ${a.name}`.toLowerCase();
      const bText = `${b.interest} ${b.name}`.toLowerCase();
      const aMatches = buyerInterestKeywords.filter(k => aText.includes(k)).length;
      const bMatches = buyerInterestKeywords.filter(k => bText.includes(k)).length;
      return bMatches - aMatches;
    });
  }, [effectiveProfiles, marketplaceProducts, user.id, buyerInterestKeywords]);

  // List of buyers from database (profiles + orders)
  const allBuyerItems: TradePartnerItem[] = useMemo(() => {
    const buyerMap = new Map<string, TradePartnerItem>();

    // 1. From database profiles
    effectiveProfiles
      .filter(p => p.role === 'buyer')
      .forEach(p => {
        const rawName = p.businessName?.trim() || p.fullName?.trim() || 'Commodity Buyer';
        const displayName = p.id === user.id ? `${rawName} (You)` : rawName;
        buyerMap.set(p.id, {
          id: p.id,
          name: displayName,
          location: p.location?.trim() || p.nationality?.trim() || 'Malawi',
          interest: getBuyerInterest(p, orders),
          role: 'buyer',
          logoUrl: p.logoUrl
        });
      });

    // 2. From database orders
    orders.forEach(order => {
      if (order.buyerId && !buyerMap.has(order.buyerId)) {
        const rawName = order.buyerName?.trim() || 'Verified Buyer';
        const displayName = order.buyerId === user.id ? `${rawName} (You)` : rawName;
        buyerMap.set(order.buyerId, {
          id: order.buyerId,
          name: displayName,
          location: order.deliveryAddress?.trim() || 'Malawi',
          interest: order.productTitle ? order.productTitle : 'Agricultural Commodities',
          role: 'buyer'
        });
      }
    });

    return Array.from(buyerMap.values());
  }, [effectiveProfiles, orders, user.id]);

  // Determine active partner list based on user tab selection
  const activeItems = activeTab === 'sellers' ? allSellerItems : allBuyerItems;
  const isDisplayingSellers = activeTab === 'sellers';

  // Ensure index remains in bounds
  const validIndex = activeItems.length > 0 ? currentIndex % activeItems.length : 0;
  const currentCard = activeItems.length > 0 ? activeItems[validIndex] : null;

  // 5-Second Flashing Exchange (no timer displayed)
  useEffect(() => {
    if (activeItems.length <= 1) return;

    const interval = setInterval(() => {
      // Trigger flash animation
      setFlashTrigger(true);
      setTimeout(() => setFlashTrigger(false), 450);

      // Advance to next partner card
      setCurrentIndex(prev => (prev + 1) % activeItems.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeItems.length]);

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-7 text-left shadow-xs relative overflow-hidden">
      {/* 5-Second Radiant Flash Overlay Effect */}
      <AnimatePresence>
        {flashTrigger && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.75, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="absolute inset-0 bg-gradient-to-r from-amber-200/50 via-white/90 to-emerald-200/50 pointer-events-none rounded-3xl z-30"
          />
        )}
      </AnimatePresence>

      {/* Header with Title and Toggle for Sellers / Buyers */}
      <div className="flex items-center justify-between gap-3 mb-5 pb-3 border-b border-gray-100">
        <div>
          <h3 className="text-lg sm:text-xl font-sans font-black tracking-tight text-[#1F2937]">
            {isDisplayingSellers ? 'Top Sellers' : 'Top Buyers'}
          </h3>
        </div>

        {/* Tab Switcher allowing user to toggle between Sellers and Buyers */}
        <div className="flex items-center gap-1 bg-gray-100/90 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab('sellers');
              setCurrentIndex(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sellers'
                ? 'bg-white text-[#365314] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Building2 className="h-3.5 w-3.5 text-[#365314]" />
            <span>Sellers</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('buyers');
              setCurrentIndex(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'buyers'
                ? 'bg-white text-[#D97706] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="h-3.5 w-3.5 text-[#D97706]" />
            <span>Buyers</span>
          </button>
        </div>
      </div>

      {/* Single Flashing Card or Empty State */}
      <div className="relative min-h-[140px] flex flex-col justify-center">
        {activeItems.length === 0 ? (
          <div className="bg-[#FAF9F6] rounded-2xl p-6 border border-dashed border-gray-200 text-center py-7">
            <p className="text-sm font-bold text-gray-800">
              {isDisplayingSellers ? 'No registered sellers found in database' : 'No registered buyers found in database'}
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              {isDisplayingSellers
                ? 'When suppliers register and list commodities in the database, their accounts will appear here.'
                : 'When buyers register and verify their trade profiles in the database, their accounts will appear here.'}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {currentCard && (
              <motion.div
                key={`${currentCard.id}-${validIndex}-${activeTab}`}
                initial={{ opacity: 0, scale: 0.98, filter: 'brightness(1.2)' }}
                animate={{ opacity: 1, scale: 1, filter: 'brightness(1)' }}
                exit={{ opacity: 0, scale: 0.98, filter: 'brightness(1.2)' }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="bg-[#FAF9F6] rounded-2xl p-5 sm:p-6 border border-gray-100/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
                  {/* Company Logo */}
                  <CompanyLogo
                    name={currentCard.name}
                    logoUrl={currentCard.logoUrl}
                    role={currentCard.role}
                  />

                  <div className="space-y-1.5 min-w-0">
                    {/* Company's Name */}
                    <h4 className="text-xl sm:text-2xl font-sans font-black text-[#1F2937] leading-tight">
                      {currentCard.name}
                    </h4>

                    {/* Company's Location */}
                    <div className="flex items-center gap-1.5 text-gray-500 text-sm font-medium">
                      <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                      <span>{currentCard.location}</span>
                    </div>

                    {/* Company's Interest */}
                    <div className="pt-0.5 text-sm text-gray-700">
                      <span className="font-bold text-gray-900">Interest: </span>
                      <span className="font-medium text-gray-800">{currentCard.interest}</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="shrink-0 self-start md:self-center">
                  {isDisplayingSellers ? (
                    <button
                      onClick={() => onExploreSupplier(currentCard.id, currentCard.name.replace(/\(You\)/i, '').trim())}
                      className="bg-[#365314] hover:bg-[#224411] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Search className="h-3.5 w-3.5" />
                      <span>View Products</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onOpenPitchModal(currentCard.name.replace(/\(You\)/i, '').trim(), 'buyer')}
                      className="bg-[#D97706] hover:bg-[#b45309] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Connect</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
