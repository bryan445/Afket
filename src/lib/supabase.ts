import { createClient } from '@supabase/supabase-js';
import { UserProfile, Product, Order, LogisticsJob, UserRole, ProductCategory, OrderStatus, LogisticsStatus } from '../types';

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
    const newProfile: UserProfile = {
      id: userId,
      email: authUser.email || '',
      firstName: meta.firstName || '',
      surname: meta.surname || '',
      fullName: meta.fullName || `${meta.firstName || ''} ${meta.surname || ''}`.trim() || 'User',
      role: (requiredRole || meta.role || 'buyer') as UserRole,
      businessName: meta.businessName || '',
      phone: meta.phone || '',
      location: meta.location || 'Unknown',
      joinedAt: new Date().toISOString(),
      nationality: meta.nationality || '',
      logoUrl: meta.logoUrl || undefined,
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

        callback(data ? (data as UserProfile) : null);
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
        return data as UserProfile;
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
      logoUrl?: string
    ): Promise<{ user: UserProfile }> => {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Database is not configured. Please contact support.');
      }

      const fullName = `${firstName.trim()} ${surname.trim()}`;

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

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName: firstName.trim(),
            surname: surname.trim(),
            fullName,
            role,
            businessName,
            phone,
            location,
            nationality,
            logoUrl,
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

      // With email confirmation disabled, a session should be returned immediately.
      // If it isn't, confirmation is on again at the project level and the code needs
      // to be updated to handle that flow — surface this clearly rather than silently
      // leaving the user half-registered.
      if (!data.session) {
        throw new Error(
          'Account created but no session was returned. Email confirmation may be enabled on the Supabase project — please check Authentication settings.'
        );
      }

      const newUserProfile: UserProfile = {
        id: data.user.id,
        email,
        firstName: firstName.trim(),
        surname: surname.trim(),
        fullName,
        role,
        businessName: businessName || undefined,
        phone: phone || undefined,
        location,
        joinedAt: new Date().toISOString(),
        nationality: nationality || undefined,
        logoUrl: logoUrl || undefined,
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([newUserProfile]);

      if (profileError) {
        const errMsg = profileError.message || '';
        if (errMsg.toLowerCase().includes('duplicate key') ||
            errMsg.toLowerCase().includes('already registered') ||
            errMsg.toLowerCase().includes('already exists') ||
            errMsg.toLowerCase().includes('unique constraint') ||
            errMsg.toLowerCase().includes('profiles_pkey') ||
            errMsg.toLowerCase().includes('profiles_email_key')) {
          throw new Error('User with that email already exists.');
        }
        throw new Error(errMsg);
      }

      return { user: newUserProfile };
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

      return data as UserProfile;
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
      return data as UserProfile;
    },

    listProfiles: async (): Promise<UserProfile[]> => {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Database is not configured. Please contact support.');
      }
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw new Error(error.message);
      return data as UserProfile[];
    },

    uploadLogo: async (userId: string, file: File | Blob, fileName: string): Promise<string> => {
      if (isSupabaseConfigured && supabase) {
        const fileExt = fileName.split('.').pop() || 'jpg';
        const uniqueName = `${userId}-${Math.random().toString(36).substring(2, 11)}.${fileExt}`;
        const filePath = `${uniqueName}`;

        const { error } = await supabase.storage
          .from('company-logos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (error) {
          throw new Error(error.message);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('company-logos')
          .getPublicUrl(filePath);

        return publicUrl;
      } else {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
      }
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