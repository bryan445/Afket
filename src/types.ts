export type UserRole = 'buyer' | 'seller' | 'logistics_provider';
export type PaymentStatus = 'paid' | 'not paid';
export type SubscriptionType = 'monthly' | 'annual';
export type SubscriptionTierStatus = 'trial' | 'paid' | 'due';
export type AccountType = 'individual' | 'company';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  surname: string;
  fullName: string;
  role: UserRole;
  accountType?: AccountType;
  businessName?: string;
  phone?: string;
  location: string;
  joinedAt: string;
  nationality?: string;
  whatsapp?: string;
  facebook?: string;
  contactEmail?: string;
  logoUrl?: string;
  registrationStatus?: PaymentStatus;
  subscriptionStatus?: PaymentStatus;
  subscriptionType?: SubscriptionType;
  expiryDate?: string;
  subscriptionPaidUntil?: string;
  registrationFee?: number;
  monthlySubscriptionFee?: number;
  annualSubscriptionFee?: number;
  trialEndsAt?: string;
  lastSubscriptionPaymentDate?: string;
  lastSubscriptionPaymentMethod?: string;
  lastSubscriptionPaymentRef?: string;
  currency?: string;
  registrationPaymentDate?: string;
  registrationPaymentMethod?: string;
  registrationPaymentRef?: string;
  policyAgreed?: boolean;
  policyAgreedAt?: string;
}

/**
 * Returns the subscription fee breakdown based on user role and account entity type.
 * - Solo/individual users: 10,000 MWK / month or 110,000 MWK / year (Save 10,000 MWK)
 * - Companies & Logistics Providers: 15,000 MWK / month or 150,000 MWK / year (Save 30,000 MWK)
 */
export function getSubscriptionFees(role?: UserRole, accountType?: AccountType, businessName?: string): {
  monthly: number;
  annual: number;
  savings: number;
  tierLabel: string;
} {
  const isCorporate = role === 'logistics_provider' || accountType === 'company' || Boolean(businessName?.trim());
  if (isCorporate) {
    return {
      monthly: 15000,
      annual: 150000,
      savings: 30000,
      tierLabel: role === 'logistics_provider' ? 'Logistics Carrier & Fleet' : 'Registered Agribusiness / Company'
    };
  }
  return {
    monthly: 10000,
    annual: 110000,
    savings: 10000,
    tierLabel: 'Solo Trader / Individual Seller / Buyer'
  };
}

export function getMonthlySubscriptionFee(role?: UserRole, accountType?: AccountType, businessName?: string): number {
  return getSubscriptionFees(role, accountType, businessName).monthly;
}

export function getAnnualSubscriptionFee(role?: UserRole, accountType?: AccountType, businessName?: string): number {
  return getSubscriptionFees(role, accountType, businessName).annual;
}

/**
 * Official Support Contact Information for AFKET Malawian Ag-Trade Platform
 */
export const AFKET_SUPPORT = {
  email: 'admin@afket.store',
  altEmail: 'admin@afket.store',
  whatsappNumber: '0987523475',
  whatsappDisplay: '0987523475',
  whatsappUrl: 'https://wa.me/265987523475?text=Hello%20AFKET%20Support,%20I%20need%20assistance%20with%20my%20trade%20account',
  phone: '0884716426',
  phoneTel: 'tel:0884716426',
  officeLocation: 'Blantyre / Lilongwe, Malawi'
};

/**
 * Calculates trial and subscription details for a user profile.
 * - Free 1-Month (30 days) usage / trial from registration day (joinedAt).
 * - After 1-month usage, user must pay subscription (Monthly or Annual).
 */
export function getUserSubscriptionInfo(user: Partial<UserProfile> | null | undefined) {
  const fees = getSubscriptionFees(user?.role, user?.accountType, user?.businessName);
  const currentPlanType: SubscriptionType = user?.subscriptionType || 'monthly';
  const TRIAL_DAYS = 30; // 1-month free usage

  if (!user || !user.joinedAt) {
    return {
      status: 'trial' as SubscriptionTierStatus,
      isTrialActive: true,
      daysRemaining: TRIAL_DAYS,
      trialEndsDate: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
      monthlyFee: fees.monthly,
      annualFee: fees.annual,
      annualSavings: fees.savings,
      currentPlanType,
      tierLabel: fees.tierLabel,
      isPaid: false,
      isDue: false,
      formattedDueDate: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    };
  }

  const joinedDate = new Date(user.joinedAt);
  const trialEndsDate = user.trialEndsAt 
    ? new Date(user.trialEndsAt) 
    : new Date(joinedDate.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  
  const now = new Date();
  const rawExpiry = user.subscriptionPaidUntil || (user.subscriptionStatus === 'paid' ? user.expiryDate : null);
  const paidUntilDate = rawExpiry ? new Date(rawExpiry) : null;
  
  // An active paid subscription requires that payment was explicitly confirmed (subscriptionStatus === 'paid')
  // and if an expiry date is set, it has not passed yet.
  const isPaidConfirmed = user.subscriptionStatus === 'paid';
  const isPaidActive = isPaidConfirmed && (paidUntilDate ? (paidUntilDate.getTime() > now.getTime()) : true);

  if (isPaidActive) {
    const daysUntilNextPayment = paidUntilDate 
      ? Math.max(0, Math.ceil((paidUntilDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : (currentPlanType === 'annual' ? 365 : 30);
    
    return {
      status: 'paid' as SubscriptionTierStatus,
      isTrialActive: false,
      daysRemaining: daysUntilNextPayment,
      trialEndsDate,
      monthlyFee: fees.monthly,
      annualFee: fees.annual,
      annualSavings: fees.savings,
      currentPlanType,
      tierLabel: fees.tierLabel,
      isPaid: true,
      isDue: false,
      formattedDueDate: paidUntilDate 
        ? paidUntilDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Active'
    };
  }

  const msRemaining = trialEndsDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  const isTrialActive = msRemaining > 0;

  return {
    status: (isTrialActive ? 'trial' : 'due') as SubscriptionTierStatus,
    isTrialActive,
    daysRemaining,
    trialEndsDate,
    monthlyFee: fees.monthly,
    annualFee: fees.annual,
    annualSavings: fees.savings,
    currentPlanType,
    tierLabel: fees.tierLabel,
    isPaid: false,
    isDue: !isTrialActive,
    formattedDueDate: trialEndsDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  };
}

export interface BuyerWhatsAppPermission {
  allowed: boolean;
  isBlocked: boolean;
  daysRemaining: number;
  daysSinceJoined: number;
  maxFreeDays: number;
  reason: string;
}

/**
 * Validates WhatsApp communication access for buyers connecting with sellers.
 * - Buyers can connect with sellers via WhatsApp for only 2 weeks (14 days) on free tier.
 * - After 2 weeks, they must be blocked from WhatsApp seller connections until they pay subscription.
 * - Active paid subscription unlocks unlimited WhatsApp communication.
 */
export function checkBuyerWhatsAppPermission(
  user: Partial<UserProfile> | null | undefined
): BuyerWhatsAppPermission {
  const MAX_BUYER_FREE_DAYS = 14; // 2 weeks limit for buyers

  if (!user || !user.id) {
    return {
      allowed: false,
      isBlocked: true,
      daysRemaining: 0,
      daysSinceJoined: 0,
      maxFreeDays: MAX_BUYER_FREE_DAYS,
      reason: 'Please sign in to connect with sellers.'
    };
  }

  const subInfo = getUserSubscriptionInfo(user);

  // Active paid subscription: Unlimited WhatsApp connections
  if (subInfo.isPaid) {
    return {
      allowed: true,
      isBlocked: false,
      daysRemaining: subInfo.daysRemaining,
      daysSinceJoined: 0,
      maxFreeDays: MAX_BUYER_FREE_DAYS,
      reason: 'Active subscription grants unlimited WhatsApp seller connections.'
    };
  }

  const joinedDate = user.joinedAt ? new Date(user.joinedAt) : new Date();
  const now = new Date();
  const msSinceJoined = now.getTime() - joinedDate.getTime();
  const daysSinceJoined = Math.max(0, Math.floor(msSinceJoined / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, MAX_BUYER_FREE_DAYS - daysSinceJoined);

  // If user role is buyer: strictly enforce 2 weeks (14 days) limit
  if (user.role === 'buyer') {
    if (daysSinceJoined >= MAX_BUYER_FREE_DAYS) {
      return {
        allowed: false,
        isBlocked: true,
        daysRemaining: 0,
        daysSinceJoined,
        maxFreeDays: MAX_BUYER_FREE_DAYS,
        reason: 'Free buyer WhatsApp seller connection is limited to 2 weeks. Your 14-day free WhatsApp access has expired. Please subscribe to your Monthly or Annual plan to continue messaging sellers directly.'
      };
    }

    return {
      allowed: true,
      isBlocked: false,
      daysRemaining,
      daysSinceJoined,
      maxFreeDays: MAX_BUYER_FREE_DAYS,
      reason: `Free Buyer WhatsApp Access active (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining of your 2-week limit).`
    };
  }

  // Non-buyer roles (sellers, logistics) during their 1-month free trial
  if (subInfo.isTrialActive) {
    return {
      allowed: true,
      isBlocked: false,
      daysRemaining: subInfo.daysRemaining,
      daysSinceJoined,
      maxFreeDays: 30,
      reason: `Free 1-month account usage active (${subInfo.daysRemaining} days remaining).`
    };
  }

  return {
    allowed: false,
    isBlocked: true,
    daysRemaining: 0,
    daysSinceJoined,
    maxFreeDays: 30,
    reason: 'Free 1-month account usage has expired. Please update your subscription to continue connecting with trade partners.'
  };
}

export interface UserFeedback {
  id: string;
  userId?: string;
  userName: string;
  userEmail: string;
  userRole?: UserRole;
  rating: number; // 1 to 5
  category: string;
  satisfaction?: string;
  feedback: string;
  createdAt: string;
}

export const MAX_FREE_SELLER_PRODUCTS = 3;

export interface ProductUploadPermission {
  allowed: boolean;
  reason: string;
  isExpired: boolean;
  isUnpaid: boolean;
  maxFreeProducts: number;
  currentCount: number;
  daysRemaining?: number;
  formattedDueDate?: string;
  planType: SubscriptionType;
  monthlyFee: number;
  annualFee: number;
  tierLabel: string;
}

/**
 * Checks if a user is permitted to upload or list products on the AFKET Marketplace.
 * - During the free period, sellers can add only three (3) products for sale.
 * - If a seller attempts to add a fourth (4th) product, they are blocked with a note to subscribe to continue uploading.
 * - Active paid subscription unlocks unlimited product listings.
 */
export function checkProductUploadEligibility(
  user: Partial<UserProfile> | null | undefined,
  existingProductCount: number = 0
): ProductUploadPermission {
  const subInfo = getUserSubscriptionInfo(user);
  const count = Math.max(0, existingProductCount);

  if (!user || !user.id) {
    return {
      allowed: false,
      reason: 'Please sign in to upload products.',
      isExpired: false,
      isUnpaid: true,
      maxFreeProducts: MAX_FREE_SELLER_PRODUCTS,
      currentCount: count,
      planType: subInfo.currentPlanType,
      monthlyFee: subInfo.monthlyFee,
      annualFee: subInfo.annualFee,
      tierLabel: subInfo.tierLabel
    };
  }

  // Active paid subscription: Unlimited uploads allowed
  if (subInfo.isPaid) {
    return {
      allowed: true,
      reason: `Active ${subInfo.currentPlanType === 'annual' ? 'Annual' : 'Monthly'} Subscription (${subInfo.daysRemaining} days remaining) — Unlimited product listings.`,
      isExpired: false,
      isUnpaid: false,
      maxFreeProducts: Infinity,
      currentCount: count,
      daysRemaining: subInfo.daysRemaining,
      formattedDueDate: subInfo.formattedDueDate,
      planType: subInfo.currentPlanType,
      monthlyFee: subInfo.monthlyFee,
      annualFee: subInfo.annualFee,
      tierLabel: subInfo.tierLabel
    };
  }

  // Free period expired (after 1-month trial)
  if (!subInfo.isTrialActive) {
    return {
      allowed: false,
      reason: 'Your 1-month free trial has ended. Please subscribe to your Monthly or Annual plan to continue uploading and selling products.',
      isExpired: true,
      isUnpaid: true,
      maxFreeProducts: MAX_FREE_SELLER_PRODUCTS,
      currentCount: count,
      daysRemaining: 0,
      formattedDueDate: subInfo.formattedDueDate,
      planType: subInfo.currentPlanType,
      monthlyFee: subInfo.monthlyFee,
      annualFee: subInfo.annualFee,
      tierLabel: subInfo.tierLabel
    };
  }

  // Within free period: seller can add up to MAX_FREE_SELLER_PRODUCTS (3 products)
  // If attempting to add 4th product (count >= 3), block and display note to subscribe
  if (count >= MAX_FREE_SELLER_PRODUCTS) {
    return {
      allowed: false,
      reason: `You have reached the free limit of ${MAX_FREE_SELLER_PRODUCTS} products for sale. Please subscribe to your Monthly or Annual plan to continue uploading and selling more products.`,
      isExpired: false,
      isUnpaid: true,
      maxFreeProducts: MAX_FREE_SELLER_PRODUCTS,
      currentCount: count,
      daysRemaining: subInfo.daysRemaining,
      formattedDueDate: subInfo.formattedDueDate,
      planType: subInfo.currentPlanType,
      monthlyFee: subInfo.monthlyFee,
      annualFee: subInfo.annualFee,
      tierLabel: subInfo.tierLabel
    };
  }

  const remaining = MAX_FREE_SELLER_PRODUCTS - count;
  return {
    allowed: true,
    reason: `Free Period: ${count} of ${MAX_FREE_SELLER_PRODUCTS} products listed (${remaining} remaining in free period).`,
    isExpired: false,
    isUnpaid: true,
    maxFreeProducts: MAX_FREE_SELLER_PRODUCTS,
    currentCount: count,
    daysRemaining: subInfo.daysRemaining,
    formattedDueDate: subInfo.formattedDueDate,
    planType: subInfo.currentPlanType,
    monthlyFee: subInfo.monthlyFee,
    annualFee: subInfo.annualFee,
    tierLabel: subInfo.tierLabel
  };
}

export type ProductCategory = 'crops' | 'minerals' | 'fruits' | 'legumes' | 'clothings' | 'meat' | 'handicrafts';

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerBusinessName?: string;
  sellerNationality?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  sellerWhatsapp?: string;
  sellerFacebook?: string;
  sellerLogoUrl?: string;
  localCurrency?: string;
  title: string;
  description: string;
  category: ProductCategory;
  price: number; // general price/average
  localPrice: number; // local market price
  internationalPrice: number; // export/international price in USD
  unit: string; // e.g., "Ton", "kg", "50kg Bag"
  availableQuantity: number;
  condition: string; // e.g., "Moisture level <7%, Grade A", "Certified Organic, Raw"
  minOrderQty?: number; // minimum bulk purchase quantity
  packaging?: string; // e.g., "50kg Polypropylene Bags", "Bulk Container"
  certifications?: string; // e.g., "Phytosanitary, FDA, Fairtrade"
  location: string; // origin country/city, e.g., "Kumasi, Ghana"
  imageUrl: string;
  imageUrls?: string[]; // up to three product pictures
  harvestDate?: string;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'accepted' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  productId: string;
  productTitle: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  quantity: number;
  totalPrice: number;
  status: OrderStatus;
  deliveryAddress: string;
  createdAt: string;
  logisticsId?: string; // assigned logistics provider
  logisticsStatus?: LogisticsStatus;
}

export type LogisticsStatus = 'awaiting_pickup' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered';

export interface LogisticsJob {
  id: string;
  orderId: string;
  productTitle: string;
  quantity: number;
  unit: string;
  buyerName: string;
  buyerPhone?: string;
  sellerName: string;
  sellerPhone?: string;
  pickupLocation: string;
  deliveryLocation: string;
  status: LogisticsStatus;
  providerId?: string; // assigned logistics company
  providerName?: string;
  providerPhone?: string;
  providerEmail?: string;
  providerWhatsapp?: string;
  providerFacebook?: string;
  quotePrice?: number; // logistics price
  estimatedDelivery?: string;
  updatedAt: string;
  sellerLogoUrl?: string;
  buyerLogoUrl?: string;
  providerLogoUrl?: string;
}

export interface TradeStats {
  totalSales: number;
  totalPurchases: number;
  completedDeals: number;
  pendingDeliveries: number;
  activeListingsCount: number;
}

export const SUPPORTED_CURRENCIES = [
  { code: 'DZD', symbol: 'DA', label: 'Algerian Dinar (DZD)' },
  { code: 'AOA', symbol: 'Kz', label: 'Angolan Kwanza (AOA)' },
  { code: 'XOF', symbol: 'CFA', label: 'Benin – CFA Franc (XOF)' },
  { code: 'BWP', symbol: 'P', label: 'Botswana – Pula (BWP)' },
  { code: 'BIF', symbol: 'FBu', label: 'Burundi – Burundi Franc (BIF)' },
  { code: 'XOF_BF', symbol: 'CFA', label: 'Burkina Faso – CFA Franc BCEAO (XOF)' },
  { code: 'XAF_CM', symbol: 'FCFA', label: 'Cameroon – CFA Franc BEAC (XAF)' },
  { code: 'CVE', symbol: 'Esc', label: 'Cape Verde – Cape Verde Escudo (CVE)' },
  { code: 'XAF_CF', symbol: 'FCFA', label: 'Central African Republic – CFA Franc BEAC (XAF)' },
  { code: 'XAF_TD', symbol: 'FCFA', label: 'Chad – CFA Franc BEAC (XAF)' },
  { code: 'KMF', symbol: 'CF', label: 'Comoros – Comoros Franc (KMF)' },
  { code: 'XOF_CI', symbol: 'CFA', label: 'Cote d’Ivoire – CFA Franc BCEAO (XOF)' },
  { code: 'CDF', symbol: 'FC', label: 'DR Congo – Francs (CDF)' },
  { code: 'DJF', symbol: 'Fdj', label: 'Djibouti – Djibouti Franc (DJF)' },
  { code: 'EGP', symbol: 'E£', label: 'Egypt – Pound (EGP)' },
  { code: 'XAF_GQ', symbol: 'FCFA', label: 'Equatorial Guinea – CFA Franc BEAC (XAF)' },
  { code: 'ERN', symbol: 'Nfk', label: 'Eritrea – Eriterian Nakfa (ERN)' },
  { code: 'ETB', symbol: 'Br', label: 'Ethiopia – Birr (ETB)' },
  { code: 'XAF_GA', symbol: 'FCFA', label: 'Gabon – CFA Franc BEAC (XAF)' },
  { code: 'GMD', symbol: 'D', label: 'Gambia – Dalasi (GMD)' },
  { code: 'GHS', symbol: 'GH₵', label: 'Ghana – Cedi (GHS)' },
  { code: 'GNF', symbol: 'FG', label: 'Guinea – Franc (GNF)' },
  { code: 'GWP', symbol: 'Peso', label: 'Guinea-Bissau – Guinea-Bissau Peso (GWP)' },
  { code: 'KES', symbol: 'KSh', label: 'Kenya – Shillings (KES)' },
  { code: 'LSL', symbol: 'L', label: 'Lesotho – Loti (LSL)' },
  { code: 'LRD', symbol: 'LD', label: 'Liberia – Dollar (LRD)' },
  { code: 'LYD', symbol: 'LD', label: 'Libya – Dinar (LYD)' },
  { code: 'MGA', symbol: 'Ar', label: 'Madagascar – Malagasy ariary (MGA)' },
  { code: 'MWK', symbol: 'MWK', label: 'Malawi – Kwacha (MWK)' },
  { code: 'XOF_ML', symbol: 'CFA', label: 'Mali – CFA Franc BCEAO (XOF)' },
  { code: 'MRO', symbol: 'UM', label: 'Mauritania – Ouguiya (MRO)' },
  { code: 'MUR', symbol: 'Rs', label: 'Mauritius – Rupees (MUR)' },
  { code: 'MAD', symbol: 'DH', label: 'Morocco – Dirham (MAD)' },
  { code: 'MZN', symbol: 'MT', label: 'Mozambique – Metical (MZN)' },
  { code: 'NAD', symbol: 'N$', label: 'Namibia – Dollar (NAD)' },
  { code: 'XOF_NE', symbol: 'CFA', label: 'Niger – CFA Franc BCEAO (XOF)' },
  { code: 'NGN', symbol: '₦', label: 'Nigeria – Naira (NGN)' },
  { code: 'XAF_CG', symbol: 'FCFA', label: 'Republic of the Congo – Franc BEAC (XAF)' },
  { code: 'EUR', symbol: '€', label: 'Réunion – Euro (EUR)' },
  { code: 'RWF', symbol: 'FRw', label: 'Rwanda – Franc (RWF)' },
  { code: 'STD', symbol: 'Db', label: 'São Tomé and Principe – Dobra (STD)' },
  { code: 'XOF_SN', symbol: 'CFA', label: 'Senegal – CFA Franc BCEAO (XOF)' },
  { code: 'SCR', symbol: 'SR', label: 'Seychelles – Rupees (SCR)' },
  { code: 'SLL', symbol: 'Le', label: 'Sierra Leone – Leone (SLL)' },
  { code: 'SOS', symbol: 'Sh', label: 'Somalia – Shillings (SOS)' },
  { code: 'ZAR', symbol: 'R', label: 'South Africa – Rand (ZAR)' },
  { code: 'SSP', symbol: '£', label: 'South Sudan – Pound (SSP)' },
  { code: 'SDG', symbol: 'SDG', label: 'Sudan – Pound (SDG)' },
  { code: 'SZL', symbol: 'L', label: 'Swaziland – Lilangeni (SZL)' },
  { code: 'TZS', symbol: 'TSh', label: 'Tanzania – Shillings (TZS)' },
  { code: 'XOF_TG', symbol: 'CFA', label: 'Togo – CFA Franc BCEAO (XOF)' },
  { code: 'TND', symbol: 'DT', label: 'Tunisia – Dinar (TND)' },
  { code: 'UGX', symbol: 'USh', label: 'Uganda – Shillings (UGX)' },
  { code: 'ZMW', symbol: 'ZK', label: 'Zambia – Kwacha (ZMW)' },
  { code: 'ZWD', symbol: 'Z$', label: 'Zimbabwe – Dollar (ZWD)' },
  { code: 'USD', symbol: '$', label: 'US Dollar (USD)' }
];

export function formatLocalPrice(price: number, nationality?: string, localCurrency?: string): string {
  const currencyCode = (localCurrency || getCurrencyLabel(nationality)).toUpperCase().trim();
  
  // Normalize CFA or other common codes
  let lookupCode = currencyCode;
  if (currencyCode === 'CFA') lookupCode = 'XOF';
  if (currencyCode === 'SHILLINGS') lookupCode = 'UGX';

  const found = SUPPORTED_CURRENCIES.find(c => 
    c.code === lookupCode || 
    c.code.startsWith(lookupCode + '_') || 
    c.label.toUpperCase().includes(lookupCode)
  );
  
  if (found) {
    if (found.code === 'USD') {
      return `$${price.toLocaleString()} USD`;
    }
    const prependSymbols = ['$', '₦', 'GH₵', '€', '£', 'KSh', 'TSh', 'USh', 'R', 'N$', 'Z$', 'Kz', 'DH', 'MT', 'E£', 'DA'];
    if (prependSymbols.includes(found.symbol)) {
      return `${found.symbol}${price.toLocaleString()}`;
    }
    return `${price.toLocaleString()} ${found.symbol}`;
  }
  
  return `${price.toLocaleString()} ${currencyCode}`;
}

export function getCurrencyLabel(nationality?: string): string {
  if (!nationality) return 'USD';
  const norm = nationality.toLowerCase().trim();
  if (norm.includes('algeria')) return 'DZD';
  if (norm.includes('angola')) return 'AOA';
  if (norm.includes('benin')) return 'XOF';
  if (norm.includes('botswana')) return 'BWP';
  if (norm.includes('burundi')) return 'BIF';
  if (norm.includes('burkina')) return 'XOF';
  if (norm.includes('cameroon')) return 'XAF';
  if (norm.includes('cape verde')) return 'CVE';
  if (norm.includes('central african')) return 'XAF';
  if (norm.includes('chad')) return 'XAF';
  if (norm.includes('comoros')) return 'KMF';
  if (norm.includes('cote') || norm.includes('ivory')) return 'XOF';
  if (norm.includes('congo') && (norm.includes('dr') || norm.includes('democratic'))) return 'CDF';
  if (norm.includes('djibouti')) return 'DJF';
  if (norm.includes('egypt')) return 'EGP';
  if (norm.includes('equatorial')) return 'XAF';
  if (norm.includes('eritrea')) return 'ERN';
  if (norm.includes('ethiop')) return 'ETB';
  if (norm.includes('gabon')) return 'XAF';
  if (norm.includes('gambia')) return 'GMD';
  if (norm.includes('ghana')) return 'GHS';
  if (norm.includes('guinea-bissau')) return 'GWP';
  if (norm.includes('guinea')) return 'GNF';
  if (norm.includes('kenya')) return 'KES';
  if (norm.includes('lesotho')) return 'LSL';
  if (norm.includes('liberia')) return 'LRD';
  if (norm.includes('libya')) return 'LYD';
  if (norm.includes('madagascar')) return 'MGA';
  if (norm.includes('malawi')) return 'MWK';
  if (norm.includes('mali')) return 'XOF';
  if (norm.includes('mauritania')) return 'MRO';
  if (norm.includes('mauritius')) return 'MUR';
  if (norm.includes('morocco')) return 'MAD';
  if (norm.includes('mozambique')) return 'MZN';
  if (norm.includes('namibia')) return 'NAD';
  if (norm.includes('nigeria')) return 'NGN';
  if (norm.includes('niger')) return 'XOF';
  if (norm.includes('republic of the congo') || norm.includes('congo-brazzaville')) return 'XAF';
  if (norm.includes('réunion') || norm.includes('reunion')) return 'EUR';
  if (norm.includes('rwanda')) return 'RWF';
  if (norm.includes('são tomé') || norm.includes('sao tome')) return 'STD';
  if (norm.includes('senegal')) return 'XOF';
  if (norm.includes('seychelles')) return 'SCR';
  if (norm.includes('sierra leone')) return 'SLL';
  if (norm.includes('somalia')) return 'SOS';
  if (norm.includes('south africa')) return 'ZAR';
  if (norm.includes('south sudan')) return 'SSP';
  if (norm.includes('sudan')) return 'SDG';
  if (norm.includes('swaziland') || norm.includes('eswatini')) return 'SZL';
  if (norm.includes('tanzania')) return 'TZS';
  if (norm.includes('togo')) return 'XOF';
  if (norm.includes('tunisia')) return 'TND';
  if (norm.includes('uganda')) return 'UGX';
  if (norm.includes('zambia')) return 'ZMW';
  if (norm.includes('zimbabwe')) return 'ZWD';
  return 'USD';
}
