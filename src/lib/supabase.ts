import { createClient } from '@supabase/supabase-js';
import { 
  UserProfile, 
  Product, 
  Order, 
  LogisticsJob, 
  UserRole, 
  ProductCategory, 
  OrderStatus, 
  LogisticsStatus, 
  PaymentStatus, 
  AccountType, 
  SubscriptionType, 
  getSubscriptionFees,
  checkProductUploadEligibility,
  UserFeedback
} from '../types';

// Real Supabase credentials from environment
const rawUrl = ((import.meta as any).env.VITE_SUPABASE_URL || '').trim();
const rawKey = ((import.meta as any).env.VITE_SUPABASE_ANON_KEY || '').trim();

const isValidSupabaseUrl = (url: string): boolean => {
  if (!url) return false;
  if (!url.startsWith('https://')) return false;
  if (url.includes('YOUR_') || url.includes('your-') || url.includes('placeholder')) return false;
  return true;
};

const isValidSupabaseKey = (key: string): boolean => {
  if (!key) return false;
  if (key.length < 20) return false;
  if (key.includes('YOUR_') || key.includes('your-') || key.includes('placeholder')) return false;
  return true;
};

export const isSupabaseConfigured = isValidSupabaseUrl(rawUrl) && isValidSupabaseKey(rawKey);

export const supabase = isSupabaseConfigured
  ? createClient(rawUrl, rawKey)
  : null;

// Normalizer to handle both camelCase and snake_case column names returned from Supabase profiles
export const normalizeProfile = (row: any): UserProfile => {
  if (!row) return row;
  const now = new Date();
  const rawExpiry = row.expiryDate || row.expiry_date || row.subscriptionPaidUntil || row.subscription_paid_until;
  const trialEnds = row.trialEndsAt || row.trial_ends_at || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  
  return {
    id: row.id,
    email: row.email || '',
    firstName: row.firstName || row.first_name || '',
    surname: row.surname || '',
    fullName: row.fullName || row.full_name || `${row.firstName || row.first_name || ''} ${row.surname || ''}`.trim() || 'User',
    role: (row.role || 'buyer') as UserRole,
    accountType: (row.accountType || row.account_type || 'individual') as AccountType,
    businessName: row.businessName || row.business_name || '',
    phone: row.phone || '',
    location: row.location || 'Unknown',
    joinedAt: row.joinedAt || row.joined_at || row.created_at || now.toISOString(),
    nationality: row.nationality || '',
    logoUrl: row.logoUrl || row.logo_url || undefined,
    registrationStatus: (row.registrationStatus || row.registration_status || 'paid') as PaymentStatus,
    subscriptionStatus: (row.subscriptionStatus || row.subscription_status || 'not paid') as PaymentStatus,
    subscriptionType: (row.subscriptionType || row.subscription_type || 'monthly') as SubscriptionType,
    expiryDate: rawExpiry || trialEnds,
    subscriptionPaidUntil: row.subscriptionPaidUntil || row.subscription_paid_until || rawExpiry || undefined,
    trialEndsAt: trialEnds,
    registrationFee: Number(row.registrationFee ?? row.registration_fee ?? 0),
    monthlySubscriptionFee: Number(row.monthlySubscriptionFee ?? row.monthly_subscription_fee ?? 10000),
    annualSubscriptionFee: Number(row.annualSubscriptionFee ?? row.annual_subscription_fee ?? 110000),
    currency: row.currency || 'MWK',
    registrationPaymentDate: row.registrationPaymentDate || row.registration_payment_date || undefined,
    registrationPaymentMethod: row.registrationPaymentMethod || row.registration_payment_method || undefined,
    registrationPaymentRef: row.registrationPaymentRef || row.registration_payment_ref || undefined,
    lastSubscriptionPaymentDate: row.lastSubscriptionPaymentDate || row.last_subscription_payment_date || undefined,
    lastSubscriptionPaymentMethod: row.lastSubscriptionPaymentMethod || row.last_subscription_payment_method || undefined,
    lastSubscriptionPaymentRef: row.lastSubscriptionPaymentRef || row.last_subscription_payment_ref || undefined,
    facebook: row.facebook || undefined,
    whatsapp: row.whatsapp || undefined,
    policyAgreed: true,
    policyAgreedAt: row.policyAgreedAt || row.policy_agreed_at || row.agreed_to_policy_at || undefined,
  };
};

// No mock/demo data — products, orders, and logistics jobs all start empty.
const INITIAL_PRODUCTS: Product[] = [];
const INITIAL_ORDERS: Order[] = [];
const INITIAL_LOGISTICS_JOBS: LogisticsJob[] = [];

// LocalStorage Helper — used only for products/orders/logistics offline fallback.
// Never used for auth, sessions, or profiles.
export const getLocalStorage = <T>(key: string, initialData: T[]): T[] => {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(initialData));
    return initialData;
  }
  return JSON.parse(data);
};

export const setLocalStorage = <T>(key: string, data: T[]): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Helper function to dynamically ensure a profile is present in Supabase profiles table
// prior to foreign key constraints checking, and to self-heal a missing profile row
// for any pre-existing account created before confirmation was disabled.
export const ensureProfileExists = async (userId: string, requiredRole?: UserRole): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('Error querying existing profile in ensureProfileExists:', error);
    }

    if (data) {
      if (requiredRole && data.role !== requiredRole) {
        console.log(`Profile role mismatch for ${userId}. Current: ${data.role}, Expected: ${requiredRole}. Updating...`);
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ role: requiredRole })
          .eq('id', userId);
        if (updateErr) {
          console.error(`Failed to update profile role to ${requiredRole}:`, updateErr);
          throw new Error(`Profile exists but has role "${data.role}". Failed to automatically switch to "${requiredRole}": ${updateErr.message}`);
        }
      }
      return;
    }

    console.log(`Profile for user ${userId} not found in database. Attempting to auto-create from auth metadata...`);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData.user) {
      console.warn('Could not retrieve authenticated user in ensureProfileExists:', authErr);
      throw new Error(`Authentication context not found. Cannot auto-create your database profile: ${authErr?.message || 'Not authenticated'}`);
    }

    const authUser = authData.user;
    if (authUser.id !== userId) {
      console.warn(`User ID mismatch: authenticated user is ${authUser.id} but target is ${userId}`);
      throw new Error(`User ID mismatch: target profile is ${userId} but authenticated user is ${authUser.id}. Cannot create profile for another user.`);
    }

    const meta = authUser.user_metadata || {};
    const accountType: AccountType = meta.accountType || (meta.businessName ? 'company' : 'individual');
    const role = (requiredRole || meta.role || 'buyer') as UserRole;
    const fees = getSubscriptionFees(role, accountType, meta.businessName);
    const now = new Date();
    const trialEndsAt = meta.trialEndsAt || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const newProfile: UserProfile = {
      id: userId,
      email: authUser.email || '',
      firstName: meta.firstName || '',
      surname: meta.surname || '',
      fullName: meta.fullName || `${meta.firstName || ''} ${meta.surname || ''}`.trim() || 'User',
      role,
      accountType,
      businessName: meta.businessName || '',
      phone: meta.phone || '',
      location: meta.location || 'Unknown',
      joinedAt: meta.joinedAt || now.toISOString(),
      nationality: meta.nationality || '',
      logoUrl: meta.logoUrl || undefined,
      registrationStatus: 'paid', // Free registration
      subscriptionStatus: (meta.subscriptionStatus === 'paid' ? 'paid' : 'not paid') as PaymentStatus,
      subscriptionType: (meta.subscriptionType || 'monthly') as SubscriptionType,
      expiryDate: meta.subscriptionPaidUntil || trialEndsAt,
      registrationFee: 0,
      monthlySubscriptionFee: fees.monthly,
      annualSubscriptionFee: fees.annual,
      trialEndsAt,
      subscriptionPaidUntil: meta.subscriptionPaidUntil || undefined,
      currency: meta.currency || 'MWK',
      registrationPaymentDate: meta.registrationPaymentDate || undefined,
      registrationPaymentMethod: meta.registrationPaymentMethod || undefined,
      registrationPaymentRef: meta.registrationPaymentRef || undefined,
    };

    let { error: insertError } = await supabase
      .from('profiles')
      .insert([newProfile]);

    if (insertError && (insertError.message.includes('profiles_email_key') || insertError.message.includes('duplicate key'))) {
      console.warn('Duplicate email detected in ensureProfileExists. Retrying with a modified email address...');
      const parts = (newProfile.email || '').split('@');
      if (parts.length === 2) {
        newProfile.email = `${parts[0]}+${userId.slice(0, 5)}@${parts[1]}`;
        const retryResult = await supabase.from('profiles').insert([newProfile]);
        insertError = retryResult.error;
      }
    }

    if (insertError) {
      console.error('Failed to auto-create missing profile in public.profiles:', insertError);
      throw new Error(`Failed to auto-create database profile: ${insertError.message}`);
    } else {
      console.log('Successfully auto-created missing profile in public.profiles.');
    }
  } catch (err) {
    console.error('Exception in ensureProfileExists helper:', err);
    throw err;
  }
};

// Call once at app startup so any auth state change (e.g. session restored,
// signed in from another tab) keeps the app's current user in sync.
export const onAuthStateChange = (callback: (user: UserProfile | null) => void) => {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      try {
        let { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error || !data) {
          await ensureProfileExists(session.user.id);
          const retry = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          data = retry.data;
        }

        callback(data ? normalizeProfile(data) : null);
      } catch (err) {
        console.error('onAuthStateChange profile fetch failed:', err);
        callback(null);
      }
    } else if (event === 'SIGNED_OUT') {
      callback(null);
    }
  });

  return () => subscription.unsubscribe();
};

// Abstracted Database interface for front-end consumption.
// Auth/profile data is Supabase-only — no local persistence of login or profile details.
export const db = {
  auth: {
    getCurrentUser: async (): Promise<UserProfile | null> => {
      if (!isSupabaseConfigured || !supabase) return null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error || !data) return null;
        return normalizeProfile(data);
      } catch (err) {
        console.error("Supabase getCurrentUser failed:", err);
        return null;
      }
    },

    signUp: async (
      email: string,
      password: string,
      firstName: string,
      surname: string,
      role: UserRole,
      businessName: string,
      phone: string,
      location: string,
      nationality?: string,
      logoUrl?: string,
      accountType?: AccountType,
      registrationStatus?: PaymentStatus,
      subscriptionStatus?: PaymentStatus,
      registrationFee?: number,
      registrationPaymentMethod?: string,
      registrationPaymentRef?: string
    ): Promise<{ user: UserProfile; needsEmailConfirmation?: boolean }> => {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Database is not configured. Please contact support.');
      }

      const fullName = `${firstName.trim()} ${surname.trim()}`;
      const resolvedAccountType: AccountType = accountType || (businessName?.trim() ? 'company' : 'individual');
      const fees = getSubscriptionFees(role, resolvedAccountType, businessName);
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const isSubscriptionPaid = subscriptionStatus === 'paid' && Boolean(registrationPaymentRef);

      // Explicit duplicate-email check against Supabase before creating the auth user.
      const { data: existingProfiles, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .limit(1);

      if (checkError) {
        console.warn('Could not check for existing profile before signup:', checkError);
      }
      if (existingProfiles && existingProfiles.length > 0) {
        throw new Error('User with that email already exists.');
      }

      const emailRedirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: {
            firstName: firstName.trim(),
            surname: surname.trim(),
            fullName,
            role,
            accountType: resolvedAccountType,
            businessName,
            phone,
            location,
            nationality,
            logoUrl,
            registrationStatus: 'paid', // 100% Free Registration
            subscriptionStatus: isSubscriptionPaid ? 'paid' : 'not paid',
            subscriptionType: 'monthly',
            registrationFee: 0,
            monthlySubscriptionFee: fees.monthly,
            annualSubscriptionFee: fees.annual,
            trialEndsAt,
            subscriptionPaidUntil: isSubscriptionPaid ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
            currency: 'MWK',
            joinedAt: now.toISOString(),
            registrationPaymentDate: isSubscriptionPaid ? now.toISOString() : undefined,
            registrationPaymentMethod: registrationPaymentMethod,
            registrationPaymentRef: registrationPaymentRef,
            policyAgreed: true,
            policyAgreedAt: now.toISOString(),
          }
        }
      });

      if (error || !data.user) {
        const errMsg = error?.message || '';
        if (errMsg.toLowerCase().includes('duplicate key') ||
            errMsg.toLowerCase().includes('already registered') ||
            errMsg.toLowerCase().includes('already exists') ||
            errMsg.toLowerCase().includes('unique constraint')) {
          throw new Error('User with that email already exists.');
        }
        throw new Error(errMsg || 'Authentication signup failed');
      }

      const newUserProfile: UserProfile = {
        id: data.user.id,
        email,
        firstName: firstName.trim(),
        surname: surname.trim(),
        fullName,
        role,
        accountType: resolvedAccountType,
        businessName: businessName || undefined,
        phone: phone || undefined,
        location,
        joinedAt: now.toISOString(),
        nationality: nationality || undefined,
        logoUrl: logoUrl || undefined,
        registrationStatus: 'paid', // Free registration
        subscriptionStatus: isSubscriptionPaid ? 'paid' : 'not paid',
        subscriptionType: 'monthly',
        registrationFee: 0,
        monthlySubscriptionFee: fees.monthly,
        annualSubscriptionFee: fees.annual,
        trialEndsAt,
        subscriptionPaidUntil: isSubscriptionPaid ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        currency: 'MWK',
        registrationPaymentDate: isSubscriptionPaid ? now.toISOString() : undefined,
        registrationPaymentMethod: registrationPaymentMethod,
        registrationPaymentRef: registrationPaymentRef,
        policyAgreed: true,
        policyAgreedAt: now.toISOString(),
      };

      // Always save to local backup list
      const localProfiles = getLocalStorage<UserProfile>('afket_profiles', []);
      const idx = localProfiles.findIndex(p => p.id === newUserProfile.id || p.email.toLowerCase() === email.toLowerCase());
      if (idx >= 0) {
        localProfiles[idx] = newUserProfile;
      } else {
        localProfiles.push(newUserProfile);
      }
      setLocalStorage('afket_profiles', localProfiles);

      // Attempt to insert profile into database
      try {
        await supabase.from('profiles').upsert([newUserProfile]);
      } catch (insertErr) {
        console.warn('Profile pre-insert notice (will auto-create on confirmation):', insertErr);
      }

      // If no session was returned, Supabase has sent a confirmation email!
      const needsEmailConfirmation = !data.session;

      return { 
        user: newUserProfile, 
        needsEmailConfirmation 
      };
    },

    checkAccountExists: async (email: string): Promise<boolean> => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) return false;

      // 1. Check local backup profiles
      const localProfiles = getLocalStorage<UserProfile>('afket_profiles', []);
      const existsLocally = localProfiles.some(p => p.email && p.email.toLowerCase() === cleanEmail);
      if (existsLocally) return true;

      // 2. Check database profiles table if configured
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .ilike('email', cleanEmail)
            .limit(1);

          if (!error && data && data.length > 0) {
            return true;
          }
        } catch (err) {
          console.warn('Could not query profiles table for account existence:', err);
        }
      }

      return false;
    },

    sendSignInLink: async (email: string): Promise<{ success: boolean }> => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        throw new Error('Please enter your email address.');
      }

      // Check if account exists first
      const exists = await db.auth.checkAccountExists(cleanEmail);
      if (!exists) {
        throw new Error('NO_ACCOUNT_FOUND: No account found for this email address. Please open an account first.');
      }

      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Database is not configured. Please contact support.');
      }

      const emailRedirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      // shouldCreateUser: false prevents Supabase from creating unconfigured accounts via magic link
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo,
          shouldCreateUser: false
        }
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('signups not allowed') || msg.includes('user not found') || msg.includes('no user')) {
          throw new Error('NO_ACCOUNT_FOUND: No account found for this email address. Please open an account first.');
        }
        throw new Error(error.message);
      }

      return { success: true };
    },

    resetPasswordForEmail: async (email: string): Promise<{ success: boolean }> => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        throw new Error('Please enter your email address.');
      }

      // Check if account exists first
      const exists = await db.auth.checkAccountExists(cleanEmail);
      if (!exists) {
        throw new Error('NO_ACCOUNT_FOUND: No account found for this email address. Please open an account first.');
      }

      if (!isSupabaseConfigured || !supabase) {
        console.log('[Auth] Mock password reset email dispatched to:', cleanEmail);
        return { success: true };
      }

      const emailRedirectTo = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: emailRedirectTo
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('user not found') || msg.includes('no user') || msg.includes('signups not allowed')) {
          throw new Error('NO_ACCOUNT_FOUND: No account found for this email address. Please open an account first.');
        }
        throw new Error(error.message);
      }

      return { success: true };
    },

    updatePassword: async (newPassword: string): Promise<{ success: boolean }> => {
      if (!isSupabaseConfigured || !supabase) {
        return { success: true };
      }
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw new Error(error.message);
      return { success: true };
    },

    resendConfirmationEmail: async (email: string): Promise<{ success: boolean }> => {
      if (!isSupabaseConfigured || !supabase) {
        return { success: true };
      }
      const emailRedirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo
        }
      });
      if (error) throw new Error(error.message);
      return { success: true };
    },

    processRegistrationPayment: async (
      userId: string,
      paymentMethodOrDetails: string | {
        paymentMethod: string;
        transactionRef?: string;
        amount: number;
        accountType?: AccountType;
        subscriptionType?: SubscriptionType;
        planType?: SubscriptionType;
      },
      transactionRef?: string,
      amount?: number,
      accountType?: AccountType
    ): Promise<UserProfile> => {
      return await db.auth.processSubscriptionPayment(userId, paymentMethodOrDetails, transactionRef, amount, accountType);
    },

    processSubscriptionPayment: async (
      userId: string,
      paymentMethodOrDetails: string | {
        paymentMethod: string;
        transactionRef?: string;
        amount: number;
        accountType?: AccountType;
        subscriptionType?: SubscriptionType;
        planType?: SubscriptionType;
      },
      transactionRef?: string,
      amount?: number,
      accountType?: AccountType,
      planTypeParam?: SubscriptionType
    ): Promise<UserProfile> => {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Database is not configured. Please contact support.');
      }

      let paymentMethod: string;
      let finalRef: string | undefined;
      let feeAmount: number;
      let accType: AccountType | undefined;
      let planType: SubscriptionType = 'monthly';

      if (typeof paymentMethodOrDetails === 'object') {
        paymentMethod = paymentMethodOrDetails.paymentMethod;
        finalRef = paymentMethodOrDetails.transactionRef;
        feeAmount = paymentMethodOrDetails.amount;
        accType = paymentMethodOrDetails.accountType;
        planType = paymentMethodOrDetails.planType || paymentMethodOrDetails.subscriptionType || 'monthly';
      } else {
        paymentMethod = paymentMethodOrDetails;
        finalRef = transactionRef;
        feeAmount = amount || 10000;
        accType = accountType;
        planType = planTypeParam || 'monthly';
      }

      const now = new Date();
      // Annual plan grants 365 days; Monthly plan grants 30 days
      const daysToAdd = planType === 'annual' ? 365 : 30;
      const paidUntil = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

      const updates: Partial<UserProfile> = {
        registrationStatus: 'paid',
        subscriptionStatus: 'paid',
        subscriptionType: planType,
        expiryDate: paidUntil,
        subscriptionPaidUntil: paidUntil,
        lastSubscriptionPaymentDate: now.toISOString(),
        lastSubscriptionPaymentMethod: paymentMethod,
        lastSubscriptionPaymentRef: finalRef || `MWK-${Date.now().toString().slice(-6)}`,
        registrationPaymentDate: now.toISOString(),
        registrationPaymentMethod: paymentMethod,
        registrationPaymentRef: finalRef || `MWK-${Date.now().toString().slice(-6)}`,
        currency: 'MWK',
      };

      if (planType === 'annual') {
        updates.annualSubscriptionFee = feeAmount;
      } else {
        updates.monthlySubscriptionFee = feeAmount;
      }

      if (accType) {
        updates.accountType = accType;
      }

      return await db.auth.updateProfile(userId, updates);
    },

    signIn: async (email: string, password?: string): Promise<UserProfile> => {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Database is not configured. Please contact support.');
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: password || 'TemporaryPassword123!'
      });

      if (authError) {
        throw new Error(authError.message);
      }
      if (!authData.user) {
        throw new Error('Authentication succeeded but no user was returned.');
      }

      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      // Self-heal: profile row missing (e.g. an account created before confirmation
      // was disabled, which never got a profile row written).
      if (error || !data) {
        console.warn('Profile missing for authenticated user, attempting auto-create:', error);
        try {
          await ensureProfileExists(authData.user.id);
        } catch (ensureErr) {
          console.error('ensureProfileExists failed during signIn:', ensureErr);
        }

        const retry = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error || !data) {
        throw new Error(error ? error.message : 'User profile not found. Please register.');
      }

      return normalizeProfile(data);
    },

    signOut: async (): Promise<void> => {
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.auth.signOut();
        } catch (err) {
          console.warn("Supabase signOut failed:", err);
        }
      }
    },

    updateProfile: async (id: string, updates: Partial<UserProfile>): Promise<UserProfile> => {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Database is not configured. Please contact support.');
      }

      const payload = { ...updates } as any;
      if (updates.fullName) {
        const parts = updates.fullName.trim().split(/\s+/);
        payload.firstName = parts[0] || '';
        payload.surname = parts.slice(1).join(' ') || '';
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);

      const normalized = normalizeProfile(data);

      // Keep local profiles backup in sync
      try {
        const localProfiles = getLocalStorage<UserProfile>('afket_profiles', []);
        const idx = localProfiles.findIndex(p => p.id === id);
        if (idx >= 0) {
          localProfiles[idx] = normalized;
          setLocalStorage('afket_profiles', localProfiles);
        }
      } catch (cacheErr) {
        console.warn('Could not update local storage cache for profile:', cacheErr);
      }

      return normalized;
    },

    listProfiles: async (): Promise<UserProfile[]> => {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Database is not configured. Please contact support.');
      }
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw new Error(error.message);
      return (data || []).map(normalizeProfile);
    },

    uploadLogo: async (userId: string, file: File | Blob, fileName: string): Promise<string> => {
      return db.storage.uploadImage('company-logos', file, fileName, userId);
    },

    uploadProfileImage: async (userId: string, file: File | Blob, fileName: string): Promise<string> => {
      return db.storage.uploadImage('profile-images', file, fileName, userId);
    }
  },

  storage: {
    uploadImage: async (
      bucket: 'profile-images' | 'product-images' | 'company-logos' | 'images' | string,
      file: File | Blob,
      fileName: string,
      customPrefix?: string
    ): Promise<string> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const fileExt = (fileName && fileName.includes('.')) ? fileName.split('.').pop() : 'jpg';
          const prefix = customPrefix ? `${customPrefix}-` : '';
          const uniqueName = `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
          const filePath = `${uniqueName}`;

          const { error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (error) {
            console.warn(`Upload to bucket '${bucket}' error:`, error);
            // If upload failed, try general 'images' bucket fallback
            if (bucket !== 'images') {
              try {
                const { error: fallbackError } = await supabase.storage
                  .from('images')
                  .upload(filePath, file, { cacheControl: '3600', upsert: true });
                if (!fallbackError) {
                  const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
                  return publicUrl;
                }
              } catch (e) {
                console.warn('Fallback upload to images bucket failed:', e);
              }
            }
            throw new Error(`Failed to upload to ${bucket}: ${error.message}`);
          }

          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

          return publicUrl;
        } catch (err: any) {
          console.warn(`Supabase storage upload error in bucket ${bucket}:`, err);
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
          });
        }
      } else {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
      }
    },

    uploadProfileImage: async (userId: string, file: File | Blob, fileName: string): Promise<string> => {
      return db.storage.uploadImage('profile-images', file, fileName, userId);
    },

    uploadProductImage: async (sellerId: string, file: File | Blob, fileName: string): Promise<string> => {
      return db.storage.uploadImage('product-images', file, fileName, sellerId);
    },

    uploadGeneralImage: async (file: File | Blob, fileName: string, customPrefix?: string): Promise<string> => {
      return db.storage.uploadImage('images', file, fileName, customPrefix);
    }
  },

  products: {
    list: async (category?: ProductCategory): Promise<Product[]> => {
      if (isSupabaseConfigured && supabase) {
        try {
          let query = supabase.from('products').select('*');
          if (category) {
            query = query.eq('category', category);
          }
          const { data, error } = await query.order('createdAt', { ascending: false });
          if (error) throw new Error(error.message);
          return data as Product[];
        } catch (err) {
          console.warn("Supabase products.list failed, falling back to local storage:", err);
          return getLocalProductsList(category);
        }
      } else {
        return getLocalProductsList(category);
      }
    },

    create: async (productData: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
      if (isSupabaseConfigured && supabase) {
        try {
          if (productData.sellerId) {
            await ensureProfileExists(productData.sellerId, 'seller');
            
            // Check seller subscription status and current product count before permitting product upload
            const { data: pData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', productData.sellerId)
              .maybeSingle();

            if (pData) {
              const sellerProf = normalizeProfile(pData);
              const { count } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('sellerId', productData.sellerId);

              const eligibility = checkProductUploadEligibility(sellerProf, count ?? 0);
              if (!eligibility.allowed) {
                throw new Error(eligibility.reason || 'You have reached the 3-product limit for the free period. Please subscribe to continue uploading.');
              }
            }
          }
          const { data, error } = await supabase
            .from('products')
            .insert([{ ...productData, createdAt: new Date().toISOString() }])
            .select()
            .single();
          if (error) throw new Error(error.message);
          return data as Product;
        } catch (err: any) {
          console.error("Supabase products.create error:", err);
          throw new Error(err.message || "Failed to create product listing in Supabase");
        }
      } else {
        return getLocalProductCreate(productData);
      }
    },

    update: async (id: string, updates: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<Product> => {
      if (isSupabaseConfigured && supabase) {
        try {
          if (updates.sellerId) {
            await ensureProfileExists(updates.sellerId, 'seller');
          } else {
            const { data: existingProd } = await supabase
              .from('products')
              .select('sellerId')
              .eq('id', id)
              .single();
            if (existingProd?.sellerId) {
              await ensureProfileExists(existingProd.sellerId, 'seller');
            }
          }
          const { data, error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
          if (error) throw new Error(error.message);
          return data as Product;
        } catch (err: any) {
          console.error("Supabase products.update error:", err);
          throw new Error(err.message || "Failed to update product listing in Supabase");
        }
      } else {
        return getLocalProductUpdate(id, updates);
      }
    },

    delete: async (id: string): Promise<void> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);
          if (error) throw new Error(error.message);
        } catch (err) {
          console.warn("Supabase products.delete failed, falling back to local storage:", err);
          getLocalProductDelete(id);
        }
      } else {
        getLocalProductDelete(id);
      }
    }
  },

  orders: {
    listByBuyer: async (buyerId: string): Promise<Order[]> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('buyerId', buyerId)
            .order('createdAt', { ascending: false });
          if (error) throw new Error(error.message);
          return data as Order[];
        } catch (err) {
          console.warn("Supabase orders.listByBuyer failed, falling back to local storage:", err);
          return getLocalOrdersListByBuyer(buyerId);
        }
      } else {
        return getLocalOrdersListByBuyer(buyerId);
      }
    },

    listBySeller: async (sellerId: string): Promise<Order[]> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('sellerId', sellerId)
            .order('createdAt', { ascending: false });
          if (error) throw new Error(error.message);
          return data as Order[];
        } catch (err) {
          console.warn("Supabase orders.listBySeller failed, falling back to local storage:", err);
          return getLocalOrdersListBySeller(sellerId);
        }
      } else {
        return getLocalOrdersListBySeller(sellerId);
      }
    },

    create: async (orderData: Omit<Order, 'id' | 'status' | 'createdAt'>): Promise<Order> => {
      if (isSupabaseConfigured && supabase) {
        try {
          if (orderData.buyerId) {
            await ensureProfileExists(orderData.buyerId, 'buyer');
          }
          if (orderData.sellerId) {
            await ensureProfileExists(orderData.sellerId, 'seller');
          }
          const newOrderData = {
            ...orderData,
            status: 'pending' as OrderStatus,
            createdAt: new Date().toISOString()
          };
          const { data, error } = await supabase
            .from('orders')
            .insert([newOrderData])
            .select()
            .single();
          if (error) throw new Error(error.message);

          try {
            await supabase.from('logistics_jobs').insert([{
              orderId: data.id,
              productTitle: data.productTitle,
              quantity: data.quantity,
              unit: 'Metric Ton',
              buyerName: data.buyerName,
              pickupLocation: 'Seller Base',
              deliveryLocation: data.deliveryAddress,
              status: 'awaiting_pickup' as LogisticsStatus,
              updatedAt: new Date().toISOString()
            }]);
          } catch (logErr) {
            console.warn("Could not auto-generate Supabase logistics job:", logErr);
          }

          return data as Order;
        } catch (err: any) {
          console.error("Supabase orders.create error:", err);
          throw new Error(err.message || "Failed to finalize sourcing contract in Supabase");
        }
      } else {
        return getLocalOrderCreate(orderData);
      }
    },

    updateStatus: async (orderId: string, status: OrderStatus): Promise<void> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', orderId);
          if (error) throw new Error(error.message);
        } catch (err) {
          console.warn("Supabase orders.updateStatus failed, falling back to local storage:", err);
          getLocalOrderUpdateStatus(orderId, status);
        }
      } else {
        getLocalOrderUpdateStatus(orderId, status);
      }
    }
  },

  logistics: {
    listAvailableJobs: async (): Promise<LogisticsJob[]> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('logistics_jobs')
            .select('*')
            .is('providerId', null);
          if (error) throw new Error(error.message);
          return data as LogisticsJob[];
        } catch (err) {
          console.warn("Supabase logistics.listAvailableJobs failed, falling back to local storage:", err);
          return getLocalLogisticsListAvailableJobs();
        }
      } else {
        return getLocalLogisticsListAvailableJobs();
      }
    },

    listProviderJobs: async (providerId: string): Promise<LogisticsJob[]> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('logistics_jobs')
            .select('*')
            .eq('providerId', providerId);
          if (error) throw new Error(error.message);
          return data as LogisticsJob[];
        } catch (err) {
          console.warn("Supabase logistics.listProviderJobs failed, falling back to local storage:", err);
          return getLocalLogisticsListProviderJobs(providerId);
        }
      } else {
        return getLocalLogisticsListProviderJobs(providerId);
      }
    },

    listAllJobs: async (): Promise<LogisticsJob[]> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('logistics_jobs')
            .select('*');
          if (error) throw new Error(error.message);
          return data as LogisticsJob[];
        } catch (err) {
          console.warn("Supabase logistics.listAllJobs failed, falling back to local storage:", err);
          return getLocalLogisticsListAllJobs();
        }
      } else {
        return getLocalLogisticsListAllJobs();
      }
    },

    acceptJob: async (jobId: string, providerId: string, providerName: string, quotePrice: number, estimatedDelivery: string): Promise<LogisticsJob> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('logistics_jobs')
            .update({
              providerId,
              providerName,
              quotePrice,
              estimatedDelivery,
              status: 'awaiting_pickup' as LogisticsStatus,
              updatedAt: new Date().toISOString()
            })
            .eq('id', jobId)
            .select()
            .single();
          if (error) throw new Error(error.message);

          try {
            await supabase
              .from('orders')
              .update({
                logisticsId: providerId,
                logisticsStatus: 'awaiting_pickup' as LogisticsStatus
              })
              .eq('id', data.orderId);
          } catch (orderErr) {
            console.warn("Could not update Supabase order logistics during acceptJob:", orderErr);
          }

          return data as LogisticsJob;
        } catch (err) {
          console.warn("Supabase logistics.acceptJob failed, falling back to local storage:", err);
          return getLocalLogisticsAcceptJob(jobId, providerId, providerName, quotePrice, estimatedDelivery);
        }
      } else {
        return getLocalLogisticsAcceptJob(jobId, providerId, providerName, quotePrice, estimatedDelivery);
      }
    },

    updateJobStatus: async (jobId: string, status: LogisticsStatus): Promise<LogisticsJob> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('logistics_jobs')
            .update({ status, updatedAt: new Date().toISOString() })
            .eq('id', jobId)
            .select()
            .single();
          if (error) throw new Error(error.message);

          let orderStatus: OrderStatus = 'processing';
          if (status === 'in_transit') orderStatus = 'shipped';
          if (status === 'delivered') orderStatus = 'delivered';

          try {
            await supabase
              .from('orders')
              .update({
                logisticsStatus: status,
                status: orderStatus
              })
              .eq('id', data.orderId);
          } catch (orderErr) {
            console.warn("Could not sync Supabase order status during updateJobStatus:", orderErr);
          }

          return data as LogisticsJob;
        } catch (err) {
          console.warn("Supabase logistics.updateJobStatus failed, falling back to local storage:", err);
          return getLocalLogisticsUpdateJobStatus(jobId, status);
        }
      } else {
        return getLocalLogisticsUpdateJobStatus(jobId, status);
      }
    }
  },

  feedback: {
    submit: async (item: Omit<UserFeedback, 'id' | 'createdAt'>): Promise<UserFeedback> => {
      const feedbackEntry: UserFeedback = {
        ...item,
        id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString()
      };

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('feedbacks').insert([feedbackEntry]);
        } catch (err) {
          console.warn("Could not insert into Supabase feedbacks table:", err);
        }
      }

      // Always save to local storage
      const feedbacks = getLocalStorage<UserFeedback>('afket_user_feedbacks', []);
      feedbacks.unshift(feedbackEntry);
      setLocalStorage('afket_user_feedbacks', feedbacks);
      return feedbackEntry;
    },

    getAll: async (): Promise<UserFeedback[]> => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from('feedbacks').select('*').order('createdAt', { ascending: false });
          if (!error && data) return data as UserFeedback[];
        } catch (err) {
          console.warn("Supabase feedback fetch error:", err);
        }
      }
      return getLocalStorage<UserFeedback>('afket_user_feedbacks', []);
    }
  }
};

// ----------------------------------------------------
// LOCAL STORAGE FALLBACK — products / orders / logistics only.
// Never used for auth, sessions, or profiles.
// ----------------------------------------------------

export const getLocalProductsList = (category?: ProductCategory): Product[] => {
  const products = getLocalStorage<Product>('afket_products', INITIAL_PRODUCTS);
  let list = [...products];
  if (category) {
    list = list.filter(p => p.category === category);
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getLocalProductCreate = (productData: Omit<Product, 'id' | 'createdAt'>): Product => {
  const products = getLocalStorage<Product>('afket_products', INITIAL_PRODUCTS);
  if (productData.sellerId) {
    const currentSellerProds = products.filter(p => p.sellerId === productData.sellerId).length;
    const profiles = getLocalStorage<UserProfile>('afket_user_profiles', []);
    const sellerProf = profiles.find(p => p.id === productData.sellerId);
    if (sellerProf) {
      const eligibility = checkProductUploadEligibility(sellerProf, currentSellerProds);
      if (!eligibility.allowed) {
        throw new Error(eligibility.reason || 'You have reached the 3-product limit for the free period. Please subscribe to continue uploading.');
      }
    }
  }
  const newProduct: Product = {
    ...productData,
    id: `prod-${Math.random().toString(36).substring(2, 11)}`,
    createdAt: new Date().toISOString()
  };
  products.push(newProduct);
  setLocalStorage('afket_products', products);
  return newProduct;
};

export const getLocalProductUpdate = (id: string, updates: Partial<Omit<Product, 'id' | 'createdAt'>>): Product => {
  const products = getLocalStorage<Product>('afket_products', INITIAL_PRODUCTS);
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) throw new Error('Product not found');
  const updated = { ...products[idx], ...updates };
  products[idx] = updated;
  setLocalStorage('afket_products', products);
  return updated;
};

export const getLocalProductDelete = (id: string): void => {
  const products = getLocalStorage<Product>('afket_products', INITIAL_PRODUCTS);
  const filtered = products.filter(p => p.id !== id);
  setLocalStorage('afket_products', filtered);
};

export const getLocalOrdersListByBuyer = (buyerId: string): Order[] => {
  const orders = getLocalStorage<Order>('afket_orders', INITIAL_ORDERS);
  return orders
    .filter(o => o.buyerId === buyerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getLocalOrdersListBySeller = (sellerId: string): Order[] => {
  const orders = getLocalStorage<Order>('afket_orders', INITIAL_ORDERS);
  return orders
    .filter(o => o.sellerId === sellerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getLocalOrderCreate = (orderData: Omit<Order, 'id' | 'status' | 'createdAt'>): Order => {
  const orders = getLocalStorage<Order>('afket_orders', INITIAL_ORDERS);
  const products = getLocalStorage<Product>('afket_products', INITIAL_PRODUCTS);

  const targetProductIndex = products.findIndex(p => p.id === orderData.productId);
  if (targetProductIndex !== -1) {
    const prod = products[targetProductIndex];
    if (prod.availableQuantity >= orderData.quantity) {
      prod.availableQuantity -= orderData.quantity;
      setLocalStorage('afket_products', products);
    } else {
      throw new Error(`Insufficient stock available. Only ${prod.availableQuantity} ${prod.unit} left.`);
    }
  }

  const newOrder: Order = {
    ...orderData,
    status: 'pending' as OrderStatus,
    createdAt: new Date().toISOString(),
    id: `ord-${Math.random().toString(36).substring(2, 11)}`
  };
  orders.push(newOrder);
  setLocalStorage('afket_orders', orders);

  const logisticsJobs = getLocalStorage<LogisticsJob>('afket_logistics', INITIAL_LOGISTICS_JOBS);
  const productDetail = products.find(p => p.id === orderData.productId);

  const newJob: LogisticsJob = {
    id: `log-${Math.random().toString(36).substring(2, 11)}`,
    orderId: newOrder.id,
    productTitle: newOrder.productTitle,
    quantity: newOrder.quantity,
    unit: productDetail?.unit || 'Units',
    buyerName: newOrder.buyerName,
    buyerPhone: '',
    sellerName: newOrder.sellerName,
    sellerPhone: '',
    pickupLocation: productDetail?.location || 'Origin Farm',
    deliveryLocation: newOrder.deliveryAddress,
    status: 'awaiting_pickup',
    updatedAt: new Date().toISOString()
  };
  logisticsJobs.push(newJob);
  setLocalStorage('afket_logistics', logisticsJobs);

  return newOrder;
};

export const getLocalOrderUpdateStatus = (orderId: string, status: OrderStatus): void => {
  const orders = getLocalStorage<Order>('afket_orders', INITIAL_ORDERS);
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = status;
    setLocalStorage('afket_orders', orders);
  }
};

export const getLocalLogisticsListAvailableJobs = (): LogisticsJob[] => {
  const jobs = getLocalStorage<LogisticsJob>('afket_logistics', INITIAL_LOGISTICS_JOBS);
  return jobs.filter(j => !j.providerId);
};

export const getLocalLogisticsListProviderJobs = (providerId: string): LogisticsJob[] => {
  const jobs = getLocalStorage<LogisticsJob>('afket_logistics', INITIAL_LOGISTICS_JOBS);
  return jobs.filter(j => j.providerId === providerId);
};

export const getLocalLogisticsListAllJobs = (): LogisticsJob[] => {
  return getLocalStorage<LogisticsJob>('afket_logistics', INITIAL_LOGISTICS_JOBS);
};

export const getLocalLogisticsAcceptJob = (jobId: string, providerId: string, providerName: string, quotePrice: number, estimatedDelivery: string): LogisticsJob => {
  const jobs = getLocalStorage<LogisticsJob>('afket_logistics', INITIAL_LOGISTICS_JOBS);
  const jobIndex = jobs.findIndex(j => j.id === jobId);
  if (jobIndex === -1) throw new Error('Logistics job not found.');

  const updatedJob: LogisticsJob = {
    ...jobs[jobIndex],
    providerId,
    providerName,
    quotePrice,
    estimatedDelivery,
    status: 'awaiting_pickup',
    updatedAt: new Date().toISOString()
  };

  jobs[jobIndex] = updatedJob;
  setLocalStorage('afket_logistics', jobs);

  const orders = getLocalStorage<Order>('afket_orders', INITIAL_ORDERS);
  const orderIndex = orders.findIndex(o => o.id === updatedJob.orderId);
  if (orderIndex !== -1) {
    orders[orderIndex].logisticsId = providerId;
    orders[orderIndex].logisticsStatus = 'awaiting_pickup';
    orders[orderIndex].status = 'processing';
    setLocalStorage('afket_orders', orders);
  }

  return updatedJob;
};

export const getLocalLogisticsUpdateJobStatus = (jobId: string, status: LogisticsStatus): LogisticsJob => {
  const jobs = getLocalStorage<LogisticsJob>('afket_logistics', INITIAL_LOGISTICS_JOBS);
  const jobIndex = jobs.findIndex(j => j.id === jobId);
  if (jobIndex === -1) throw new Error('Logistics job not found.');

  const updatedJob: LogisticsJob = {
    ...jobs[jobIndex],
    status,
    updatedAt: new Date().toISOString()
  };
  jobs[jobIndex] = updatedJob;
  setLocalStorage('afket_logistics', jobs);

  const orders = getLocalStorage<Order>('afket_orders', INITIAL_ORDERS);
  const orderIndex = orders.findIndex(o => o.id === updatedJob.orderId);
  if (orderIndex !== -1) {
    orders[orderIndex].logisticsStatus = status;
    if (status === 'in_transit') {
      orders[orderIndex].status = 'shipped';
    } else if (status === 'delivered') {
      orders[orderIndex].status = 'delivered';
    }
    setLocalStorage('afket_orders', orders);
  }

  return updatedJob;
};