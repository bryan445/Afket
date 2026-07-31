import React, { useEffect, useState } from 'react';
import { LogisticsJob, UserProfile } from '../types';
import { db } from '../lib/supabase';
import { 
  Truck, ArrowRight, MapPin, Calendar, DollarSign, Package, 
  CheckCircle2, Clock, ShieldAlert, Navigation, Phone, User, X,
  MessageCircle, Mail, Facebook, Globe, Star, Sliders, Coins, Scale
} from 'lucide-react';

// Static carrier database matching domestic & international carriers
const ALL_PROVIDERS = [
  // MALAWI
  {
    id: 'swift-mw',
    name: 'Swift Transport',
    initial: 'SWIFT',
    color: 'from-orange-500 to-amber-600',
    textColor: 'text-white',
    type: 'Domestic Highway',
    country: 'Malawi',
    phone: '+265 1 876 122',
    whatsapp: '+265884716426',
    email: 'ops@swiftmalawi.com',
    website: 'www.swiftmalawi.com',
    isGlobal: false,
    rating: 4.9,
    baseRate: 150,
    perTonRate: 25,
    transitDays: '1-3 days',
    services: ['Overland Road', 'Bulk Agriculture Transport', 'Cold-chain storage']
  },
  {
    id: 'mw-cargo',
    name: 'Malawi Cargo Centres',
    initial: 'MCCL',
    color: 'from-blue-600 to-indigo-800',
    textColor: 'text-white',
    type: 'Corridor & Port',
    country: 'Malawi',
    phone: '+265 1 752 444',
    whatsapp: '+265999912345',
    email: 'info@malawicargo.mw',
    website: 'www.malawicargo.mw',
    isGlobal: false,
    rating: 4.8,
    baseRate: 280,
    perTonRate: 45,
    transitDays: '4-7 days',
    services: ['Dar es Salaam Corridor', 'Beira Transit', 'Customs Bonded Warehousing']
  },
  {
    id: 'glens-mw',
    name: 'Glens Logistics',
    initial: 'GLENS',
    color: 'from-emerald-600 to-teal-800',
    textColor: 'text-white',
    type: 'Domestic Express',
    country: 'Malawi',
    phone: '+265 1 671 888',
    whatsapp: '+265888203040',
    email: 'bookings@glens.mw',
    website: 'www.glenslogistics.mw',
    isGlobal: false,
    rating: 4.7,
    baseRate: 110,
    perTonRate: 20,
    transitDays: '1-2 days',
    services: ['FMCG Distribution', 'Last-mile Courier', 'Removals & Freight']
  },

  // KENYA
  {
    id: 'siginon-ke',
    name: 'Siginon Group',
    initial: 'SIGI',
    color: 'from-orange-600 to-red-700',
    textColor: 'text-white',
    type: 'East Africa Freight',
    country: 'Kenya',
    phone: '+254 20 2636900',
    whatsapp: '+254709111000',
    email: 'corporate@siginon.com',
    website: 'www.siginon.com',
    isGlobal: false,
    rating: 4.9,
    baseRate: 220,
    perTonRate: 35,
    transitDays: '2-4 days',
    services: ['Aviation Ground Handling', 'Mombasa Port Transit', 'Overland trucking']
  },
  {
    id: 'sendy-ke',
    name: 'Sendy Logistics',
    initial: 'SENDY',
    color: 'from-teal-500 to-emerald-600',
    textColor: 'text-white',
    type: 'Digital Last-Mile',
    country: 'Kenya',
    phone: '+254 709 779000',
    whatsapp: '+254709779000',
    email: 'support@sendyit.com',
    website: 'www.sendyit.com',
    isGlobal: false,
    rating: 4.8,
    baseRate: 90,
    perTonRate: 15,
    transitDays: '1-2 days',
    services: ['E-commerce Fulfillment', 'Smart Fleet Dispatch', 'Cross-city trucking']
  },

  // NIGERIA
  {
    id: 'gig-ng',
    name: 'GIG Logistics',
    initial: 'GIGL',
    color: 'from-red-600 to-rose-800',
    textColor: 'text-white',
    type: 'West Africa Hub',
    country: 'Nigeria',
    phone: '+234 813 985 1110',
    whatsapp: '+2348139851110',
    email: 'info@giglogistics.com',
    website: 'www.giglogistics.com',
    isGlobal: false,
    rating: 4.8,
    baseRate: 180,
    perTonRate: 30,
    transitDays: '2-5 days',
    services: ['Domestic Air Freight', 'Haulage Services', 'Interstate Distribution']
  },
  {
    id: 'redstar-ng',
    name: 'Red Star Express',
    initial: 'RSE',
    color: 'from-purple-600 to-indigo-800',
    textColor: 'text-white',
    type: 'Domestic & Courier',
    country: 'Nigeria',
    phone: '+234 1 271 5670',
    whatsapp: '+2348039007000',
    email: 'enquiries@redstarexpress-ng.com',
    website: 'www.redstarexpress-ng.com',
    isGlobal: false,
    rating: 4.7,
    baseRate: 140,
    perTonRate: 22,
    transitDays: '1-3 days',
    services: ['FedEx Nigeria Partner', 'Agro-logistics', 'Customs clearance']
  },

  // GLOBAL / ABROAD
  {
    id: 'dhl-global',
    name: 'DHL Forwarding',
    initial: 'DHL',
    color: 'from-yellow-400 to-yellow-500',
    textColor: 'text-red-700',
    type: 'Global Air & Sea',
    country: 'Germany',
    phone: '+49 228 18 20',
    whatsapp: '+492281820',
    email: 'global.freight@dhl.com',
    website: 'www.dhl.com',
    isGlobal: true,
    rating: 4.9,
    baseRate: 550,
    perTonRate: 95,
    transitDays: '3-5 days',
    services: ['DHL Express Air Cargo', 'Ocean Freight Containers', 'Multimodal Solutions']
  },
  {
    id: 'maersk-global',
    name: 'Maersk Logistics',
    initial: 'MAERSK',
    color: 'from-sky-400 to-blue-500',
    textColor: 'text-white',
    type: 'Global Ocean Leader',
    country: 'Denmark',
    phone: '+45 3363 3363',
    whatsapp: '+4533633363',
    email: 'sales.logistics@maersk.com',
    website: 'www.maersk.com',
    isGlobal: true,
    rating: 4.9,
    baseRate: 680,
    perTonRate: 110,
    transitDays: '10-18 days',
    services: ['Ocean Intermodal Shipping', 'Cold Chain Reefer Containers', 'Port-to-Port Hubs']
  },
  {
    id: 'dsv-global',
    name: 'DSV Global',
    initial: 'DSV',
    color: 'from-zinc-700 to-zinc-900',
    textColor: 'text-white',
    type: 'Global Road & Air',
    country: 'Denmark',
    phone: '+45 43 20 30 40',
    whatsapp: '+4543203040',
    email: 'info@dsv.com',
    website: 'www.dsv.com',
    isGlobal: true,
    rating: 4.8,
    baseRate: 480,
    perTonRate: 80,
    transitDays: '4-7 days',
    services: ['Air Charter Services', 'Overland Pan-African Trucking', 'Supply Chain Management']
  },
  {
    id: 'kuehne-nagel',
    name: 'Kuehne + Nagel',
    initial: 'K+N',
    color: 'from-blue-900 to-slate-900',
    textColor: 'text-white',
    type: 'Global Sea Freight',
    country: 'Switzerland',
    phone: '+41 44 786 95 11',
    whatsapp: '+41447869511',
    email: 'info.seafreight@kuehne-nagel.com',
    website: 'www.kuehne-nagel.com',
    isGlobal: true,
    rating: 4.8,
    baseRate: 620,
    perTonRate: 105,
    transitDays: '8-14 days',
    services: ['LCL / FCL Ocean Freight', 'Industrial Project Logistics', 'Customs Control']
  }
];

const getProvidersForCountry = (country: string) => {
  const cleanCountry = (country || 'Malawi').toLowerCase();
  const domestic = ALL_PROVIDERS.filter(p => !p.isGlobal && p.country.toLowerCase() === cleanCountry);
  const international = ALL_PROVIDERS.filter(p => p.isGlobal);
  
  // fallback if domestic has nothing
  if (domestic.length === 0) {
    domestic.push({
      id: 'af-exp',
      name: 'Africa Express',
      initial: 'AEX',
      color: 'from-amber-600 to-amber-800',
      textColor: 'text-white',
      type: 'Continental',
      country: country || 'Africa',
      phone: '+27 11 975 1234',
      whatsapp: '+27119751234',
      email: 'info@africa-express.co',
      website: 'www.africa-express.co',
      isGlobal: false,
      rating: 4.8,
      baseRate: 450,
      perTonRate: 85,
      transitDays: '3-6 days',
      services: ['Overland Road', 'Customs Clearance', 'Cross-border Transit']
    });
  }
  
  return { domestic, international, all: [...domestic, ...international] };
};

interface LogisticsProps {
  user: UserProfile;
}

export default function Logistics({ user }: LogisticsProps) {
  const [availableJobs, setAvailableJobs] = useState<LogisticsJob[]>([]);
  const [myJobs, setMyJobs] = useState<LogisticsJob[]>([]);
  const [allJobs, setAllJobs] = useState<LogisticsJob[]>([]); // for buyers/sellers tracking
  const [registeredCarriers, setRegisteredCarriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getMergedProviders = (country: string) => {
    const staticRes = getProvidersForCountry(country);
    const cleanCountry = (country || 'Malawi').toLowerCase();
    const domesticRegistered = registeredCarriers.filter(
      c => c.country.toLowerCase() === cleanCountry
    );
    const otherRegistered = registeredCarriers.filter(
      c => c.country.toLowerCase() !== cleanCountry
    );

    return {
      domestic: [...domesticRegistered, ...staticRes.domestic],
      international: staticRes.international,
      all: [...domesticRegistered, ...staticRes.domestic, ...otherRegistered, ...staticRes.international]
    };
  };

  // Quote form state
  const [selectedJob, setSelectedJob] = useState<LogisticsJob | null>(null);
  const [quotePrice, setQuotePrice] = useState('');
  const [estDelivery, setEstDelivery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  // Active sub-tab for logistics providers
  const [logisticsTab, setLogisticsTab] = useState<'available' | 'active'>('available');

  // Carrier directory states (for buyer/seller view)
  const [selectedCarrier, setSelectedCarrier] = useState<any | null>(null);
  const [carrierFilter, setCarrierFilter] = useState<string | null>(null);

  // Estimator Form State
  const [calcOrigin, setCalcOrigin] = useState('');
  const [calcDestination, setCalcDestination] = useState('');
  const [calcWeight, setCalcWeight] = useState(5); // default 5 tons
  const [calcCargoType, setCalcCargoType] = useState('Agri-bulk');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    if (selectedCarrier) {
      const userCountry = user.nationality || 'Malawi';
      if (userCountry.toLowerCase() === 'malawi') {
        setCalcOrigin('Lilongwe');
        setCalcDestination(selectedCarrier.isGlobal ? 'Rotterdam Hub' : 'Beira Corridor Port');
      } else if (userCountry.toLowerCase() === 'kenya') {
        setCalcOrigin('Nairobi');
        setCalcDestination(selectedCarrier.isGlobal ? 'Rotterdam Hub' : 'Mombasa Port');
      } else if (userCountry.toLowerCase() === 'nigeria') {
        setCalcOrigin('Lagos');
        setCalcDestination(selectedCarrier.isGlobal ? 'London Hub' : 'Abuja Hub');
      } else {
        setCalcOrigin('Johannesburg');
        setCalcDestination('Durban Port');
      }
      setBookingSuccess(false);
    }
  }, [selectedCarrier, user]);

  async function loadLogisticsData() {
    try {
      setLoading(true);
      const [profiles, rawAvail, rawActive, rawAll] = await Promise.all([
        db.auth.listProfiles(),
        user.role === 'logistics_provider' ? db.logistics.listAvailableJobs() : Promise.resolve([]),
        user.role === 'logistics_provider' ? db.logistics.listProviderJobs(user.id) : Promise.resolve([]),
        user.role !== 'logistics_provider' ? db.logistics.listAllJobs() : Promise.resolve([])
      ]);

      const providerProfiles = profiles.filter(p => p.role === 'logistics_provider');
      const mappedRegisteredCarriers = providerProfiles.map(p => {
        const initial = p.businessName 
          ? p.businessName.split(/\s+/).map((w: string) => w[0]).join('').toUpperCase().slice(0, 4)
          : p.fullName.split(/\s+/).map((w: string) => w[0]).join('').toUpperCase().slice(0, 4);
        
        const colors = [
          'from-indigo-600 to-purple-800',
          'from-pink-600 to-rose-700',
          'from-emerald-600 to-teal-800',
          'from-sky-500 to-blue-700',
          'from-amber-600 to-orange-700',
          'from-cyan-600 to-blue-800',
          'from-violet-600 to-fuchsia-800'
        ];
        let hash = 0;
        for (let i = 0; i < p.id.length; i++) {
          hash += p.id.charCodeAt(i);
        }
        const color = colors[hash % colors.length];

        return {
          id: p.id,
          name: p.businessName || p.fullName,
          initial: initial || 'LOG',
          color: color,
          textColor: 'text-white',
          type: 'Registered Provider',
          country: p.nationality || 'Malawi',
          phone: p.phone || '+265 1 876 122',
          whatsapp: p.whatsapp || p.phone || '+265 884 716 426',
          email: p.contactEmail || p.email,
          website: p.facebook || 'www.afket.com',
          isGlobal: false,
          rating: 4.9,
          baseRate: 200,
          perTonRate: 45,
          transitDays: '2-4 days',
          services: ['Agri-Bulk Shipping', 'Direct Corridor Delivery', 'Overland Transport'],
          logoUrl: p.logoUrl
        };
      });
      setRegisteredCarriers(mappedRegisteredCarriers);

      const mapJobContacts = (job: LogisticsJob) => {
        const providerProfile = profiles.find(p => p.id === job.providerId || (job.providerName && p.businessName === job.providerName));
        const sellerProfile = profiles.find(p => p.fullName === job.sellerName || (job.sellerPhone && p.phone === job.sellerPhone) || (p.businessName && job.sellerName.includes(p.businessName)));
        const buyerProfile = profiles.find(p => p.fullName === job.buyerName || (job.buyerPhone && p.phone === job.buyerPhone) || (p.businessName && job.buyerName.includes(p.businessName)));

        return {
          ...job,
          providerPhone: providerProfile?.phone || job.providerPhone,
          providerEmail: providerProfile?.email || providerProfile?.contactEmail || job.providerEmail,
          providerWhatsapp: providerProfile?.whatsapp || job.providerWhatsapp,
          providerFacebook: providerProfile?.facebook || job.providerFacebook,
          providerLogoUrl: providerProfile?.logoUrl,
          sellerPhone: sellerProfile?.phone || job.sellerPhone,
          sellerEmail: sellerProfile?.email || sellerProfile?.contactEmail,
          sellerWhatsapp: sellerProfile?.whatsapp,
          sellerFacebook: sellerProfile?.facebook,
          sellerLogoUrl: sellerProfile?.logoUrl,
          buyerPhone: buyerProfile?.phone || job.buyerPhone,
          buyerEmail: buyerProfile?.email || buyerProfile?.contactEmail,
          buyerWhatsapp: buyerProfile?.whatsapp,
          buyerFacebook: buyerProfile?.facebook,
          buyerLogoUrl: buyerProfile?.logoUrl
        };
      };

      if (user.role === 'logistics_provider') {
        setAvailableJobs(rawAvail.map(mapJobContacts));
        setMyJobs(rawActive.map(mapJobContacts));
      } else {
        setAllJobs(rawAll.map(mapJobContacts));
      }
    } catch (e) {
      console.error('Error loading logistics:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogisticsData();
  }, [user]);

  const handleProvideQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteError('');
    setQuoteSuccess(false);

    if (!selectedJob) return;

    const priceNum = parseFloat(quotePrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setQuoteError('Please enter a valid transit price.');
      return;
    }

    if (!estDelivery) {
      setQuoteError('Please specify an estimated delivery date.');
      return;
    }

    try {
      setSubmitting(true);
      await db.logistics.acceptJob(
        selectedJob.id,
        user.id,
        user.businessName || user.fullName,
        priceNum,
        estDelivery
      );

      setQuoteSuccess(true);
      loadLogisticsData();
      setTimeout(() => {
        setSelectedJob(null);
        setQuotePrice('');
        setEstDelivery('');
        setQuoteSuccess(false);
      }, 1500);
    } catch (err: any) {
      setQuoteError(err.message || 'Failed to submit freight quote.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (jobId: string, status: any) => {
    try {
      await db.logistics.updateJobStatus(jobId, status);
      loadLogisticsData();
    } catch (err) {
      console.error('Failed to update cargo status', err);
    }
  };

  const getLogisticsStatusBadge = (status: string) => {
    switch (status) {
      case 'awaiting_pickup': return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
      case 'picked_up': return 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]';
      case 'in_transit': return 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]';
      case 'out_for_delivery': return 'bg-[#F5F3FF] text-[#5B21B6] border-[#DDD6FE]';
      case 'delivered': return 'bg-[#ECFCCB] text-[#365314] border-[#D9F99D]';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="py-6 space-y-6 font-sans text-left">
      {/* Header Block */}
      <div className="border-b border-gray-100 pb-5">
        <h1 className="text-3xl font-sans font-black tracking-tight text-[#1F2937]">Cargo & Route Logistics</h1>
        <p className="text-sm text-gray-500 font-medium mt-1">
          {user.role === 'logistics_provider' 
            ? 'Submit transit routes, provide shipping prices, and manage bulk transport runs.' 
            : 'Track regional and continental shipments, monitor carrier status, and verify deliveries.'}
        </p>
      </div>

      {/* RENDER FOR LOGISTICS COMPANIES (CARRIERS) */}
      {user.role === 'logistics_provider' ? (
        <div className="space-y-6">
          {/* Sub Tab Toggle */}
          <div className="flex border-b border-gray-200 max-w-md">
            <button
              id="logistics-tab-avail"
              onClick={() => setLogisticsTab('available')}
              className={`flex-1 py-3 text-center border-b-2 text-sm font-bold transition cursor-pointer ${
                logisticsTab === 'available'
                  ? 'border-[#D97706] text-[#D97706]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Open Cargo Board ({availableJobs.length})
            </button>
            <button
              id="logistics-tab-active"
              onClick={() => setLogisticsTab('active')}
              className={`flex-1 py-3 text-center border-b-2 text-sm font-bold transition cursor-pointer ${
                logisticsTab === 'active'
                  ? 'border-[#D97706] text-[#D97706]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Your Shipments ({myJobs.length})
            </button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-3xl h-44 animate-pulse"></div>
              ))}
            </div>
          ) : logisticsTab === 'available' ? (
            /* Open Cargo Board Available to Bid */
            availableJobs.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-xs">
                <span className="block text-4xl mb-3">🚚</span>
                <h3 className="text-lg font-sans font-bold text-gray-800">No Open Cargo Routes</h3>
                <p className="text-sm text-gray-500 font-medium mt-1">All orders are currently covered. Try checking back later when new trades are signed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {availableJobs.map((job) => (
                  <div 
                    key={job.id} 
                    className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between h-full space-y-4"
                  >
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-start">
                        <div className="bg-[#FFFBEB] text-[#92400E] px-4 py-2.5 rounded-2xl border border-[#FEF3C7] flex-1 mr-3">
                          <span className="text-[10px] uppercase font-bold tracking-wider block text-amber-800/80">Commodity Load</span>
                          <span className="text-sm font-bold block mt-0.5">{job.productTitle}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-800 bg-[#FAF9F6] border border-gray-150 px-3 py-1.5 rounded-xl font-mono shrink-0">
                          {job.quantity} {job.unit}
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs text-gray-600 bg-[#FAF9F6] p-4 rounded-2xl border border-gray-100">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-[#D97706] shrink-0" />
                          <div>
                            <span className="text-[9px] text-gray-400 block font-bold">LOADING BASE</span>
                            <span className="font-bold text-gray-800">{job.pickupLocation}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 pt-2 border-t border-gray-200/50">
                          <Navigation className="h-4 w-4 text-[#365314] shrink-0" />
                          <div>
                            <span className="text-[9px] text-gray-400 block font-bold">DISCHARGE HUB</span>
                            <span className="font-bold text-gray-800">{job.deliveryLocation}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500 font-medium">
                        <div className="flex items-center space-x-1.5">
                          {job.buyerLogoUrl ? (
                            <img 
                              src={job.buyerLogoUrl} 
                              className="h-4 w-4 rounded-full object-cover bg-white border border-gray-150 shrink-0" 
                              alt="Buyer Logo"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <User className="h-3.5 w-3.5 text-gray-450 shrink-0" />
                          )}
                          <span className="truncate">Buyer: {job.buyerName}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Clock className="h-3.5 w-3.5 text-gray-455" />
                          <span>Status: Open Board</span>
                        </div>
                      </div>
                    </div>

                    <button
                      id={`btn-quote-${job.id}`}
                      onClick={() => {
                        setSelectedJob(job);
                        setQuotePrice('');
                        setEstDelivery('');
                      }}
                      className="w-full bg-[#365314] hover:bg-[#224411] text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer flex items-center justify-center shadow-xs"
                    >
                      <Truck className="h-4 w-4 mr-1.5" />
                      Provide Shipping Quote
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* ACTIVE CARRIAGE SHIPMENTS (ACCEPTED BY PROVIDER) */
            myJobs.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-xs">
                <span className="block text-4xl mb-3">📦</span>
                <h3 className="text-lg font-sans font-bold text-gray-800">No Active Shipments</h3>
                <p className="text-sm text-gray-500 font-medium mt-1">You haven&apos;t accepted any cargo jobs. Explore the Open Cargo Board to dispatch runs.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myJobs.map((job) => (
                  <div 
                    key={job.id} 
                    className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs flex flex-col lg:flex-row justify-between lg:items-center gap-5"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${getLogisticsStatusBadge(job.status)}`}>
                          {job.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-mono text-gray-400 font-semibold">Cargo ID: #{job.id.slice(-6)}</span>
                      </div>

                      <h3 className="text-sm font-bold text-[#1F2937]">{job.productTitle} ({job.quantity} {job.unit})</h3>

                      <div className="flex items-center space-x-2.5 text-xs text-gray-600 font-medium">
                        <span className="font-bold text-gray-700">{job.pickupLocation}</span>
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        <span className="font-bold text-gray-700">{job.deliveryLocation}</span>
                      </div>

                      <div className="flex space-x-4 text-[11px] text-gray-400 pt-1 font-medium flex-wrap gap-y-1">
                        <span className="flex items-center">
                          {job.sellerLogoUrl ? (
                            <img 
                              src={job.sellerLogoUrl} 
                              className="h-4 w-4 rounded-full object-cover bg-white border border-gray-150 mr-1 shrink-0" 
                              alt="Seller Logo"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <User className="h-3 w-3 mr-1 text-gray-400 shrink-0" />
                          )}
                          Seller: {job.sellerName} ({job.sellerPhone || 'No phone'})
                        </span>
                        <span className="flex items-center">
                          {job.buyerLogoUrl ? (
                            <img 
                              src={job.buyerLogoUrl} 
                              className="h-4 w-4 rounded-full object-cover bg-white border border-gray-150 mr-1 shrink-0" 
                              alt="Buyer Logo"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <User className="h-3 w-3 mr-1 text-gray-400 shrink-0" />
                          )}
                          Buyer: {job.buyerName} ({job.buyerPhone || 'No phone'})
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-gray-100">
                      <div className="text-left sm:text-right">
                        <div className="text-xs font-bold text-gray-800">Contracted Rate: ${job.quotePrice}</div>
                        <div className="text-[10px] text-gray-450 flex items-center mt-0.5 sm:justify-end font-semibold">
                          <Calendar className="h-3.5 w-3.5 mr-1 text-gray-400" />
                          <span>Del. Date: {job.estimatedDelivery}</span>
                        </div>
                      </div>

                      {/* Cargo Status Advance Control */}
                      <div className="text-left">
                        <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Advance Carriage Status</label>
                        <select
                          id={`select-status-${job.id}`}
                          value={job.status}
                          onChange={(e) => handleStatusChange(job.id, e.target.value)}
                          className="bg-[#FAF9F6] border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-[#D97706] font-bold cursor-pointer"
                        >
                          <option value="awaiting_pickup">Awaiting Pickup</option>
                          <option value="picked_up">Picked Up</option>
                          <option value="in_transit">In Transit</option>
                          <option value="out_for_delivery">Out For Delivery</option>
                          <option value="delivered">Delivered ✅</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      ) : (
        /* RENDER FOR BUYERS & SELLERS (TRACKING THEIR CARGOES) */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-sans font-bold text-[#1F2937]">Your Trade Cargo Shipments</h2>
            {carrierFilter && (
              <span className="text-xs bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7] px-3 py-1 rounded-full font-bold flex items-center space-x-1">
                <Truck className="h-3.5 w-3.5" />
                <span>Showing {allJobs.filter(j => j.providerName && j.providerName.toLowerCase().includes(carrierFilter.toLowerCase())).length} jobs handled by {carrierFilter}</span>
              </span>
            )}
          </div>
          
          {carrierFilter && (
            <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-2xl p-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#D97706]">
                <Truck className="h-4 w-4" />
                <span>Currently filtering active shipments by carrier: <span className="font-black text-[#1F2937] underline">{carrierFilter}</span></span>
              </div>
              <button 
                onClick={() => setCarrierFilter(null)}
                className="text-xs font-bold text-[#D97706] bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
              >
                Clear Filter
              </button>
            </div>
          )}
          
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-3xl h-36 animate-pulse"></div>
              ))}
            </div>
          ) : allJobs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-xs">
              <span className="block text-4xl mb-3">🚚</span>
              <h3 className="text-lg font-sans font-bold text-gray-800">No Shipping Records Yet</h3>
              <p className="text-sm text-gray-500 font-medium mt-1">Once you conduct a purchase or sale, the cargo routing and regional carrier dispatch logs will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allJobs
                .filter((job) => {
                  if (!carrierFilter) return true;
                  return job.providerName && job.providerName.toLowerCase().includes(carrierFilter.toLowerCase());
                })
                .map((job) => (
                  <div 
                    key={job.id} 
                    className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row justify-between md:items-center gap-4 text-left"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2.5">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${getLogisticsStatusBadge(job.status)}`}>
                          {job.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-mono text-gray-400 font-semibold">Cargo Ref: #{job.id.slice(-6)}</span>
                      </div>

                      <h3 className="text-sm font-bold text-[#1F2937]">{job.productTitle} ({job.quantity} {job.unit})</h3>

                      <div className="flex items-center space-x-2 text-xs text-gray-600 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="font-bold text-gray-700">{job.pickupLocation}</span>
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        <span className="font-bold text-gray-700">{job.deliveryLocation}</span>
                      </div>

                      <div className="flex flex-col space-y-1.5 pt-1">
                        <div className="flex items-center space-x-4 text-[11px] text-gray-400 font-medium">
                          <span className="flex items-center">
                            {job.providerLogoUrl ? (
                              <img 
                                src={job.providerLogoUrl} 
                                className="h-4 w-4 rounded-full object-cover bg-white border border-gray-150 mr-1 shrink-0" 
                                alt="Shipper Logo"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <User className="h-3 w-3 mr-1 text-gray-400 shrink-0" />
                            )}
                            Shipper: {job.providerName || 'Assigning Region Carrier...'}
                          </span>
                        </div>
                        
                        {job.providerId && (
                          <div className="flex items-center space-x-2 mt-1 flex-wrap gap-y-1">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mr-1">Contact Shipper:</span>
                            
                            {/* WhatsApp */}
                            <a
                              href={`https://wa.me/${(job.providerWhatsapp || job.providerPhone || '+2348031112222').replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/40 rounded-lg px-2 py-1 text-[10px] font-bold transition"
                              title="WhatsApp Shipper"
                            >
                              <MessageCircle className="h-3 w-3 text-emerald-600" />
                              <span>WhatsApp</span>
                            </a>

                            {/* Email */}
                            {job.providerEmail && (
                              <a
                                href={`mailto:${job.providerEmail}?subject=Inquiry on Shipment Ref: #${job.id.slice(-6)}`}
                                className="flex items-center space-x-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/40 rounded-lg px-2 py-1 text-[10px] font-bold transition"
                                title="Email Shipper"
                              >
                                <Mail className="h-3 w-3 text-rose-500" />
                                <span>Email</span>
                              </a>
                            )}

                            {/* Phone Call */}
                            {(job.providerPhone || job.providerWhatsapp) && (
                              <a
                                href={`tel:${job.providerPhone || job.providerWhatsapp}`}
                                className="flex items-center space-x-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/40 rounded-lg px-2 py-1 text-[10px] font-bold transition"
                                title="Call Shipper"
                              >
                                <Phone className="h-3 w-3 text-blue-500" />
                                <span>Call</span>
                              </a>
                            )}

                            {/* Facebook */}
                            {job.providerFacebook && (
                              <a
                                href={job.providerFacebook.startsWith('http') ? job.providerFacebook : `https://${job.providerFacebook}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-[#BAE6FD]/40 rounded-lg px-2 py-1 text-[10px] font-bold transition"
                                title="Facebook Shipper"
                              >
                                <Facebook className="h-3 w-3 text-indigo-500" />
                                <span>Facebook</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-gray-100 justify-between md:justify-end">
                      <div className="text-left md:text-right font-medium">
                        <div className="text-xs font-bold text-[#1F2937]">
                          {job.quotePrice ? `Freight: $${job.quotePrice}` : 'Inviting Freight Quotes...'}
                        </div>
                        <div className="text-[10px] text-gray-405 flex items-center mt-0.5 md:justify-end font-semibold">
                          <Calendar className="h-3.5 w-3.5 mr-1 text-gray-400" />
                          <span>Est. Delivery: {job.estimatedDelivery || 'TBD'}</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-[#FAF9F6] border border-gray-100 rounded-xl">
                        {job.status === 'delivered' ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-[#D97706] animate-pulse" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Top Carriers Directory Carousel */}
          <div className="mt-12 border-t border-gray-100 pt-8 text-left">
            <style>{`
              @keyframes marquee-infinite {
                0% { transform: translateX(0); }
                100% { transform: translateX(-33.3333%); }
              }
              .animate-marquee {
                animation: marquee-infinite 35s linear infinite;
              }
            `}</style>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <div className="flex items-center space-x-2 text-[10px] text-amber-600 font-bold uppercase tracking-widest">
                  <Globe className="h-3.5 w-3.5" />
                  <span>Logistics Carrier Directory</span>
                </div>
                <h3 className="text-lg font-sans font-black tracking-tight text-[#1F2937] mt-0.5">Top Freight & Shipping Networks</h3>
                <p className="text-xs text-gray-500 font-medium">Click on any rolling logistics provider below to estimate direct trade cargo rates and view details.</p>
              </div>
              <div className="shrink-0">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Verified Transit Routes
                </span>
              </div>
            </div>

            {/* Continuous Marquee Carousel */}
            <div className="relative w-full overflow-hidden bg-white/60 backdrop-blur-md rounded-3xl border border-gray-100 p-6 shadow-xs select-none">
              {/* Fade out vignettes */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white/90 to-transparent z-10" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white/90 to-transparent z-10" />

              <div className="overflow-hidden w-full">
                <div className="flex animate-marquee hover:[animation-play-state:paused] space-x-12 whitespace-nowrap py-2">
                  {/* Duplicated carriers list for a seamless, continuous infinite loop */}
                  {[
                    ...getMergedProviders(user.nationality || 'Malawi').all,
                    ...getMergedProviders(user.nationality || 'Malawi').all,
                    ...getMergedProviders(user.nationality || 'Malawi').all
                  ].map((carrier, idx) => {
                    // Let's get flags dynamically
                    const getFlagEmoji = (country: string) => {
                      switch (country.toLowerCase()) {
                        case 'malawi': return '🇲🇼';
                        case 'kenya': return '🇰🇪';
                        case 'nigeria': return '🇳🇬';
                        default: return '🌍';
                      }
                    };

                    return (
                      <button
                        key={`${carrier.id}-${idx}`}
                        onClick={() => setSelectedCarrier(carrier)}
                        className="group flex flex-col items-center text-center focus:outline-hidden shrink-0 cursor-pointer"
                      >
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white shadow-md overflow-hidden relative transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:border-amber-500 bg-white flex items-center justify-center shrink-0">
                          {carrier.logoUrl ? (
                            <img src={carrier.logoUrl} alt={carrier.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${carrier.color} flex items-center justify-center`}>
                              <span className={`text-base sm:text-lg font-black tracking-tight ${carrier.textColor}`}>
                                {carrier.initial}
                              </span>
                            </div>
                          )}
                          <span className="absolute bottom-1 right-1 bg-white text-[9px] font-black px-1.5 py-0.5 rounded-full text-gray-800 border border-gray-100 shadow-xs z-10">
                            {getFlagEmoji(carrier.country)}
                          </span>
                        </div>
                        <span className="text-xs font-black text-gray-800 mt-2.5 group-hover:text-amber-600 transition truncate w-24">
                          {carrier.name}
                        </span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                          {carrier.type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Carrier Intelligence Hub & Direct Freight Booking Modal */}
          {selectedCarrier && (
            <div className="fixed inset-0 bg-[#1F2937]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white w-full max-w-2xl rounded-3xl p-6 sm:p-8 text-left shadow-2xl relative border border-gray-100 my-8">
                <button 
                  onClick={() => setSelectedCarrier(null)} 
                  className="absolute top-5 right-5 p-1.5 hover:bg-[#FAF9F6] rounded-xl transition text-gray-400 hover:text-[#1F2937] cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Carrier Identity Header */}
                <div className="flex items-start space-x-4 pb-5 border-b border-gray-100">
                  <div className="w-16 h-16 rounded-2xl border border-gray-100 flex items-center justify-center shadow-md shrink-0 overflow-hidden bg-white">
                    {selectedCarrier.logoUrl ? (
                      <img src={selectedCarrier.logoUrl} alt={selectedCarrier.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${selectedCarrier.color} flex items-center justify-center`}>
                        <span className={`text-xl font-black tracking-tight ${selectedCarrier.textColor}`}>
                          {selectedCarrier.initial}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        {selectedCarrier.isGlobal ? 'International Partner' : `Domestic Carrier (${selectedCarrier.country})`}
                      </span>
                      <span className="bg-[#ECFCCB] text-[#365314] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center">
                        <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500 mr-1" />
                        <span>{selectedCarrier.rating} Rating</span>
                      </span>
                    </div>
                    <h2 className="text-2xl font-sans font-black tracking-tight text-[#1F2937]">{selectedCarrier.name}</h2>
                    <p className="text-xs text-gray-500 font-medium">{selectedCarrier.type} • Direct Cargo Forwarding Network</p>
                  </div>
                </div>

                {/* Core Specifications & Dynamic Freight Estimator */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5">
                  
                  {/* Left Column: Services & Coverage */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Core Shipping Services</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCarrier.services.map((svc: string, index: number) => (
                          <span key={index} className="bg-[#FAF9F6] border border-gray-100 text-gray-700 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                            {svc}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-[#FAF9F6] border border-gray-100 rounded-2xl p-4 space-y-3">
                      <h4 className="text-xs font-bold text-[#1F2937] flex items-center">
                        <Sliders className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
                        <span>Freight Specifications</span>
                      </h4>
                      
                      <div className="space-y-2 text-xs text-gray-600 font-medium">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Base Booking Fare:</span>
                          <span className="font-bold text-gray-800">${selectedCarrier.baseRate} USD</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Variable Rate per Ton:</span>
                          <span className="font-bold text-gray-800">${selectedCarrier.perTonRate} USD/Ton</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Transit Speed:</span>
                          <span className="font-bold text-emerald-700">{selectedCarrier.transitDays}</span>
                        </div>
                      </div>
                    </div>

                    {/* Direct Action: Filter shipments list */}
                    <button
                      onClick={() => {
                        setCarrierFilter(selectedCarrier.name);
                        setSelectedCarrier(null);
                      }}
                      className="w-full bg-white hover:bg-[#FAF9F6] text-gray-700 border border-gray-200 font-bold text-xs py-3 rounded-xl transition cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <Truck className="h-4 w-4 text-amber-500" />
                      <span>Filter Active Shipments by {selectedCarrier.name}</span>
                    </button>
                  </div>

                  {/* Right Column: Live Freight Estimator Widget */}
                  <div className="border border-amber-500/10 bg-[#FFFDF5] rounded-3xl p-4 sm:p-5 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-1.5 text-[10px] text-amber-700 font-bold uppercase tracking-wider mb-1">
                        <Coins className="h-3.5 w-3.5" />
                        <span>Interactive Freight Estimator</span>
                      </div>

                      {/* Route origin */}
                      <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Origin Cargo Port</label>
                        <select
                          value={calcOrigin}
                          onChange={(e) => setCalcOrigin(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 font-bold focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer"
                        >
                          {user.nationality?.toLowerCase() === 'malawi' ? (
                            <>
                              <option value="Lilongwe">Lilongwe Hub</option>
                              <option value="Blantyre">Blantyre Hub</option>
                              <option value="Mzuzu">Mzuzu Agri Depot</option>
                            </>
                          ) : user.nationality?.toLowerCase() === 'kenya' ? (
                            <>
                              <option value="Nairobi">Nairobi Hub</option>
                              <option value="Mombasa">Mombasa Port Terminals</option>
                              <option value="Kisumu">Kisumu Lake Terminal</option>
                            </>
                          ) : (
                            <>
                              <option value="Lagos">Lagos Sea Cargo Hub</option>
                              <option value="Abuja">Abuja Inland Port</option>
                              <option value="Kano">Kano Dry Port</option>
                            </>
                          )}
                        </select>
                      </div>

                      {/* Route destination */}
                      <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Delivery Destination</label>
                        <select
                          value={calcDestination}
                          onChange={(e) => setCalcDestination(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 font-bold focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer"
                        >
                          {selectedCarrier.isGlobal ? (
                            <>
                              <option value="Rotterdam Hub">Rotterdam Port (Netherlands)</option>
                              <option value="London Hub">Tilbury Docks London (UK)</option>
                              <option value="Shanghai Port">Shanghai Terminal (China)</option>
                              <option value="Houston Port">Port of Houston (USA)</option>
                            </>
                          ) : (
                            <>
                              <option value="Beira Corridor Port">Beira Corridor Port (Mozambique)</option>
                              <option value="Dar es Salaam Port">Dar es Salaam Corridor (Tanzania)</option>
                              <option value="Nacala Port">Nacala Ocean Gate (Mozambique)</option>
                              <option value="Mombasa Port">Mombasa Ocean Gate (Kenya)</option>
                              <option value="Durban Port">Port of Durban (South Africa)</option>
                            </>
                          )}
                        </select>
                      </div>

                      {/* Weight Slider */}
                      <div>
                        <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase mb-1">
                          <span>Weight Capacity</span>
                          <span className="text-amber-700 font-bold">{calcWeight} Metric Tons</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={calcWeight}
                          onChange={(e) => setCalcWeight(parseInt(e.target.value))}
                          className="w-full accent-amber-600 cursor-pointer h-1 bg-gray-200 rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Estimate Result Block */}
                    <div className="mt-4 pt-3 border-t border-dashed border-amber-500/20">
                      <div className="bg-amber-50 rounded-2xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-amber-800 uppercase block">Est. Fare Breakdown</span>
                          <span className="text-base font-black text-amber-900 font-mono">
                            ${selectedCarrier.baseRate + selectedCarrier.perTonRate * calcWeight} USD
                          </span>
                        </div>
                        <div className="text-right text-[10px] text-amber-800 font-bold">
                          <div>Base: ${selectedCarrier.baseRate}</div>
                          <div>Transit: {selectedCarrier.transitDays}</div>
                        </div>
                      </div>

                      {bookingSuccess ? (
                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-black rounded-lg p-2.5 mt-3 text-center">
                          ✓ Carriage Routing request dispatched successfully!
                        </div>
                      ) : (
                        <button
                          onClick={() => setBookingSuccess(true)}
                          className="w-full bg-[#D97706] hover:bg-[#b45309] text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer mt-3"
                        >
                          Book Cargo Carriage Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct Instant Contact Suite */}
                <div className="border-t border-gray-100 mt-6 pt-5 space-y-3">
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Direct Instant Communications Protocol</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Whatsapp */}
                    <a
                      href={`https://wa.me/${selectedCarrier.whatsapp.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(selectedCarrier.name)}%2C%20I%20would%20like%20to%20inquire%20about%20booking%20cargo%20transport%20for%20${calcWeight}%20Metric%20Tons%20of%20bulk%20produce.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100 rounded-xl py-3 text-xs font-bold transition flex items-center justify-center space-x-2"
                    >
                      <MessageCircle className="h-4 w-4 text-emerald-600" />
                      <span>Chat on WhatsApp</span>
                    </a>

                    {/* Email */}
                    <a
                      href={`mailto:${selectedCarrier.email}?subject=Cargo%20Transport%20Inquiry&body=Hello%20${encodeURIComponent(selectedCarrier.name)}%2C%20I%20have%20a%20consignment%20of%20bulk%20cargo%2520ready%2520for%2520shipping.`}
                      className="flex-1 bg-[#FEF2F2] hover:bg-[#FEE2E2] text-rose-800 border border-rose-100 rounded-xl py-3 text-xs font-bold transition flex items-center justify-center space-x-2"
                    >
                      <Mail className="h-4 w-4 text-rose-500" />
                      <span>Inquire via Email</span>
                    </a>

                    {/* Call */}
                    <a
                      href={`tel:${selectedCarrier.phone}`}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-100 rounded-xl py-3 text-xs font-bold transition flex items-center justify-center space-x-2"
                    >
                      <Phone className="h-4 w-4 text-blue-500" />
                      <span>Call Dispatch Desk</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quote Placement Modal (For Logistics Providers) */}
      {selectedJob && (
        <div className="fixed inset-0 bg-[#1F2937]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 text-left shadow-2xl relative border border-gray-100">
            <button 
              onClick={() => setSelectedJob(null)} 
              className="absolute top-4 right-4 p-1.5 hover:bg-[#FAF9F6] rounded-xl transition text-gray-400 hover:text-[#1F2937] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-sans font-black tracking-tight text-[#1F2937] mb-1">Freight Shipping Quote</h2>
            <p className="text-xs text-gray-500 mb-4 font-medium">Provide transit charges and target delivery schedules for regional cargo delivery.</p>

            <div className="bg-[#FFFBEB] rounded-2xl p-4 border border-[#FEF3C7] mb-5 text-xs space-y-2.5 text-amber-900 font-medium">
              <div className="flex justify-between">
                <span className="text-amber-800/80">Load variant:</span>
                <span className="font-bold text-[#D97706]">{selectedJob.productTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-800/80">Weight size:</span>
                <span className="font-bold text-[#1F2937]">{selectedJob.quantity} {selectedJob.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-800/80">Origin pickup:</span>
                <span className="font-bold text-gray-800">{selectedJob.pickupLocation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-800/80">Delivery hub:</span>
                <span className="font-bold text-gray-800">{selectedJob.deliveryLocation}</span>
              </div>
            </div>

            {quoteError && (
              <div className="bg-[#FEF2F2] border border-[#FEE2E2] text-red-800 text-xs rounded-xl p-3.5 mb-4 flex items-center font-medium">
                <ShieldAlert className="h-4 w-4 mr-2 shrink-0 animate-bounce" />
                <span>{quoteError}</span>
              </div>
            )}

            {quoteSuccess && (
              <div className="bg-[#ECFCCB] border border-[#ECFCCB] text-[#365314] text-xs rounded-xl p-3.5 mb-4 flex items-center font-medium">
                <CheckCircle2 className="h-4 w-4 mr-2 shrink-0" />
                <span>Quote accepted! Assigning cargo pipeline...</span>
              </div>
            )}

            <form onSubmit={handleProvideQuote} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Contract Freight Rate (USD) *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <DollarSign className="h-4 w-4" />
                  </div>
                  <input
                    id="quote-price-input"
                    type="number"
                    placeholder="e.g. 750"
                    value={quotePrice}
                    onChange={(e) => setQuotePrice(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#FAF9F6] border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                    required
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 font-medium">This rate includes loading, customs processing and regional clearances.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Estimated Delivery Date *</label>
                <input
                  id="quote-date-input"
                  type="date"
                  value={estDelivery}
                  onChange={(e) => setEstDelivery(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F6] border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                  required
                />
              </div>

              <button
                id="btn-submit-quote"
                type="submit"
                disabled={submitting}
                className="w-full bg-[#D97706] hover:bg-[#b45309] text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer mt-2"
              >
                {submitting ? 'Signing Contract...' : 'Accept Carriage & Submit Quote'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
