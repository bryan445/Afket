import { useEffect, useState } from 'react';
import { db, supabase, isSupabaseConfigured, getLocalStorage, setLocalStorage } from './lib/supabase';
import { UserProfile, AFKET_SUPPORT } from './types';
import Navbar from './components/Navbar';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Logistics from './components/Logistics';
import Profile from './components/Profile';
import { motion, AnimatePresence } from 'motion/react';
import { Sprout, Headphones } from 'lucide-react';
import { WhatsAppLogo, CallLogo, EmailLogo } from './components/BrandIcons';
import afketLogo from './assets/images/afket_logo_1782851553801.jpg';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash || '' : '';
    const search = typeof window !== 'undefined' ? window.location.search || '' : '';
    return hash.includes('type=recovery') || search.includes('type=recovery');
  });
  const [isVerifyingLink, setIsVerifyingLink] = useState(() => {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    return (hash.includes('access_token=') || 
            hash.includes('type=signup') || 
            search.includes('code=')) && 
           !hash.includes('type=recovery') && 
           !search.includes('type=recovery');
  });

  useEffect(() => {
    let active = true;

    // Check for auth errors in the URL first (e.g. expired email links)
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    if (hash.includes('error=')) {
      const match = hash.match(/error_description=([^&]+)/);
      if (match) {
        const decodedErr = decodeURIComponent(match[1].replace(/\+/g, ' '));
        setAuthError(decodedErr);
        setIsVerifyingLink(false);
        setLoading(false);
        return;
      }
    } else if (search.includes('error=')) {
      const params = new URLSearchParams(search);
      const errDesc = params.get('error_description');
      if (errDesc) {
        setAuthError(errDesc);
        setIsVerifyingLink(false);
        setLoading(false);
        return;
      }
    }

    if (!isSupabaseConfigured || !supabase) {
      // Offline / Sandbox Mode
      async function checkUserSession() {
        try {
          setLoading(true);
          const currentUser = await db.auth.getCurrentUser();
          if (active) {
            setUser(currentUser);
          }
        } catch (err) {
          console.error('Failed to restore user session:', err);
        } finally {
          if (active) {
            setLoading(false);
            setIsVerifyingLink(false);
          }
        }
      }
      checkUserSession();
      return () => {
        active = false;
      };
    }

    // Live Supabase Mode - check session immediately in case onAuthStateChange is slow on mount
    async function checkCurrentSession() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type') as any;

        // Handle PKCE auth code exchange from email confirmation link
        if (code) {
          try {
            const { data, error } = await supabase!.auth.exchangeCodeForSession(code);
            if (error) {
              console.warn('PKCE exchange error, trying getSession fallback:', error);
            } else if (data?.session && active) {
              await handleSessionUser(data.session);
              return;
            }
          } catch (codeErr) {
            console.warn('exchangeCodeForSession exception:', codeErr);
          }
        }

        // Handle OTP token hash from email link
        if (tokenHash && type) {
          try {
            const { data, error } = await supabase!.auth.verifyOtp({
              token_hash: tokenHash,
              type: type || 'signup'
            });
            if (error) {
              console.warn('verifyOtp error:', error);
            } else if (data?.session && active) {
              await handleSessionUser(data.session);
              return;
            }
          } catch (otpErr) {
            console.warn('verifyOtp exception:', otpErr);
          }
        }

        const { data: { session } } = await supabase!.auth.getSession();
        if (session?.user && active) {
          await handleSessionUser(session);
        }
      } catch (err) {
        console.error('Error fetching session on init:', err);
      } finally {
        if (active && !isVerifyingLink) {
          setLoading(false);
        }
      }
    }

    async function handleSessionUser(session: any) {
      try {
        let profile = null;
        try {
          const { data, error } = await supabase!
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (!error && data) {
            profile = data;
          }
        } catch (fetchErr) {
          console.warn('Network error fetching existing profile, trying offline fallback:', fetchErr);
        }

        if (profile) {
          setUser(profile);
          setCurrentTab('dashboard'); // Open user's dashboard
          cleanUrlAddressBar();
        } else {
          // Profile does not exist yet or connection failed!
          // Check local backup first to avoid duplicates
          const localProfiles = getLocalStorage<UserProfile>('afket_profiles', []);
          const existingLocal = localProfiles.find(
            p => p.id === session.user.id || p.email.toLowerCase() === (session.user.email || '').toLowerCase()
          );
          
          const meta = session.user.user_metadata || {};
          const accountType = meta.accountType || existingLocal?.accountType || (meta.businessName || existingLocal?.businessName ? 'company' : 'individual');
          const isCompany = accountType === 'company' || Boolean(meta.businessName || existingLocal?.businessName);
          const fee = meta.role === 'logistics_provider' || isCompany ? 15000 : 10000;
          const now = new Date();
          const trialEndsAt = meta.trialEndsAt || existingLocal?.trialEndsAt || new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

          const newProfile: UserProfile = {
            id: session.user.id, // Always override with the authentic UUID from Supabase Auth
            email: session.user.email || existingLocal?.email || '',
            firstName: meta?.firstName || existingLocal?.firstName || '',
            surname: meta?.surname || existingLocal?.surname || '',
            fullName: meta?.fullName || existingLocal?.fullName || `${meta?.firstName || existingLocal?.firstName || ''} ${meta?.surname || existingLocal?.surname || ''}`.trim() || 'User',
            role: meta?.role || existingLocal?.role || 'buyer',
            accountType,
            businessName: meta?.businessName || existingLocal?.businessName || '',
            phone: meta?.phone || existingLocal?.phone || '',
            location: meta?.location || existingLocal?.location || 'Unknown',
            joinedAt: existingLocal?.joinedAt || meta?.joinedAt || now.toISOString(),
            nationality: meta?.nationality || existingLocal?.nationality || '',
            logoUrl: meta?.logoUrl || existingLocal?.logoUrl || undefined,
            registrationStatus: 'paid', // 100% Free registration
            subscriptionStatus: meta?.subscriptionStatus || existingLocal?.subscriptionStatus || 'not paid',
            registrationFee: 0,
            monthlySubscriptionFee: meta?.monthlySubscriptionFee || existingLocal?.monthlySubscriptionFee || fee,
            trialEndsAt,
            subscriptionPaidUntil: meta?.subscriptionPaidUntil || existingLocal?.subscriptionPaidUntil || undefined,
            currency: meta?.currency || existingLocal?.currency || 'MWK',
            registrationPaymentDate: meta?.registrationPaymentDate || existingLocal?.registrationPaymentDate || undefined,
            registrationPaymentMethod: meta?.registrationPaymentMethod || existingLocal?.registrationPaymentMethod || undefined,
            registrationPaymentRef: meta?.registrationPaymentRef || existingLocal?.registrationPaymentRef || undefined,
          };

          // Try inserting into Supabase database profiles table
          try {
            let { error: insertError } = await supabase!
              .from('profiles')
              .upsert([newProfile]);

            if (insertError) {
              console.warn('Ignored or cached profile upsert error:', insertError);
            }
          } catch (insertErr) {
            console.warn('Network exception during profile auto-creation:', insertErr);
          }

          // Ensure cached locally as backup
          const profileIndex = localProfiles.findIndex(
            p => p.id === session.user.id || p.email.toLowerCase() === (session.user.email || '').toLowerCase()
          );
          if (profileIndex >= 0) {
            localProfiles[profileIndex] = newProfile;
          } else {
            localProfiles.push(newProfile);
          }
          setLocalStorage('afket_profiles', localProfiles);
          
          setUser(newProfile);
          setCurrentTab('dashboard'); // Open user's dashboard
          cleanUrlAddressBar();
        }
      } catch (err) {
        console.error('Error handling auth state change session:', err);
      } finally {
        if (active) {
          setIsVerifyingLink(false);
          setLoading(false);
        }
      }
    }

    function cleanUrlAddressBar() {
      try {
        if (window.history.replaceState) {
          window.history.replaceState(null, '', window.location.origin + window.location.pathname);
        }
      } catch (e) {
        console.error('Failed to clean URL parameters:', e);
      }
    }

    checkCurrentSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('onAuthStateChange triggered:', event, session);
      
      if (!active) return;

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setIsVerifyingLink(false);
        setLoading(false);
        return;
      }

      if (session?.user) {
        await handleSessionUser(session);
      } else {
        setUser(null);
        if (!isVerifyingLink) {
          setLoading(false);
        }
      }
    });

    // Safety timeout to prevent infinite spin if verification fails completely
    let safetyTimeout: NodeJS.Timeout;
    if (isVerifyingLink) {
      safetyTimeout = setTimeout(() => {
        if (active) {
          console.warn('Verification safety timeout reached');
          setIsVerifyingLink(false);
          setLoading(false);
        }
      }, 7000); // 7 seconds safety timeout
    }

    return () => {
      active = false;
      subscription.unsubscribe();
      if (safetyTimeout) clearTimeout(safetyTimeout);
    };
  }, [isVerifyingLink]);

  const handleLogout = async () => {
    try {
      await db.auth.signOut();
      setUser(null);
      setCurrentTab('dashboard');
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateProfile = (updatedProfile: UserProfile) => {
    setUser(updatedProfile);
  };

  if (isVerifyingLink) {
    return (
      <div className="min-h-screen bg-[#051C15] flex flex-col items-center justify-center font-sans text-white">
        <div className="flex flex-col items-center space-y-6 max-w-md px-6 text-center">
          <img 
            src={afketLogo} 
            alt="AFKET Logo" 
            className="h-24 w-24 rounded-full border border-[#D97706]/20 shadow-2xl animate-spin"
            style={{ animationDuration: '3s' }}
            referrerPolicy="no-referrer"
          />
          <div className="space-y-2">
            <h1 className="font-sans font-black text-2xl tracking-wide text-[#D97706] uppercase">Verifying Account</h1>
            <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">Connecting to African Market Network...</p>
          </div>
          <p className="text-gray-300 text-sm font-medium leading-relaxed bg-[#072d22] p-4 rounded-2xl border border-emerald-950/60 shadow-xs">
            Please wait while we confirm your email address and authorize your agricultural trading profile.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#051C15] flex flex-col items-center justify-center font-sans text-white">
        <div className="flex flex-col items-center space-y-4">
          <img 
            src={afketLogo} 
            alt="AFKET Logo" 
            className="h-24 w-24 rounded-full border border-amber-500/20 shadow-2xl animate-pulse"
            referrerPolicy="no-referrer"
          />
          <div className="text-center">
            <h1 className="font-sans font-black text-3xl tracking-wider text-amber-500 uppercase">AFKET</h1>
            <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase mt-1">Booting African Market Protocol...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || isPasswordRecovery) {
    return (
      <Auth 
        onAuthSuccess={(profile) => {
          setUser(profile);
          setIsPasswordRecovery(false);
          setCurrentTab('dashboard');
        }} 
        initialError={authError || undefined} 
        isRecoveryMode={isPasswordRecovery}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col font-sans antialiased text-[#1F2937]">
      <Navbar 
         user={user} 
         currentTab={currentTab} 
         setCurrentTab={setCurrentTab} 
         onLogout={handleLogout} 
         onUpdateProfile={handleUpdateProfile}
      />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-32 sm:pt-24 pb-24 sm:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.99 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="h-full"
          >
            {currentTab === 'dashboard' && (
              <Dashboard user={user} setCurrentTab={setCurrentTab} />
            )}
            {currentTab === 'marketplace' && (
              <Products 
                user={user} 
                onNavigateTab={setCurrentTab}
                onUpdateProfile={handleUpdateProfile}
              />
            )}
            {currentTab === 'logistics' && (
              <Logistics 
                user={user} 
                onNavigateTab={setCurrentTab}
                onUpdateProfile={handleUpdateProfile}
              />
            )}
            {currentTab === 'profile' && (
              <Profile user={user} onUpdateProfile={handleUpdateProfile} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Contact Support Bar before Footer */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mb-4 shrink-0">
        <div 
          id="global-support-contact-bar"
          className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-lime-100 text-[#365314] flex items-center justify-center shrink-0 border border-lime-200">
              <Headphones className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-xs text-gray-800 font-bold">
                Need Help or Assistance? <span className="font-normal text-gray-600">Contact AFKET Malawian Support Team:</span>
              </p>
              <span className="text-[11px] text-gray-500 font-medium">Payment verification, trade matchmaking, logistics dispatch & account support</span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Email Support Link */}
            <a
              id="support-contact-email-btn"
              href={`mailto:${AFKET_SUPPORT.email}?subject=AFKET%20Support%20Request`}
              className="h-10 w-10 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-gray-200 flex items-center justify-center transition shadow-2xs hover:scale-105 active:scale-95 cursor-pointer p-2"
              title="Email AFKET Support"
              aria-label="Email AFKET Support"
            >
              <EmailLogo className="h-5 w-5" />
            </a>

            {/* WhatsApp Support Link */}
            <a
              id="support-contact-whatsapp-btn"
              href={AFKET_SUPPORT.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 w-10 rounded-xl bg-white hover:bg-emerald-50 text-emerald-600 border border-gray-200 flex items-center justify-center transition shadow-2xs hover:scale-105 active:scale-95 cursor-pointer p-2"
              title="Chat on WhatsApp"
              aria-label="WhatsApp Support"
            >
              <WhatsAppLogo className="h-5 w-5" />
            </a>

            {/* Phone Call Support Link */}
            <a
              id="support-contact-phone-btn"
              href={AFKET_SUPPORT.phoneTel}
              className="h-10 w-10 rounded-xl bg-white hover:bg-emerald-50 text-emerald-600 border border-gray-200 flex items-center justify-center transition shadow-2xs hover:scale-105 active:scale-95 cursor-pointer p-2"
              title="Call Support Helpline"
              aria-label="Phone Call Support"
            >
              <CallLogo className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-md border-t border-gray-100 py-6 shrink-0 mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <img 
              src={afketLogo} 
              alt="AFKET" 
              className="h-6 w-6 rounded-full border border-amber-500/10" 
              referrerPolicy="no-referrer"
            />
            <span className="font-sans font-black tracking-tight text-[#1F2937] uppercase">afket</span>
            <span className="text-[9px] font-bold text-[#365314] bg-[#ECFCCB] px-1.5 py-0.5 rounded uppercase">African Market</span>
          </div>
          <p className="text-[11px] text-gray-500 font-sans">
            &copy; {new Date().getFullYear()} AFKET - African Market. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
