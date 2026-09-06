# ⚡ Supabase Setup & Integration Guide

Welcome to the real-time backend configuration for **AFKET (African Market Network)**. This guide provides step-by-step instructions for provisioning your database, setting up authentication, and configuring your local variables.

---

## 🚀 Step 1: Create a Supabase Project
1. Go to the [Supabase Dashboard](https://supabase.com/) and sign in.
2. Click **New Project** and select or create an organization.
3. Choose a project name (e.g., `AFKET`), enter a secure database password, and choose your region.
4. Wait a few minutes for your project to provision.

---

## 📂 Step 2: Initialize Database Schema & RLS Policies
1. In your Supabase Dashboard, navigate to the **SQL Editor** tab from the left sidebar.
2. Click **New query** (or **New Blank Query**).
3. Copy the entire contents of the `supabase_setup.sql` file in this workspace.
4. Paste the SQL query into the editor and click **Run**.
5. Ensure the query runs successfully with no errors. This will create:
   - `profiles` table (linked to Supabase Auth users)
   - `products` table (with seller validation policies)
   - `orders` table (with buyer/seller security constraints)
   - `logistics_jobs` table (real-time logistics coordination)
   - Enable **Real-Time Replication** on all tables
   - Initialize public storage buckets:
     - `profile-images` (User avatars, profile portraits, and trader photos)
     - `images` (General application images, media, and documents)
     - `product-images` (Harvest commodities, mineral samples, packaging)
     - `company-logos` (Cooperative, enterprise, and carrier logos)

---

## 🗄️ Storage Buckets in Supabase
The storage schema in `supabase_setup.sql` automatically configures 4 dedicated public buckets:
1. **`profile-images`**: Dedicated to user avatar and profile pictures. Max size: 5MB.
2. **`images`**: General multi-purpose media storage bucket. Max size: 10MB.
3. **`product-images`**: Dedicated to multi-angle product and harvest photos. Max size: 10MB.
4. **`company-logos`**: Dedicated to company, farm union, and carrier branding. Max size: 5MB.

All buckets have public read access enabled with secure row-level security (RLS) policies allowing authenticated users to upload and manage their files.

If creating buckets manually in the **Supabase Dashboard > Storage**:
1. Click **New Bucket**
2. Name the bucket `profile-images` (and repeat for `images`, `product-images`, `company-logos`)
3. Toggle **Public bucket** to **ON** (Enabled)
4. Click **Save bucket**

---

## 🔑 Step 3: Configure Environment Variables
You need to supply your Supabase credentials to link AFKET with your backend:

1. In the Supabase Dashboard, go to **Project Settings** > **API**.
2. Locate the following keys:
   - **Project URL** (`VITE_SUPABASE_URL`)
   - **Anon Public API Key** (`VITE_SUPABASE_ANON_KEY`)
3. Open the **Secrets / Settings** panel in Google AI Studio.
4. Add the following key-value pairs:
   - `VITE_SUPABASE_URL` = `<your-project-url>`
   - `VITE_SUPABASE_ANON_KEY` = `<your-anon-key>`
5. Deploy or share the app, and it will automatically switch from the `localStorage` Mock Engine to the real live Supabase backend!

---

## 🔄 Real-Time Capabilities & Subscriptions
AFKET supports real-time logistics monitoring and stock updates. Because you ran `supabase_setup.sql`, the **Real-time Publication** (`supabase_realtime`) is fully active. Any update made by transporters or buyers will immediately propagate to other screens in real-time.

---

## 📩 Step 4: Configure Automated Thank-You Emails
When a user registers and is logged in, you should dispatch a custom welcome thank-you email through Supabase. There are two primary ways to set this up in your production Supabase environment:

### Option A: Customizing Built-In Supabase Auth Templates
1. Go to your **Supabase Dashboard** > **Authentication** > **Email Templates**.
2. Select **Confirm Signup** or **Welcome / Magic Link**.
3. Under the HTML or Message body, customize the template. For example:
   ```html
   <h2>Welcome to the AFKET Trading Network!</h2>
   <p>Thank you for registering on our platform. We are excited to support your trade operations!</p>
   <p>Please click the button below to confirm your email and activate your account:</p>
   <a href="{{ .ConfirmationURL }}">Confirm Your Account</a>
   ```

### Option B: Automatic Postgres Trigger + Supabase Edge Function (Custom Mailers)
For a fully personalized welcome email sent immediately upon registration confirmation, you can combine a PostgreSQL trigger with an email service (like Resend, Sendgrid, or Mailgun):

1. **Write the PostgreSQL Trigger**:
   Run this script in your **SQL Editor** to attach a welcome-email webhook to the `profiles` table:
   ```sql
   CREATE OR REPLACE FUNCTION public.handle_new_user_welcome()
   RETURNS trigger AS $$
   BEGIN
     PERFORM net.http_post(
       url := 'https://<your-project-ref>.supabase.co/functions/v1/send-welcome',
       headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
       body := json_build_object(
         'email', NEW.email,
         'fullName', NEW."fullName",
         'role', NEW.role
       )::text
     );
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE TRIGGER on_profile_created_welcome
     AFTER INSERT ON public.profiles
     FOR EACH ROW
     EXECUTE FUNCTION public.handle_new_user_welcome();
   ```

2. **Deploy a Supabase Edge Function**:
   Create a function named `send-welcome` that handles the webhook POST request and dispatches the formatted email to the recipient using your preferred email provider's REST API.

---

Enjoy your new real-time cloud-persisted Pan-African Ag-Trade network! 🌍🌾
