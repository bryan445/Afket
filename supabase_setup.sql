-- ====================================================================
-- AFKET SUPABASE SETUP SCHEMA & POLICIES
-- ====================================================================
-- This SQL script sets up the full database, tables, triggers,
-- row-level security (RLS) policies, and real-time features for AFKET.
-- Copy and paste this script directly into the Supabase SQL Editor.
-- ====================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    email text not null unique,
    "firstName" text not null default '',
    "surname" text not null default '',
    "fullName" text not null default '',
    role text not null check (role in ('buyer', 'seller', 'logistics_provider')),
    "accountType" text default 'individual' check ("accountType" in ('individual', 'company')),
    "businessName" text,
    phone text,
    location text not null,
    "joinedAt" timestamp with time zone default timezone('utc'::text, now()) not null,
    nationality text,
    whatsapp text,
    facebook text,
    "contactEmail" text,
    "logoUrl" text,
    "registrationStatus" text default 'paid' check ("registrationStatus" in ('paid', 'not paid')),
    "subscriptionStatus" text default 'not paid' check ("subscriptionStatus" in ('paid', 'not paid')),
    "subscriptionType" text default 'monthly' check ("subscriptionType" in ('monthly', 'annual')),
    "subscription_type" text default 'monthly',
    "expiryDate" timestamp with time zone,
    "expiry_date" timestamp with time zone,
    "subscriptionPaidUntil" timestamp with time zone,
    "trialEndsAt" timestamp with time zone,
    "registrationFee" numeric default 0,
    "monthlySubscriptionFee" numeric default 10000,
    "annualSubscriptionFee" numeric default 110000,
    "lastSubscriptionPaymentDate" timestamp with time zone,
    "lastSubscriptionPaymentMethod" text,
    "lastSubscriptionPaymentRef" text,
    currency text default 'MWK',
    "registrationPaymentDate" timestamp with time zone,
    "registrationPaymentMethod" text,
    "registrationPaymentRef" text
);

-- Migration helpers for pre-existing tables
alter table public.profiles add column if not exists "accountType" text default 'individual';
alter table public.profiles add column if not exists "registrationStatus" text default 'paid';
alter table public.profiles add column if not exists "subscriptionStatus" text default 'not paid';
alter table public.profiles add column if not exists "subscriptionType" text default 'monthly';
alter table public.profiles add column if not exists "subscription_type" text default 'monthly';
alter table public.profiles add column if not exists "expiryDate" timestamp with time zone;
alter table public.profiles add column if not exists "expiry_date" timestamp with time zone;
alter table public.profiles add column if not exists "subscriptionPaidUntil" timestamp with time zone;
alter table public.profiles add column if not exists "trialEndsAt" timestamp with time zone;
alter table public.profiles add column if not exists "registrationFee" numeric default 0;
alter table public.profiles add column if not exists "monthlySubscriptionFee" numeric default 10000;
alter table public.profiles add column if not exists "annualSubscriptionFee" numeric default 110000;
alter table public.profiles add column if not exists "lastSubscriptionPaymentDate" timestamp with time zone;
alter table public.profiles add column if not exists "lastSubscriptionPaymentMethod" text;
alter table public.profiles add column if not exists "lastSubscriptionPaymentRef" text;
alter table public.profiles add column if not exists currency text default 'MWK';
alter table public.profiles add column if not exists "registrationPaymentDate" timestamp with time zone;
alter table public.profiles add column if not exists "registrationPaymentMethod" text;
alter table public.profiles add column if not exists "registrationPaymentRef" text;

-- Enable Row-Level Security for profiles
alter table public.profiles enable row level security;

-- Profiles RLS Policies
create policy "Allow public read access to profiles"
    on public.profiles for select
    using (true);

create policy "Allow users to update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

create policy "Allow users to insert their own profile"
    on public.profiles for insert
    with check (auth.uid() = id);


-- 2. PRODUCTS TABLE
create table if not exists public.products (
    id uuid default gen_random_uuid() primary key,
    "sellerId" uuid references public.profiles(id) on delete cascade not null,
    "sellerName" text not null,
    "sellerBusinessName" text,
    "sellerNationality" text,
    "sellerPhone" text,
    "sellerEmail" text,
    "sellerWhatsapp" text,
    "sellerFacebook" text,
    "localCurrency" text,
    title text not null,
    description text not null,
    category text not null,
    price numeric not null,
    "localPrice" numeric not null,
    "internationalPrice" numeric not null,
    unit text not null,
    "availableQuantity" numeric not null default 0,
    condition text not null,
    "minOrderQty" numeric,
    packaging text,
    certifications text,
    location text not null,
    "imageUrl" text not null,
    "imageUrls" text[],
    "harvestDate" text,
    "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row-Level Security for products
alter table public.products enable row level security;

-- Products RLS Policies
create policy "Allow public read access to products"
    on public.products for select
    using (true);

create policy "Allow sellers to create products"
    on public.products for insert
    with check (
        auth.uid() = "sellerId" AND 
        exists (
            select 1 from public.profiles 
            where id = auth.uid() 
              AND role = 'seller'
              AND (
                -- Paid subscription active
                ("subscriptionStatus" = 'paid' AND (coalesce("expiryDate", "expiry_date", "subscriptionPaidUntil") is null OR coalesce("expiryDate", "expiry_date", "subscriptionPaidUntil") > now()))
                OR
                -- 14-day free trial active
                ("trialEndsAt" is not null AND "trialEndsAt" > now())
              )
        )
    );

create policy "Allow sellers to update their own products"
    on public.products for update
    using (auth.uid() = "sellerId")
    with check (auth.uid() = "sellerId");

create policy "Allow sellers to delete their own products"
    on public.products for delete
    using (auth.uid() = "sellerId");


-- 3. ORDERS TABLE
create table if not exists public.orders (
    id uuid default gen_random_uuid() primary key,
    "productId" uuid references public.products(id) on delete set null,
    "productTitle" text not null,
    "buyerId" uuid references public.profiles(id) on delete cascade not null,
    "buyerName" text not null,
    "sellerId" uuid references public.profiles(id) on delete cascade not null,
    "sellerName" text not null,
    quantity numeric not null,
    "totalPrice" numeric not null,
    status text not null check (status in ('pending', 'accepted', 'processing', 'shipped', 'delivered', 'cancelled')) default 'pending',
    "deliveryAddress" text not null,
    "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null,
    "logisticsId" uuid references public.profiles(id) on delete set null,
    "logisticsStatus" text
);

-- Enable Row-Level Security for orders
alter table public.orders enable row level security;

-- Orders RLS Policies
create policy "Users can view their own orders (buyer or seller)"
    on public.orders for select
    using (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR auth.uid() = "logisticsId");

create policy "Buyers can insert orders"
    on public.orders for insert
    with check (
        auth.uid() = "buyerId" AND
        exists (
            select 1 from public.profiles 
            where id = auth.uid() AND role = 'buyer'
        )
    );

create policy "Participants can update order statuses"
    on public.orders for update
    using (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR auth.uid() = "logisticsId")
    with check (auth.uid() = "buyerId" OR auth.uid() = "sellerId" OR auth.uid() = "logisticsId");


-- 4. LOGISTICS JOBS TABLE
create table if not exists public.logistics_jobs (
    id uuid default gen_random_uuid() primary key,
    "orderId" uuid references public.orders(id) on delete cascade not null,
    "productTitle" text not null,
    quantity numeric not null,
    unit text not null,
    "buyerName" text not null,
    "buyerPhone" text,
    "sellerName" text not null,
    "sellerPhone" text,
    "pickupLocation" text not null,
    "deliveryLocation" text not null,
    status text not null default 'awaiting_pickup',
    "providerId" uuid references public.profiles(id) on delete set null,
    "providerName" text,
    "providerPhone" text,
    "providerEmail" text,
    "providerWhatsapp" text,
    "providerFacebook" text,
    "quotePrice" numeric,
    "estimatedDelivery" text,
    "updatedAt" timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row-Level Security for logistics_jobs
alter table public.logistics_jobs enable row level security;

-- Logistics Jobs RLS Policies
create policy "Allow all authenticated users to view logistics jobs"
    on public.logistics_jobs for select
    using (auth.role() = 'authenticated');

create policy "Allow carriers and order participants to update jobs"
    on public.logistics_jobs for update
    using (
        auth.uid() = "providerId" OR 
        exists (
            select 1 from public.orders 
            where id = "orderId" AND (auth.uid() = "buyerId" OR auth.uid() = "sellerId")
        ) OR
        ( "providerId" is null AND exists (
            select 1 from public.profiles 
            where id = auth.uid() AND role = 'logistics_provider'
        ))
    );

create policy "Allow internal inserting of logistics jobs on order placement"
    on public.logistics_jobs for insert
    with check (auth.role() = 'authenticated');


-- 5. REAL-TIME PUBLICATION CONFIGURATION
-- Re-create publication if it doesn't exist to enable real-time replication
drop publication if exists supabase_realtime;
create publication supabase_realtime;

-- Add tables to the real-time publication
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.logistics_jobs;


-- 6. STORAGE BUCKETS FOR PROFILE IMAGES, GENERAL IMAGES, PRODUCTS & LOGOS
-- Creates dedicated buckets in Supabase Storage with public access enabled
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
values 
    ('profile-images', 'profile-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('images', 'images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('product-images', 'product-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('company-logos', 'company-logos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true;

-- Profile Images Storage Policies
create policy "Allow public viewing of profile images"
    on storage.objects for select
    using (bucket_id = 'profile-images');

create policy "Allow authenticated users to upload profile images"
    on storage.objects for insert
    with check (bucket_id = 'profile-images' AND auth.role() = 'authenticated');

create policy "Allow users to update profile images"
    on storage.objects for update
    using (bucket_id = 'profile-images' AND auth.role() = 'authenticated');

create policy "Allow users to delete profile images"
    on storage.objects for delete
    using (bucket_id = 'profile-images' AND auth.role() = 'authenticated');

-- General Images Storage Policies
create policy "Allow public viewing of general images"
    on storage.objects for select
    using (bucket_id = 'images');

create policy "Allow authenticated users to upload general images"
    on storage.objects for insert
    with check (bucket_id = 'images' AND auth.role() = 'authenticated');

create policy "Allow users to update general images"
    on storage.objects for update
    using (bucket_id = 'images' AND auth.role() = 'authenticated');

create policy "Allow users to delete general images"
    on storage.objects for delete
    using (bucket_id = 'images' AND auth.role() = 'authenticated');

-- Product Images Storage Policies
create policy "Allow public viewing of product images"
    on storage.objects for select
    using (bucket_id = 'product-images');

create policy "Allow sellers to upload product images"
    on storage.objects for insert
    with check (bucket_id = 'product-images' AND auth.role() = 'authenticated');

create policy "Allow users to update product images"
    on storage.objects for update
    using (bucket_id = 'product-images' AND auth.role() = 'authenticated');

create policy "Allow users to delete product images"
    on storage.objects for delete
    using (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Company Logos Storage Policies
create policy "Allow public viewing of company logos"
    on storage.objects for select
    using (bucket_id = 'company-logos');

create policy "Allow users to upload company logos"
    on storage.objects for insert
    with check (bucket_id = 'company-logos' AND auth.role() = 'authenticated');

create policy "Allow users to update company logos"
    on storage.objects for update
    using (bucket_id = 'company-logos' AND auth.role() = 'authenticated');

create policy "Allow users to delete company logos"
    on storage.objects for delete
    using (bucket_id = 'company-logos' AND auth.role() = 'authenticated');


