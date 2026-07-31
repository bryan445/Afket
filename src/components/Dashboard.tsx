import React, { useEffect, useState } from 'react';
import { UserProfile, Order, Product, LogisticsJob } from '../types';
import { db } from '../lib/supabase';
import { 
  TrendingUp, ShoppingCart, Landmark, Package, 
  MapPin, Clock, Calendar, ChevronRight, User, PlusCircle, ArrowUpRight,
  Search, Star, MessageSquare, Phone, Building, ArrowRight, Map, FileText, CheckCircle2, Sparkles, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  user: UserProfile;
  setCurrentTab: (tab: string) => void;
}

export default function Dashboard({ user, setCurrentTab }: DashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [logisticsJobs, setLogisticsJobs] = useState<LogisticsJob[]>([]);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Buyer Search State
  const [dashSearch, setDashSearch] = useState('');
  const [dashCategory, setDashCategory] = useState('all');

  // Logistics Tool State
  const [quoteOrigin, setQuoteOrigin] = useState('Kumasi, Ghana');
  const [quoteDest, setQuoteDest] = useState('Nairobi, Kenya');
  const [quoteWeight, setQuoteWeight] = useState('15');
  const [calculatedQuote, setCalculatedQuote] = useState<number | null>(null);
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null);
  const [connectionTab, setConnectionTab] = useState<'sellers' | 'buyers'>('sellers');

  // Contact proposal modal simulations
  const [pitchModalOpen, setPitchModalOpen] = useState(false);
  const [pitchTargetName, setPitchTargetName] = useState('');
  const [pitchTargetRole, setPitchTargetRole] = useState('');
  const [pitchSuccess, setPitchSuccess] = useState(false);
  const [pitchMessage, setPitchMessage] = useState('');

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const fetchedProfiles = await db.auth.listProfiles();
        setAllProfiles(fetchedProfiles);

        if (user.role === 'buyer') {
          const fetchedOrders = await db.orders.listByBuyer(user.id);
          setOrders(fetchedOrders);
        } else if (user.role === 'seller') {
          const fetchedOrders = await db.orders.listBySeller(user.id);
          setOrders(fetchedOrders);
          const allProds = await db.products.list();
          setProducts(allProds.filter(p => p.sellerId === user.id));
        } else if (user.role === 'logistics_provider') {
          const myJobs = await db.logistics.listProviderJobs(user.id);
          setLogisticsJobs(myJobs);
          const openJobs = await db.logistics.listAvailableJobs();
          setProducts([]); // not used in logistics directly
          setOrders([]);   // loaded for available routes indirectly
        }
      } catch (e) {
        console.error('Error loading dashboard statistics:', e);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [user]);

  const handleDashSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (dashSearch.trim()) {
      localStorage.setItem('afket_search_query', dashSearch.trim());
    }
    if (dashCategory !== 'all') {
      localStorage.setItem('afket_search_category', dashCategory);
    }
    setCurrentTab('marketplace');
  };

  const handleExploreSupplier = (supplierName: string) => {
    localStorage.setItem('afket_search_query', supplierName);
    setCurrentTab('marketplace');
  };

  const handleCalculateFreight = (e: React.FormEvent) => {
    e.preventDefault();
    const weight = parseFloat(quoteWeight) || 1;
    let multiplier = 55;
    const origin = quoteOrigin.toLowerCase();
    const dest = quoteDest.toLowerCase();
    
    if (origin.includes('kumasi') && dest.includes('nairobi')) multiplier = 85;
    else if (origin.includes('bobo-dioulasso') && dest.includes('mombasa')) multiplier = 95;
    else if (origin.includes('sunyani') && dest.includes('lagos')) multiplier = 40;
    else if (origin.includes('accra') || dest.includes('accra')) multiplier = 60;
    else multiplier = 75;
    
    const quote = weight * multiplier;
    const days = Math.round(multiplier / 10) + 3;
    
    setCalculatedQuote(quote);
    setCalculatedDays(days);
  };

  const handleOpenPitchModal = (targetName: string, role: string) => {
    setPitchTargetName(targetName);
    setPitchTargetRole(role);
    setPitchModalOpen(true);
  };

  const handlePitchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPitchSuccess(true);
    setTimeout(() => {
      setPitchModalOpen(false);
      setPitchSuccess(false);
      setPitchMessage('');
    }, 1800);
  };

  // Calculations for KPI Cards
  const getSellersKPI = () => {
    const totalSalesValue = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.totalPrice, 0);
    const activeListings = products.length;
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'accepted' || o.status === 'processing').length;
    const completedShipments = orders.filter(o => o.status === 'delivered').length;

    return [
      { label: 'Cumulative Revenue', value: `$${totalSalesValue.toLocaleString()}`, icon: Landmark, color: 'text-emerald-600 bg-emerald-50' },
      { label: 'Active Product Listings', value: activeListings, icon: Package, color: 'text-amber-600 bg-amber-50' },
      { label: 'Orders to Fulfill', value: pendingOrders, icon: Clock, color: 'text-blue-600 bg-blue-50' },
      { label: 'Delivered Cargo', value: completedShipments, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50' },
    ];
  };

  const getBuyersKPI = () => {
    const totalSpendValue = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.totalPrice, 0);
    const totalBoughtCount = orders.length;
    const activeTransits = orders.filter(o => o.status === 'shipped' || o.status === 'processing').length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;

    return [
      { label: 'Total Invested', value: `$${totalSpendValue.toLocaleString()}`, icon: Landmark, color: 'text-emerald-600 bg-emerald-50' },
      { label: 'Total Orders Sourced', value: totalBoughtCount, icon: ShoppingCart, color: 'text-amber-600 bg-amber-50' },
      { label: 'Active Shipments', value: activeTransits, icon: Package, color: 'text-blue-600 bg-blue-50' },
      { label: 'Awaiting Acceptance', value: pendingOrders, icon: Clock, color: 'text-violet-600 bg-violet-50' },
    ];
  };

  const getLogisticsKPI = () => {
    const totalEarnings = logisticsJobs
      .filter(j => j.status === 'delivered' && j.quotePrice)
      .reduce((sum, j) => sum + (j.quotePrice || 0), 0);
    const activeRoutes = logisticsJobs.filter(j => j.status !== 'delivered').length;
    const completedRoutes = logisticsJobs.filter(j => j.status === 'delivered').length;

    return [
      { label: 'Logistics Revenue', value: `$${totalEarnings.toLocaleString()}`, icon: Landmark, color: 'text-emerald-600 bg-emerald-50' },
      { label: 'Active Shipping Routes', value: activeRoutes, icon: Package, color: 'text-blue-600 bg-blue-50' },
      { label: 'Completed Deliveries', value: completedRoutes, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
    ];
  };

  const kpis = user.role === 'seller' 
    ? getSellersKPI() 
    : user.role === 'buyer' 
      ? getBuyersKPI() 
      : getLogisticsKPI();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-[#FFFBEB] text-[#D97706] border-[#FEF3C7]';
      case 'accepted': return 'bg-cyan-50 text-cyan-800 border-cyan-100';
      case 'processing': return 'bg-blue-50 text-blue-800 border-blue-100';
      case 'shipped': return 'bg-[#ECFCCB] text-[#365314] border-[#ECFCCB]/80';
      case 'delivered': return 'bg-green-100 text-green-800 border-transparent';
      case 'cancelled': return 'bg-[#FEF2F2] text-red-800 border-[#FEE2E2]';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getLogisticsStatusBadge = (status: string) => {
    switch (status) {
      case 'awaiting_pickup': return 'bg-[#FFFBEB] text-[#D97706] border-[#FEF3C7]';
      case 'picked_up': return 'bg-cyan-50 text-cyan-800 border-cyan-100';
      case 'in_transit': return 'bg-blue-50 text-blue-800 border-blue-100';
      case 'out_for_delivery': return 'bg-[#ECFCCB] text-[#365314] border-[#ECFCCB]/80';
      case 'delivered': return 'bg-green-100 text-green-800 border-transparent';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="py-6 space-y-8 font-sans">
      {/* Welcome Banner */}
      <div className="bg-[#1F2937] text-white p-6 sm:p-8 rounded-3xl relative overflow-hidden border border-gray-800 shadow-sm">
        {/* Aesthetic design grids */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#D97706]/20 via-[#1F2937] to-[#1F2937] z-0"></div>
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#FAF9F6_1px,transparent_1px)] [background-size:20px_20px] z-0"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="text-left">
            <span className="text-xs uppercase font-mono tracking-widest text-[#D97706] font-bold">AFKET Commerce Hub</span>
            <h1 className="text-3xl sm:text-4xl font-sans font-black tracking-tight mt-1">
              Welcome, {user.fullName}!
            </h1>
            <p className="text-gray-300 text-sm sm:text-base mt-2 max-w-xl font-medium">
              {user.role === 'seller' && "Manage your agriculture cooperative, monitor export sales, and match logistics carriers in real time."}
              {user.role === 'buyer' && "Source unrefined shea butter, cocoa beans, or local grains straight from verified cooperatives."}
              {user.role === 'logistics_provider' && "Provide freight routes, accept agricultural transportation jobs, and secure premium transit quotes."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {user.role === 'seller' && (
              <button 
                id="dash-add-product"
                onClick={() => {
                  localStorage.setItem('afket_add_product_straight', 'true');
                  setCurrentTab('marketplace');
                }} 
                className="bg-[#D97706] hover:bg-[#b45309] active:bg-amber-800 text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-md flex items-center cursor-pointer"
              >
                <PlusCircle className="h-4 w-4 mr-1.5" />
                Add Product Listing
              </button>
            )}
            {user.role === 'buyer' && (
              <button 
                id="dash-browse"
                onClick={() => setCurrentTab('marketplace')} 
                className="bg-[#D97706] hover:bg-[#b45309] active:bg-amber-800 text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-md flex items-center cursor-pointer"
              >
                Browse Marketplace
                <ArrowUpRight className="h-4 w-4 ml-1.5" />
              </button>
            )}
            {user.role === 'logistics_provider' && (
              <button 
                id="dash-routes"
                onClick={() => setCurrentTab('logistics')} 
                className="bg-[#D97706] hover:bg-[#b45309] active:bg-amber-800 text-white font-bold text-xs px-5 py-3 rounded-xl transition shadow-md flex items-center cursor-pointer"
              >
                Explore Open Cargo
                <ArrowUpRight className="h-4 w-4 ml-1.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Block (Bento Grid Card Design) */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-3xl p-5 animate-pulse h-28"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, index) => {
            const Icon = kpi.icon;
            
            let cardClass = "";
            let labelClass = "";
            let valClass = "";
            let iconBoxClass = "";

            if (index === 0) {
              // Primary Highlight Card (Amber/Gold block)
              cardClass = "bg-[#D97706] text-white rounded-3xl p-6 shadow-sm flex flex-col justify-between";
              labelClass = "text-[10px] font-bold uppercase tracking-widest text-white/80";
              valClass = "text-3xl font-black mt-2 text-white";
              iconBoxClass = "p-3 rounded-2xl bg-white/20 text-white";
            } else if (index === 1) {
              // Accent Soft Yellow
              cardClass = "bg-[#FFFBEB] border border-[#FEF3C7] rounded-3xl p-6 shadow-sm text-amber-900 flex flex-col justify-between";
              labelClass = "text-[10px] font-bold uppercase tracking-widest text-amber-800/80";
              valClass = "text-3xl font-black mt-2 text-[#D97706]";
              iconBoxClass = "p-3 rounded-2xl bg-amber-100 text-[#D97706]";
            } else if (index === 2) {
              // Accent Olive/Light Green
              cardClass = "bg-[#ECFCCB] border border-[#ECFCCB] rounded-3xl p-6 shadow-sm text-[#365314] flex flex-col justify-between";
              labelClass = "text-[10px] font-bold uppercase tracking-widest text-[#365314]/80";
              valClass = "text-3xl font-black mt-2 text-[#365314]";
              iconBoxClass = "p-3 rounded-2xl bg-white/50 text-[#365314]";
            } else {
              // Dark Slate Card
              cardClass = "bg-[#1F2937] text-white border border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between";
              labelClass = "text-[10px] font-bold uppercase tracking-widest text-gray-400";
              valClass = "text-3xl font-black mt-2 text-white";
              iconBoxClass = "p-3 rounded-2xl bg-gray-700 text-gray-200";
            }

            return (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                className={`${cardClass} hover:scale-[1.01] transition-all duration-300 text-left`}
              >
                <div className="flex justify-between items-start w-full">
                  <div>
                    <p className={labelClass}>{kpi.label}</p>
                    <p className={valClass}>{kpi.value}</p>
                  </div>
                  <div className={iconBoxClass}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Two Column Layout: Main Workspace & User Info sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Activities */}
        <div className="lg:col-span-3 space-y-6">

          {/* 1. BUYER DASHBOARD SPECIFICS */}
          {user.role === 'buyer' && (
            <div className="space-y-6">
              {/* Sourcing Commodity Assistant */}
              <div className="bg-white border border-gray-100 rounded-3xl p-6 text-left shadow-xs">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-2 bg-amber-50 text-[#D97706] rounded-xl">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-sans font-black tracking-tight text-[#1F2937]">Commodity Sourcing Assistant</h3>
                    <p className="text-xs text-gray-500 font-medium">Direct search query through verified Pan-African yields.</p>
                  </div>
                </div>

                <form onSubmit={handleDashSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 relative">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search crops, minerals, fruits, clothing, meat..."
                      value={dashSearch}
                      onChange={(e) => setDashSearch(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={dashCategory}
                      onChange={(e) => setDashCategory(e.target.value)}
                      className="bg-[#FAF9F6] border border-gray-100 rounded-xl px-3 py-2.5 text-xs text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706] flex-1"
                    >
                      <option value="all">All Categories</option>
                      <option value="crops">Crops</option>
                      <option value="minerals">Minerals</option>
                      <option value="fruits">Fruits</option>
                      <option value="legumes">Legumes</option>
                      <option value="clothings">Clothings</option>
                      <option value="meat">Meat</option>
                      <option value="handicrafts">Handicrafts</option>
                    </select>
                    <button
                      type="submit"
                      className="bg-[#365314] hover:bg-[#224411] text-white font-bold text-xs px-4 rounded-xl transition cursor-pointer shrink-0"
                    >
                      Search
                    </button>
                  </div>
                </form>
              </div>

              {/* Registered Seller Cooperatives */}
              {allProfiles.filter(p => p.role === 'seller').length > 0 && (
                <div className="bg-white border border-gray-100 rounded-3xl p-6 text-left shadow-xs">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-sans font-black tracking-tight text-[#1F2937]">Registered Seller Cooperatives</h3>
                      <p className="text-xs text-gray-500 font-medium">Verified farm unions and agricultural suppliers registered on AFKET.</p>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-0.5 rounded-full font-bold">Verified Partners</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {allProfiles.filter(p => p.role === 'seller').map((seller) => (
                      <div key={seller.id} className="bg-[#FAF9F6]/80 rounded-2xl p-4 border border-gray-100 hover:border-amber-200 transition duration-300 flex flex-col justify-between space-y-3 text-left">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-400 font-mono font-bold truncate max-w-[120px]">{seller.location || 'Pan-African Supplier'}</span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              Verified
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-[#1F2937] leading-tight line-clamp-1">{seller.businessName || seller.fullName}</h4>
                          <span className="text-[10px] text-gray-500 block leading-tight mt-0.5">Rep: {seller.fullName}</span>
                          {seller.phone && (
                            <div className="text-[10px] text-gray-400 font-mono mt-1">{seller.phone}</div>
                          )}
                        </div>

                        <button
                          onClick={() => handleExploreSupplier(seller.businessName || seller.fullName)}
                          className="w-full bg-[#365314] hover:bg-[#224411] text-white text-[10px] font-bold py-1.5 rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Search className="h-2.5 w-2.5" />
                          View Seller Products
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}


          {/* 3. LOGISTICS PROVIDER DASHBOARD SPECIFICS */}
          {user.role === 'logistics_provider' && (
            <div className="space-y-6">
              {/* Trade Connections Directory */}
              <div className="bg-white border border-gray-100 rounded-3xl p-6 text-left shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div>
                    <h3 className="text-lg font-sans font-black tracking-tight text-[#1F2937]">Regional Direct Trade Contacts</h3>
                    <p className="text-xs text-gray-500 font-medium">Pitch cargo transport directly to active sellers and buyers.</p>
                  </div>

                  <div className="inline-flex bg-gray-100 p-1 rounded-xl shrink-0">
                    <button
                      onClick={() => setConnectionTab('sellers')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${connectionTab === 'sellers' ? 'bg-[#365314] text-white shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      Top Sellers
                    </button>
                    <button
                      onClick={() => setConnectionTab('buyers')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${connectionTab === 'buyers' ? 'bg-[#365314] text-white shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                      Top Buyers
                    </button>
                  </div>
                </div>

                {connectionTab === 'sellers' ? (
                  <div className="space-y-3">
                    {[
                      { name: "Kwame Mensah", corp: "West Ghana Cocoa Growers", base: "Kumasi, Ghana", crops: "Cocoa, Cashews", icon: "🍫", phone: "+233 24 555 1200" },
                      { name: "Fatoumata Diallo", corp: "Burkina Shea Cooperative Group", base: "Bobo-Dioulasso, Burkina Faso", crops: "Shea Butter, Seeds", icon: "🌸", phone: "+226 20 555 3400" }
                    ].map((sel, sIdx) => (
                      <div key={sIdx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#FAF9F6]/85 rounded-2xl border border-gray-100 hover:bg-[#FAF9F6] transition">
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl mt-0.5">{sel.icon}</span>
                          <div>
                            <h4 className="text-sm font-sans font-black text-[#1F2937] leading-tight">{sel.corp}</h4>
                            <span className="text-xs text-gray-500 font-medium block">Contact Rep: {sel.name} • <span className="font-mono text-[10px]">{sel.phone}</span></span>
                            <div className="flex items-center space-x-2 text-[10px] mt-1.5">
                              <span className="bg-[#ECFCCB] text-[#365314] px-1.5 py-0.5 rounded font-bold">Yield: {sel.crops}</span>
                              <span className="text-gray-400">Loc: {sel.base}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenPitchModal(sel.name, 'seller')}
                          className="mt-3 sm:mt-0 text-xs bg-[#D97706] hover:bg-[#b45309] text-white font-bold px-3.5 py-2 rounded-xl transition cursor-pointer self-start sm:self-center"
                        >
                          Pitch Express Freight
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      { name: "Wanjiku Kamau", company: "Agriflow Sourcing Corp", base: "Nairobi, Kenya", demands: "Grains, Shea Butter", icon: "🌾", phone: "+254 722 555 901" },
                      { name: "Abidjan Processing Group", company: "CI Grain Millers", base: "Abidjan, Ivory Coast", demands: "Wheat, Sesame", icon: "🍞", phone: "+225 21 555 7800" }
                    ].map((byr, bIdx) => (
                      <div key={bIdx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#FAF9F6]/85 rounded-2xl border border-gray-100 hover:bg-[#FAF9F6] transition">
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl mt-0.5">{byr.icon}</span>
                          <div>
                            <h4 className="text-sm font-sans font-black text-[#1F2937] leading-tight">{byr.company}</h4>
                            <span className="text-xs text-gray-500 font-medium block">Purchasing Rep: {byr.name} • <span className="font-mono text-[10px]">{byr.phone}</span></span>
                            <div className="flex items-center space-x-2 text-[10px] mt-1.5">
                              <span className="bg-[#FFFBEB] text-[#D97706] px-1.5 py-0.5 rounded font-bold">Imports: {byr.demands}</span>
                              <span className="text-gray-400">Ports: {byr.base}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenPitchModal(byr.name, 'buyer')}
                          className="mt-3 sm:mt-0 text-xs bg-[#365314] hover:bg-[#224411] text-white font-bold px-3.5 py-2 rounded-xl transition cursor-pointer self-start sm:self-center"
                        >
                          Offer Transit Lane
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cargo Freight Route Quote Planner */}
              <div className="bg-white border border-gray-100 rounded-3xl p-6 text-left shadow-xs">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Map className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-sans font-black tracking-tight text-[#1F2937]">Cargo Route Quote Estimator</h3>
                    <p className="text-xs text-gray-500 font-medium">Simulate trade corridor pricing and estimated delivery times.</p>
                  </div>
                </div>

                <form onSubmit={handleCalculateFreight} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-700 block mb-1 uppercase tracking-wider">Cargo Weight (Tons)</label>
                      <input
                        type="number"
                        placeholder="e.g. 15"
                        value={quoteWeight}
                        onChange={(e) => setQuoteWeight(e.target.value)}
                        className="w-full bg-[#FAF9F6] border border-gray-100 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                        required
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-700 block mb-1 uppercase tracking-wider">Pickup Hub</label>
                      <select
                        value={quoteOrigin}
                        onChange={(e) => setQuoteOrigin(e.target.value)}
                        className="w-full bg-[#FAF9F6] border border-gray-100 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                      >
                        <option value="Kumasi, Ghana">Kumasi, Ghana</option>
                        <option value="Bobo-Dioulasso, Burkina Faso">Bobo-Dioulasso, BF</option>
                        <option value="Sunyani, Ghana">Sunyani, Ghana</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-700 block mb-1 uppercase tracking-wider">Delivery Hub</label>
                      <select
                        value={quoteDest}
                        onChange={(e) => setQuoteDest(e.target.value)}
                        className="w-full bg-[#FAF9F6] border border-gray-100 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706]"
                      >
                        <option value="Nairobi, Kenya">Nairobi, Kenya</option>
                        <option value="Lagos, Nigeria">Lagos, Nigeria</option>
                        <option value="Mombasa Port, Kenya">Mombasa Port, Kenya</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#365314] hover:bg-[#224411] text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
                  >
                    Calculate Recommended Freight Rate
                  </button>
                </form>

                {calculatedQuote !== null && (
                  <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100/60 flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <span className="text-[10px] text-emerald-800 font-bold block uppercase tracking-wider">Suggested Cargo Quote</span>
                      <span className="text-2xl font-mono font-black text-[#365314]">${calculatedQuote.toLocaleString()} USD</span>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-gray-400 block uppercase tracking-wider">Est. Duration</span>
                      <span className="text-sm font-bold text-gray-800 font-mono">~ {calculatedDays} Business Days</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* 4. MAIN USER ACTIVE TRADES CONTAINER */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 text-left shadow-xs">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-[#1F2937]">
                  {user.role === 'buyer' ? 'Active Sourced Trades' : user.role === 'seller' ? 'Incoming Trade Orders' : 'Your Shipment Jobs'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">Real-time agricultural cargo and contracts workflow.</p>
              </div>
              <button 
                onClick={() => setCurrentTab(user.role === 'logistics_provider' ? 'logistics' : 'marketplace')} 
                className="text-xs text-[#D97706] hover:text-[#b45309] font-bold flex items-center cursor-pointer"
              >
                View all <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-slate-50 h-16 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {user.role === 'logistics_provider' ? (
                  logisticsJobs.length === 0 ? (
                    <div className="text-center py-10 bg-[#FAF9F6] rounded-2xl border border-dashed border-gray-200">
                      <span className="block text-2xl mb-2">🚚</span>
                      <p className="text-sm font-bold text-gray-500">No shipments assigned to you yet.</p>
                      <button 
                        onClick={() => setCurrentTab('logistics')} 
                        className="text-xs text-[#D97706] font-bold mt-1 hover:underline cursor-pointer"
                      >
                        Find Cargo Jobs Now
                      </button>
                    </div>
                  ) : (
                    logisticsJobs.slice(0, 5).map((job) => (
                      <div 
                        key={job.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#FAF9F6]/80 rounded-2xl border border-gray-100 hover:bg-[#FAF9F6] transition duration-200"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="bg-[#ECFCCB] text-[#365314] p-2.5 rounded-xl font-bold font-mono text-sm shrink-0">
                            {job.quantity}T
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[#1F2937]">{job.productTitle}</h4>
                            <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                              <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                              <span className="font-medium truncate max-w-[200px]">{job.pickupLocation} → {job.deliveryLocation}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 sm:mt-0 flex items-center justify-between sm:justify-end space-x-4">
                          <div className="text-left sm:text-right">
                            <span className="block text-xs font-black text-gray-800">${job.quotePrice} Freight</span>
                            <span className="block text-[10px] text-gray-400 font-mono">Est. {job.estimatedDelivery || 'TBD'}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getLogisticsStatusBadge(job.status)}`}>
                            {job.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  orders.length === 0 ? (
                    <div className="text-center py-10 bg-[#FAF9F6] rounded-2xl border border-dashed border-gray-200">
                      <span className="block text-2xl mb-2">🌾</span>
                      <p className="text-sm font-bold text-gray-500">No trades recorded yet.</p>
                      <button 
                        onClick={() => setCurrentTab('marketplace')} 
                        className="text-xs text-[#D97706] font-bold mt-1 hover:underline cursor-pointer"
                      >
                        Start Sourcing Products
                      </button>
                    </div>
                  ) : (
                    orders.slice(0, 5).map((order) => {
                      const partnerProfile = user.role === 'buyer'
                        ? allProfiles.find(p => p.id === order.sellerId || p.fullName === order.sellerName)
                        : allProfiles.find(p => p.id === order.buyerId || p.fullName === order.buyerName);
                      const partnerLogoUrl = partnerProfile?.logoUrl;

                      return (
                        <div 
                          key={order.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#FAF9F6]/80 rounded-2xl border border-gray-100 hover:bg-[#FAF9F6] transition duration-200"
                        >
                          <div className="flex items-center space-x-3.5">
                            <div className="bg-[#FFFBEB] text-[#D97706] p-2.5 rounded-xl font-black text-sm font-mono shrink-0">
                              {order.quantity} T
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-[#1F2937]">{order.productTitle}</h4>
                              <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                                {partnerLogoUrl ? (
                                  <img 
                                    src={partnerLogoUrl} 
                                    className="h-4 w-4 rounded-full object-cover bg-white border border-gray-150 shrink-0" 
                                    alt="Client Logo"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <User className="h-3 w-3 text-gray-400 shrink-0" />
                                )}
                                <span className="font-medium">{user.role === 'buyer' ? `Seller: ${order.sellerName}` : `Buyer: ${order.buyerName}`}</span>
                                <span>•</span>
                                <Calendar className="h-3 w-3 shrink-0 text-gray-400" />
                                <span className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 sm:mt-0 flex items-center justify-between sm:justify-end space-x-4">
                            <div className="text-left sm:text-right">
                              <span className="block text-xs font-black text-[#1F2937]">${order.totalPrice.toLocaleString()}</span>
                              <span className="block text-[10px] text-gray-400 font-mono">Order Ref: #{order.id.slice(-6)}</span>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusBadge(order.status)}`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simulation Contact/Pitch Modal */}
      <AnimatePresence>
        {pitchModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/45 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 text-left"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#D97706] bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                    Trade Connect Direct
                  </span>
                  <h3 className="text-lg font-sans font-black text-gray-900 mt-1">
                    Connect with {pitchTargetName}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-normal font-medium">
                    {pitchTargetRole === 'seller' ? 'Propose direct cargo transport shipping routes to this agricultural supplier cooperative.' : 'Quote transit lane rates directly to this active bulk buyer.'}
                  </p>
                </div>
                <button 
                  onClick={() => setPitchModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold p-1 cursor-pointer text-lg leading-none"
                >
                  ✕
                </button>
              </div>

              {pitchSuccess ? (
                <div className="py-8 text-center space-y-3">
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 mb-2">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800">Connection Pitch Transmitted!</h4>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                    Your direct routing proposal and trade contact coordinates have been sent to {pitchTargetName}'s verified carrier inbox.
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePitchSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Your Direct Pitch Message</label>
                    <textarea
                      rows={3}
                      className="w-full bg-[#FAF9F6] border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-[#D97706] placeholder-gray-400"
                      placeholder={pitchTargetRole === 'seller' 
                        ? "e.g., Hello Kwame, our regional freight network operates weekly routes from Kumasi straight to Tema Port. We would love to transport your grade-A cocoa yield at a special discount..." 
                        : "e.g., Hello Wanjiku, we noticed your grain supply requirements. We can arrange direct cross-border bulk delivery from Abidjan to your Nairobi warehouse with phytosanitary compliance assured..."
                      }
                      value={pitchMessage}
                      onChange={(e) => setPitchMessage(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-100 pt-3">
                    <div>
                      <label className="text-gray-400 block font-medium">Proposed Route</label>
                      <span className="font-bold text-gray-850">Regional Gateway Cargo</span>
                    </div>
                    <div>
                      <label className="text-gray-400 block font-medium">Carrier Status</label>
                      <span className="font-bold text-emerald-600">● Active (Online)</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#365314] hover:bg-[#224411] text-white font-bold text-xs py-3 rounded-xl transition shadow-md cursor-pointer"
                  >
                    Send Trade Pitch Proposal
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
