import React, { useState } from 'react';
import { UserProfile, getUserSubscriptionInfo } from '../types';
import { 
  BarChart3, 
  ShoppingBag, 
  Truck, 
  LogOut, 
  User,
  Menu,
  X,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import afketLogo from '../assets/images/afket_logo_1782851553801.jpg';

interface NavbarProps {
  user: UserProfile;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onLogout: () => void;
  onUpdateProfile?: (user: UserProfile) => void;
}

export default function Navbar({ 
  user, 
  currentTab, 
  setCurrentTab, 
  onLogout
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const subInfo = getUserSubscriptionInfo(user);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'seller': return 'bg-[#ECFCCB] text-[#365314] border-transparent';
      case 'buyer': return 'bg-[#FFFBEB] text-[#D97706] border-transparent';
      case 'logistics_provider': return 'bg-gray-800 text-white border-transparent';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'seller': return 'Verified Seller';
      case 'buyer': return 'Verified Buyer';
      case 'logistics_provider': return 'Verified Logistics';
      default: return role;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, desc: 'Overview & Market Insights' },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag, desc: 'Crop Sourcing & Offers' },
    { id: 'logistics', label: 'Logistics Hub', icon: Truck, desc: 'Haulage & Fleet Dispatch' },
  ];

  const initials = user.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'KM';

  return (
    <>
      {/* Top Fixed Header Bar */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-gray-100 fixed top-0 inset-x-0 z-50 px-3 sm:px-6 h-16 shadow-xs font-sans flex items-center">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-xl bg-gray-100/80 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5 text-[#D97706]" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Logo */}
            <div 
              onClick={() => {
                setCurrentTab('dashboard');
                setMobileMenuOpen(false);
              }} 
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group"
            >
              <img 
                src={afketLogo} 
                alt="AFKET Logo" 
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-amber-500/15 object-cover shadow-sm transition-transform duration-300 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col text-left">
                <span className="font-sans font-black text-xl sm:text-2xl tracking-tighter text-[#1F2937] leading-none group-hover:text-[#D97706] transition-colors">AFKET</span>
                <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-[#365314] leading-none mt-0.5">African Market</span>
              </div>
            </div>

            {/* Nav Links - Desktop */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-1 relative">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-tab-${item.id}`}
                    onClick={() => setCurrentTab(item.id)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-bold transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'text-[#D97706]'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTabIndicatorDesktop"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D97706] rounded-full"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div 
              onClick={() => setCurrentTab('profile')}
              className="hidden md:flex flex-col items-end justify-center cursor-pointer group hover:opacity-85 transition-opacity"
            >
              <span className="text-sm font-bold text-[#1F2937] group-hover:text-[#D97706] transition-colors">{user.fullName}</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                {user.businessName && (
                  <span className="text-[11px] text-gray-500 font-sans max-w-[120px] truncate">
                    {user.businessName}
                  </span>
                )}
                <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${getRoleColor(user.role)}`}>
                  {getRoleLabel(user.role)}
                </span>
                {subInfo.isTrialActive && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-lime-100 text-lime-900 border border-lime-300 flex items-center gap-0.5" title={`${subInfo.daysRemaining} days left in 1-month free usage`}>
                    <Sparkles className="h-2.5 w-2.5 text-lime-700" />
                    <span>Trial ({subInfo.daysRemaining}d)</span>
                  </span>
                )}
                {subInfo.isPaid && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                    <span>Sub Active</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center bg-gray-50 rounded-full p-1 border border-gray-100 space-x-1">
              <button
                id="btn-edit-profile"
                onClick={() => {
                  setCurrentTab('profile');
                  setMobileMenuOpen(false);
                }}
                title="Edit Profile"
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full hover:bg-gray-100 border-2 overflow-hidden shadow-xs flex items-center justify-center text-white font-bold text-xs sm:text-sm transition-all hover:scale-105 cursor-pointer relative group ${
                  currentTab === 'profile' ? 'border-[#D97706]' : 'border-white'
                }`}
              >
                {user.logoUrl ? (
                  <img 
                    src={user.logoUrl} 
                    alt="Company Logo" 
                    className="w-full h-full object-cover bg-white"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center text-white font-bold ${
                    currentTab === 'profile' ? 'bg-[#D97706]' : 'bg-[#365314]'
                  }`}>
                    {initials}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 bg-amber-500 rounded-full p-0.5 border border-white">
                  <User className="h-2 w-2 text-white" />
                </div>
              </button>

              <button
                id="btn-logout"
                onClick={onLogout}
                title="Sign Out"
                className="p-1.5 sm:p-2 text-gray-400 hover:text-rose-600 rounded-full transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Slide-Down Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="sm:hidden fixed top-16 inset-x-0 z-40 bg-white/98 backdrop-blur-xl border-b border-gray-200 shadow-xl p-4 font-sans text-left space-y-4"
          >
            {/* User Profile Summary Card */}
            <div 
              onClick={() => {
                setCurrentTab('profile');
                setMobileMenuOpen(false);
              }}
              className="bg-[#FAF9F6] border border-gray-200/80 rounded-2xl p-3 flex items-center space-x-3 cursor-pointer hover:bg-amber-50/50 transition"
            >
              <div className="w-10 h-10 rounded-full bg-[#365314] text-white font-bold flex items-center justify-center text-sm shrink-0 overflow-hidden">
                {user.logoUrl ? (
                  <img src={user.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="block font-bold text-sm text-gray-900 truncate">{user.fullName}</span>
                <span className="block text-xs text-gray-500 truncate">
                  {user.businessName || user.email}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-[9px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${getRoleColor(user.role)}`}>
                  {getRoleLabel(user.role)}
                </span>
                {subInfo.isTrialActive && (
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-lime-100 text-lime-900 border border-lime-300 flex items-center gap-0.5">
                    <Sparkles className="h-2.5 w-2.5 text-lime-700" />
                    <span>Trial ({subInfo.daysRemaining}d)</span>
                  </span>
                )}
                {subInfo.isPaid && (
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                    <span>Sub Active</span>
                  </span>
                )}
              </div>
            </div>

            {/* Navigation Links */}
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 p-3 rounded-xl transition cursor-pointer text-left ${
                      isActive
                        ? 'bg-[#FFFBEB] text-[#D97706] font-bold border border-amber-200/60'
                        : 'text-gray-700 hover:bg-gray-50 font-medium'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-[#D97706] text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-sm leading-none mb-0.5">{item.label}</span>
                      <span className="block text-[10px] text-gray-400 leading-tight font-normal">{item.desc}</span>
                    </div>
                  </button>
                );
              })}

              <button
                onClick={() => {
                  setCurrentTab('profile');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 p-3 rounded-xl transition cursor-pointer text-left ${
                  currentTab === 'profile'
                    ? 'bg-[#FFFBEB] text-[#D97706] font-bold border border-amber-200/60'
                    : 'text-gray-700 hover:bg-gray-50 font-medium'
                }`}
              >
                <div className={`p-2 rounded-lg ${currentTab === 'profile' ? 'bg-[#D97706] text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-sm leading-none mb-0.5">Account & Company Settings</span>
                  <span className="block text-[10px] text-gray-400 leading-tight font-normal">Manage verification, location, & role details</span>
                </div>
              </button>
            </div>

            {/* Logout Action */}
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 transition cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out of AFKET</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Floating Navigation Bar */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-[100] bg-white/98 backdrop-blur-md border-t border-gray-200 py-2 px-3 shadow-2xl flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`relative flex flex-col items-center justify-center text-[10px] py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                isActive ? 'text-[#D97706] font-bold' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabMobileBg"
                  className="absolute inset-0 bg-[#FFFBEB] border border-amber-200/60 rounded-xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex flex-col items-center">
                <Icon className={`h-4 w-4 mb-0.5 ${isActive ? 'text-[#D97706]' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </span>
            </button>
          );
        })}

        {/* Mobile Profile Tab */}
        <button
          onClick={() => {
            setCurrentTab('profile');
            setMobileMenuOpen(false);
          }}
          className={`relative flex flex-col items-center justify-center text-[10px] py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
            currentTab === 'profile' ? 'text-[#D97706] font-bold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          {currentTab === 'profile' && (
            <motion.div
              layoutId="activeTabMobileBg"
              className="absolute inset-0 bg-[#FFFBEB] border border-amber-200/60 rounded-xl"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex flex-col items-center">
            <User className={`h-4 w-4 mb-0.5 ${currentTab === 'profile' ? 'text-[#D97706]' : 'text-gray-400'}`} />
            <span>Profile</span>
          </span>
        </button>
      </div>
    </>
  );
}

